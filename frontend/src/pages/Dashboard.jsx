import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Activity, Sparkles, Shield, Zap, Users, ChevronRight } from 'lucide-react';
import { adminAPI, chatAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import Badge from '../components/ui/Badge';

export default function Dashboard() {
  const [recentConversations, setRecentConversations] = useState([]);
  const { user } = useAuth();

  useEffect(() => {
    Promise.all([chatAPI.getConversations()])
      .then(([c]) => { setRecentConversations(c.data.slice(0, 10)); })
      .catch(console.error);
  }, []);

  const fmt = (d) => {
    const diff = Date.now() - new Date(d);
    const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), g = Math.floor(diff / 86400000);
    if (m < 60) return `${m}m fa`;
    if (h < 24) return `${h}h fa`;
    if (g < 7)  return `${g}g fa`;
    return new Date(d).toLocaleDateString('it-IT');
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
            Benvenuto, {user?.full_name?.split(' ')[0] || user?.username} 👋
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            {new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <Badge variant="success">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Sistema online
        </Badge>
      </div>

      {/* Project Hero */}
      <div className="mb-10 bg-slate-50 dark:bg-[#11131d] border border-slate-200 dark:border-white/10 rounded-3xl p-8">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={20} className="text-violet-600 dark:text-violet-400" />
            <span className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-widest">AION Enterprise</span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-4">
            Hub AI basato su RAG per la conoscenza aziendale
          </h2>
          <p className="max-w-2xl text-slate-700 dark:text-slate-300 leading-relaxed mb-6">
            AION centralizza il patrimonio informativo aziendale in un unico hub intelligente.
            Le risposte alle tue domande sono radicate nei documenti ufficiali, aggiornate all’istante e protette dai controlli di accesso.
          </p>
          <ul className="grid gap-3 sm:grid-cols-2">
            <li className="flex items-start gap-3">
              <span className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-300">
                <Zap size={18} />
              </span>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">Ricerca semantica</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Trova informazioni per significato, non solo per parole chiave.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-300">
                <Shield size={18} />
              </span>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">Controllo accessi</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Ruoli e permessi garantiscono che ogni utente veda solo ciò che può consultare.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-100 dark:bg-cyan-500/15 text-cyan-600 dark:text-cyan-300">
                <Users size={18} />
              </span>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">Knowledge base intelligente</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Organizza la conoscenza aziendale in un unico spazio interrogabile con semplicità.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                <Sparkles size={18} />
              </span>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">Risposte verificate</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">Le risposte sono basate sui documenti aziendali e non su contenuti inventati.</p>
              </div>
            </li>
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/agents" className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-violet-500/30 transition-all hover:scale-[1.02]">
              <span>Esplora Agenti</span>
              <ChevronRight size={16} />
            </Link>
            <Link to="/chat" className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-semibold rounded-xl hover:bg-slate-300 dark:hover:bg-slate-700 transition-all">
              <span>Inizia una Chat</span>
              <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </div>

      {/* Recent conversations */}
      <div className="bg-slate-50 dark:bg-[#11131d] border border-slate-200 dark:border-white/10 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Activity size={18} className="text-violet-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Chat Recenti</h2>
          </div>
          <Link to="/chat" className="text-sm text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 font-semibold flex items-center gap-1">
            Vedi tutte <ChevronRight size={14} />
          </Link>
        </div>

        {recentConversations.length > 0 ? (
          <div className="space-y-2">
            {recentConversations.map((conv) => (
              <Link key={conv.id} to="/chat"
                className="flex items-center gap-3 p-3.5 rounded-xl bg-white/80 dark:bg-[#11131d] border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 transition-all group"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-500/20 dark:to-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <MessageSquare size={16} className="text-violet-600 dark:text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                    {conv.title}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-600 mt-0.5">{fmt(conv.updated_at)}</p>
                </div>
                <ChevronRight size={16} className="text-slate-300 dark:text-slate-700 group-hover:text-slate-500 dark:group-hover:text-slate-400 transition-colors flex-shrink-0" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <MessageSquare size={32} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <p className="text-slate-500 dark:text-slate-600 text-sm">Nessuna conversazione ancora</p>
            <p className="text-slate-400 dark:text-slate-700 text-xs mt-1">
              <Link to="/chat" className="text-violet-600 dark:text-violet-400 hover:underline">Inizia la tua prima chat</Link> con un agente AI
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

