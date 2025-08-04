import React from 'react';
import { AlertTriangle, RotateCcw, Plus } from 'lucide-react';
import { Analysis } from '../../types';

interface FailedAnalysisProps {
  analysis: Analysis;
  onRerun: () => void;
}

export const FailedAnalysis: React.FC<FailedAnalysisProps> = ({ analysis, onRerun}) => {
  const errorMessage = (analysis.final_report as any)?.error || "An unknown error occurred.";

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Analysis Failed</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Unfortunately, we were unable to complete the analysis.
      </p>
      
      <div className="p-4 rounded-md bg-gray-100 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400 font-mono mb-8 w-full max-w-md">
        <strong>Error Details:</strong> {errorMessage}
      </div>

      <div className="flex space-x-4">
        <button onClick={onRerun} className="flex items-center space-x-2 px-4 py-2 border border-yellow-400 text-yellow-400 rounded-lg hover:bg-yellow-400 hover:text-black transition-colors">
          <RotateCcw size={16} />
          <span>Rerun Analysis</span>
        </button>
      </div>
    </div>
  );
};