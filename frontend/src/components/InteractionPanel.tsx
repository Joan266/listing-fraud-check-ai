import React from 'react';
import ChatWindow from './ChatWindow';
import InputForm from './InputForm';
import type { AnalysisData } from '../types';

interface ChatMessage {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

interface InteractionPanelProps {
  onAnalyze: (data: AnalysisData) => void;
  isAnalyzing: boolean;
  chatMessages: ChatMessage[];
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

const InteractionPanel: React.FC<InteractionPanelProps> = ({
  onAnalyze,
  isAnalyzing,
  chatMessages,
  setChatMessages
}) => {
  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden transform hover:shadow-xl transition-all duration-300">
      {/* Chat Window */}
      <div className="border-b border-slate-200">
        <ChatWindow 
          messages={chatMessages}
          setChatMessages={setChatMessages}
        />
      </div>

      {/* Input Form */}
      <div className="p-6">
        <InputForm 
          onAnalyze={onAnalyze}
          isLoading={isAnalyzing}
        />
      </div>
    </div>
  );
};

export default InteractionPanel;