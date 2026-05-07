import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, AlertCircle, Eye, EyeOff, Sun, Moon, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await login(email, password);
      toast.success(`Benvenuto ${user.username}!`);
      navigate(user.role === 'admin' ? '/dashboard' : '/user-dashboard');
    } catch (err) {
      const msg = 'Credenziali non valide. Controlla email e password.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 relative overflow-hidden ${theme === 'light' ? 'bg-slate-100 text-slate-900' : 'bg-[#0c0e1a] text-white'}`}>

      {/* Background glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-600/8 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/5 rounded-full blur-3xl" />
      </div>

      {/* Dot grid */}
      <div className="absolute inset-0 dot-grid opacity-40 pointer-events-none" />

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-5 right-5 p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all z-10 text-slate-400 hover:text-slate-200"
      >
        {theme === 'light' ? <Moon size={18} /> : <Sun size={18} className="text-amber-400" />}
      </button>

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm animate-scale-in">
        <div className={`backdrop-blur-2xl rounded-3xl border shadow-2xl shadow-black/50 p-8 ${theme === 'light' ? 'bg-white/90 border-slate-200' : 'bg-[#13162a]/80 border-white/8'}`}>

          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 mb-5">
              <img src="/logo.png" alt="AION" className="w-full h-full object-contain drop-shadow-[0_0_20px_rgba(139,92,246,0.5)]" />
            </div>
            <h1 className="text-3xl font-black gradient-text mb-1">AION</h1>
            <p className="text-slate-600 text-xs tracking-widest uppercase">Enterprise AI Platform</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 animate-shake">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  className={`w-full pl-10 pr-4 py-3 rounded-xl bg-white/95 dark:bg-white/5 border ${error ? 'border-red-500/40' : 'border-slate-200 dark:border-white/8 focus:border-violet-500/50'} text-slate-900 dark:text-white text-sm placeholder:text-slate-400 dark:placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all`}
                  placeholder="nome@azienda.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  className={`w-full pl-10 pr-11 py-3 rounded-xl bg-white/95 dark:bg-white/5 border ${error ? 'border-red-500/40' : 'border-slate-200 dark:border-white/8 focus:border-violet-500/50'} text-slate-900 dark:text-white text-sm placeholder:text-slate-400 dark:placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all`}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-semibold text-white text-sm bg-gradient-to-r from-violet-600 to-purple-600 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Accesso in corso...
                </>
              ) : (
                <>
                  Accedi
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 p-3.5 bg-white/3 rounded-xl border border-white/5">
            <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-2 font-semibold">Account Demo</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-[10px] text-slate-700">Email</p>
                <p className="text-xs font-mono text-violet-400">admin@aihub.com</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-700">Password</p>
                <p className="text-xs font-mono text-violet-400">Admin123!</p>
              </div>
            </div>
          </div>

          <p className="text-center text-[10px] text-slate-700 mt-5">© 2026 AION • Tutti i diritti riservati</p>
        </div>
      </div>
    </div>
  );
}
