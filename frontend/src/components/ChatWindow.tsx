import React, { useEffect, useRef } from 'react';
import { Bot, User } from 'lucide-react';

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

interface ChatWindowProps {
  messages: ChatMessage[];
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ messages }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="h-64 overflow-y-auto p-4 bg-slate-50 chat-window">
      <div className="space-y-4 ">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex items-start space-x-3 animate-slideIn ${
              message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''
            }`}
          >
            {/* Avatar */}
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
              message.type === 'ai' 
                ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md' 
                : 'bg-gradient-to-br from-slate-500 to-slate-600 text-white shadow-md'
            }`}>
              {message.type === 'ai' ? (
                <Bot className="w-4 h-4" />
              ) : (
                <User className="w-4 h-4" />
              )}
            </div>

            {/* Message Content */}
            <div className={`flex-1 max-w-xs lg:max-w-sm ${
              message.type === 'user' ? 'text-right' : ''
            }`}>
              <div className={`inline-block px-4 py-2 rounded-lg text-sm shadow-sm transform hover:scale-[1.02] transition-transform duration-200 ${
                message.type === 'ai'
                  ? 'bg-white text-slate-800 border border-slate-200'
                  : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white'
              }`}>
                {message.content}
              </div>
              <div className={`text-xs text-slate-500 mt-1 ${
                message.type === 'user' ? 'text-right' : ''
              }`}>
                {formatTime(message.timestamp)}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default ChatWindow;