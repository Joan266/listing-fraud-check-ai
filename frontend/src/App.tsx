import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { useAppSelector } from './hooks/redux';
import Sidebar from './components/Layout/Sidebar';
import ThemeToggle from './components/Layout/ThemeToggle';
import {LandingPage} from './pages/LandingPage';
import ReviewPage from './pages/ReviewPage';
import ResultsPage from './pages/ResultsPage';
const App: React.FC = () => {
  const {  theme, error } = useAppSelector((state) => state.app);
  
  useEffect(() => {
    if (error) {
      toast.error(`Error: ${error}`);
    }
  }, [error]);

  useEffect(() => {
    document.body.className = theme;
  }, [theme]);



  return (
    <div className={`flex h-screen ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}`}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className={`${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'} border-b px-6 py-4 flex justify-end`}>
          <ThemeToggle />
        </header>
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/review" element={<ReviewPage />} />
            <Route path="/results/:analysisId" element={<ResultsPage />} />
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
