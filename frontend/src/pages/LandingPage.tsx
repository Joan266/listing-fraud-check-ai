import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { setError } from '../store/appSlice';
import { apiClient } from '../api/client';
import { Search, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { LoadingScreen } from '../components/UI/LoadingScreen';
import { gsap } from 'gsap';
import LoadingSpinner from '../components/UI/LoadingSpinner';
export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isLoading: isGlobalLoading, sessionId, theme } = useAppSelector((state) => state.app);
  const headerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);



  const [isExtracting, setIsExtracting] = useState(false);
  const [listingText, setListingText] = useState('');
  useEffect(() => {

    if (headerRef.current && formRef.current) {

      gsap.fromTo(headerRef.current,

        { opacity: 0, y: 30 },

        { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }

      );

      gsap.fromTo(formRef.current,

        { opacity: 0, y: 30 },

        { opacity: 1, y: 0, duration: 0.8, delay: 0.2, ease: 'power2.out' }

      );

    }

  }, []);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedListingText = listingText.trim().replace(/\s+/g, ' ');

    if (cleanedListingText.length < 100) {
      toast('Please provide a listing with at least 100 characters.');

      return;
    }

    setIsExtracting(true);
    dispatch(setError(null));

    try {
      console.log('Extracting data from listing:', cleanedListingText);
      console.log('Session ID:', sessionId);
      const extractedData = await apiClient.extractData(sessionId, cleanedListingText);
      console.log('Extracted Data:', extractedData);
      navigate('/review', { state: { extractedData } });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process listing.';
      dispatch(setError(errorMessage));
    } finally {
      setIsExtracting(false);
    }
  };

  if (isGlobalLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className={`min-h-full ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center p-4`}>

      <div className="w-full max-w-4xl mx-auto py-8">

        <div ref={headerRef} className="text-center mb-12">

          <div className="inline-flex items-center space-x-3 mb-6">

            <ShieldCheck size={70} className="text-yellow-400" />

            <h1 className={`text-6xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>

              Safe<span className='text-yellow-400'>Lease</span>

            </h1>

          </div>

          <p className={`text-xl ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} max-w-2xl mx-auto`}>

            Our AI analyzes rental listings to detect fraud, verify addresses, and protect you from scams.

            <span className="relative inline-block ml-2">

              <span className={`text-xl ${theme === 'dark' ? 'text-gray-100' : 'text-black'} relative z-10`}>&nbsp;Get peace of mind in minutes.&nbsp;</span>

              <span className={`absolute bottom-0 left-0 w-full h-6 ${theme === 'dark' ? 'bg-yellow-400' : 'bg-yellow-200'} opacity-60 rounded`}></span>

            </span>

          </p>

        </div>
        <form ref={formRef} onSubmit={handleSubmit} className="mb-6">
          <textarea

            value={listingText}

            onChange={(e) => setListingText(e.target.value)}

            placeholder="Paste your rental listing here. Tip: Use Ctrl+A, then Ctrl+C to copy (Cmd+A / Cmd+C on Mac), and Ctrl+V to paste."

            className={`w-full h-48 p-4 border rounded-lg resize-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all ${theme === 'dark'

              ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400'

              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'

              }`}

          />
          <button
            type="submit"
            disabled={!listingText.trim() || isExtracting || isGlobalLoading}
            className="w-full mt-6 bg-yellow-400 hover:bg-yellow-500 disabled:bg-gray-400 disabled:cursor-not-allowed text-gray-900 font-semibold py-4 px-6 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {isExtracting ? (
              <>

                <LoadingSpinner size="sm" color="text-gray-900" />

                <span>Loading...</span>

              </>

            ) : (

              <>

                <Search size={20} />

                <span>Check My Listing</span>

              </>

            )}
          </button>
        </form>

        <div className="text-center">
          <Link to="/review" className="text-sm text-gray-500 hover:text-yellow-400 transition-colors">
            or skip and fill the form manually
          </Link>
        </div>
      </div>
    </div>
  );
};