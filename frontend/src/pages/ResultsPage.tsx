import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Shield,
  MessageCircle,
  RotateCcw,
  MapPin,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import ScoreGauge from '../components/UI/ScoreGauge';
import { gsap } from 'gsap';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import MapComponent from '../components/UI/MapComponent/EnhancedMapComponent';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { pollAnalysisStatus, sendChatMessageAsync, setCurrentAnalysisId } from '../store/appSlice';
import { ChatMessage } from '../types/index';
import { toast } from 'react-hot-toast';
import { LoadingScreen } from '../components/UI/LoadingScreen';
import { FlagsCard } from '../components/Results/FlagsCard';
import { AnalysisRunbook } from '../components/Results/AnalysisRubook';
import EnhancedMapComponent from '../components/UI/MapComponent/EnhancedMapComponent';
import { FailedAnalysis } from '../components/UI/FailedAnalysis';
const ResultsPage: React.FC = () => {
  const { analysisId } = useParams<{ analysisId: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const analysis = useAppSelector(state =>
    state.app.sessionHistory.find(a => a.id === analysisId)
  );
  const neighborhoodData = analysis?.analysis_steps?.find(
    step => step.job_name === 'neighborhood_analysis'
  )?.result;
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(analysis?.chat?.messages || []);

  const { theme, isPolling } = useAppSelector(state => state.app);
  const [isSending, setIsSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    console.log(analysis)
    if (analysisId) {
      dispatch(setCurrentAnalysisId(analysisId));
      console.log(analysis)
      if (!isPolling && analysis && (analysis.status === 'PENDING' || analysis.status === 'IN_PROGRESS')) {
        dispatch(pollAnalysisStatus(analysisId));
      }
    }
  }, [analysisId, analysis, isPolling, dispatch]);

  useEffect(() => {
    if (analysis?.chat?.messages) {
      setChatMessages(analysis.chat.messages);
    } else {
      setChatMessages([]);
    }
    if (containerRef.current) {
      gsap.fromTo(containerRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }
      );
    }
  }, [analysisId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !analysis?.chat?.id || !analysisId) return;

    const userMessage: ChatMessage = { role: 'user', content: newMessage };
    setChatMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setIsSending(true);

    try {
      const { aiMessage } = await dispatch(sendChatMessageAsync({
        analysisId: analysisId,
        chatId: analysis.chat.id,
        message: newMessage
      })).unwrap();

      setChatMessages(prev => [...prev, aiMessage]);

    } catch (err) {
      toast.error("Failed to send message.");
    } finally {
      setIsSending(false);
    }
  };

  const handleRerunAnalysis = () => {
    if (analysis) {
      // Navigate to the review page and pass the input_data for that analysis
      navigate('/review', { state: { extractedData: analysis.input_data } });
    }
  };
  // 5. If the analysis is pending, show the main loading screen
  if (!analysis || analysis.status === 'PENDING' || analysis.status === 'IN_PROGRESS') {
    return <LoadingScreen />;
  }
  if (analysis.status === 'FAILED') {
    return <FailedAnalysis analysis={analysis} onRerun={handleRerunAnalysis} />;
  }

  const { final_report, analysis_steps } = analysis;

  return (
    <div className={`min-h-full ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} p-6`}>
      <div ref={containerRef} className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
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
                <RotateCcw size={16} />
                <span>Rerun Analysis</span>
              </button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

          <div className="lg:col-span-2 space-y-6">
            {/* Summary Card */}
            <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6`}>
              <h2 className={`text-xl font-semibold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Overall Assessment
              </h2>
              <div className="flex flex-wrap justify-center gap-x-12 gap-y-6 mb-6">
                <ScoreGauge score={final_report.authenticity_score} title="Authenticity Score" theme={theme} />
                <ScoreGauge score={final_report.quality_score} title="Quality Score" theme={theme} />
              </div>
              <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <h3 className={`font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Summary
                </h3>
                <p className={`${theme === 'dark' ? 'text-gray-100' : 'text-gray-700'}`}>
                  {final_report.sidebar_summary}
                </p>
              </div>
            </div>

            {/* Map Card */}
            <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg  p-6`}>
              <div className="flex items-center space-x-2 mb-4">
                <MapPin size={20} className="text-yellow-400" />
                <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Location Verification
                </h2>
              </div>
              <MapComponent
                address={analysis.input_data.address}
                theme={theme}
                neighborhoodData={neighborhoodData}
                onLocationChange={() => { }}
              />

            </div>

            <FlagsCard flags={final_report.flags} />


            {/* Suggested Actions */}
            <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6`}>
              <h2 className={`text-xl font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Recommended Actions
              </h2>
              <div className="space-y-3">
                {final_report.suggested_actions.map((action, index) => (
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
            <div className={`${theme === 'dark' ? 'text-gray-300 bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6`}>
              <h2 className={`text-xl font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Detailed Explanation
              </h2>
              <p>
                {final_report.explanation}
              </p>
            </div>

            <AnalysisRunbook steps={analysis_steps} theme={theme} />

          </div>

          {/* Chat Interface - Right Side */}
          <div className="lg:col-span-1 sticky top-6">
            <div className={` ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg min-h-80 flex flex-col`}>


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
                {chatMessages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-lg ${message.role === 'user'
                        ? 'bg-yellow-400 text-gray-900'
                        : theme === 'dark'
                          ? 'bg-gray-700 text-gray-300'
                          : 'bg-gray-100 text-gray-700'
                        }`}
                    >
                      <p className="text-sm" dangerouslySetInnerHTML={{ __html: message.content.replace(/\n/g, '<br />') }}></p>
                    </div>
                  </div>
                ))}
                {isSending && chatMessages[chatMessages.length - 1].role === 'user' && (
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
                    onKeyPress={(e) => e.key === 'Enter' && !isSending && handleSendMessage()}
                    placeholder="Ask about the analysis..."
                    className={`flex-1 p-2 border rounded-lg text-sm ${theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                    disabled={isSending}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || isSending}
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
