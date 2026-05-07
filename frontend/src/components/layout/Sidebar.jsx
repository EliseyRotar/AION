import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Users, FolderKanban, Bot, 
  MessageSquare, Settings, ChevronRight,
  Sparkles, X, User
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar({ isOpen, onClose }) {
  const location = useLocation();
  const { isAdmin } = useAuth();
  
  const adminMenuItems = [
    { 
      label: 'Dashboard', 
      icon: LayoutDashboard, 
      path: '/dashboard',
      description: 'Panoramica generale'
    },
    { 
      label: 'Utenti', 
      icon: Users, 
      path: '/users',
      description: 'Gestisci utenti'
    },
    { 
      label: 'Gruppi', 
      icon: FolderKanban, 
      path: '/groups',
      description: 'Organizza team'
    },
    { 
      label: 'Agenti AI', 
      icon: Bot, 
      path: '/agents',
      description: 'Configura assistenti'
    },
    { 
      label: 'Chat', 
      icon: MessageSquare, 
      path: '/chat',
      description: 'Conversazioni'
    },
  ];
  
  const userMenuItems = [
    { 
      label: 'Dashboard', 
      icon: LayoutDashboard, 
      path: '/user-dashboard',
      description: 'Home'
    },
    { 
      label: 'Chat AI', 
      icon: MessageSquare, 
      path: '/chat',
      description: 'Parla con gli agenti'
    },
  ];
  
  const menuItems = isAdmin ? adminMenuItems : userMenuItems;
  
  const bottomMenuItems = [
    { 
      label: 'Il mio profilo', 
      icon: User, 
      path: '/profile',
      description: 'Gestisci account'
    },
    { 
      label: 'Impostazioni', 
      icon: Settings, 
      path: '/settings',
      description: 'Preferenze'
    },
  ];
  
  const isActive = (path) => location.pathname === path;

  const handleLinkClick = () => {
    if (onClose) onClose();
  };
  
  return (
    <>
      {/* Overlay mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-72 lg:w-64
        bg-white dark:bg-slate-900 
        border-r border-slate-200 dark:border-slate-800
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col
      `}>
        
        {/* Header mobile */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold gradient-text">BROWAY-AI</span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
            <X size={20} />
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4">
          <div className="mb-6">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 px-3">
              Menu Principale
            </p>
            <div className="space-y-1">
              {menuItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={handleLinkClick}
                  className={`
                    group flex items-center gap-3 px-3 py-3 rounded-xl
                    transition-all duration-200 cursor-pointer
                    ${isActive(item.path) 
                      ? 'bg-gradient-to-r from-primary-500/10 to-purple-500/10 text-primary-600 dark:text-primary-400 shadow-sm' 
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                    }
                  `}
                >
                  <div className={`
                    p-2 rounded-lg transition-all duration-200
                    ${isActive(item.path) 
                      ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30' 
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:bg-primary-500 group-hover:text-white group-hover:shadow-lg group-hover:shadow-primary-500/30'
                    }
                  `}>
                    <item.icon size={18} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">{item.description}</p>
                  </div>
                  <ChevronRight size={16} className={`
                    transition-all duration-200
                    ${isActive(item.path) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                  `} />
                </Link>
              ))}
            </div>
          </div>
          
          {/* Sezione account */}
          <div className="mt-auto">
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 px-3">
              Account
            </p>
            <div className="space-y-1">
              {bottomMenuItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={handleLinkClick}
                  className={`
                    group flex items-center gap-3 px-3 py-3 rounded-xl
                    transition-all duration-200 cursor-pointer
                    ${isActive(item.path) 
                      ? 'bg-gradient-to-r from-primary-500/10 to-purple-500/10 text-primary-600 dark:text-primary-400 shadow-sm' 
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                    }
                  `}
                >
                  <div className={`
                    p-2 rounded-lg transition-all duration-200
                    ${isActive(item.path) 
                      ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30' 
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:bg-primary-500 group-hover:text-white group-hover:shadow-lg group-hover:shadow-primary-500/30'
                    }
                  `}>
                    <item.icon size={18} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">{item.description}</p>
                  </div>
                  <ChevronRight size={16} className={`
                    transition-all duration-200
                    ${isActive(item.path) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                  `} />
                </Link>
              ))}
            </div>
          </div>
        </nav>
        
        {/* Version badge */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
            <span>BROWAY-AI</span>
            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full">v1.0.0</span>
          </div>
        </div>
      </aside>
    </>
  );
}