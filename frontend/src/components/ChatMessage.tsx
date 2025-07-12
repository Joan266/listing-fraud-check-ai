// src/components/ChatMessage.tsx
import React from 'react';
import './ChatMessage.css';

// Define the "shape" of a message object
export interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
}

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const messageClass = message.sender === 'user' ? 'user-message' : 'ai-message';

  return (
    <div className={`message-row ${message.sender}`}>
      <div className={`chat-bubble ${messageClass}`}>
        <p>{message.text}</p>
      </div>
    </div>
  );
};

export default ChatMessage;