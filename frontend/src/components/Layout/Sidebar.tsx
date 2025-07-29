import React from 'react';
import { Home, History, Settings, ChevronLeft, ChevronRight, Plus, FileSearch,Highlighter,ShieldCheck   } from 'lucide-react';
import { Link } from 'react-router-dom'; // Import Link

const Sidebar: React.FC = () => {
  const { sidebarCollapsed, analysisHistory, currentAnalysis, theme } = useAppSelector((state) => state.app);
 
  const handleNewAnalysis = () => {
  
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className={`${sidebarCollapsed ? 'w-20' : 'w-80'} transition-all duration-300 ${
      theme === 'dark' ? 'bg-gray-900 border-r border-gray-800' : 'bg-white border-r'
    } flex flex-col h-screen relative shadow-md`}>
      
      {/* Toggle Button */}
      <button
        onClick={() => dispatch(toggleSidebar())}
        className={`absolute -right-3 top-8 w-6 h-6 rounded-full flex items-center justify-center transition-colors shadow-lg border ${
          theme === 'dark' ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border-gray-700' : 'bg-white text-gray-600 hover:bg-gray-100 border-gray-300'
        }`}
      >
        {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      {/* Header */}
      <div className={`p-4 border-b ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
        <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3'}`}>
          <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center flex-shrink-0">
            <ShieldCheck   size={20} className="text-gray-900" />
          </div>
          {!sidebarCollapsed && (
            <div>
              <h1 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Safe<span className="text-yellow-400">Lease</span>
              </h1>
            </div>
          )}
        </div>
      </div>

      {/* New Analysis Button */}
      <div className="p-4">
        <Link
          to="/new"
          onClick={handleNewAnalysis}
          className={`w-full  py-2.5 bg-yellow-400 hover:bg-yellow-500 text-gray-900 rounded-lg font-semibold transition-all duration-200 flex items-center transform hover:scale-105 ${
            sidebarCollapsed ? 'justify-center px-2' : 'px-4 space-x-2'
          }`}
        >
          <Plus size={20} />
          {!sidebarCollapsed && <span>New Analysis</span>}
        </Link>
      </div>

      {/* Analysis History */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {!sidebarCollapsed && (
          <div className={`px-4 pt-4 pb-2 border-b ${theme === 'dark' ? 'border-gray-800' : 'border-gray-200'}`}>
            <h2 className={`text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} flex items-center space-x-2`}>
              <History size={14} />
              <span>Recent Analyses</span>
            </h2>
          </div>
        )}
        
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {analysisHistory.map((analysis) => (
            <Link
              key={analysis.id}
              to={`/results/${analysis.id}`} // Use Link for navigation
              className={`block w-full p-3 rounded-lg border text-left transition-all ${
                currentAnalysis?.id === analysis.id
                  ? theme === 'dark' 
                    ? 'bg-yellow-400/10 border-yellow-400/30'
                    : 'bg-yellow-100 border-yellow-300'
                  : theme === 'dark'
                    ? 'bg-gray-800/50 border-gray-700/50 hover:bg-gray-700/70 text-gray-300'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-gray-700'
              }`}
            >
              {!sidebarCollapsed ? (
                <>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs opacity-75">
                      {formatDate(analysis.createdAt)}
                    </span>
                    {analysis.finalReport && (
                      <div className="flex space-x-1.5">
                        <span className={`text-xs font-bold ${getScoreColor(analysis.finalReport.authenticityScore)}`}>
                          A:{analysis.finalReport.authenticityScore}
                        </span>
                        <span className={`text-xs font-bold ${getScoreColor(analysis.finalReport.qualityScore)}`}>
                          Q:{analysis.finalReport.qualityScore}
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
                </>
              ) : (
                 <div className="flex items-center justify-center">
                    {analysis.finalReport ? (
                        <span className={`text-sm font-bold ${getScoreColor(analysis.finalReport.authenticityScore)}`}>
                            {analysis.finalReport.authenticityScore}
                        </span>
                    ) : <History size={18} />}
                 </div>
              )}
            </Link>
          ))}
          
          {analysisHistory.length === 0 && !sidebarCollapsed && (
            <div className={`text-center py-8 ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
              <History size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No analyses yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
