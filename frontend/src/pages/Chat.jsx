import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, ArrowLeft, MessageSquare, Loader2, Trash2, FileText, ChevronDown } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { agentsAPI, chatAPI, streamMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import ReactMarkdown from 'react-markdown';
import toast from 'react-hot-toast';

// ── Sub-components ─────────────────────────────────────────────────────────────

const SourceBadge = ({ source }) => {
  const colors = {
    very_high: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800',
    high:      'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',
    medium:    'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800',
  };
  const labels = { very_high: '🟢', high: '🔵', medium: '🟡' };
  return (
    <div className={`flex items-center gap-2 px-2 py-1 rounded-lg border text-xs ${colors[source.relevance] || colors.medium}`}>
      <FileText size={11} />
      <span className="truncate max-w-[140px] font-medium">{source.source}</span>
      <span>{labels[source.relevance] || '⚪'} {source.confidence?.toFixed(0)}%</span>
    </div>
  );
};

const TypingDots = () => (
  <div className="flex items-center gap-1 px-1 py-0.5">
    {[0, 1, 2].map(i => (
      <span
        key={i}
        className="w-2 h-2 rounded-full bg-primary-400 animate-bounce"
        style={{ animationDelay: `${i * 0.15}s` }}
      />
    ))}
  </div>
);

const Message = ({ msg }) => {
  const isUser = msg.role === 'user';
  const isStreaming = msg.streaming;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} group`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold mr-2 mt-1 flex-shrink-0">
          AI
        </div>
      )}
      <div className={`max-w-[75%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div className={`rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-primary-500 text-white rounded-br-sm shadow-md'
            : 'bg-white dark:bg-gray-800 rounded-bl-sm shadow-sm border border-gray-100 dark:border-gray-700'
        }`}>
          {isStreaming && !msg.content ? (
            <TypingDots />
          ) : (
            <div className={`prose prose-sm max-w-none leading-relaxed ${
              isUser ? 'prose-invert' : 'dark:prose-invert'
            }`}>
              <ReactMarkdown>{msg.content}</ReactMarkdown>
              {isStreaming && <span className="inline-block w-0.5 h-4 bg-primary-400 animate-pulse ml-0.5 align-middle" />}
            </div>
          )}
        </div>

        {/* Sources */}
        {!isUser && msg.sources?.length > 0 && !isStreaming && (
          <div className="flex flex-wrap gap-1 px-1">
            {msg.sources.map((s, i) => <SourceBadge key={i} source={s} />)}
          </div>
        )}

        {/* Confidence */}
        {!isUser && msg.confidence && !isStreaming && (
          <div className="px-1">
            <span className="text-xs text-gray-400">
              {msg.from_documents ? '📚 Da documenti · ' : ''}
              {msg.confidence.toFixed(0)}% confidence
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────────

export default function Chat() {
  const { isAdmin } = useAuth();
  const [searchParams] = useSearchParams();

  const [agents, setAgents] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [currentConvId, setCurrentConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const streamingIdRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages]);

  // Initial data load
  useEffect(() => {
    const load = async () => {
      try {
        const [agentsRes, convsRes] = await Promise.all([
          agentsAPI.getMyAgents(),
          chatAPI.getConversations(),
        ]);
        const agentList = agentsRes.data;
        setAgents(agentList);
        setConversations(convsRes.data);

        // Pre-select agent from ?agent= query param
        const agentParam = searchParams.get('agent');
        if (agentParam) {
          const found = agentList.find(a => a.id === parseInt(agentParam));
          if (found) selectAgent(found);
        }
      } catch (err) {
        toast.error('Errore caricamento dati');
      } finally {
        setInitialLoad(false);
      }
    };
    load();
  }, []);

  const selectAgent = (agent) => {
    setSelectedAgent(agent);
    setCurrentConvId(null);
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: agent.welcome_message || 'Ciao! Come posso aiutarti?',
    }]);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const loadConversation = async (conv) => {
    try {
      const res = await chatAPI.getConversation(conv.id);
      setSelectedAgent(res.data.agent);
      setCurrentConvId(conv.id);
      setMessages(res.data.messages);
    } catch {
      toast.error('Errore caricamento conversazione');
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || !selectedAgent || loading) return;

    const text = input.trim();
    setInput('');
    setLoading(true);

    // Optimistic user message
    const userMsgId = `user-${Date.now()}`;
    setMessages(prev => [...prev, { id: userMsgId, role: 'user', content: text }]);

    // Placeholder streaming message
    const streamId = `stream-${Date.now()}`;
    streamingIdRef.current = streamId;
    setMessages(prev => [...prev, { id: streamId, role: 'assistant', content: '', streaming: true }]);

    let meta = null;

    await streamMessage(selectedAgent.id, { message: text, conversation_id: currentConvId }, {
      onMeta: (m) => {
        meta = m;
        if (!currentConvId && m.conversation_id) {
          setCurrentConvId(m.conversation_id);
          // Add to conversations list without full reload
          setConversations(prev => [{
            id: m.conversation_id,
            title: text.slice(0, 50) + (text.length > 50 ? '...' : ''),
            agent_id: selectedAgent.id,
            updated_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          }, ...prev]);
        }
      },
      onChunk: (chunk) => {
        setMessages(prev => prev.map(m =>
          m.id === streamId ? { ...m, content: m.content + chunk } : m
        ));
      },
      onDone: (event) => {
        setMessages(prev => prev.map(m =>
          m.id === streamId ? {
            ...m,
            id: event.message_id || streamId,
            streaming: false,
            sources: meta?.sources,
            from_documents: meta?.from_documents,
            confidence: meta?.confidence,
          } : m
        ));
        setLoading(false);
        // Update conversation timestamp in sidebar
        if (currentConvId || meta?.conversation_id) {
          const cid = currentConvId || meta?.conversation_id;
          setConversations(prev => prev.map(c =>
            c.id === cid ? { ...c, updated_at: new Date().toISOString() } : c
          ));
        }
      },
      onError: (err) => {
        console.error('Stream error:', err);
        setMessages(prev => prev.map(m =>
          m.id === streamId ? {
            ...m, streaming: false,
            content: 'Si è verificato un errore. Riprova tra qualche istante.',
          } : m
        ));
        // Remove optimistic user message on hard error
        toast.error('Errore invio messaggio');
        setLoading(false);
      },
    });
  };

  const deleteConv = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Eliminare questa conversazione?')) return;
    try {
      await chatAPI.deleteConversation(id);
      setConversations(prev => prev.filter(c => c.id !== id));
      if (currentConvId === id) {
        setCurrentConvId(null);
        setMessages([]);
        setSelectedAgent(null);
      }
      toast.success('Conversazione eliminata');
    } catch {
      toast.error('Errore eliminazione');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="h-screen flex bg-gray-50 dark:bg-gray-950 overflow-hidden">

      {/* SIDEBAR */}
      <div className="w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <Link
            to={isAdmin ? '/dashboard' : '/user-dashboard'}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-4 transition-colors"
          >
            <ArrowLeft size={16} /> Indietro
          </Link>
          <h2 className="font-bold text-base">💬 Chat AI</h2>
        </div>

        {/* Agents */}
        <div className="p-3 border-b border-gray-200 dark:border-gray-800">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-2 px-1">Agenti</p>
          {initialLoad ? (
            <div className="space-y-2">
              {[1,2].map(i => <div key={i} className="h-12 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-1">
              {agents.map(agent => (
                <button
                  key={agent.id}
                  onClick={() => selectAgent(agent)}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all ${
                    selectedAgent?.id === agent.id
                      ? 'bg-primary-50 dark:bg-primary-900/30 ring-1 ring-primary-300 dark:ring-primary-700'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <span className="text-xl flex-shrink-0">{agent.avatar_emoji}</span>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{agent.name}</p>
                    <p className="text-xs text-gray-400 truncate">{agent.description}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto p-3">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-2 px-1">Conversazioni</p>
          {conversations.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">Nessuna conversazione</p>
          ) : (
            <div className="space-y-1">
              {conversations.map(conv => (
                <div
                  key={conv.id}
                  onClick={() => loadConversation(conv)}
                  className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer group transition-all ${
                    currentConvId === conv.id
                      ? 'bg-primary-50 dark:bg-primary-900/30'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <MessageSquare size={13} className="text-gray-400 flex-shrink-0" />
                    <p className="text-xs truncate text-gray-700 dark:text-gray-300">{conv.title}</p>
                  </div>
                  <button
                    onClick={(e) => deleteConv(conv.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-opacity flex-shrink-0"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* CHAT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedAgent ? (
          <>
            {/* Header */}
            <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center gap-3 flex-shrink-0">
              <span className="text-2xl">{selectedAgent.avatar_emoji}</span>
              <div>
                <p className="font-semibold">{selectedAgent.name}</p>
                <p className="text-xs text-gray-400">{selectedAgent.description}</p>
              </div>
              {loading && (
                <div className="ml-auto flex items-center gap-1.5 text-xs text-primary-500">
                  <Loader2 size={13} className="animate-spin" />
                  <span>Elaborazione...</span>
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {messages.map((msg, i) => (
                <Message key={msg.id || i} msg={msg} />
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-shrink-0">
              <form onSubmit={sendMessage} className="flex gap-3 max-w-4xl mx-auto">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Scrivi un messaggio... (Invio per inviare, Shift+Invio per andare a capo)"
                  rows={1}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none transition text-sm"
                  disabled={loading}
                  maxLength={2000}
                  style={{ minHeight: '48px', maxHeight: '120px' }}
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="px-5 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2 font-medium shadow-sm flex-shrink-0"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
              </form>
              <p className="text-xs text-gray-400 text-right mt-1 max-w-4xl mx-auto">
                {input.length} / 2000
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-sm px-4">
              <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-primary-100 to-purple-100 dark:from-primary-900/30 dark:to-purple-900/30 flex items-center justify-center">
                <MessageSquare className="w-10 h-10 text-primary-500" />
              </div>
              <h2 className="text-xl font-bold mb-2">Seleziona un Agente AI</h2>
              <p className="text-sm text-gray-500">Scegli un agente dalla lista a sinistra per iniziare</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
