import { Settings as SettingsIcon, Moon, Sun, Shield } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import DashboardLayout from '../components/layout/DashboardLayout';

export default function Settings() {
  const { theme, toggleTheme } = useTheme();

  return (
    <DashboardLayout>
      <div className="mb-7">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-0.5">Impostazioni</h1>
        <p className="text-slate-500 dark:text-slate-500 text-sm">Personalizza la tua esperienza</p>
      </div>

      <div className="max-w-xl space-y-4">

        {/* Tema */}
        <div className="bg-white dark:bg-[#13162a] border border-slate-200 dark:border-white/5 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            {theme === 'light' ? <Sun size={16} className="text-amber-500" /> : <Moon size={16} className="text-violet-400" />}
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Tema</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Chiaro', value: 'light', icon: Sun, activeColor: 'text-amber-500' },
              { label: 'Scuro', value: 'dark', icon: Moon, activeColor: 'text-violet-400' },
            ].map(({ label, value, icon: Icon, activeColor }) => (
              <button
                key={value}
                onClick={() => theme !== value && toggleTheme()}
                className={`p-5 rounded-xl border-2 transition-all ${
                  theme === value
                    ? 'border-violet-500/50 bg-violet-50 dark:bg-violet-500/10'
                    : 'border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/3 hover:border-slate-300 dark:hover:border-white/10'
                }`}
              >
                <Icon size={28} className={`mx-auto mb-2 ${theme === value ? activeColor : 'text-slate-400 dark:text-slate-600'}`} />
                <p className={`text-sm font-semibold ${theme === value ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-600'}`}>{label}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Sistema */}
        <div className="bg-white dark:bg-[#13162a] border border-slate-200 dark:border-white/5 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={16} className="text-cyan-500 dark:text-cyan-400" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Sistema</h3>
          </div>
          <div className="space-y-2">
            {[
              { label: 'Versione', value: 'v2.0.0', badge: 'primary' },
              { label: 'Stato API', value: 'Online', badge: 'success' },
              { label: 'LLM Provider', value: 'Groq', badge: 'success' },
              { label: 'RAG Engine', value: 'FAISS', badge: 'cyan' },
            ].map(({ label, value, badge }) => (
              <div key={label} className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-[#11131d] rounded-xl border border-slate-200 dark:border-white/5">
                <span className="text-sm text-slate-600 dark:text-slate-400">{label}</span>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                  badge === 'success' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20' :
                  badge === 'primary' ? 'bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-200 dark:border-violet-500/20' :
                  badge === 'cyan' ? 'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-500/20' :
                  'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10'
                }`}>{value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
