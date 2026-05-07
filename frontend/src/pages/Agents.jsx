import { useState, useEffect } from 'react';
import { Plus, Trash2, X, Upload, FileText, Check, Edit2, Shield, Users, User, Bot, Thermometer, Save, Clock } from 'lucide-react';
import { agentsAPI, adminAPI } from '../services/api';
import DashboardLayout from '../components/layout/DashboardLayout';
import toast from 'react-hot-toast';

export default function Agents() {
  const [agents, setAgents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [models, setModels] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showAccessModal, setShowAccessModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState(null);
  const [uploadAgent, setUploadAgent] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processingDocs, setProcessingDocs] = useState(new Set());
  
  const [accessForm, setAccessForm] = useState({ group_ids: [], user_ids: [], admin_only: false });
  
  const defaultForm = {
    name: '',
    description: '',
    system_prompt: '',
    welcome_message: 'Ciao! Come posso aiutarti?',
    base_model: 'llama-3.3-70b-versatile',
    temperature: '0.7',
    avatar_emoji: '🤖',
    primary_color: '#6366f1',
    fallback_to_general: true,
    group_ids: [],
    user_ids: []
  };
  
  const [form, setForm] = useState(defaultForm);

  useEffect(() => { 
    loadData(); 
  }, []);

  useEffect(() => {
    if (processingDocs.size === 0) return;
    
    const interval = setInterval(() => {
      loadData();
    }, 3000);
    
    return () => clearInterval(interval);
  }, [processingDocs]);

  const loadData = async () => {
    try {
      const [a, g, u, m] = await Promise.all([
        agentsAPI.getAllAgents(), 
        adminAPI.getGroups(), 
        adminAPI.getUsers(),
        agentsAPI.getModels()
      ]);
      
      setAgents(a.data || []);
      setGroups(g.data || []);
      setUsers((u.data || []).filter(user => user.role !== 'admin'));
      
      const modelList = m.data?.models || m.data || ['llama3.2', 'mistral'];
      if (Array.isArray(modelList) && modelList.length > 0) {
        setModels(modelList);
      }
      
      const processing = new Set();
      a.data?.forEach(agent => {
        agent.documents?.forEach(doc => {
          if (doc.status === 'processing') {
            processing.add(doc.id);
          }
        });
      });
      setProcessingDocs(processing);
      
    } catch (err) {
      console.error('Errore caricamento:', err);
      toast.error('Errore nel caricamento');
    }
  };

  const openCreateModal = () => {
    setEditingAgent(null);
    setForm({
      ...defaultForm,
      base_model: models[0] || 'llama3.2'
    });
    setShowModal(true);
  };

  const openAccessModal = (agent) => {
    setEditingAgent(agent);
    setAccessForm({
      group_ids: agent.groups?.map(g => g.id) || [],
      user_ids: agent.user_ids || [],
      admin_only: (agent.groups?.length || 0) === 0 && (agent.user_ids?.length || 0) === 0
    });
    setShowAccessModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.name || form.name.trim() === '') {
      toast.error('Inserisci il nome dell\'agente');
      return;
    }
    if (!form.system_prompt || form.system_prompt.trim() === '') {
      toast.error('Inserisci il System Prompt');
      return;
    }
    
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const payload = {
        name: String(form.name || '').trim(),
        description: String(form.description || ''),
        system_prompt: String(form.system_prompt || '').trim(),
        welcome_message: String(form.welcome_message || 'Ciao! Come posso aiutarti?'),
        base_model: String(form.base_model || 'llama-3.3-70b-versatile'),
        temperature: String(form.temperature || '0.7'),
        avatar_emoji: String(form.avatar_emoji || '🤖'),
        primary_color: String(form.primary_color || '#6366f1'),
        fallback_to_general: Boolean(form.fallback_to_general),
        group_ids: Array.isArray(form.group_ids) ? form.group_ids : [],
        user_ids: Array.isArray(form.user_ids) ? form.user_ids : []
      };
      
      await agentsAPI.createAgent(payload);
      toast.success('Agente creato!');
      setShowModal(false);
      setForm(defaultForm);
      loadData();
    } catch (err) {
      console.error('Errore creazione agente:', err);
      const errorDetail = err.response?.data?.detail;
      if (typeof errorDetail === 'string') {
        toast.error(errorDetail);
      } else if (Array.isArray(errorDetail)) {
        const messages = errorDetail.map(e => `${e.loc?.join('.')}: ${e.msg}`).join('\n');
        toast.error(messages || 'Errore nella creazione');
      } else {
        toast.error('Errore nella creazione agente');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAccessSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const payload = {
        name: String(editingAgent.name || ''),
        description: String(editingAgent.description || ''),
        system_prompt: String(editingAgent.system_prompt || ''),
        welcome_message: String(editingAgent.welcome_message || ''),
        base_model: String(editingAgent.base_model || 'llama-3.3-70b-versatile'),
        temperature: String(editingAgent.temperature || '0.7'),
        avatar_emoji: String(editingAgent.avatar_emoji || '🤖'),
        primary_color: String(editingAgent.primary_color || '#6366f1'),
        fallback_to_general: Boolean(editingAgent.fallback_to_general),
        group_ids: accessForm.admin_only ? [] : (accessForm.group_ids || []),
        user_ids: accessForm.admin_only ? [] : (accessForm.user_ids || [])
      };
      
      await agentsAPI.updateAgent(editingAgent.id, payload);
      toast.success('Accessi aggiornati!');
      setShowAccessModal(false);
      setEditingAgent(null);
      loadData();
    } catch (err) {
      console.error('Errore aggiornamento:', err);
      toast.error('Errore aggiornamento');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Eliminare questo agente?')) return;
    try {
      await agentsAPI.deleteAgent(id);
      toast.success('Eliminato');
      loadData();
    } catch (err) {
      toast.error('Errore eliminazione');
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      toast.loading('Caricamento...', { id: 'upload' });
      await agentsAPI.uploadDocument(uploadAgent, file);
      toast.success('Documento caricato! Elaborazione in corso...', { id: 'upload' });
      setUploadAgent(null);
      loadData();
    } catch (err) {
      toast.error('Errore upload', { id: 'upload' });
    }
  };

  const getAccessLabel = (agent) => {
    const g = agent.groups?.length || 0;
    const u = agent.user_ids?.length || 0;
    if (g === 0 && u === 0) return '🔒 Solo Admin';
    let parts = [];
    if (g > 0) parts.push(`${g} gruppi`);
    if (u > 0) parts.push(`${u} utenti`);
    return parts.join(', ');
  };

  const getDocumentStatus = (doc) => {
    if (doc.status === 'ready') return <Check size={14} className="text-green-500" />;
    if (doc.status === 'error') return <X size={14} className="text-red-500" />;
    return <Clock size={14} className="text-amber-500 animate-spin" />;
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Gestione Agenti AI</h1>
            <p className="text-slate-500 text-sm">{agents.length} agenti</p>
          </div>
          <button onClick={openCreateModal} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all">
            <Plus size={20} /> Nuovo Agente
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {agents.map((agent) => (
          <div key={agent.id} className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-lg" style={{ backgroundColor: (agent.primary_color || '#6366f1') + '20', border: `2px solid ${agent.primary_color || '#6366f1'}` }}>
                  {agent.avatar_emoji || '🤖'}
                </div>
                <div>
                  <p className="font-bold text-lg text-slate-800 dark:text-white">{agent.name}</p>
                  <p className="text-sm text-slate-500">{agent.description || 'Nessuna descrizione'}</p>
                </div>
              </div>
              <button onClick={() => handleDelete(agent.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                <Trash2 size={18} />
              </button>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-medium text-slate-600 dark:text-slate-400">
                <Bot size={12} /> {agent.base_model}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-medium text-slate-600 dark:text-slate-400">
                <Thermometer size={12} /> {agent.temperature}
              </span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl mb-4 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield size={16} className="text-primary-500" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Accesso:</span>
                  <span className="text-sm text-slate-500">{getAccessLabel(agent)}</span>
                </div>
                <button onClick={() => openAccessModal(agent)} className="flex items-center gap-1 text-sm text-primary-500 hover:text-primary-600 font-medium">
                  <Edit2 size={14} /> Modifica
                </button>
              </div>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">📄 Documenti ({agent.documents?.length || 0})</span>
                <button onClick={() => setUploadAgent(agent.id)} className="text-sm text-primary-500 font-medium hover:underline">
                  <Upload size={14} className="inline mr-1" /> Carica
                </button>
              </div>
              {agent.documents?.length > 0 ? agent.documents.map((doc) => (
                <div key={doc.id} className="flex items-center gap-2 text-sm py-1.5 px-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg mb-1">
                  <FileText size={14} className="text-slate-400" />
                  <span className="truncate flex-1 text-slate-600 dark:text-slate-400">{doc.original_filename}</span>
                  <span className="text-xs text-slate-400">{doc.chunk_count || 0} chunks</span>
                  {getDocumentStatus(doc)}
                </div>
              )) : <p className="text-sm text-slate-400 italic">Nessun documento</p>}
            </div>
          </div>
        ))}
      </div>

      {agents.length === 0 && (
        <div className="text-center py-16">
          <Bot size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
          <p className="text-slate-500">Nessun agente creato.</p>
        </div>
      )}

      {/* Modal Creazione */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-2xl my-8 max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">🤖 Nuovo Agente</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                <X size={20} className="text-slate-500" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block">Nome *</label>
                  <input 
                    type="text"
                    placeholder="Es: Assistente HR" 
                    value={form.name} 
                    onChange={(e) => setForm({ ...form, name: e.target.value })} 
                    className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-transparent focus:border-primary-500 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none"
                    required 
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block">Icona</label>
                  <input 
                    type="text"
                    placeholder="🤖" 
                    value={form.avatar_emoji} 
                    onChange={(e) => setForm({ ...form, avatar_emoji: e.target.value.slice(0, 2) })} 
                    className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-transparent focus:border-primary-500 text-slate-900 dark:text-white text-center text-2xl outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block">Descrizione</label>
                <textarea 
                  placeholder="Descrizione breve dell'agente..." 
                  value={form.description} 
                  onChange={(e) => setForm({ ...form, description: e.target.value })} 
                  className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-transparent focus:border-primary-500 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none resize-none"
                  rows={2} 
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block">System Prompt *</label>
                <textarea 
                  placeholder="Sei un assistente AI specializzato in..." 
                  value={form.system_prompt} 
                  onChange={(e) => setForm({ ...form, system_prompt: e.target.value })} 
                  className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-transparent focus:border-primary-500 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none resize-none"
                  rows={4} 
                  required 
                />
                <p className="text-xs text-slate-500 mt-1">Istruzioni che definiscono il comportamento dell'AI</p>
              </div>

              <div>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block">Messaggio di benvenuto</label>
                <input 
                  type="text"
                  placeholder="Ciao! Come posso aiutarti?" 
                  value={form.welcome_message} 
                  onChange={(e) => setForm({ ...form, welcome_message: e.target.value })} 
                  className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-transparent focus:border-primary-500 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block">Modello</label>
                  <select 
                    value={form.base_model} 
                    onChange={(e) => setForm({ ...form, base_model: e.target.value })} 
                    className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-transparent focus:border-primary-500 text-slate-900 dark:text-white outline-none"
                  >
                    {models.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block">Temperatura</label>
                  <select 
                    value={form.temperature} 
                    onChange={(e) => setForm({ ...form, temperature: e.target.value })} 
                    className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-transparent focus:border-primary-500 text-slate-900 dark:text-white outline-none"
                  >
                    <option value="0.3">0.3 - Preciso</option>
                    <option value="0.5">0.5 - Bilanciato</option>
                    <option value="0.7">0.7 - Creativo</option>
                    <option value="0.9">0.9 - Molto creativo</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block">Colore</label>
                  <input 
                    type="color" 
                    value={form.primary_color} 
                    onChange={(e) => setForm({ ...form, primary_color: e.target.value })} 
                    className="w-full h-12 rounded-xl cursor-pointer border-2 border-slate-200 dark:border-slate-700" 
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full py-4 bg-gradient-to-r from-primary-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Creazione in corso...' : '✨ Crea Agente'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Accessi */}
      {showAccessModal && editingAgent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">🔐 Modifica Accessi</h2>
                <p className="text-sm text-slate-500">{editingAgent.avatar_emoji} {editingAgent.name}</p>
              </div>
              <button onClick={() => { setShowAccessModal(false); setEditingAgent(null); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleAccessSubmit} className="space-y-4">
              {/* Solo Admin checkbox */}
              <label className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition border-2 ${accessForm.admin_only ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-500' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                <input 
                  type="checkbox" 
                  checked={accessForm.admin_only} 
                  onChange={(e) => setAccessForm({ ...accessForm, admin_only: e.target.checked })} 
                  className="rounded text-primary-500 w-5 h-5" 
                />
                <div>
                  <p className="font-semibold text-slate-700 dark:text-slate-300">
                    <Shield size={16} className="inline mr-1" /> Solo Admin
                  </p>
                  <p className="text-sm text-slate-500">Solo gli admin potranno usare questo agente</p>
                </div>
              </label>

              {/* Gruppi e Utenti (visibili solo se non admin_only) */}
              {!accessForm.admin_only && (
                <>
                  {/* Gruppi */}
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      <Users size={14} /> Gruppi ({accessForm.group_ids.length})
                    </label>
                    <div className="flex flex-wrap gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 min-h-[60px]">
                      {groups.length > 0 ? groups.map((g) => (
                        <label 
                          key={g.id} 
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition text-sm ${
                            accessForm.group_ids.includes(g.id) 
                              ? 'bg-primary-100 dark:bg-primary-900/30 ring-2 ring-primary-500' 
                              : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                        >
                          <input 
                            type="checkbox" 
                            checked={accessForm.group_ids.includes(g.id)} 
                            onChange={() => setAccessForm(prev => ({
                              ...prev,
                              group_ids: prev.group_ids.includes(g.id) 
                                ? prev.group_ids.filter(id => id !== g.id)
                                : [...prev.group_ids, g.id]
                            }))}
                            className="sr-only" 
                          />
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: g.color || '#6366f1' }} />
                          <span className="text-slate-800 dark:text-white">{g.name}</span>
                        </label>
                      )) : <p className="text-sm text-slate-400">Nessun gruppo disponibile</p>}
                    </div>
                  </div>

                  {/* Utenti */}
                  <div>
                    <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                      <User size={14} /> Utenti ({accessForm.user_ids.length})
                    </label>
                    <div className="flex flex-wrap gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 max-h-40 overflow-y-auto min-h-[60px]">
                      {users.length > 0 ? users.map((u) => (
                        <label 
                          key={u.id} 
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition text-sm ${
                            accessForm.user_ids.includes(u.id) 
                              ? 'bg-primary-100 dark:bg-primary-900/30 ring-2 ring-primary-500' 
                              : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                        >
                          <input 
                            type="checkbox" 
                            checked={accessForm.user_ids.includes(u.id)} 
                            onChange={() => setAccessForm(prev => ({
                              ...prev,
                              user_ids: prev.user_ids.includes(u.id) 
                                ? prev.user_ids.filter(id => id !== u.id)
                                : [...prev.user_ids, u.id]
                            }))}
                            className="sr-only" 
                          />
                          <div 
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold" 
                            style={{ backgroundColor: u.avatar_color || '#6366f1' }}
                          >
                            {u.username?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <span className="text-slate-800 dark:text-white">{u.username}</span>
                        </label>
                      )) : <p className="text-sm text-slate-400">Nessun utente disponibile</p>}
                    </div>
                  </div>
                </>
              )}

              {/* Submit button */}
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full py-3 bg-gradient-to-r from-primary-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Salvataggio...
                  </>
                ) : (
                  <>
                    <Save size={18} /> 
                    Salva Modifiche
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Upload */}
      {uploadAgent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800">
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">📄 Carica Documento</h2>
            <input 
              type="file" 
              accept=".pdf,.docx,.doc,.txt" 
              onChange={handleUpload} 
              className="w-full mb-4 p-3 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800" 
            />
            <p className="text-xs text-slate-500 mb-4">Formati supportati: PDF, DOCX, DOC, TXT</p>
            <button 
              onClick={() => setUploadAgent(null)} 
              className="w-full py-2.5 border border-slate-300 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors"
            >
              Annulla
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}