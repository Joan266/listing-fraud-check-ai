import React, { useState, useRef, useEffect } from 'react';
import { Search, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { extractDataAsync, startAnalysisAsync } from '../store/appSlice';
import { gsap } from 'gsap';
import LoadingSpinner from '../components/UI/LoadingSpinner';

const LandingPage: React.FC = () => {
  const [listingText, setListingText] = useState('');
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isLoading, loadingMessage, theme } = useAppSelector((state) => state.app);

  const headerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

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


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!listingText.trim()) return;
    dispatch(extractDataAsync(listingText));
    navigate('/review')
  };

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

        <form ref={formRef} onSubmit={handleSubmit} className="mb-12">
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
            disabled={!listingText.trim() || isLoading}
            className="w-full mt-6 bg-yellow-400 hover:bg-yellow-500 disabled:bg-gray-400 disabled:cursor-not-allowed text-gray-900 font-semibold py-4 px-6 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" color="text-gray-900" />
                <span>{loadingMessage}</span>
              </>
            ) : (
              <>
                <Search size={20} />
                <span>Check My Listing</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LandingPage;
