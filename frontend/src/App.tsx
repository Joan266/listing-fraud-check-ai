// src/App.tsx
import { useState } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import InteractionPanel from './components/InteractionPanel';
import ReportPanel from './components/ReportPanel';
import type { AnalysisResult, AnalysisData, ChatMessageData } from './types';
import { Shield, Zap } from 'lucide-react';
import './App.css';
// Define the initial welcome message for the chat
const initialMessage: ChatMessageData = {
  id: '1',
  type: 'ai',
  content: "Welcome to VeriRent. To start, please provide the listing details in the form below.",
  timestamp: new Date()
};

function App() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  // --- RE-INTRODUCE CHAT MESSAGE STATE ---
  const [chatMessages, setChatMessages] = useState<ChatMessageData[]>([initialMessage]);

  const apiKey = import.meta.env.VITE_Maps_API_KEY;
  const API_BASE_URL = 'http://127.0.0.1:8000';

  const addChatMessage = (content: string, type: 'user' | 'ai') => {
    const newMessage: ChatMessageData = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, newMessage]);
  };

  const handleAnalyze = async (formData: AnalysisData) => {
    setIsAnalyzing(true);
    setAnalysisResult(null);
    setChatMessages([initialMessage]); // Reset chat on new analysis

    addChatMessage('Thank you. Starting the full analysis... This may take a moment.', 'ai');

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const foundUrls = formData.imageUrls.match(urlRegex) || [];

    const payload = {
      address: formData.address,
      description: formData.description || formData.rawListing,
      image_urls: foundUrls,
      communication_text: formData.hostConversation
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/checks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('Failed to submit job');
      const data = await response.json();
      pollForResult(data.job_id);
    } catch (error) {
      console.error('Submission error:', error);
      setIsAnalyzing(false);
      addChatMessage('Sorry, I couldn\'t connect to the analysis service.', 'ai');
    }
  };

  const pollForResult = (jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/checks/${jobId}`);
        const data = await response.json();
        if (data.status === 'COMPLETED' || data.status === 'FAILED') {
          clearInterval(interval);
          setIsAnalyzing(false);
          addChatMessage('Analysis complete. You can view the report on the right.', 'ai');
          setAnalysisResult(data.result);
        }
      } catch (error) {
        console.error('Polling error:', error);
        clearInterval(interval);
        setIsAnalyzing(false);
        addChatMessage('Sorry, there was an error processing your request.', 'ai');
      }
    }, 3000);
  };

  if (!apiKey) {
    return <div>Error: VITE_Maps_API_KEY is missing.</div>;
  }

  return (
    <APIProvider apiKey={apiKey} libraries={['places']}>
      <div className="min-h-screen bg-slate-50">
        <header className="bg-white shadow-sm border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-slate-800">VeriRent</h1>
              </div>
              {/* --- UPDATED PART --- */}
              <div className="hidden sm:flex items-center space-x-1 text-sm text-slate-600 font-medium">
                <Zap className="w-4 h-4 text-grey-500" />
                <span>El Carfax de los Alquileres</span>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <InteractionPanel
              onAnalyze={handleAnalyze}
              isAnalyzing={isAnalyzing}
              chatMessages={chatMessages}
              setChatMessages={setChatMessages}
            />
            <ReportPanel
              isAnalyzing={isAnalyzing}
              analysisResult={analysisResult}
            />
          </div>
        </main>
      </div>
    </APIProvider>
  );
}

export default App;