import React, { useEffect } from 'react';
import { Routes, Route, useParams, useNavigate, useLocation } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';
import { useAppSelector, useAppDispatch } from './hooks/redux';
import { fetchHistoryAsync, fetchAnalysisByIdAsync,pollAnalysisStatus, setCurrentAnalysisId } from './store/appSlice';

import Sidebar from './components/Layout/Sidebar';
import ThemeToggle from './components/Layout/ThemeToggle';
import LandingPage from './pages/LandingPage';
import ReviewPage from './pages/ReviewPage';
import ResultsPage from './pages/ResultsPage';
import { LoadingScreen } from './components/UI/LoadingScreen';

// Remove the isLoading check from this wrapper
const LadingPageWrapper = () => {
  const { error } = useAppSelector((state) => state.app);
  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);
  return <LandingPage />;
};

// Remove the isLoading check from this wrapper
const ReviewPageWrapper = () => {
  const { error } = useAppSelector((state) => state.app);
  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);
  return <ReviewPage />;
};

const ResultsPageWrapper = () => {
  const { analysisId } = useParams<{ analysisId: string }>();
  const dispatch = useAppDispatch();
  useEffect(() => {
    // Define an async function to handle the logic
    const handleFetchAndPoll = async () => {
      if (analysisId) {
        try {
          // 1. Dispatch the fetch thunk and wait for its result
          const analysis = await dispatch(fetchAnalysisByIdAsync(analysisId)).unwrap();

          // 2. Now 'analysis' is the actual payload. Check its status.
          if (analysis.status === 'IN_PROGRESS' || analysis.status === 'PENDING') {
            // 3. If it's still running, dispatch the polling thunk.
            //    We don't need to await this one; it will run in the background.
            dispatch(pollAnalysisStatus(analysis.id));
          }
        } catch (error) {
          // The .unwrap() will throw an error if the thunk is rejected
          console.error("Failed to fetch or poll analysis:", error);
          toast.error("Could not load the analysis.");
        }
      }
    };

    handleFetchAndPoll();
  }, [analysisId, dispatch]);

  // The global loading screen in App.tsx handles the loading state.
  return <ResultsPage />;
};

const App: React.FC = () => {
  const { theme, isLoading, error } = useAppSelector((state) => state.app);
  const dispatch = useAppDispatch();
  const location = useLocation();

   useEffect(() => {
    if (error) {
      toast.error(`Error: ${error}`);
    }
  }, [error]);

  useEffect(() => {
    // Set the theme on the body element for global styling
    document.body.className = theme;
  }, [theme]);

  useEffect(() => {
      // Fetch initial history on app load
      dispatch(fetchHistoryAsync());
  }, [dispatch]);

  // Handle new analysis flow
  const isNewAnalysisFlow = location.pathname === '/new' || location.pathname === '/';
  useEffect(() => {
    if (isNewAnalysisFlow) {
      dispatch(setCurrentAnalysisId(null));
    }
  }, [isNewAnalysisFlow, dispatch]);


  return (
    <div className={`flex h-screen ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}`}>
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className={`${theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'} border-b px-6 py-4 flex justify-end`}>
          <ThemeToggle />
        </header>
        <main className="flex-1 overflow-auto">
           {isLoading && <LoadingScreen />}
           <div style={{ visibility: isLoading ? 'hidden' : 'visible', height: '100%' }}>
            <Routes>
              <Route path="/" element={<LadingPageWrapper/>} />
              <Route path="/new" element={<LadingPageWrapper />} />
              <Route path="/review" element={<ReviewPageWrapper />} />
              <Route path="/results/:analysisId" element={<ResultsPageWrapper />} />
            </Routes>
          </div>
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
