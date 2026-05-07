import { Settings as SettingsIcon, Moon, Sun, Shield } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import DashboardLayout from '../components/layout/DashboardLayout';

export default function Settings() {
  const { theme, toggleTheme } = useTheme();

  return (
    <DashboardLayout>
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary-500 to-purple-500">
            <SettingsIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Impostazioni</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Personalizza la tua esperienza</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl space-y-6">
        
        {/* Tema */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            {theme === 'light' ? <Sun size={20} className="text-amber-500" /> : <Moon size={20} className="text-primary-400" />}
            Tema
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => theme === 'dark' && toggleTheme()}
              className={`p-6 rounded-xl border-2 transition-all ${
                theme === 'light' 
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              <Sun size={32} className={`mx-auto mb-2 ${theme === 'light' ? 'text-primary-500' : 'text-slate-400'}`} />
              <p className={`font-semibold ${theme === 'light' ? 'text-primary-600' : 'text-slate-500'}`}>Chiaro</p>
            </button>
            
            <button
              onClick={() => theme === 'light' && toggleTheme()}
              className={`p-6 rounded-xl border-2 transition-all ${
                theme === 'dark' 
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
              }`}
            >
              <Moon size={32} className={`mx-auto mb-2 ${theme === 'dark' ? 'text-primary-400' : 'text-slate-400'}`} />
              <p className={`font-semibold ${theme === 'dark' ? 'text-primary-400' : 'text-slate-500'}`}>Scuro</p>
            </button>
          </div>
        </div>

        {/* Info Sistema */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Shield size={20} className="text-primary-500" />
            Sistema
          </h3>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <span className="text-slate-600 dark:text-slate-400">Versione</span>
              <span className="px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-sm font-medium">v1.0.0</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <span className="text-slate-600 dark:text-slate-400">Stato API</span>
              <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full text-sm font-medium">Online</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <span className="text-slate-600 dark:text-slate-400">LLM Provider</span>
              <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full text-sm font-medium">Groq</span>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}