import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, FolderKanban, Bot, MessageSquare, FileText, 
  ArrowRight, Clock, Zap, Activity
} from 'lucide-react';
import { adminAPI, chatAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Badge from '../components/ui/Badge';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recentConversations, setRecentConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, convsRes] = await Promise.all([
        adminAPI.getDashboard(),
        chatAPI.getConversations()
      ]);
      setStats(statsRes.data);
      setRecentConversations(convsRes.data.slice(0, 5));
    } catch (err) {
      console.error('Errore:', err);
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    { 
      label: 'Nuovo Utente', 
      desc: 'Aggiungi un membro al team', 
      icon: Users, 
      path: '/users', 
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20'
    },
    { 
      label: 'Nuovo Gruppo', 
      desc: 'Organizza il team', 
      icon: FolderKanban, 
      path: '/groups', 
      color: 'from-emerald-500 to-emerald-600',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20'
    },
    { 
      label: 'Nuovo Agente', 
      desc: 'Crea un assistente AI', 
      icon: Bot, 
      path: '/agents', 
      color: 'from-violet-500 to-violet-600',
      bgColor: 'bg-violet-50 dark:bg-violet-900/20'
    },
    { 
      label: 'Avvia Chat', 
      desc: 'Parla con gli agenti', 
      icon: MessageSquare, 
      path: '/chat', 
      color: 'from-orange-500 to-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20'
    },
  ];

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) return `${diffMins} min fa`;
    if (diffHours < 24) return `${diffHours} ore fa`;
    if (diffDays < 7) return `${diffDays} giorni fa`;
    return date.toLocaleDateString('it-IT');
  };

  return (
    <DashboardLayout>
      {/* Welcome Section */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              Bentornato, {user?.full_name?.split(' ')[0] || user?.username}! 👋
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Ecco cosa sta succedendo nella tua piattaforma AI oggi.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Clock size={16} />
            <span>{new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Quick Actions - 2 cols */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Zap className="text-amber-500" size={20} />
                <CardTitle>Azioni Rapide</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {quickActions.map((action, i) => (
                  <Link 
                    key={i} 
                    to={action.path}
                    className={`${action.bgColor} rounded-2xl p-5 border border-slate-200/50 dark:border-slate-700/50 hover:-translate-y-1 hover:shadow-xl transition-all duration-300 group`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${action.color} shadow-lg group-hover:scale-110 transition-transform`}>
                        <action.icon className="w-6 h-6 text-white" />
                      </div>
                      <ArrowRight size={20} className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 group-hover:translate-x-1 transition-all" />
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">{action.label}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{action.desc}</p>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Conversations - 1 col */}
        <div className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="text-primary-500" size={20} />
                  <CardTitle>Attività Recente</CardTitle>
                </div>
                <Link to="/chat" className="text-sm text-primary-600 dark:text-primary-400 hover:underline font-medium">
                  Vedi tutte
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {recentConversations.length > 0 ? (
                <div className="space-y-3">
                  {recentConversations.map((conv) => (
                    <Link 
                      key={conv.id}
                      to="/chat"
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                        <MessageSquare size={18} className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                          {conv.title}
                        </p>
                        <p className="text-xs text-slate-500">{formatDate(conv.updated_at)}</p>
                      </div>
                      <ArrowRight size={16} className="text-slate-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageSquare size={40} className="mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                  <p className="text-sm text-slate-500">Nessuna conversazione recente</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* System Status */}
      <div className="mt-6">
        <Card>
          <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                Sistema operativo • Tutti i servizi funzionanti
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="success">RAG Online</Badge>
              <Badge variant="success">Groq Online</Badge>
              <Badge variant="primary">v1.0.0</Badge>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}