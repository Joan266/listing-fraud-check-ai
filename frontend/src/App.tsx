import React, { useEffect, useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { Menu } from 'lucide-react';
import { useAppSelector } from './hooks/redux';
import Sidebar from './components/Layout/Sidebar';
import ThemeToggle from './components/Layout/ThemeToggle';
import { LandingPage } from './pages/LandingPage';
import ReviewPage from './pages/ReviewPage';
import ResultsPage from './pages/ResultsPage';

const App: React.FC = () => {
  const { theme, error } = useAppSelector((state) => state.app);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (error) {
      toast.error(`Error: ${error}`);
    }
  }, [error]);

  useEffect(() => {
    document.body.className = theme;
  }, [theme]);

  return (
    <div className={`flex h-screen overflow-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}`}>

      {/* Mobile backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar: fixed overlay on mobile, static on desktop */}
      <div className={`
        fixed inset-y-0 left-0 z-50 transition-transform duration-300
        md:static md:translate-x-0
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className={`${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'} border-b px-6 py-4 flex items-center`}>
          <button
            className={`md:hidden p-1.5 rounded-lg ${theme === 'dark' ? 'text-gray-300 hover:bg-gray-600' : 'text-gray-600 hover:bg-gray-100'}`}
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>
          <div className="flex-1" />
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
