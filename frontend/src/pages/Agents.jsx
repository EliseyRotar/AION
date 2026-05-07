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
    name: '', description: '', system_prompt: '',
    welcome_message: 'Ciao! Come posso aiutarti?',
    base_model: 'llama-3.3-70b-versatile', temperature: '0.7',
    avatar_emoji: '🤖', primary_color: '#7c3aed',
    fallback_to_general: true, group_ids: [], user_ids: []
  };
  const [form, setForm] = useState(defaultForm);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (processingDocs.size === 0) return;
    const interval = setInterval(() => loadData(), 3000);
    return () => clearInterval(interval);
  }, [processingDocs]);

  const loadData = async () => {
    try {
      const [a, g, u, m] = await Promise.all([
        agentsAPI.getAllAgents(), adminAPI.getGroups(),
        adminAPI.getUsers(), agentsAPI.getModels()
      ]);
      setAgents(a.data || []);
      setGroups(g.data || []);
      setUsers((u.data || []).filter(user => user.role !== 'admin'));
      const modelList = m.data?.models || m.data || ['llama-3.3-70b-versatile'];
      if (Array.isArray(modelList) && modelList.length > 0) setModels(modelList);
      const processing = new Set();
      a.data?.forEach(agent => agent.documents?.forEach(doc => {
        if (doc.status === 'processing') processing.add(doc.id);
      }));
      setProcessingDocs(processing);
    } catch (err) {
      toast.error('Errore nel caricamento');
    }
  };

  const openCreateModal = () => {
    setEditingAgent(null);
    setForm({ ...defaultForm, base_model: models[0] || 'llama-3.3-70b-versatile' });
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
    if (!form.name?.trim()) { toast.error("Inserisci il nome dell'agente"); return; }
    if (!form.system_prompt?.trim()) { toast.error('Inserisci il System Prompt'); return; }
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await agentsAPI.createAgent({
        name: form.name.trim(), description: String(form.description || ''),
        system_prompt: form.system_prompt.trim(),
        welcome_message: String(form.welcome_message || 'Ciao! Come posso aiutarti?'),
        base_model: String(form.base_model), temperature: String(form.temperature),
        avatar_emoji: String(form.avatar_emoji || '🤖'),
        primary_color: String(form.primary_color || '#7c3aed'),
        fallback_to_general: Boolean(form.fallback_to_general),
        group_ids: form.group_ids || [], user_ids: form.user_ids || []
      });
      toast.success('Agente creato!');
      setShowModal(false);
      setForm(defaultForm);
      loadData();
    } catch (err) {
      const d = err.response?.data?.detail;
      toast.error(typeof d === 'string' ? d : 'Errore nella creazione');
    } finally { setIsSubmitting(false); }
  };

  const handleAccessSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await agentsAPI.updateAgent(editingAgent.id, {
        name: String(editingAgent.name), description: String(editingAgent.description || ''),
        system_prompt: String(editingAgent.system_prompt),
        welcome_message: String(editingAgent.welcome_message || ''),
        base_model: String(editingAgent.base_model), temperature: String(editingAgent.temperature),
        avatar_emoji: String(editingAgent.avatar_emoji || '🤖'),
        primary_color: String(editingAgent.primary_color || '#7c3aed'),
        fallback_to_general: Boolean(editingAgent.fallback_to_general),
        group_ids: accessForm.admin_only ? [] : (accessForm.group_ids || []),
        user_ids: accessForm.admin_only ? [] : (accessForm.user_ids || [])
      });
      toast.success('Accessi aggiornati!');
      setShowAccessModal(false);
      setEditingAgent(null);
      loadData();
    } catch { toast.error('Errore aggiornamento'); }
    finally { setIsSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Eliminare questo agente?')) return;
    try { await agentsAPI.deleteAgent(id); toast.success('Eliminato'); loadData(); }
    catch { toast.error('Errore eliminazione'); }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      toast.loading('Caricamento...', { id: 'upload' });
      await agentsAPI.uploadDocument(uploadAgent, file);
      toast.success('Documento caricato!', { id: 'upload' });
      setUploadAgent(null);
      loadData();
    } catch { toast.error('Errore upload', { id: 'upload' }); }
  };

  const getAccessLabel = (agent) => {
    const g = agent.groups?.length || 0;
    const u = agent.user_ids?.length || 0;
    if (g === 0 && u === 0) return '🔒 Solo Admin';
    return [g > 0 && `${g} gruppi`, u > 0 && `${u} utenti`].filter(Boolean).join(', ');
  };

  const getDocumentStatus = (doc) => {
    if (doc.status === 'ready') return <Check size={13} className="text-emerald-500" />;
    if (doc.status === 'error') return <X size={13} className="text-red-500" />;
    return <Clock size={13} className="text-amber-500 animate-spin" />;
  };

  const inputCls = "w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/8 focus:border-violet-500/50 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all";

  return (
    <DashboardLayout>
      <div className="mb-7 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-0.5">Agenti AI</h1>
          <p className="text-slate-500 text-sm">{agents.length} agenti</p>
        </div>
        <button onClick={openCreateModal} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 hover:scale-[1.02] transition-all">
          <Plus size={16} /> Nuovo Agente
        </button>
      </div>

      {/* Agent cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {agents.map((agent) => (
          <div key={agent.id} className="bg-white dark:bg-[#13162a] border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 rounded-2xl p-5 transition-colors">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0" style={{ backgroundColor: (agent.primary_color || '#7c3aed') + '20' }}>
                  {agent.avatar_emoji || '🤖'}
                </div>
                <div>
                  <p className="font-bold text-slate-800 dark:text-slate-200">{agent.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-600">{agent.description || 'Nessuna descrizione'}</p>
                </div>
              </div>
              <button onClick={() => handleDelete(agent.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">
                <Trash2 size={15} />
              </button>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-white/8 rounded-full text-xs text-slate-700 dark:text-slate-300">
                <Bot size={11} /> {agent.base_model}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-white/8 rounded-full text-xs text-slate-700 dark:text-slate-300">
                <Thermometer size={11} /> {agent.temperature}
              </span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-[#11131d] rounded-xl mb-4 border border-slate-200 dark:border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield size={13} className="text-violet-500" />
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Accesso:</span>
                  <span className="text-xs text-slate-600 dark:text-slate-600">{getAccessLabel(agent)}</span>
                </div>
                <button onClick={() => openAccessModal(agent)} className="flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 font-medium transition-colors">
                  <Edit2 size={11} /> Modifica
                </button>
              </div>
            </div>

            <div className="border-t border-slate-200 dark:border-white/5 pt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">📄 Documenti ({agent.documents?.length || 0})</span>
                <button onClick={() => setUploadAgent(agent.id)} className="text-xs text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 font-medium transition-colors">
                  <Upload size={11} className="inline mr-1" />Carica
                </button>
              </div>
              {agent.documents?.length > 0 ? agent.documents.map((doc) => (
                <div key={doc.id} className="flex items-center gap-2 text-xs py-1.5 px-2 bg-slate-50 dark:bg-[#11131d] border border-slate-200 dark:border-white/5 rounded-lg mb-1">
                  <FileText size={11} className="text-slate-500 dark:text-slate-500 flex-shrink-0" />
                  <span className="truncate flex-1 text-slate-600 dark:text-slate-300">{doc.original_filename}</span>
                  <span className="text-slate-600 dark:text-slate-300">{doc.chunk_count || 0} chunks</span>
                  {getDocumentStatus(doc)}
                </div>
              )) : <p className="text-xs text-slate-600 italic">Nessun documento</p>}
            </div>
          </div>
        ))}
      </div>

      {agents.length === 0 && (
        <div className="text-center py-20">
          <Bot size={40} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
          <p className="text-slate-500 dark:text-slate-600 text-sm">Nessun agente creato.</p>
        </div>
      )}

      {/* Modal Creazione */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-[#13162a] border border-slate-200 dark:border-white/8 rounded-2xl p-6 w-full max-w-2xl my-8 shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Nuovo Agente</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-400 transition-colors"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wider mb-1.5">Nome *</label>
                  <input type="text" placeholder="Es: Assistente HR" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wider mb-1.5">Icona</label>
                  <input type="text" placeholder="🤖" value={form.avatar_emoji} onChange={(e) => setForm({ ...form, avatar_emoji: e.target.value.slice(0, 2) })} className={inputCls + " text-center text-2xl"} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wider mb-1.5">Descrizione</label>
                <textarea placeholder="Descrizione breve..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className={inputCls + " resize-none"} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wider mb-1.5">System Prompt *</label>
                <textarea placeholder="Sei un assistente AI specializzato in..." value={form.system_prompt} onChange={(e) => setForm({ ...form, system_prompt: e.target.value })} rows={4} required className={inputCls + " resize-none"} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wider mb-1.5">Messaggio di benvenuto</label>
                <input type="text" placeholder="Ciao! Come posso aiutarti?" value={form.welcome_message} onChange={(e) => setForm({ ...form, welcome_message: e.target.value })} className={inputCls} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wider mb-1.5">Modello</label>
                  <select value={form.base_model} onChange={(e) => setForm({ ...form, base_model: e.target.value })} className={inputCls}>
                    {models.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wider mb-1.5">Temperatura</label>
                  <select value={form.temperature} onChange={(e) => setForm({ ...form, temperature: e.target.value })} className={inputCls}>
                    <option value="0.3">0.3 - Preciso</option>
                    <option value="0.5">0.5 - Bilanciato</option>
                    <option value="0.7">0.7 - Creativo</option>
                    <option value="0.9">0.9 - Molto creativo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wider mb-1.5">Colore</label>
                  <input type="color" value={form.primary_color} onChange={(e) => setForm({ ...form, primary_color: e.target.value })} className="w-full h-10 rounded-xl cursor-pointer border border-slate-200 dark:border-white/10" />
                </div>
              </div>
              <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 transition-all disabled:opacity-50 mt-2">
                {isSubmitting ? 'Creazione...' : '✨ Crea Agente'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Accessi */}
      {showAccessModal && editingAgent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-[#13162a] border border-slate-200 dark:border-white/8 rounded-2xl p-6 w-full max-w-lg shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Modifica Accessi</h2>
                <p className="text-xs text-slate-500">{editingAgent.avatar_emoji} {editingAgent.name}</p>
              </div>
              <button onClick={() => { setShowAccessModal(false); setEditingAgent(null); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-400 transition-colors"><X size={18} /></button>
            </div>
            <form onSubmit={handleAccessSubmit} className="space-y-4">
              <label className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition border ${accessForm.admin_only ? 'bg-violet-50 dark:bg-violet-500/10 border-violet-300 dark:border-violet-500/30' : 'bg-slate-50 dark:bg-[#11131d] border border-slate-200 dark:border-white/8'}`}>
                <input type="checkbox" checked={accessForm.admin_only} onChange={(e) => setAccessForm({ ...accessForm, admin_only: e.target.checked })} className="w-4 h-4 accent-violet-500" />
                <div>
                  <p className="font-semibold text-slate-700 dark:text-slate-300 text-sm flex items-center gap-1.5"><Shield size={13} /> Solo Admin</p>
                  <p className="text-xs text-slate-500 dark:text-slate-600">Solo gli admin potranno usare questo agente</p>
                </div>
              </label>
              {!accessForm.admin_only && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wider mb-1.5">Gruppi ({accessForm.group_ids.length})</label>
                    <div className="flex flex-wrap gap-2 p-3 bg-slate-50 dark:bg-[#11131d] rounded-xl border border-slate-200 dark:border-white/8 min-h-[52px]">
                      {groups.map((g) => (
                        <label key={g.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition text-xs ${accessForm.group_ids.includes(g.id) ? 'bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300' : 'bg-slate-50 dark:bg-[#121628] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                          <input type="checkbox" checked={accessForm.group_ids.includes(g.id)} onChange={() => setAccessForm(prev => ({ ...prev, group_ids: prev.group_ids.includes(g.id) ? prev.group_ids.filter(id => id !== g.id) : [...prev.group_ids, g.id] }))} className="sr-only" />
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: g.color || '#7c3aed' }} />{g.name}
                        </label>
                      ))}
                      {groups.length === 0 && <p className="text-xs text-slate-400 dark:text-slate-600">Nessun gruppo</p>}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wider mb-1.5">Utenti ({accessForm.user_ids.length})</label>
                    <div className="flex flex-wrap gap-2 p-3 bg-slate-50 dark:bg-[#11131d] rounded-xl border border-slate-200 dark:border-white/8 max-h-36 min-h-[52px]">
                      {users.map((u) => (
                        <label key={u.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition text-xs ${accessForm.user_ids.includes(u.id) ? 'bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300' : 'bg-slate-50 dark:bg-[#121628] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                          <input type="checkbox" checked={accessForm.user_ids.includes(u.id)} onChange={() => setAccessForm(prev => ({ ...prev, user_ids: prev.user_ids.includes(u.id) ? prev.user_ids.filter(id => id !== u.id) : [...prev.user_ids, u.id] }))} className="sr-only" />
                          <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0" style={{ backgroundColor: u.avatar_color || '#7c3aed' }}>{u.username?.[0]?.toUpperCase()}</div>
                          {u.username}
                        </label>
                      ))}
                      {users.length === 0 && <p className="text-xs text-slate-400 dark:text-slate-600">Nessun utente</p>}
                    </div>
                  </div>
                </>
              )}
              <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg shadow-violet-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2">
                {isSubmitting ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Salvataggio...</> : <><Save size={15} />Salva Modifiche</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Upload */}
      {uploadAgent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#13162a] border border-slate-200 dark:border-white/8 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-scale-in">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Carica Documento</h2>
            <input type="file" accept=".pdf,.docx,.doc,.txt" onChange={handleUpload} className="w-full mb-3 p-3 border-2 border-dashed border-slate-300 dark:border-white/10 rounded-xl text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-[#11131d] text-sm" />
            <p className="text-xs text-slate-400 dark:text-slate-600 mb-4">Formati: PDF, DOCX, DOC, TXT</p>
            <button onClick={() => setUploadAgent(null)} className="w-full py-2.5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm">
              Annulla
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
