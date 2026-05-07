import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, MessageSquare, Clock, ChevronRight, Sparkles, Zap } from 'lucide-react';
import { agentsAPI, chatAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card from '../components/ui/Card';

export default function UserDashboard() {
  const [agents, setAgents] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [a, c] = await Promise.all([
        agentsAPI.getMyAgents(),
        chatAPI.getConversations()
      ]);
      setAgents(a.data);
      setConversations(c.data);
    } catch (err) {
      console.error('Errore:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAgentClick = (agentId) => {
    navigate(`/chat?agent=${agentId}`);
  };

  const handleChatClick = () => {
    navigate('/chat');
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buongiorno';
    if (hour < 18) return 'Buon pomeriggio';
    return 'Buonasera';
  };

  return (
    <DashboardLayout>
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-purple-600 to-pink-600 p-8 mb-8 shadow-2xl">
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-white/80 text-sm mb-2">
            <Clock size={14} />
            <span>{new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            {getGreeting()}, {user?.full_name?.split(' ')[0] || user?.username}! ✨
          </h1>
          <p className="text-white/80 text-lg max-w-2xl">
            Hai accesso a <span className="font-bold text-white">{agents.length} assistenti AI</span> pronti ad aiutarti.
          </p>
          
          <div className="flex flex-wrap gap-4 mt-6">
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 text-white">
              <Bot size={18} />
              <span className="font-semibold">{agents.length} Agenti</span>
            </div>
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 text-white">
              <MessageSquare size={18} />
              <span className="font-semibold">{conversations.length} Chat</span>
            </div>
          </div>
        </div>
      </div>

      {/* Agents */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary-500 to-purple-500">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">I tuoi Assistenti AI</h2>
            <p className="text-sm text-slate-500">Clicca per iniziare una conversazione</p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-48 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse"></div>)}
          </div>
        ) : agents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.map((agent) => (
              <div 
                key={agent.id} 
                onClick={() => handleAgentClick(agent.id)}
                className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
              >
                <div className="h-2 -mx-6 -mt-6 mb-4 rounded-t-2xl" style={{ backgroundColor: agent.primary_color }} />
                
                <div className="flex items-start gap-4">
                  <div 
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-lg flex-shrink-0 group-hover:scale-110 transition-transform"
                    style={{ backgroundColor: agent.primary_color + '20', border: `2px solid ${agent.primary_color}` }}
                  >
                    {agent.avatar_emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 dark:text-white text-lg mb-1 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                      {agent.name}
                    </h3>
                    <p className="text-sm text-slate-500 line-clamp-2">{agent.description || 'Assistente AI'}</p>
                  </div>
                </div>
                
                {agent.welcome_message && (
                  <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                    <p className="text-xs text-slate-500 italic line-clamp-2">"{agent.welcome_message}"</p>
                  </div>
                )}
                
                <div className="mt-4 flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Zap size={12} /> {agent.base_model}
                  </span>
                  <span className="text-sm text-primary-600 dark:text-primary-400 font-semibold flex items-center gap-1 group-hover:gap-2 transition-all">
                    Chatta <ChevronRight size={16} />
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-16 border border-slate-200 dark:border-slate-800 text-center">
            <Bot size={64} className="mx-auto text-slate-300 dark:text-slate-700 mb-4" />
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Nessun assistente disponibile</h3>
            <p className="text-slate-500">Contatta un amministratore per ottenere l'accesso.</p>
          </div>
        )}
      </div>

      {/* Conversations */}
      {conversations.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">💬 Conversazioni Recenti</h2>
            <button onClick={handleChatClick} className="text-sm text-primary-600 dark:text-primary-400 hover:underline font-medium">
              Vedi tutte
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {conversations.slice(0, 6).map((conv) => (
              <div 
                key={conv.id}
                onClick={handleChatClick}
                className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500/20 to-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <MessageSquare size={20} className="text-primary-600 dark:text-primary-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 dark:text-white truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                      {conv.title}
                    </p>
                    <p className="text-xs text-slate-500">{formatDate(conv.updated_at)}</p>
                  </div>
                  <ChevronRight size={18} className="text-slate-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}