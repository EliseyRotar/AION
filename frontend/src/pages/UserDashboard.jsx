import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, MessageSquare, ChevronRight, Zap, Sparkles } from 'lucide-react';
import { agentsAPI, chatAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';

export default function UserDashboard() {
  const [agents, setAgents] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [a, c] = await Promise.all([agentsAPI.getMyAgents(), chatAPI.getConversations()]);
      setAgents(a.data);
      setConversations(c.data);
    } catch (err) {
      console.error('Errore:', err);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Buongiorno';
    if (h < 18) return 'Buon pomeriggio';
    return 'Buonasera';
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <DashboardLayout>

      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600/20 via-purple-600/10 to-cyan-600/10 border border-violet-500/20 p-7 mb-7">
        {/* Glow orbs */}
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <p className="text-xs text-slate-500 mb-1 uppercase tracking-widest">
            {new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
            {getGreeting()}, {user?.full_name?.split(' ')[0] || user?.username} ✨
          </h1>
          <p className="text-slate-700 dark:text-slate-200 text-sm">
            Hai accesso a <span className="text-violet-700 dark:text-violet-300 font-semibold">{agents.length} assistenti AI</span> costruiti sulla conoscenza aziendale.
          </p>
          <p className="text-slate-600 dark:text-slate-300 text-sm mt-2 max-w-2xl">
            Trova risposte affidabili dai documenti ufficiali, accelera l’onboarding e lavora con agenti che rispettano ruoli e permessi.
          </p>

          <div className="flex flex-wrap gap-3 mt-5">
            <div className="flex items-center gap-2 bg-slate-100/75 dark:bg-white/5 border border-slate-300/70 dark:border-white/10 rounded-full px-4 py-1.5 text-sm text-slate-900 dark:text-slate-200">
              <Bot size={14} className="text-violet-500" />
              <span>{agents.length} Agenti</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-100/75 dark:bg-white/5 border border-slate-300/70 dark:border-white/10 rounded-full px-4 py-1.5 text-sm text-slate-900 dark:text-slate-200">
              <MessageSquare size={14} className="text-cyan-500" />
              <span>{conversations.length} Chat</span>
            </div>
          </div>
        </div>
      </div>

      {/* Agents */}
      <div className="mb-7">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={16} className="text-violet-400" />
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">I tuoi Assistenti AI</h2>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <div key={i} className="h-44 rounded-2xl skeleton" />)}
          </div>
        ) : agents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((agent) => (
              <div
                key={agent.id}
                onClick={() => navigate(`/chat?agent=${agent.id}`)}
                className="group bg-white dark:bg-[#13162a] border border-slate-200 dark:border-white/5 hover:border-violet-300 dark:hover:border-violet-500/30 rounded-2xl p-5 cursor-pointer hover:-translate-y-0.5 transition-all duration-200"
              >
                {/* Color bar */}
                <div className="h-0.5 -mx-5 -mt-5 mb-4 rounded-t-2xl opacity-60" style={{ backgroundColor: agent.primary_color }} />

                <div className="flex items-start gap-3 mb-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-110 transition-transform"
                    style={{ backgroundColor: (agent.primary_color || '#7c3aed') + '20' }}
                  >
                    {agent.avatar_emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 dark:text-white text-sm mb-0.5 group-hover:text-violet-300 transition-colors truncate">
                      {agent.name}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{agent.description || 'Assistente AI'}</p>
                  </div>
                </div>

                {agent.welcome_message && (
                  <p className="text-xs text-slate-600 italic line-clamp-2 mb-3 px-3 py-2 bg-white/3 rounded-lg border border-white/5">
                    "{agent.welcome_message}"
                  </p>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <span className="text-[10px] text-slate-700 flex items-center gap-1">
                    <Zap size={10} /> {agent.base_model}
                  </span>
                  <span className="text-xs text-violet-400 font-medium flex items-center gap-1 group-hover:gap-1.5 transition-all">
                    Chatta <ChevronRight size={14} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-[#13162a] border border-slate-200 dark:border-white/5 rounded-2xl p-14 text-center">
            <Bot size={48} className="mx-auto text-slate-700 mb-3" />
            <h3 className="font-semibold text-slate-400 mb-1">Nessun assistente disponibile</h3>
            <p className="text-xs text-slate-600">Contatta un amministratore per ottenere l'accesso.</p>
          </div>
        )}
      </div>

      {/* Recent conversations */}
      {conversations.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <MessageSquare size={16} className="text-cyan-400" />
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Conversazioni Recenti</h2>
            </div>
            <button onClick={() => navigate('/chat')} className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
              Vedi tutte
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {conversations.slice(0, 6).map((conv) => (
              <div
                key={conv.id}
                onClick={() => navigate('/chat')}
                className="group flex items-center gap-3 bg-white dark:bg-[#13162a] border border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 rounded-xl p-3.5 cursor-pointer transition-all"
              >
                <div className="w-9 h-9 rounded-lg bg-cyan-500/10 flex items-center justify-center flex-shrink-0">
                  <MessageSquare size={15} className="text-cyan-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">{conv.title}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-600">{formatDate(conv.updated_at)}</p>
                </div>
                <ChevronRight size={14} className="text-slate-700 group-hover:text-slate-400 transition-colors flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}
