import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';

const api = axios.create({ baseURL: BASE });

// ── Token helpers ─────────────────────────────────────────────────────────────

export const tokenStorage = {
  getAccess:  () => localStorage.getItem('token'),
  getRefresh: () => localStorage.getItem('refresh_token'),
  setTokens:  (access, refresh) => {
    localStorage.setItem('token', access);
    if (refresh) localStorage.setItem('refresh_token', refresh);
  },
  clear: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
  },
};

// ── Request interceptor ───────────────────────────────────────────────────────

api.interceptors.request.use((config) => {
  const token = tokenStorage.getAccess();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response interceptor — auto-refresh on 401 ───────────────────────────────

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(p => error ? p.reject(error) : p.resolve(token));
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    const isLogin   = original?.url?.includes('/auth/login');
    const isRefresh = original?.url?.includes('/auth/refresh');

    if (err.response?.status === 401 && !isLogin && !isRefresh && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => failedQueue.push({ resolve, reject }))
          .then(token => { original.headers.Authorization = `Bearer ${token}`; return api(original); })
          .catch(e => Promise.reject(e));
      }

      original._retry = true;
      isRefreshing = true;

      const refreshToken = tokenStorage.getRefresh();
      if (!refreshToken) {
        tokenStorage.clear();
        window.location.href = '/login';
        return Promise.reject(err);
      }

      try {
        const res = await axios.post(`${BASE}/auth/refresh`, { refresh_token: refreshToken });
        const { access_token, refresh_token } = res.data;
        tokenStorage.setTokens(access_token, refresh_token);
        api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
        processQueue(null, access_token);
        original.headers.Authorization = `Bearer ${access_token}`;
        return api(original);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        tokenStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(err);
  }
);

// ── API surface ───────────────────────────────────────────────────────────────

export const authAPI = {
  login:  (data)          => api.post('/auth/login', data),
  me:     ()              => api.get('/auth/me'),
  logout: (refresh_token) => api.post('/auth/logout', { refresh_token }),
};

export const adminAPI = {
  getDashboard: ()         => api.get('/admin/dashboard'),
  getUsers:     ()         => api.get('/admin/users'),
  createUser:   (data)     => api.post('/admin/users', data),
  updateUser:   (id, data) => api.put(`/admin/users/${id}`, data),
  deleteUser:   (id)       => api.delete(`/admin/users/${id}`),
  getGroups:    ()         => api.get('/admin/groups'),
  createGroup:  (data)     => api.post('/admin/groups', data),
  updateGroup:  (id, data) => api.put(`/admin/groups/${id}`, data),
  deleteGroup:  (id)       => api.delete(`/admin/groups/${id}`),
};

export const agentsAPI = {
  getModels:      ()           => api.get('/agents/models'),
  getMyAgents:    ()           => api.get('/agents'),
  getAllAgents:    ()           => api.get('/agents/all'),
  createAgent:    (data)       => api.post('/agents', data),
  updateAgent:    (id, data)   => api.put(`/agents/${id}`, data),
  deleteAgent:    (id)         => api.delete(`/agents/${id}`),
  uploadDocument: (agentId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/agents/${agentId}/documents`, formData);
  },
};

export const chatAPI = {
  getConversations:   ()   => api.get('/chat/conversations'),
  getConversation:    (id) => api.get(`/chat/conversations/${id}`),
  deleteConversation: (id) => api.delete(`/chat/conversations/${id}`),
  sendMessage:        (agentId, data) => api.post(`/chat/${agentId}`, data),
};

export async function streamMessage(agentId, data, { onChunk, onMeta, onDone, onError }) {
  const token = tokenStorage.getAccess();
  try {
    const response = await fetch(`${BASE}/chat/${agentId}/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (!raw) continue;
        try {
          const event = JSON.parse(raw);
          if (event.type === 'meta')       onMeta?.(event);
          else if (event.type === 'chunk') onChunk?.(event.text);
          else if (event.type === 'done')  onDone?.(event);
        } catch {}
      }
    }
  } catch (err) {
    onError?.(err);
  }
}

export default api;
