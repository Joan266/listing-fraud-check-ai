import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { setCurrentAnalysisId, setError } from '../store/appSlice';
import { apiClient } from '../api/client';
import {
  Search, Link as LinkIcon, ShieldCheck, Type, ArrowDown,
  MapPin, BarChart3, AlertTriangle, Scan, Building2, Globe,
  ClipboardPaste, Cpu, FileCheck,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { LoadingScreen } from '../components/UI/LoadingScreen';
import { gsap } from 'gsap';
import LoadingSpinner from '../components/UI/LoadingSpinner';

const FEATURES = [
  {
    icon: MapPin,
    title: 'Address verification',
    description: 'Cross-referenced against Catastro and Google Maps to confirm the property exists at the stated location.',
  },
  {
    icon: BarChart3,
    title: 'Price analysis',
    description: 'Compared to local market rates to catch suspiciously low prices designed to lure victims.',
  },
  {
    icon: AlertTriangle,
    title: 'Scam pattern detection',
    description: 'Matched against known fraud tactics, urgency pressure, and common red flags.',
  },
  {
    icon: Scan,
    title: 'Image forensics',
    description: 'Reverse-searched and analyzed for stolen, duplicated, or AI-generated listing photos.',
  },
  {
    icon: Building2,
    title: 'Neighborhood analysis',
    description: 'Local context verified — nearby amenities, transport connections, and area reputation.',
  },
  {
    icon: Globe,
    title: 'URL & host check',
    description: 'Domain age, registration details, and host profile cross-verified for authenticity.',
  },
];

const STEPS = [
  {
    icon: ClipboardPaste,
    title: 'Paste your listing',
    description: 'Copy the text or drop a URL from any rental site.',
  },
  {
    icon: Cpu,
    title: 'AI runs the checks',
    description: 'Six verification layers analyze address, price, photos, host, area, and URL.',
  },
  {
    icon: FileCheck,
    title: 'Get your report',
    description: 'A clear risk score with every red flag explained.',
  },
];

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isLoading: isGlobalLoading, sessionId, theme } = useAppSelector((state) => state.app);

  const heroRef = useRef<HTMLDivElement>(null);
  const stepsRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const formSectionRef = useRef<HTMLElement>(null);
  const highlightRef = useRef<HTMLSpanElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const [inputMode, setInputMode] = useState<'text' | 'url'>('text');
  const [isExtracting, setIsExtracting] = useState(false);
  const [listingText, setListingText] = useState('');
  const [listingUrl, setListingUrl] = useState('');

  const isDark = theme === 'dark';

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('from_extension') !== 'true') return;
    window.history.replaceState({}, '', '/');
    const stored = localStorage.getItem('fraudcheck_extension_data');
    localStorage.removeItem('fraudcheck_extension_data');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const data = parsed?.extracted_data;
        if (
          data &&
          typeof data === 'object' &&
          !Array.isArray(data) &&
          (data.address || data.description || data.listing_url)
        ) {
          toast.success('Datos recibidos de la extension de Chrome');
          navigate('/review', { state: { extractedData: data } });
          return;
        }
      } catch { /* discard malformed data */ }
    }
  }, []);

  useEffect(() => {
    dispatch(setCurrentAnalysisId(null));
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    [heroRef, stepsRef, featuresRef, formSectionRef].forEach((ref, i) => {
      if (ref.current) {
        tl.fromTo(ref.current, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.7 }, i * 0.15);
      }
    });

    if (highlightRef.current) {
      tl.fromTo(highlightRef.current, { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: 'power2.inOut' }, 0.5);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsExtracting(true);
    dispatch(setError(null));
    try {
      if (inputMode === 'url') {
        const trimmedUrl = listingUrl.trim();
        if (!trimmedUrl) {
          toast('Please enter a listing URL.');
          setIsExtracting(false);
          return;
        }
        const result = await apiClient.extractFromUrl(sessionId, trimmedUrl);
        navigate('/review', { state: { extractedData: result.extracted_data } });
      } else {
        const cleanedListingText = listingText.trim().replace(/\s+/g, ' ');
        if (cleanedListingText.length < 100) {
          toast('Please provide a listing with at least 100 characters.');
          setIsExtracting(false);
          return;
        }
        const extractedData = await apiClient.extractData(sessionId, cleanedListingText);
        navigate('/review', { state: { extractedData } });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process listing.';
      dispatch(setError(errorMessage));
    } finally {
      setIsExtracting(false);
    }
  };

  const scrollToForm = () => formSectionRef.current?.scrollIntoView({ behavior: 'smooth' });

  if (isGlobalLoading) return <LoadingScreen />;

  return (
    <div className={`min-h-full ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>

      {/* Hero */}
      <section className="px-6 pt-16 pb-20 max-w-4xl mx-auto text-center" ref={heroRef} style={{ opacity: 0 }}>
        <div className="flex items-center justify-center gap-3 mb-8">
          <ShieldCheck size={48} className="text-yellow-400" />
          <span className={`font-display text-4xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Safe<span className="text-yellow-400">Lease</span>
          </span>
        </div>

        <h1 className={`font-display text-5xl md:text-6xl font-bold leading-tight mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Check{' '}
          <span className="relative inline-block">
            <span className="relative z-10">before you sign</span>
            <span
              ref={highlightRef}
              className="absolute bottom-1 left-0 w-full h-3 bg-yellow-400/50 rounded-sm origin-left scale-x-0"
            />
          </span>
        </h1>

        <p className={`font-body text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-8 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          Paste any rental listing — our AI cross-references the address, price, photos,
          and host against public records and known scam patterns.
        </p>

        <div className={`flex items-center justify-center gap-6 text-sm font-body mb-10 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          <span>Free</span>
          <span className={`w-1 h-1 rounded-full ${isDark ? 'bg-gray-600' : 'bg-gray-300'}`} />
          <span>No sign-up</span>
          <span className={`w-1 h-1 rounded-full ${isDark ? 'bg-gray-600' : 'bg-gray-300'}`} />
          <span>Results in minutes</span>
        </div>

        <button
          onClick={scrollToForm}
          className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-display font-semibold px-8 py-3.5 rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
        >
          Check a listing
          <ArrowDown size={18} />
        </button>
      </section>

      {/* Divider */}
      <div className="max-w-4xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-yellow-400/30 to-transparent" />
      </div>

      {/* How it works */}
      <section className="px-6 py-20 max-w-4xl mx-auto" ref={stepsRef} style={{ opacity: 0 }}>
        <p className={`font-display text-sm font-semibold tracking-widest uppercase text-center mb-12 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          How it works
        </p>
        <div className="grid md:grid-cols-3 gap-10">
          {STEPS.map((step, i) => (
            <div key={i} className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-yellow-400/10 mb-4">
                <step.icon size={22} className="text-yellow-400" />
              </div>
              <h3 className={`font-display font-semibold text-lg mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {step.title}
              </h3>
              <p className={`font-body text-sm leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className={`px-6 py-20 ${isDark ? 'bg-gray-800/30' : 'bg-white/60'}`} ref={featuresRef} style={{ opacity: 0 }}>
        <div className="max-w-4xl mx-auto">
          <p className={`font-display text-sm font-semibold tracking-widest uppercase text-center mb-12 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Six verification layers
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((feature, i) => (
              <div
                key={i}
                className={`p-5 rounded-xl border transition-colors ${
                  isDark
                    ? 'border-gray-700/50 bg-gray-800/40 hover:border-yellow-400/20'
                    : 'border-gray-200 bg-white hover:border-yellow-400/40'
                }`}
              >
                <feature.icon size={20} className="text-yellow-400 mb-3" />
                <h3 className={`font-display font-semibold text-sm mb-1.5 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {feature.title}
                </h3>
                <p className={`font-body text-sm leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Form */}
      <section ref={formSectionRef} className="px-6 py-20 max-w-3xl mx-auto" style={{ opacity: 0 }}>
        <h2 className={`font-display text-2xl font-bold text-center mb-8 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Check a listing now
        </h2>

        <form ref={formRef} onSubmit={handleSubmit}>
          <div className="flex justify-center mb-4">
            <div className={`inline-flex rounded-lg p-1 ${isDark ? 'bg-gray-800' : 'bg-gray-200'}`}>
              <button
                type="button"
                onClick={() => setInputMode('text')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-display font-medium transition-all ${
                  inputMode === 'text'
                    ? 'bg-yellow-400 text-gray-900'
                    : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Type size={16} />
                <span>Paste Text</span>
              </button>
              <button
                type="button"
                onClick={() => setInputMode('url')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-display font-medium transition-all ${
                  inputMode === 'url'
                    ? 'bg-yellow-400 text-gray-900'
                    : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <LinkIcon size={16} />
                <span>Paste URL</span>
              </button>
            </div>
          </div>

          {inputMode === 'text' ? (
            <textarea
              value={listingText}
              onChange={(e) => setListingText(e.target.value)}
              placeholder="Paste your rental listing here. Tip: Ctrl+A to select all, Ctrl+C to copy, Ctrl+V to paste."
              className={`w-full h-48 p-4 border rounded-lg resize-none font-body focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all ${
                isDark
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              }`}
            />
          ) : (
            <input
              type="url"
              value={listingUrl}
              onChange={(e) => setListingUrl(e.target.value)}
              placeholder="https://www.airbnb.com/rooms/12345678 or any rental listing URL"
              className={`w-full p-4 border rounded-lg font-body focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all ${
                isDark
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              }`}
            />
          )}

          <button
            type="submit"
            disabled={(inputMode === 'text' ? !listingText.trim() : !listingUrl.trim()) || isExtracting || isGlobalLoading}
            className="w-full mt-6 bg-yellow-400 hover:bg-yellow-500 disabled:bg-gray-400 disabled:cursor-not-allowed text-gray-900 font-display font-semibold py-4 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
          >
            {isExtracting ? (
              <>
                <LoadingSpinner size="sm" color="text-gray-900" />
                <span>{inputMode === 'url' ? 'Scraping & Extracting...' : 'Extracting data...'}</span>
              </>
            ) : (
              <>
                <Search size={20} />
                <span>Check My Listing</span>
              </>
            )}
          </button>
        </form>

        {!isExtracting && (
          <div className="text-center mt-4">
            <Link
              to="/review"
              className={`font-body text-sm hover:text-yellow-400 transition-colors ${isDark ? 'text-gray-500' : 'text-gray-400'}`}
            >
              or skip and fill the form manually
            </Link>
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className={`px-6 py-8 border-t ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-yellow-400" />
            <span className={`font-display text-sm font-semibold ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>SafeLease</span>
          </div>
          <p className={`font-body text-xs ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
            AI-powered rental fraud detection
          </p>
        </div>
      </footer>
    </div>
  );
};
