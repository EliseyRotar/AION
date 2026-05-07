import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Sparkles, AlertCircle, Eye, EyeOff, Sun, Moon } from 'lucide-react';
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
      console.error('Errore login:', err);
      const errorMsg = 'Credenziali non valide. Controlla email e password.';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-slate-100 via-slate-50 to-white dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-primary-500/10 to-purple-500/10 rounded-full blur-3xl"></div>
      </div>
      
      {/* Grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear_gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:14px_24px]"></div>
      
      {/* Theme toggle */}
      <button 
        onClick={toggleTheme}
        className="absolute top-6 right-6 p-3 rounded-xl glass hover:scale-110 transition-all duration-300 z-10"
      >
        {theme === 'light' ? (
          <Moon size={20} className="text-slate-600" />
        ) : (
          <Sun size={20} className="text-yellow-500" />
        )}
      </button>
      
      {/* Login card */}
      <div className="relative z-10 w-full max-w-md animate-scale-in">
        <div className="glass rounded-3xl shadow-2xl p-8 border border-white/20 dark:border-slate-700/50">
          
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-600 via-purple-600 to-pink-600 shadow-2xl shadow-primary-500/30 mb-6 hover:scale-110 transition-transform duration-300">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold gradient-text mb-2">BROWAY-AI</h1>
            <p className="text-slate-500 dark:text-slate-400">Enterprise AI Platform</p>
          </div>

          {/* Error box */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl flex items-start gap-3 animate-shake">
              <div className="p-1 bg-red-100 dark:bg-red-900/50 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-red-700 dark:text-red-400">Accesso negato</p>
                <p className="text-sm text-red-600 dark:text-red-300 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Email field */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Email
              </label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  className={`
                    w-full pl-12 pr-4 py-3.5 rounded-xl 
                    bg-slate-100 dark:bg-slate-800/50 
                    border-2 transition-all duration-200
                    text-slate-900 dark:text-white
                    focus:outline-none focus:ring-4 focus:ring-primary-500/20
                    ${error 
                      ? 'border-red-500 dark:border-red-500 bg-red-50 dark:bg-red-900/10' 
                      : 'border-transparent focus:border-primary-500'
                    }
                  `}
                  placeholder="nome@azienda.com"
                  required
                />
              </div>
            </div>

            {/* Password field */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  className={`
                    w-full pl-12 pr-12 py-3.5 rounded-xl 
                    bg-slate-100 dark:bg-slate-800/50 
                    border-2 transition-all duration-200
                    text-slate-900 dark:text-white
                    focus:outline-none focus:ring-4 focus:ring-primary-500/20
                    ${error 
                      ? 'border-red-500 dark:border-red-500 bg-red-50 dark:bg-red-900/10' 
                      : 'border-transparent focus:border-primary-500'
                    }
                  `}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="
                w-full py-4 rounded-xl font-semibold text-white
                bg-gradient-to-r from-primary-600 via-purple-600 to-primary-600
                bg-[length:200%_100%] bg-left
                hover:bg-right
                shadow-lg shadow-primary-500/30
                hover:shadow-xl hover:shadow-primary-500/40
                transition-all duration-500
                disabled:opacity-50 disabled:cursor-not-allowed
                transform hover:scale-[1.02] active:scale-[0.98]
              "
            >
              {loading ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Accesso in corso...
                </div>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Accedi alla piattaforma
                  <Sparkles size={18} />
                </span>
              )}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-8 p-4 bg-gradient-to-r from-primary-50 to-purple-50 dark:from-primary-900/20 dark:to-purple-900/20 rounded-2xl border border-primary-100 dark:border-primary-800/30">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">🔑</span>
              <p className="font-semibold text-primary-700 dark:text-primary-300">Account Demo</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-slate-500 dark:text-slate-400">Email:</p>
                <p className="font-mono text-primary-600 dark:text-primary-400">admin@aihub.com</p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400">Password:</p>
                <p className="font-mono text-primary-600 dark:text-primary-400">Admin123!</p>
              </div>
            </div>
          </div>
          
          {/* Footer */}
          <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-6">
            © 2026 BROWAY-AI • Tutti i diritti riservati
          </p>
        </div>
      </div>
    </div>
  );
}