import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const isLoginRequest = err.config?.url?.includes('/auth/login');
    if (err.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: () => api.get('/admin/users'),
  createUser: (data) => api.post('/admin/users', data),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getGroups: () => api.get('/admin/groups'),
  createGroup: (data) => api.post('/admin/groups', data),
  updateGroup: (id, data) => api.put(`/admin/groups/${id}`, data),
  deleteGroup: (id) => api.delete(`/admin/groups/${id}`),
};

export const agentsAPI = {
  getModels: () => api.get('/agents/models'),
  getMyAgents: () => api.get('/agents'),
  getAllAgents: () => api.get('/agents/all'),
  createAgent: (data) => api.post('/agents', data),
  updateAgent: (id, data) => api.put(`/agents/${id}`, data),
  deleteAgent: (id) => api.delete(`/agents/${id}`),
  uploadDocument: (agentId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/agents/${agentId}/documents`, formData);
  },
};

export const chatAPI = {
  getConversations: () => api.get('/chat/conversations'),
  getConversation: (id) => api.get(`/chat/conversations/${id}`),
  deleteConversation: (id) => api.delete(`/chat/conversations/${id}`),
  // Non-streaming fallback
  sendMessage: (agentId, data) => api.post(`/chat/${agentId}`, data),
};

/**
 * Stream a chat message using SSE.
 * Returns an EventSource-like async generator via fetch.
 * onChunk(text) called for each token, onMeta(meta) called once with metadata.
 */
export async function streamMessage(agentId, data, { onChunk, onMeta, onDone, onError }) {
  const token = localStorage.getItem('token');
  try {
    const response = await fetch(`/api/chat/${agentId}/stream`, {
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
      buffer = lines.pop(); // keep incomplete line

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (!raw) continue;
        try {
          const event = JSON.parse(raw);
          if (event.type === 'meta') onMeta?.(event);
          else if (event.type === 'chunk') onChunk?.(event.text);
          else if (event.type === 'done') onDone?.(event);
        } catch {}
      }
    }
  } catch (err) {
    onError?.(err);
  }
}

export default api;
