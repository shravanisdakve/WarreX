import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { Send, Bot, User, Sparkles, Brain } from 'lucide-react';
import { QUICK_ACTIONS, WELCOME_MESSAGE, WELCOME_MESSAGE_SHORT } from '../config/aiConfig';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  isLoading?: boolean;
}

export default function Assistant() {
  const { t, i18n } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: WELCOME_MESSAGE, sender: 'bot', timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [quickActions, setQuickActions] = useState(QUICK_ACTIONS);
  const [welcomeMessageShort, setWelcomeMessageShort] = useState(WELCOME_MESSAGE_SHORT);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (messages.length <= 1) { // Only set default if it's the first time or only one message
      setMessages([
        { id: Date.now(), text: welcomeMessageShort, sender: 'bot', timestamp: new Date() }
      ]);
    }
  }, [i18n.language, welcomeMessageShort]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch history on mount
  useEffect(() => {
    const fetchHistoryAndConfig = async () => {
      try {
        const [historyRes, catalogRes] = await Promise.all([
          axios.get('/api/assistant/history').catch(() => ({ data: [] })),
          axios.get('/api/meta/catalog').catch(() => ({ data: {} }))
        ]);

        const catalog = catalogRes.data;
        if (catalog.quickActions) setQuickActions(catalog.quickActions);

        let initialMessage = WELCOME_MESSAGE;
        if (catalog.welcomeMessages?.welcomeShort) {
          setWelcomeMessageShort(catalog.welcomeMessages.welcomeShort);
        }
        if (catalog.welcomeMessages?.welcome) {
          initialMessage = catalog.welcomeMessages.welcome;
        }

        if (historyRes.data && historyRes.data.length > 0) {
          // Convert string timestamps back to Date objects
          const history = historyRes.data.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          }));
          setMessages(history);
        } else {
          setMessages([
            { id: 1, text: initialMessage, sender: 'bot', timestamp: new Date() }
          ]);
        }
      } catch (err) {
        console.error('Failed to load chat history:', err);
      }
    };
    fetchHistoryAndConfig();
  }, []);

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMsg: Message = { id: Date.now(), text: messageText, sender: 'user', timestamp: new Date() };
    const loadingMsg: Message = { id: Date.now() + 1, text: '', sender: 'bot', timestamp: new Date(), isLoading: true };

    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await axios.post('/api/assistant', { message: messageText }, { timeout: 45000 }); // Increase timeout to 45s for AI
      const botResponse = res.data.response;

      setMessages(prev => prev.map(m =>
        m.isLoading ? { ...m, text: botResponse, isLoading: false } : m
      ));
    } catch (error: any) {
      console.error('Assistant error:', error);
      let errorMsg = 'Sorry, I encountered an error. Please check your internet connection or try again later.';
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        errorMsg = 'My response is taking a bit longer than usual due to high server load. Please try again in a few moments.';
      } else if (error.response?.status === 403) {
        errorMsg = 'Session expired or invalid authentication. Please try logging in again to talk to the AI advisor.';
      }

      setMessages(prev => prev.map(m =>
        m.isLoading ? { ...m, text: errorMsg, isLoading: false } : m
      ));
    } finally {
      setIsLoading(true); // Keep internal state loading for a split second to prevent double-sends
      setTimeout(() => setIsLoading(false), 500);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const renderMessage = (text: string) => {
    return text.split('\n').map((line, i) => {
      let processed = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      processed = processed.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-indigo-400 underline hover:text-indigo-300">$1</a>');
      if (processed.startsWith('•') || processed.startsWith('-')) {
        return <p key={i} className="ml-2" dangerouslySetInnerHTML={{ __html: processed }} />;
      }
      return <p key={i} dangerouslySetInnerHTML={{ __html: processed }} />;
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] bg-[#151c2e] shadow-lg rounded-2xl overflow-hidden border border-indigo-500/10">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 px-5 py-4 text-white flex justify-between items-center shadow-lg">
        <h2 className="text-lg font-semibold flex items-center">
          <Brain className="w-5 h-5 mr-2" />
          {t('assistant')}
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-white/20 px-2 py-1 rounded-full flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> {t('ai_powered')}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0a0e1a]/50">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex items-end gap-2 max-w-[85%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.sender === 'user' ? 'bg-indigo-600' : 'bg-gradient-to-br from-indigo-400 to-purple-500'}`}>
                {msg.sender === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
              </div>
              <div className={`px-4 py-3 rounded-2xl ${msg.sender === 'user'
                ? 'bg-indigo-600 text-white rounded-br-md'
                : 'bg-[#1a2340] text-slate-200 border border-indigo-500/10 rounded-bl-md shadow-sm'
                }`}>
                {msg.isLoading ? (
                  <div className="flex items-center gap-2 text-slate-400">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                      <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                    </div>
                    <span className="text-sm">{t('analyzing_data')}</span>
                  </div>
                ) : (
                  <div className="text-sm whitespace-pre-wrap space-y-1">
                    {msg.sender === 'bot' ? renderMessage(msg.text) : msg.text}
                  </div>
                )}
                <span className={`text-xs block mt-1.5 ${msg.sender === 'user' ? 'text-indigo-200' : 'text-slate-500'}`}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      {messages.length <= 2 && (
        <div className="px-4 py-3 bg-[#151c2e] border-t border-white/5">
          <p className="text-xs text-slate-500 mb-2">Quick actions:</p>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action: any, i: number) => (
              <button
                key={i}
                onClick={() => sendMessage(action.message)}
                disabled={isLoading}
                className="text-xs font-semibold px-4 py-2 bg-indigo-500/10 text-indigo-400 rounded-full hover:bg-indigo-500/20 hover:shadow-md hover:-translate-y-0.5 active:scale-95 transition-all disabled:opacity-50 border border-indigo-500/20 btn-tactile"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 bg-[#151c2e] border-t border-white/5 flex gap-2">
        <input
          id="assistantInput"
          name="assistantInput"
          type="text"
          aria-label={t('ask_placeholder') || 'Type a message...'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('ask_placeholder')}
          disabled={isLoading}
          className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-sm text-slate-200 placeholder-slate-600 disabled:bg-white/[0.02] transition-all hover:border-white/20"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-2.5 rounded-full shadow-md hover:from-indigo-700 hover:to-purple-700 hover:shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}
