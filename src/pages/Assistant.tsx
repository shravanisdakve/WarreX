import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { Send, Bot, User, Loader, Sparkles } from 'lucide-react';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  isLoading?: boolean;
}

const QUICK_ACTIONS = [
  { label: '📋 Warranty Overview', message: 'Show me the warranty status of all my products' },
  { label: '⚠️ Expiring Soon', message: 'Which products have warranties expiring soon?' },
  { label: '📞 Service Centers', message: 'What service center brands are available?' },
  { label: '📧 Draft Complaint', message: 'Help me draft a warranty complaint email' },
];

export default function Assistant() {
  const { t, i18n } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: t('assistant_intro'), sender: 'bot', timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Update intro message when language changes
  useEffect(() => {
    setMessages([
      { id: Date.now(), text: t('assistant_intro'), sender: 'bot', timestamp: new Date() }
    ]);
  }, [i18n.language]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMsg: Message = { id: Date.now(), text: messageText, sender: 'user', timestamp: new Date() };
    const loadingMsg: Message = { id: Date.now() + 1, text: '', sender: 'bot', timestamp: new Date(), isLoading: true };

    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await axios.post('/api/assistant', { message: messageText });
      const botResponse = res.data.response;

      setMessages(prev => prev.map(m =>
        m.isLoading ? { ...m, text: botResponse, isLoading: false } : m
      ));
    } catch (error) {
      console.error('Assistant error:', error);
      setMessages(prev => prev.map(m =>
        m.isLoading ? { ...m, text: 'Sorry, I encountered an error. Please try again.', isLoading: false } : m
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  // Simple markdown-like rendering for bot messages
  const renderMessage = (text: string) => {
    return text.split('\n').map((line, i) => {
      // Bold text
      let processed = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      // Links
      processed = processed.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-indigo-400 underline hover:text-indigo-300">$1</a>');
      // Bullet points
      if (processed.startsWith('•') || processed.startsWith('-')) {
        return <p key={i} className="ml-2" dangerouslySetInnerHTML={{ __html: processed }} />;
      }
      return <p key={i} dangerouslySetInnerHTML={{ __html: processed }} />;
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] bg-white shadow-lg rounded-2xl overflow-hidden border border-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-5 py-4 text-white flex justify-between items-center">
        <h2 className="text-lg font-semibold flex items-center">
          <Sparkles className="w-5 h-5 mr-2" />
          {t('assistant')}
        </h2>
        <span className="text-xs bg-white/20 px-2 py-1 rounded-full">AI Powered</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex items-end gap-2 max-w-[85%] ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.sender === 'user' ? 'bg-indigo-600' : 'bg-gradient-to-br from-indigo-400 to-purple-500'}`}>
                {msg.sender === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
              </div>
              <div className={`px-4 py-3 rounded-2xl ${msg.sender === 'user'
                ? 'bg-indigo-600 text-white rounded-br-md'
                : 'bg-white text-gray-800 border border-gray-200 rounded-bl-md shadow-sm'
                }`}>
                {msg.isLoading ? (
                  <div className="flex items-center gap-2 text-gray-400">
                    <Loader className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Thinking...</span>
                  </div>
                ) : (
                  <div className="text-sm whitespace-pre-wrap space-y-1">
                    {msg.sender === 'bot' ? renderMessage(msg.text) : msg.text}
                  </div>
                )}
                <span className={`text-xs block mt-1.5 ${msg.sender === 'user' ? 'text-indigo-200' : 'text-gray-400'}`}>
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
        <div className="px-4 py-3 bg-white border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-2">Quick actions:</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_ACTIONS.map((action, i) => (
              <button
                key={i}
                onClick={() => sendMessage(action.message)}
                disabled={isLoading}
                className="text-xs px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full hover:bg-indigo-100 transition-colors disabled:opacity-50"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 bg-white border-t border-gray-200 flex gap-2">
        <input
          id="assistantInput"
          name="assistantInput"
          type="text"
          aria-label={t('ask_placeholder') || 'Type a message...'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('ask_placeholder')}
          disabled={isLoading}
          className="flex-1 border border-gray-300 rounded-full px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm disabled:bg-gray-50 transition-shadow"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="bg-indigo-600 text-white p-2.5 rounded-full hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}
