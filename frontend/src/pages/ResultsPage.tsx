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
import { resetCurrentAnalysis, updateAnalysisAsync, sendChatMessageAsync, addUserMessage } from '../store/appSlice';
import ScoreGauge from '../components/UI/ScoreGauge';
import MapComponent from '../components/UI/MapComponent';
import { ChatMessage } from '../types';
import { gsap } from 'gsap';
import { v4 as uuidv4 } from 'uuid';


const ResultsPage: React.FC = () => {
  const { currentAnalysis, theme } = useAppSelector((state) => state.app);
  const dispatch = useAppDispatch();
  
  const [newMessage, setNewMessage] = useState('');
  
  const containerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    // Entrance animation for the entire page
    if (containerRef.current) {
      gsap.fromTo(containerRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }
      );
    }
  }, []);

  useEffect(() => {
    // Scroll to the bottom of the chat when new messages are added
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentAnalysis?.chatMessages]);


  const handleSendMessage = () => {
    if (newMessage.trim() && currentAnalysis) {
      const userMessage: ChatMessage = {
        id: uuidv4(),
        type: 'user',
        content: newMessage,
        timestamp: new Date().toISOString()
      };
      
      // Add user message to state immediately for a responsive feel
      dispatch(addUserMessage(userMessage));
      // Dispatch the thunk to send the message to the backend
      dispatch(sendChatMessageAsync(userMessage));

      setNewMessage('');
    }
  };

  const handleNewAnalysis = () => {
    dispatch(resetCurrentAnalysis());
  };

  // This function is for re-running the same analysis, not yet fully implemented in the provided code
  const handleRerunAnalysis = () => {
    if (currentAnalysis && currentAnalysis.extractedData) {
        // This would require a PUT/update endpoint on the backend
      console.log("Rerunning analysis with ID:", currentAnalysis.id);
      // dispatch(updateAnalysisAsync({
      //   checkId: currentAnalysis.id,
      //   extractedData: currentAnalysis.extractedData
      // }));
    }
  };

  if (!currentAnalysis?.finalReport) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="text-center">
          <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Analysis results are not available.
          </p>
        </div>
      </div>
    );
  }

  const { finalReport, chatMessages = [] } = currentAnalysis;

  // Dynamically create flag lists from the report for display
  const redFlags = finalReport.chat_explanation
      .split('\n')
      .filter(line => line.includes('Risk') || line.includes('Warning'))
      .map(line => line.replace(/###/g, '').replace('Risk:', '').replace('Warning:', '').trim());

  const positiveSignals = finalReport.chat_explanation
      .split('\n')
      .filter(line => line.includes('Positive') || line.includes('Verified'))
      .map(line => line.replace(/###/g, '').replace('Positive Signal:', '').replace('Verified:', '').trim());


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
              
              <div className="flex justify-around items-center mb-6">
                <ScoreGauge 
                  score={finalReport.authenticityScore} 
                  title="Authenticity Score" 
                  theme={theme}
                />
                <div className={`w-px h-24 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
                <ScoreGauge 
                  score={finalReport.qualityScore} 
                  title="Quality Score" 
                  theme={theme}
                />
              </div>
              
              <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <h3 className={`font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  AI Summary
                </h3>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  {finalReport.sidebar_summary}
                </p>
              </div>
            </div>

            {/* Red Flags & Positive Signals */}
            <div className="grid md:grid-cols-2 gap-6">
                <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6`}>
                  <div className="flex items-center space-x-2 mb-4">
                    <AlertTriangle size={20} className="text-red-400" />
                    <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Red Flags
                    </h2>
                  </div>
                  <div className="space-y-3">
                    {redFlags.length > 0 ? redFlags.map((flag, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <AlertTriangle size={16} className="text-red-400 mt-1 flex-shrink-0" />
                        <span className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} text-sm`}>{flag}</span>
                      </div>
                    )) : <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>No major red flags detected.</p>}
                  </div>
                </div>

                <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6`}>
                  <div className="flex items-center space-x-2 mb-4">
                    <CheckCircle size={20} className="text-green-400" />
                    <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      Positive Signals
                    </h2>
                  </div>
                  <div className="space-y-3">
                    {positiveSignals.length > 0 ? positiveSignals.map((signal, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <CheckCircle size={16} className="text-green-400 mt-1 flex-shrink-0" />
                        <span className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} text-sm`}>{signal}</span>
                      </div>
                    )) : <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>No strong positive signals found.</p>}
                  </div>
                </div>
            </div>

            {/* Suggested Actions */}
            <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6`}>
              <h2 className={`text-xl font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Recommended Next Steps
              </h2>
              
              <div className="space-y-3">
                {finalReport.suggested_actions.map((action, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-5 h-5 bg-yellow-400 text-gray-900 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 flex-shrink-0">
                      {index + 1}
                    </div>
                    <span className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} text-sm`}>
                      {action}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Legal Disclaimer */}
            <div className={`${theme === 'dark' ? 'bg-gray-800/50' : 'bg-gray-100/50'} border-l-4 ${theme === 'dark' ? 'border-gray-600' : 'border-gray-300'} p-4 rounded-r-lg`}>
              <h3 className={`text-base font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                Disclaimer
              </h3>
              <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                This AI-powered analysis is for informational purposes only and does not constitute legal or financial advice. 
                SafeLease makes no warranties regarding its accuracy. Always perform your own due diligence before making rental decisions.
              </p>
            </div>
          </div>

          {/* Chat Interface - Right Side */}
          <div className="lg:col-span-1">
            <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg h-[calc(100vh-12rem)] flex flex-col`}>
              
              <div className="p-4 border-b border-gray-700">
                <div className="flex items-center space-x-2">
                  <MessageCircle size={20} className="text-yellow-400" />
                  <h2 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Ask Questions
                  </h2>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] p-3 rounded-lg shadow-sm ${
                        message.type === 'user'
                          ? 'bg-yellow-400 text-gray-900 rounded-br-none'
                          : theme === 'dark'
                          ? 'bg-gray-700 text-gray-300 rounded-bl-none'
                          : 'bg-gray-100 text-gray-800 rounded-bl-none'
                      }`}
                    >
                      <p className="text-sm" dangerouslySetInnerHTML={{ __html: message.content.replace(/\n/g, '<br />') }} />
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <div className="p-4 border-t border-gray-700">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Ask for clarification..."
                    className={`flex-1 p-2 border rounded-lg text-sm ${
                      theme === 'dark' 
                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:ring-yellow-400' 
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:ring-yellow-400'
                    }`}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className="px-4 py-2 bg-yellow-400 hover:bg-yellow-500 disabled:bg-gray-500 disabled:cursor-not-allowed text-gray-900 rounded-lg transition-colors text-sm font-medium"
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
