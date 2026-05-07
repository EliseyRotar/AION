import { useState, useEffect } from 'react';
import { Plus, Trash2, X, Mail, User, Lock, Shield, AlertCircle, Crown } from 'lucide-react';
import { adminAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import toast from 'react-hot-toast';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({ email: '', username: '', full_name: '', password: '', role: 'user' });
  const { user: currentUser } = useAuth();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const res = await adminAPI.getUsers();
      setUsers(res.data || []);
    } catch { toast.error('Errore caricamento'); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.email || !form.username || !form.password) { setFormError('Compila tutti i campi obbligatori'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setFormError('Email non valida'); return; }
    if (form.password.length < 6) { setFormError('Password minimo 6 caratteri'); return; }
    setIsSubmitting(true);
    try {
      await adminAPI.createUser(form);
      toast.success('Utente creato!');
      setShowModal(false);
      setForm({ email: '', username: '', full_name: '', password: '', role: 'user' });
      loadData();
    } catch (err) {
      const msg = err.response?.data?.detail;
      setFormError(typeof msg === 'string' ? msg : 'Errore creazione');
    } finally { setIsSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (id === currentUser?.id) { toast.error('Non puoi eliminare il tuo account!'); return; }
    if (!confirm('Eliminare questo utente?')) return;
    try { await adminAPI.deleteUser(id); toast.success('Eliminato'); loadData(); }
    catch { toast.error('Errore eliminazione'); }
  };

  return (
    <DashboardLayout>
      <div className="mb-7 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-0.5">Utenti</h1>
          <p className="text-slate-500 dark:text-slate-600 text-sm">{users.length} registrati</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-semibold rounded-xl shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 hover:scale-[1.02] transition-all"
        >
          <Plus size={16} /> Nuovo Utente
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((user) => {
          const isMe = user.id === currentUser?.id;
          return (
            <div key={user.id} className="bg-white dark:bg-[#13162a] border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 rounded-2xl p-5 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                  style={{ backgroundColor: user.avatar_color || '#7c3aed' }}
                >
                  {user.username?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 dark:text-slate-200 truncate text-sm">
                    {user.full_name || user.username}
                    {isMe && <span className="ml-1.5 text-[10px] text-violet-400">(Tu)</span>}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-600 truncate">{user.email}</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                  user.role === 'admin'
                    ? 'bg-violet-500/10 text-violet-400 border-violet-500/20'
                    : 'bg-white/5 text-slate-500 border-white/10'
                }`}>
                  {user.role === 'admin' ? <Crown size={11} /> : <User size={11} />}
                  {user.role === 'admin' ? 'Admin' : 'Utente'}
                </span>

                <button
                  onClick={() => handleDelete(user.id)}
                  disabled={isMe}
                  className={`p-2 rounded-lg transition-colors ${isMe ? 'text-slate-700 cursor-not-allowed' : 'text-slate-600 hover:text-red-400 hover:bg-red-500/10'}`}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {users.length === 0 && (
        <div className="text-center py-20">
          <User size={40} className="mx-auto text-slate-700 mb-3" />
          <p className="text-slate-600 text-sm">Nessun utente</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#13162a] border border-slate-200 dark:border-white/8 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-scale-in">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Nuovo Utente</h2>
              <button onClick={() => { setShowModal(false); setFormError(''); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-500 dark:text-slate-400">
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2">
                <AlertCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-400">{formError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {[
                { label: 'Email *', key: 'email', type: 'text', placeholder: 'nome@dominio.com', icon: Mail },
                { label: 'Username *', key: 'username', type: 'text', placeholder: 'mario.rossi', icon: User },
                { label: 'Nome Completo', key: 'full_name', type: 'text', placeholder: 'Mario Rossi', icon: User },
                { label: 'Password *', key: 'password', type: 'password', placeholder: 'Min. 6 caratteri', icon: Lock },
              ].map(({ label, key, type, placeholder, icon: Icon }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{label}</label>
                  <div className="relative">
                    <Icon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600" />
                    <input
                      type={type}
                      placeholder={placeholder}
                      value={form[key]}
                      onChange={(e) => { setForm({ ...form, [key]: e.target.value }); setFormError(''); }}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/8 focus:border-violet-500/50 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all"
                    />
                  </div>
                </div>
              ))}

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Ruolo *</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-[#11131d] border border-slate-200 dark:border-white/8 focus:border-violet-500/50 text-slate-900 dark:text-white text-sm focus:outline-none transition-all"
                >
                  <option value="user">👤 Utente</option>
                  <option value="admin">👑 Amministratore</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 transition-all disabled:opacity-50 mt-2"
              >
                {isSubmitting ? 'Creazione...' : 'Crea Utente'}
              </button>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
