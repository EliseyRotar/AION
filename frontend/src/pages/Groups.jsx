import { useState, useEffect } from 'react';
import { Plus, Trash2, X, Users, Edit2, Palette, FileText, Save, UserPlus, AlertCircle } from 'lucide-react';
import { adminAPI } from '../services/api';
import DashboardLayout from '../components/layout/DashboardLayout';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', color: '#6366f1', user_ids: [] });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user: currentUser } = useAuth();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [g, u] = await Promise.all([adminAPI.getGroups(), adminAPI.getUsers()]);
      setGroups(g.data);
      setUsers(u.data.filter(user => user.role !== 'admin'));
    } catch (err) {
      toast.error('Errore nel caricamento');
    }
  };

  const openCreateModal = () => {
    setEditingGroup(null);
    setForm({ name: '', description: '', color: '#6366f1', user_ids: [] });
    setShowModal(true);
  };

  const openEditModal = (group) => {
    setEditingGroup(group);
    setForm({
      name: group.name,
      description: group.description || '',
      color: group.color || '#6366f1',
      user_ids: group.users?.filter(u => u.role !== 'admin').map(u => u.id) || []
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      if (editingGroup) {
        await adminAPI.updateGroup(editingGroup.id, form);
        toast.success('Gruppo aggiornato!');
      } else {
        await adminAPI.createGroup(form);
        toast.success('Gruppo creato!');
      }
      setShowModal(false);
      setEditingGroup(null);
      loadData();
    } catch (err) {
      toast.error('Errore nel salvataggio');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Eliminare questo gruppo?')) return;
    try {
      await adminAPI.deleteGroup(id);
      toast.success('Gruppo eliminato');
      loadData();
    } catch (err) {
      toast.error('Errore eliminazione');
    }
  };

  const toggleUser = (userId) => {
    setForm(prev => ({
      ...prev,
      user_ids: prev.user_ids.includes(userId)
        ? prev.user_ids.filter(id => id !== userId)
        : [...prev.user_ids, userId]
    }));
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Gestione Gruppi</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{groups.length} gruppi</p>
          </div>
          <button onClick={openCreateModal} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all">
            <Plus size={20} /> Nuovo Gruppo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map((group) => {
          const nonAdminUsers = group.users?.filter(u => u.role !== 'admin') || [];
          return (
            <div key={group.id} className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg" style={{ backgroundColor: group.color }}>
                  {group.name[0].toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-800 dark:text-white">{group.name}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{group.description || 'Nessuna descrizione'}</p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-1 mb-4 min-h-[32px]">
                {nonAdminUsers.slice(0, 5).map((u) => (
                  <div key={u.id} className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow" style={{ backgroundColor: u.avatar_color }} title={u.username}>
                    {u.username[0].toUpperCase()}
                  </div>
                ))}
                {nonAdminUsers.length > 5 && (
                  <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold">
                    +{nonAdminUsers.length - 5}
                  </div>
                )}
                {nonAdminUsers.length === 0 && <span className="text-sm text-slate-400">Nessun membro</span>}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                <span className="flex items-center gap-1.5 text-sm text-slate-500">
                  <Users size={16} /> {nonAdminUsers.length} membri
                </span>
                <div className="flex gap-1">
                  <button onClick={() => openEditModal(group)} className="p-2 text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg">
                    <Edit2 size={18} />
                  </button>
                  <button onClick={() => handleDelete(group.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {groups.length === 0 && (
        <div className="text-center py-16">
          <Users size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
          <p className="text-slate-500">Nessun gruppo.</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 my-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                {editingGroup ? '✏️ Modifica Gruppo' : '➕ Nuovo Gruppo'}
              </h2>
              <button onClick={() => { setShowModal(false); setEditingGroup(null); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block">📁 Nome gruppo *</label>
                <input 
                  type="text"
                  placeholder="Es: Reparto IT" 
                  value={form.name} 
                  onChange={(e) => setForm({ ...form, name: e.target.value })} 
                  className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-transparent focus:border-primary-500 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none"
                  required 
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  <FileText size={14} /> Descrizione
                </label>
                <textarea 
                  placeholder="Descrizione..." 
                  value={form.description} 
                  onChange={(e) => setForm({ ...form, description: e.target.value })} 
                  className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-transparent focus:border-primary-500 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none resize-none"
                  rows={2} 
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  <Palette size={14} /> Colore
                </label>
                <div className="flex items-center gap-3">
                  <input 
                    type="color" 
                    value={form.color} 
                    onChange={(e) => setForm({ ...form, color: e.target.value })} 
                    className="w-16 h-12 rounded-xl cursor-pointer border-2 border-slate-200 dark:border-slate-700" 
                  />
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg" style={{ backgroundColor: form.color }}>
                    {form.name?.[0]?.toUpperCase() || 'G'}
                  </div>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  <UserPlus size={14} /> Membri ({form.user_ids.length})
                </label>
                <div className="max-h-40 overflow-y-auto space-y-1 border-2 border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50 dark:bg-slate-800/50">
                  {users.length > 0 ? users.map((u) => (
                    <label 
                      key={u.id} 
                      className={`flex items-center gap-3 cursor-pointer p-2 rounded-lg transition ${
                        form.user_ids.includes(u.id) 
                          ? 'bg-primary-100 dark:bg-primary-900/30 ring-2 ring-primary-500' 
                          : 'hover:bg-white dark:hover:bg-slate-800'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={form.user_ids.includes(u.id)}
                        onChange={() => toggleUser(u.id)}
                        className="rounded text-primary-500 w-4 h-4"
                      />
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: u.avatar_color }}>
                        {u.username[0].toUpperCase()}
                      </div>
                      <span className="text-sm text-slate-800 dark:text-white">{u.full_name || u.username}</span>
                    </label>
                  )) : (
                    <p className="text-sm text-slate-500 text-center py-4">Nessun utente</p>
                  )}
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full py-3 bg-gradient-to-r from-primary-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
              >
                {isSubmitting ? 'Salvataggio...' : <><Save size={18} /> {editingGroup ? 'Salva' : 'Crea Gruppo'}</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}