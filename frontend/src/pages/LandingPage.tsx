import React, { useState, useRef, useEffect } from 'react';
import { Search, Lightbulb, Shield, Zap } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { extractDataAsync } from '../store/appSlice';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import { gsap } from 'gsap';

const LandingPage: React.FC = () => {
  const [listingText, setListingText] = useState('');
  const { loading, loadingMessage, theme } = useAppSelector((state) => state.app);
  const dispatch = useAppDispatch();
  
  const headerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const tipsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Entrance animations
    if (headerRef.current && formRef.current && tipsRef.current) {
      gsap.fromTo(headerRef.current, 
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }
      );
      
      gsap.fromTo(formRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8, delay: 0.2, ease: 'power2.out' }
      );
      
      gsap.fromTo(tipsRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8, delay: 0.4, ease: 'power2.out' }
      );
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (listingText.trim()) {
      dispatch(extractDataAsync(listingText.trim()));
    }
  };

  const tips = [
    {
      icon: <Search size={20} />,
      title: "Copy the entire listing",
      description: "Include the full listing page for best results"
    },
    {
      icon: <Shield size={20} />,
      title: "Include host information",
      description: "Profile details and communication help with verification"
    },
    {
      icon: <Zap size={20} />,
      title: "Analysis takes ~2 minutes",
      description: "Our AI thoroughly examines every detail"
    }
  ];

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center p-4`}>
      <div className="w-full max-w-4xl mx-auto">
        
        {/* Header */}
        <div ref={headerRef} className="text-center mb-12">
          <div className="inline-flex items-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-yellow-400 rounded-xl flex items-center justify-center">
              <Shield size={24} className="text-gray-900" />
            </div>
            <h1 className={`text-4xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              SafeLease
            </h1>
          </div>
          
          <h2 className={`text-3xl font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Spot scams before you sign
          </h2>
          
          <p className={`text-xl ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} max-w-2xl mx-auto`}>
            Our AI analyzes rental listings to detect fraud, verify addresses, and protect you from scams.
            <span className="relative inline-block ml-2">
              <span className="relative z-10">Get peace of mind</span>
              <span className="absolute bottom-1 left-0 w-full h-2 bg-yellow-400 opacity-30 rounded"></span>
            </span>
            in minutes.
          </p>
        </div>

        {/* Main Form */}
        <form ref={formRef} onSubmit={handleSubmit} className="mb-12">
          <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-2xl p-8 shadow-lg`}>
            <label className={`block text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Paste your rental listing here
            </label>
            
            <textarea
              value={listingText}
              onChange={(e) => setListingText(e.target.value)}
              placeholder="Copy and paste the entire rental listing including address, description, price, host information, and any other details..."
              className={`w-full h-48 p-4 border rounded-lg resize-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all ${
                theme === 'dark' 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
              disabled={loading}
            />
            
            <button
              type="submit"
              disabled={!listingText.trim() || loading}
              className="w-full mt-6 bg-yellow-400 hover:bg-yellow-500 disabled:bg-gray-400 disabled:cursor-not-allowed text-gray-900 font-semibold py-4 px-6 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
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
          </div>
        </form>

        {/* Tips Section */}
        <div ref={tipsRef} className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-2xl p-8 shadow-lg`}>
          <div className="flex items-start space-x-3 mb-6">
            <Lightbulb size={24} className="text-yellow-400 mt-1" />
            <div>
              <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Pro Tips for Best Results
              </h3>
              <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                Follow these guidelines to get the most accurate fraud analysis
              </p>
            </div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {tips.map((tip, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-gray-700 text-yellow-400' : 'bg-yellow-50 text-yellow-600'}`}>
                  {tip.icon}
                </div>
                <div>
                  <h4 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {tip.title}
                  </h4>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {tip.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;