import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Sun, Moon, LogOut, User, Settings, ChevronDown, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/user-dashboard': 'Dashboard',
  '/users': 'Utenti',
  '/groups': 'Gruppi',
  '/agents': 'Agenti AI',
  '/chat': 'Chat',
  '/profile': 'Profilo',
  '/settings': 'Impostazioni',
};

export default function Navbar({ onMenuToggle }) {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const { user, logout, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => { logout(); navigate('/login'); };
  const pageTitle = PAGE_TITLES[location.pathname] || 'AION';

  return (
    <header className="
      sticky top-0 z-50 h-14
      bg-slate-50 dark:bg-[#0d1020]
      border-b border-slate-200 dark:border-white/5
      backdrop-blur-xl shadow-sm dark:shadow-black/20
    ">
      <div className="flex items-center justify-between h-full px-4 lg:px-6">

        {/* Left */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuToggle}
            className="p-2 rounded-xl text-slate-500 dark:text-slate-400
              hover:bg-slate-100 dark:hover:bg-white/5
              hover:text-slate-800 dark:hover:text-white transition-colors"
          >
            <Menu size={20} />
          </button>

          <Link to={isAdmin ? '/dashboard' : '/user-dashboard'} className="flex items-center gap-2">
            <img src="/logo.png" alt="AION" className="w-7 h-7 object-contain" />
            <span className="font-black text-base gradient-text tracking-tight hidden sm:block">AION</span>
          </Link>

          <div className="hidden md:flex items-center gap-1.5 text-slate-400 dark:text-slate-600">
            <span className="text-xs">/</span>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{pageTitle}</span>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-1">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl text-slate-500 dark:text-slate-400
              hover:bg-slate-100 dark:hover:bg-white/5
              hover:text-slate-800 dark:hover:text-white transition-colors"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} className="text-amber-400" />}
          </button>

          {/* Profile */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-xl
                hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: user?.avatar_color || '#7c3aed' }}
              >
                {user?.username?.[0]?.toUpperCase() || 'U'}
              </div>
              <span className="hidden md:block text-sm font-medium text-slate-700 dark:text-slate-300">
                {user?.full_name?.split(' ')[0] || user?.username}
              </span>
              <ChevronDown size={14} className="text-slate-400 hidden md:block" />
            </button>

            {showProfileMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                {/* Dropdown — responsive light/dark */}
                <div className="absolute right-0 mt-2 w-64 z-50 animate-scale-in
                  bg-white dark:bg-[#13162a] border border-slate-200 dark:border-white/8
                  rounded-2xl shadow-2xl shadow-slate-500/10 dark:shadow-black/50 py-2"
                >
                  <div className="px-4 py-3 border-b border-slate-200 dark:border-white/8">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0"
                        style={{ backgroundColor: user?.avatar_color || '#7c3aed' }}
                      >
                        {user?.username?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-white text-sm truncate">{user?.full_name || user?.username}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-600 truncate">{user?.email}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      isAdmin
                        ? 'bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-500/20'
                        : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10'
                    }`}>
                      {isAdmin ? '👑 Admin' : '👤 Utente'}
                    </span>
                  </div>

                  <div className="py-1">
                    {[
                      { to: '/profile', icon: User, label: 'Il mio profilo' },
                      { to: '/settings', icon: Settings, label: 'Impostazioni' },
                    ].map(({ to, icon: Icon, label }) => (
                      <Link key={to} to={to} onClick={() => setShowProfileMenu(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm
                          text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                      >
                        <Icon size={15} /> {label}
                      </Link>
                    ))}
                  </div>

                  <div className="border-t border-slate-200 dark:border-white/8 pt-1">
                    <button onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm
                        text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                    >
                      <LogOut size={15} /> Esci
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
