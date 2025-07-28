import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { store } from './store';
import { useAppSelector } from './hooks/redux';
import Sidebar from './components/Layout/Sidebar';
import ThemeToggle from './components/Layout/ThemeToggle';
import LandingPage from './pages/LandingPage';
import ReviewPage from './pages/ReviewPage';
import ResultsPage from './pages/ResultsPage';
const AppContent: React.FC = () => {
  const { currentAnalysis, theme } = useAppSelector((state) => state.app);

  useEffect(() => {
    // Apply theme to document
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const getCurrentPage = () => {
    if (!currentAnalysis) {
      return <LandingPage />;
    }

    if (currentAnalysis.finalReport) {
      return <ResultsPage />;
    }

    return <ReviewPage />;
  };

  return (
    <div className={`flex h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b px-6 py-4 flex justify-end`}>
          <ThemeToggle />
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          {getCurrentPage()}
        </div>
      </div>

      {/* Toast Notifications */}
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

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
};

export default App;