import { useState, useEffect } from 'react';
import { Plus, Trash2, X, Mail, User, Lock, Shield, AlertCircle } from 'lucide-react';
import { adminAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import toast from 'react-hot-toast';

export default function Users() {
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [form, setForm] = useState({ 
    email: '', 
    username: '', 
    full_name: '', 
    password: '', 
    role: 'user' 
  });
  const { user: currentUser } = useAuth();

  useEffect(() => { 
    loadData(); 
  }, []);

  const loadData = async () => {
    try {
      const res = await adminAPI.getUsers();
      setUsers(res.data || []);
    } catch (err) {
      console.error('Errore caricamento utenti:', err);
      toast.error('Errore nel caricamento utenti');
    }
  };

  const validateEmail = (email) => {
    // Richiede formato: qualcosa@qualcosa.qualcosa
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    
    // Validazioni
    if (!form.email || !form.username || !form.password) {
      setFormError('Compila tutti i campi obbligatori');
      return;
    }

    if (!validateEmail(form.email)) {
      setFormError('Email non valida. Formato richiesto: nome@dominio.com');
      return;
    }

    if (form.password.length < 6) {
      setFormError('La password deve avere almeno 6 caratteri');
      return;
    }

    setIsSubmitting(true);

    try {
      await adminAPI.createUser(form);
      toast.success('Utente creato!');
      setShowModal(false);
      setForm({ email: '', username: '', full_name: '', password: '', role: 'user' });
      setFormError('');
      loadData();
    } catch (err) {
      console.error('Errore creazione:', err);
      const errorMsg = err.response?.data?.detail;
      if (typeof errorMsg === 'string') {
        setFormError(errorMsg);
      } else if (Array.isArray(errorMsg)) {
        setFormError(errorMsg.map(e => e.msg).join(', '));
      } else {
        setFormError('Errore nella creazione utente');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (id === currentUser?.id) {
      toast.error('Non puoi eliminare il tuo account!');
      return;
    }
    if (!confirm('Eliminare questo utente?')) return;
    
    try {
      await adminAPI.deleteUser(id);
      toast.success('Utente eliminato');
      loadData();
    } catch (err) {
      toast.error('Errore eliminazione');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setForm({ email: '', username: '', full_name: '', password: '', role: 'user' });
    setFormError('');
  };

  return (
    <DashboardLayout>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Gestione Utenti</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">{users.length} utenti registrati</p>
          </div>
          <button 
            onClick={() => setShowModal(true)} 
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
          >
            <Plus size={20} /> Nuovo Utente
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((user) => {
          const isCurrentUser = user.id === currentUser?.id;
          return (
            <div key={user.id} className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-4 mb-4">
                <div 
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg" 
                  style={{ backgroundColor: user.avatar_color || '#6366f1' }}
                >
                  {user.username?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 dark:text-white truncate">
                    {user.full_name || user.username}
                    {isCurrentUser && <span className="ml-2 text-xs text-primary-500">(Tu)</span>}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                  user.role === 'admin' 
                    ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}>
                  <Shield size={12} /> {user.role === 'admin' ? 'Admin' : 'Utente'}
                </span>
                
                <button 
                  onClick={() => handleDelete(user.id)} 
                  disabled={isCurrentUser}
                  className={`p-2 rounded-lg transition-colors ${
                    isCurrentUser 
                      ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed' 
                      : 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                  }`}
                >
                  <Trash2 size={18} />
                </button>
              </div>

              {isCurrentUser && (
                <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center gap-2 text-xs text-blue-700 dark:text-blue-400">
                  <AlertCircle size={14} />
                  <span>Questo è il tuo account</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {users.length === 0 && (
        <div className="text-center py-16">
          <User size={48} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
          <p className="text-slate-500">Nessun utente.</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">Nuovo Utente</h2>
              <button 
                onClick={closeModal} 
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            {/* Errore form */}
            {formError && (
              <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-300">{formError}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  <Mail size={14} /> Email *
                </label>
                <input 
                  type="text"
                  placeholder="nome@dominio.com" 
                  value={form.email} 
                  onChange={(e) => { setForm({ ...form, email: e.target.value }); setFormError(''); }}
                  className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-transparent focus:border-primary-500 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none"
                  required 
                />
                <p className="text-xs text-slate-500 mt-1">Formato: nome@dominio.com</p>
              </div>
              
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  <User size={14} /> Username *
                </label>
                <input 
                  type="text"
                  placeholder="mario.rossi" 
                  value={form.username} 
                  onChange={(e) => { setForm({ ...form, username: e.target.value }); setFormError(''); }}
                  className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-transparent focus:border-primary-500 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none"
                  required 
                />
              </div>
              
              <div>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 block">
                  Nome Completo
                </label>
                <input 
                  type="text"
                  placeholder="Mario Rossi" 
                  value={form.full_name} 
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-transparent focus:border-primary-500 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none"
                />
              </div>
              
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  <Lock size={14} /> Password *
                </label>
                <input 
                  type="password" 
                  placeholder="Minimo 6 caratteri" 
                  value={form.password} 
                  onChange={(e) => { setForm({ ...form, password: e.target.value }); setFormError(''); }}
                  className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-transparent focus:border-primary-500 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none"
                  required 
                />
              </div>
              
              <div>
                <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  <Shield size={14} /> Ruolo *
                </label>
                <select 
                  value={form.role} 
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-transparent focus:border-primary-500 text-slate-900 dark:text-white outline-none"
                >
                  <option value="user">👤 Utente normale</option>
                  <option value="admin">👑 Amministratore</option>
                </select>
              </div>
              
              <button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full py-3 bg-gradient-to-r from-primary-600 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 mt-4"
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