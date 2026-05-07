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
      <div className="mb-7 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-0.5">Gruppi</h1>
          <p className="text-slate-500 dark:text-slate-500 text-sm">{groups.length} gruppi</p>        </div>
        <button onClick={openCreateModal} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 hover:scale-[1.02] transition-all">
          <Plus size={16} /> Nuovo Gruppo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map((group) => {
          const nonAdminUsers = group.users?.filter(u => u.role !== 'admin') || [];
          return (
            <div key={group.id} className="bg-white dark:bg-[#13162a] border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 rounded-2xl p-5 transition-colors">              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg flex-shrink-0" style={{ backgroundColor: group.color }}>
                  {group.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">{group.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-600 truncate">{group.description || 'Nessuna descrizione'}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 mb-4 min-h-[28px]">
                {nonAdminUsers.slice(0, 6).map((u) => (
                  <div key={u.id} className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: u.avatar_color }} title={u.username}>
                    {u.username[0].toUpperCase()}
                  </div>
                ))}
                {nonAdminUsers.length > 6 && (
                  <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                    +{nonAdminUsers.length - 6}
                  </div>
                )}
                {nonAdminUsers.length === 0 && <span className="text-xs text-slate-400 dark:text-slate-600">Nessun membro</span>}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/5">
                <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-600">
                  <Users size={13} /> {nonAdminUsers.length} membri
                </span>
                <div className="flex gap-1">
                  <button onClick={() => openEditModal(group)} className="p-1.5 text-violet-500 hover:bg-violet-50 dark:hover:bg-violet-500/10 rounded-lg transition-colors">
                    <Edit2 size={15} />
                  </button>
                  <button onClick={() => handleDelete(group.id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {groups.length === 0 && (
        <div className="text-center py-20">
          <Users size={40} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
          <p className="text-slate-500 dark:text-slate-600 text-sm">Nessun gruppo.</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#13162a] border border-slate-200 dark:border-white/8 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingGroup ? 'Modifica Gruppo' : 'Nuovo Gruppo'}
              </h2>
              <button onClick={() => { setShowModal(false); setEditingGroup(null); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-400 transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wider mb-1.5">Nome *</label>
                <input
                  type="text" placeholder="Es: Reparto IT"
                  value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/8 focus:border-violet-500/50 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wider mb-1.5">Descrizione</label>
                <textarea
                  placeholder="Descrizione..."
                  value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/8 focus:border-violet-500/50 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none resize-none transition-all"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wider mb-1.5">Colore</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-14 h-10 rounded-xl cursor-pointer border border-slate-200 dark:border-white/10" />
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold" style={{ backgroundColor: form.color }}>
                    {form.name?.[0]?.toUpperCase() || 'G'}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-500 uppercase tracking-wider mb-1.5">Membri ({form.user_ids.length})</label>
                <div className="max-h-36 space-y-1 border border-slate-200 dark:border-white/8 rounded-xl p-2 bg-slate-50 dark:bg-[#11131d]">
                  {users.length > 0 ? users.map((u) => (
                    <label key={u.id} className={`flex items-center gap-3 cursor-pointer p-2 rounded-lg transition-colors ${form.user_ids.includes(u.id) ? 'bg-violet-50 dark:bg-violet-500/15 text-slate-900 dark:text-white' : 'bg-slate-50 dark:bg-[#121628] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}>
                      <input type="checkbox" checked={form.user_ids.includes(u.id)} onChange={() => toggleUser(u.id)} className="rounded w-4 h-4 accent-violet-500" />
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: u.avatar_color }}>
                        {u.username[0].toUpperCase()}
                      </div>
                      <span className="text-sm text-slate-200 dark:text-slate-300">{u.full_name || u.username}</span>
                    </label>
                  )) : <p className="text-xs text-slate-400 dark:text-slate-600 text-center py-3">Nessun utente</p>}
                </div>
              </div>

              <button type="submit" disabled={isSubmitting} className="w-full py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2">
                {isSubmitting ? 'Salvataggio...' : <><Save size={16} /> {editingGroup ? 'Salva' : 'Crea Gruppo'}</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}