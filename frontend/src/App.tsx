import React, { useEffect } from 'react';
import { Routes, Route, useParams, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { fetchHistoryAsync, loadAnalysisFromHistory, pollAnalysisStatus } from './store/appSlice';

const Loading = ({ message = "Loading..." }) => {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
        <p className="text-dark-200">{message}</p>
      </div>
    </div>
  );
};



  useEffect(() => {
    if (analysisId) {
      // If the analysis is not loaded, or is not complete, fetch/poll.
      const shouldPoll = currentAnalysis?.id === analysisId && !currentAnalysis.finalReport && currentAnalysis.status !== 'FAILED';

      if (currentAnalysis?.id !== analysisId) {
        dispatch(loadAnalysisFromHistory(analysisId));
      }
      if (shouldPoll) {
        dispatch(pollAnalysisStatus(analysisId));
      }
    }
    if (currentAnalysis?.status === 'COMPLETED') {
    dispatch(fetchHistoryAsync()); // Refresh history after completion
  }
  }, [analysisId, dispatch, currentAnalysis]);

  if (status === 'loading' || !currentAnalysis || currentAnalysis.id !== analysisId || !currentAnalysis.finalReport) {
    return <LoadingScreen />;
  }

  return <ResultsPage />;
};


  return (
    <div className={`flex h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b px-6 py-4 flex justify-end`}>
          <ThemeToggle />
        </header>
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/new" element={<LandingPage />} />
            <Route path="/review/:analysisId" element={<ReviewPageWrapper />} />
            <Route path="/results/:analysisId" element={<ResultsPageWrapper />} />
          </Routes>
        </main>
      </div>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: theme === 'dark' ? '#1F2937' : '#FFFFFF',
            color: theme === 'dark' ? '#F3F4F6' : '#1F2937',
            border: theme === 'dark' ? '1px solid #374151' : '1px solid #E5E7EB',
          },
        }}
      />
    </div>
  );
};

export default App;