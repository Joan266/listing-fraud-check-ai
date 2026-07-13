import React, { useEffect, useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { Menu } from 'lucide-react';
import { useAppSelector, useAppDispatch } from './hooks/redux';
import { fetchHistoryAsync } from './store/appSlice';
import Sidebar from './components/Layout/Sidebar';
import { LandingPage } from './pages/LandingPage';
import ReviewPage from './pages/ReviewPage';
import ResultsPage from './pages/ResultsPage';

const App: React.FC = () => {
  const { error, sessionHistory, sessionId } = useAppSelector((state) => state.app);
  const dispatch = useAppDispatch();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (sessionId) {
      dispatch(fetchHistoryAsync());
    }
  }, [sessionId, dispatch]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (error) {
      toast.error(`Error: ${error}`);
    }
  }, [error]);

  const hasSidebar = sessionHistory.length > 0;

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        overflow: 'auto',
        background: '#090C12',
        fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
        color: '#E7ECF3',
      }}
      className="scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
    >
      {/* Mobile backdrop */}
      {hasSidebar && mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar: only when there's history */}
      {hasSidebar && (
        <div className={`
          fixed inset-y-0 left-0 z-50 transition-transform duration-300
          md:static md:translate-x-0
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <Sidebar />
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Mobile header — only when sidebar exists */}
        {hasSidebar && (
          <header style={{
            background: 'rgba(9,12,18,0.95)',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
          }}>
            <button
              className="md:hidden p-1.5 rounded-lg text-gray-400 hover:bg-white/05"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
          </header>
        )}

        <main style={{ flex: 1, overflowY: 'auto' }}>
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
            background: '#0C1017',
            color: '#E7ECF3',
            border: '1px solid rgba(255,255,255,0.1)',
            fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
          },
        }}
      />
    </div>
  );
};

export default App;
