import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Sun, Moon, LogOut, User, Settings, ChevronDown, 
  Sparkles, Menu, X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export default function Navbar({ onMenuToggle, isSidebarOpen }) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const { user, logout, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Titolo pagina dinamico
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/dashboard' || path === '/user-dashboard') return 'Dashboard';
    if (path === '/users') return 'Gestione Utenti';
    if (path === '/groups') return 'Gestione Gruppi';
    if (path === '/agents') return 'Agenti AI';
    if (path === '/chat') return 'Chat AI';
    if (path === '/profile') return 'Profilo';
    if (path === '/settings') return 'Impostazioni';
    return 'BROWAY-AI';
  };

  return (
    <header className="sticky top-0 z-50 glass border-b border-slate-200/50 dark:border-slate-700/50">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        
        {/* Left side - Logo & Menu */}
        <div className="flex items-center gap-4">
          {/* Mobile menu button */}
          <button 
            onClick={onMenuToggle}
            className="lg:hidden p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {isSidebarOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          
          {/* Logo */}
          <Link to={isAdmin ? "/dashboard" : "/user-dashboard"} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 via-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 transition-shadow">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold gradient-text tracking-tight">BROWAY-AI</h1>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 -mt-0.5">Enterprise Platform</p>
            </div>
          </Link>
          
          {/* Page title - Desktop */}
          <div className="hidden md:flex items-center gap-2 ml-6 pl-6 border-l border-slate-200 dark:border-slate-700">
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {getPageTitle()}
            </span>
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-2">
          
          {/* Theme toggle */}
          <button 
            onClick={toggleTheme} 
            className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
            title={theme === 'light' ? 'Modalità scura' : 'Modalità chiara'}
          >
            {theme === 'light' ? (
              <Moon size={20} className="text-slate-600" />
            ) : (
              <Sun size={20} className="text-yellow-500" />
            )}
          </button>
          
          {/* Profile dropdown */}
          <div className="relative">
            <button 
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 p-1.5 pr-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
            >
              <div 
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-md"
                style={{ backgroundColor: user?.avatar_color || '#6366f1' }}
              >
                {user?.username?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-tight">
                  {user?.full_name?.split(' ')[0] || user?.username}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  {isAdmin ? 'Amministratore' : 'Utente'}
                </p>
              </div>
              <ChevronDown size={16} className="text-slate-400 hidden md:block" />
            </button>

            {showProfileMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                <div className="absolute right-0 mt-2 w-72 glass rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 py-2 z-50 animate-scale-in">
                  
                  {/* User info */}
                  <div className="px-4 py-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-lg"
                        style={{ backgroundColor: user?.avatar_color || '#6366f1' }}
                      >
                        {user?.username?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 dark:text-white truncate">
                          {user?.full_name || user?.username}
                        </p>
                        <p className="text-sm text-slate-500 truncate">{user?.email}</p>
                        <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          isAdmin 
                            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}>
                          {isAdmin ? '👑 Admin' : '👤 Utente'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Menu items */}
                  <div className="py-2">
                    <Link 
                      to="/profile" 
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <User size={18} />
                      <span className="text-sm font-medium">Il mio profilo</span>
                    </Link>
                    <Link 
                      to="/settings" 
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Settings size={18} />
                      <span className="text-sm font-medium">Impostazioni</span>
                    </Link>
                  </div>
                  
                  {/* Logout */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <LogOut size={18} />
                      <span className="text-sm font-medium">Esci</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}