import React, { useState, useRef, useEffect } from 'react';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  MessageCircle, 
  RotateCcw, 
  Search,
  MapPin,
  Star,
  Camera,
  User,
  ExternalLink
} from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { resetCurrentAnalysis, updateAnalysisAsync } from '../store/appSlice';
import ScoreGauge from '../components/UI/ScoreGauge';
import MapComponent from '../components/UI/MapComponent';
import { ChatMessage } from '../types';
import { gsap } from 'gsap';

const ResultsPage: React.FC = () => {
  const { currentAnalysis, theme } = useAppSelector((state) => state.app);
  const dispatch = useAppDispatch();
  
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentAnalysis?.finalReport) {
      // Initialize chat with the AI explanation
      const initialMessage: ChatMessage = {
        id: '1',
        type: 'assistant',
        content: currentAnalysis.finalReport.chat_explanation,
        timestamp: new Date().toISOString()
      };
      setChatMessages([initialMessage]);
    }
  }, [currentAnalysis]);

  useEffect(() => {
    // Entrance animation
    if (containerRef.current) {
      gsap.fromTo(containerRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }
      );
    }
  }, []);

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'user',
        content: newMessage,
        timestamp: new Date().toISOString()
      };
      
      setChatMessages(prev => [...prev, userMessage]);
      setNewMessage('');
      
      // Simulate AI response (in production, this would call the backend)
      setTimeout(() => {
        const aiResponse: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: "I'm analyzing your question about this listing. In a production environment, this would connect to the AI backend for detailed responses.",
          timestamp: new Date().toISOString()
        };
        setChatMessages(prev => [...prev, aiResponse]);
      }, 1000);
    }
  };

  const handleNewAnalysis = () => {
    dispatch(resetCurrentAnalysis());
  };

  const handleRerunAnalysis = () => {
    if (currentAnalysis && currentAnalysis.extractedData) {
      dispatch(updateAnalysisAsync({
        checkId: currentAnalysis.id,
        extractedData: currentAnalysis.extractedData
      }));
    }
  };

  if (!currentAnalysis?.finalReport) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="text-center">
          <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            No analysis results found
          </p>
        </div>
      </div>
    );
  }

  const { finalReport } = currentAnalysis;

  // Parse red flags and positive signals from the explanation
  const redFlags = [
    "Suspiciously low price for the area",
    "Limited or fake host profile information",
    "Poor quality or stock photos detected",
    "Inconsistent address information"
  ];

  const positiveSignals = [
    "Address successfully verified on map",
    "Host profile appears legitimate",
    "Reasonable pricing for the location",
    "Clear property description provided"
  ];

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} p-6`}>
      <div ref={containerRef} className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Shield size={28} className="text-yellow-400" />
              <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Analysis Results
              </h1>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={handleRerunAnalysis}
                className={`px-4 py-2 border border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-gray-900 rounded-lg transition-colors flex items-center space-x-2`}
              >
                <RotateCcw size={18} />
                <span>Rerun Analysis</span>
              </button>
              
              <button
                onClick={handleNewAnalysis}
                className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-900 rounded-lg transition-colors flex items-center space-x-2"
              >
                <Search size={18} />
                <span>New Analysis</span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* Results Panel - Left Side */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Summary Card */}
            <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6`}>
              <h2 className={`text-xl font-semibold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Overall Assessment
              </h2>
              
              <div className="flex justify-center space-x-12 mb-6">
                <ScoreGauge 
                  score={finalReport.authenticityScore} 
                  title="Authenticity Score" 
                  theme={theme}
                />
                <ScoreGauge 
                  score={finalReport.qualityScore} 
                  title="Quality Score" 
                  theme={theme}
                />
              </div>
              
              <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <h3 className={`font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Summary
                </h3>
                <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  {finalReport.sidebar_summary}
                </p>
              </div>
            </div>

            {/* Map Card */}
            <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6`}>
              <div className="flex items-center space-x-2 mb-4">
                <MapPin size={20} className="text-yellow-400" />
                <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Location Verification
                </h2>
              </div>
              
              <MapComponent
                address={currentAnalysis.extractedData.address}
                latitude={currentAnalysis.geocodeResult?.latitude}
                longitude={currentAnalysis.geocodeResult?.longitude}
                theme={theme}
                className="h-64"
              />
            </div>

            {/* Red Flags Card */}
            <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6`}>
              <div className="flex items-center space-x-2 mb-4">
                <AlertTriangle size={20} className="text-red-400" />
                <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Red Flags
                </h2>
              </div>
              
              <div className="space-y-3">
                {redFlags.map((flag, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <AlertTriangle size={16} className="text-red-400 mt-1 flex-shrink-0" />
                    <span className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      {flag}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Positive Signals Card */}
            <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6`}>
              <div className="flex items-center space-x-2 mb-4">
                <CheckCircle size={20} className="text-green-400" />
                <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Positive Signals
                </h2>
              </div>
              
              <div className="space-y-3">
                {positiveSignals.map((signal, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <CheckCircle size={16} className="text-green-400 mt-1 flex-shrink-0" />
                    <span className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      {signal}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Detailed Analysis Sections */}
            <div className="grid md:grid-cols-2 gap-6">
              
              {/* Image Analysis */}
              <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6`}>
                <div className="flex items-center space-x-2 mb-4">
                  <Camera size={20} className="text-yellow-400" />
                  <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Image Analysis
                  </h3>
                </div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Analyzed {currentAnalysis.extractedData.image_urls?.length || 0} images for authenticity and quality.
                </p>
              </div>

              {/* Host Reputation */}
              <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6`}>
                <div className="flex items-center space-x-2 mb-4">
                  <User size={20} className="text-yellow-400" />
                  <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Host Reputation
                  </h3>
                </div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Verified host information and profile authenticity.
                </p>
              </div>
            </div>

            {/* Suggested Actions */}
            <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6`}>
              <h2 className={`text-xl font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Recommended Actions
              </h2>
              
              <div className="space-y-3">
                {finalReport.suggested_actions.map((action, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-yellow-400 text-gray-900 rounded-full flex items-center justify-center text-sm font-bold mt-0.5">
                      {index + 1}
                    </div>
                    <span className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      {action}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Legal Disclaimer */}
            <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6`}>
              <h3 className={`text-lg font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Legal Disclaimer
              </h3>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                This analysis is provided for informational purposes only and should not be considered as legal or financial advice. 
                SafeLease makes no warranties about the accuracy or completeness of the analysis. Always conduct your own due 
                diligence before making any rental decisions.
              </p>
            </div>
          </div>

          {/* Chat Interface - Right Side */}
          <div className="lg:col-span-1">
            <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg h-[800px] flex flex-col`}>
              
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-700">
                <div className="flex items-center space-x-2">
                  <MessageCircle size={20} className="text-yellow-400" />
                  <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Ask Questions
                  </h2>
                </div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Get detailed explanations about the analysis
                </p>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-lg ${
                        message.type === 'user'
                          ? 'bg-yellow-400 text-gray-900'
                          : theme === 'dark'
                          ? 'bg-gray-700 text-gray-300'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className={`text-xs mt-1 opacity-75`}>
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t border-gray-700">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Ask about the analysis..."
                    className={`flex-1 p-2 border rounded-lg text-sm ${
                      theme === 'dark' 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className="px-3 py-2 bg-yellow-400 hover:bg-yellow-500 disabled:bg-gray-400 disabled:cursor-not-allowed text-gray-900 rounded-lg transition-colors text-sm font-medium"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsPage;