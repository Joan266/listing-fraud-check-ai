import React, { useState, useRef, useEffect } from 'react';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  MessageCircle, 
  RotateCcw, 
  Search,
  MapPin,
  Camera,
  User
} from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { resetCurrentAnalysis, addChatMessage, setCurrentScreen } from '../store/appSlice';
import { useSendMessageMutation } from '../api/chatApi';
import ScoreGauge from '../components/UI/ScoreGauge';
import MapComponent from '../components/UI/MapComponent';
import { ChatMessage } from '../types';
import { gsap } from 'gsap';
import LoadingSpinner from '../components/UI/LoadingSpinner';

const ResultsPage: React.FC = () => {
  const { currentAnalysis, theme, chatMessages } = useAppSelector((state) => state.app);
  const dispatch = useAppDispatch();
  
  const [newMessage, setNewMessage] = useState('');
  const [sendMessage, { isLoading: isSendingMessage }] = useSendMessageMutation();
  
  const containerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Entrance animation
    if (containerRef.current) {
      gsap.fromTo(containerRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }
      );
    }
  }, []);

  useEffect(() => {
    // Scroll to bottom of chat
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendMessage = async () => {
    if (newMessage.trim() && currentAnalysis) {
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'user',
        content: newMessage,
        timestamp: new Date().toISOString()
      };
      
      dispatch(addChatMessage(userMessage));
      setNewMessage('');
      
      try {
        const response = await sendMessage({
            session_id: currentAnalysis.sessionId,
            chat_id: currentAnalysis.id,
            message: { role: 'user', content: newMessage }
        }).unwrap();

        const aiResponse: ChatMessage = {
            id: response.chat_id + Date.now().toString(),
            type: 'assistant',
            content: response.response.content,
            timestamp: new Date().toISOString()
        };
        dispatch(addChatMessage(aiResponse));

      } catch (error) {
        console.error("Failed to send message:", error);
        const errorResponse: ChatMessage = {
            id: 'error-' + Date.now().toString(),
            type: 'assistant',
            content: "Sorry, I encountered an error. Please try again.",
            timestamp: new Date().toISOString()
        };
        dispatch(addChatMessage(errorResponse));
      }
    }
  };



  const handleRerunAnalysis = () => {
    
  };

  if (!currentAnalysis?.finalReport) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="text-center p-8">
            <LoadingSpinner size="lg" />
            <p className={`text-lg mt-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Analysis in progress...
            </p>
        </div>
      </div>
    );
  }

  const { finalReport, extractedData } = currentAnalysis;

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
                  score={finalReport.authenticity_score} 
                  title="Authenticity Score" 
                  theme={theme}
                />
                <ScoreGauge 
                  score={finalReport.quality_score} 
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
                  Analyzed {extractedData.image_urls?.length || 0} images for authenticity and quality.
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
                    <div className="w-6 h-6 bg-yellow-400 text-gray-900 rounded-full flex items-center justify-center text-sm font-bold mt-0.5 flex-shrink-0">
                      {index + 1}
                    </div>
                    <span className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      {action}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Chat Interface - Right Side */}
          <div className="lg:col-span-1">
            <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg h-[calc(100vh-12rem)] flex flex-col`}>
              
              {/* Chat Header */}
              <div className={`p-4 border-b ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
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
                      <p className="text-sm" dangerouslySetInnerHTML={{ __html: message.content.replace(/\n/g, '<br />') }}></p>
                      <p className={`text-xs mt-1 opacity-75`}>
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
                {isSendingMessage && (
                    <div className="flex justify-start">
                        <div className={`max-w-[80%] p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
                            <LoadingSpinner size="sm" />
                        </div>
                    </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <div className={`p-4 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
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
                    disabled={!newMessage.trim() || isSendingMessage}
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
