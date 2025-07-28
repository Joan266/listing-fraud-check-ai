import React from 'react';
import { Home, History, Settings, ChevronLeft, ChevronRight, Plus, FileSearch } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import { toggleSidebar, resetCurrentAnalysis, loadAnalysisFromHistory } from '../../store/appSlice';

const Sidebar: React.FC = () => {
  const { sidebarCollapsed, analysisHistory, currentAnalysis, theme } = useAppSelector((state) => state.app);
  const dispatch = useAppDispatch();

  const handleNewAnalysis = () => {
    dispatch(resetCurrentAnalysis());
  };

  const handleLoadAnalysis = (analysisId: string) => {
    dispatch(loadAnalysisFromHistory(analysisId));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      time: 'short'
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className={`${sidebarCollapsed ? 'w-16' : 'w-80'} transition-all duration-300 ${
      theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
    } border-r flex flex-col h-screen relative`}>
      
      {/* Toggle Button */}
      <button
        onClick={() => dispatch(toggleSidebar())}
        className={`absolute -right-3 top-6 w-6 h-6 rounded-full ${
          theme === 'dark' ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        } flex items-center justify-center transition-colors shadow-lg border ${
          theme === 'dark' ? 'border-gray-700' : 'border-gray-300'
        }`}
      >
        {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3'}`}>
          <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center">
            <FileSearch size={18} className="text-gray-900" />
          </div>
          {!sidebarCollapsed && (
            <div>
              <h1 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                SafeLease
              </h1>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                AI Fraud Detection
              </p>
            </div>
          )}
        </div>
      </div>

      {/* New Analysis Button */}
      <div className="p-4">
        <button
          onClick={handleNewAnalysis}
          className={`w-full ${sidebarCollapsed ? 'px-2' : 'px-4'} py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-900 rounded-lg font-medium transition-colors flex items-center ${
            sidebarCollapsed ? 'justify-center' : 'space-x-2'
          }`}
        >
          <Plus size={18} />
          {!sidebarCollapsed && <span>New Analysis</span>}
        </button>
      </div>

      {/* Navigation */}
      <nav className="px-4 space-y-2">
        <a
          href="#"
          className={`flex items-center ${sidebarCollapsed ? 'justify-center px-2' : 'space-x-3 px-3'} py-2 rounded-lg ${
            theme === 'dark' ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'
          } transition-colors`}
        >
          <Home size={18} />
          {!sidebarCollapsed && <span>Dashboard</span>}
        </a>
        
        <a
          href="#"
          className={`flex items-center ${sidebarCollapsed ? 'justify-center px-2' : 'space-x-3 px-3'} py-2 rounded-lg ${
            theme === 'dark' ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'
          } transition-colors`}
        >
          <Settings size={18} />
          {!sidebarCollapsed && <span>Settings</span>}
        </a>
      </nav>

      {/* Analysis History */}
      {!sidebarCollapsed && (
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="px-4 py-2 border-b border-gray-800">
            <h2 className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} flex items-center space-x-2`}>
              <History size={16} />
              <span>Recent Analyses</span>
            </h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {analysisHistory.map((analysis) => (
              <button
                key={analysis.id}
                onClick={() => handleLoadAnalysis(analysis.id)}
                className={`w-full p-3 rounded-lg border text-left transition-all ${
                  currentAnalysis?.id === analysis.id
                    ? theme === 'dark' 
                      ? 'bg-yellow-400/10 border-yellow-400/30 text-yellow-400'
                      : 'bg-yellow-100 border-yellow-300 text-yellow-800'
                    : theme === 'dark'
                      ? 'bg-gray-800 border-gray-700 hover:bg-gray-750 text-gray-300'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-700'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs opacity-75">
                    {formatDate(analysis.createdAt)}
                  </span>
                  {analysis.finalReport && (
                    <div className="flex space-x-1">
                      <span className={`text-xs font-medium ${getScoreColor(analysis.finalReport.authenticity_score)}`}>
                        A:{analysis.finalReport.authenticity_score}
                      </span>
                      <span className={`text-xs font-medium ${getScoreColor(analysis.finalReport.quality_score)}`}>
                        Q:{analysis.finalReport.quality_score}
                      </span>
                    </div>
                  )}
                </div>
                <div className="text-sm font-medium truncate">
                  {analysis.extractedData.address || 'Unknown Address'}
                </div>
                <div className="text-xs opacity-75 truncate">
                  {analysis.extractedData.property_type || 'Property'}
                </div>
              </button>
            ))}
            
            {analysisHistory.length === 0 && (
              <div className={`text-center py-8 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                <History size={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">No analyses yet</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;