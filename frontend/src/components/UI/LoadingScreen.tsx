import React, { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ShieldCheck, Eye, UserCheck } from 'lucide-react';
import { useAppSelector } from '../../hooks/redux';

// --- Sub-component for the Progress Bar ---
const ProgressBar: React.FC<{ progress: number; theme: 'light' | 'dark' }> = ({ progress, theme }) => {
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (progressRef.current) {
      gsap.to(progressRef.current, {
        width: `${progress}%`,
        duration: 0.5,
        ease: 'power2.out',
      });
    }
  }, [progress]);

  return (
    <div className="w-full">
      <div className={`w-full bg-opacity-20 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'} rounded-full h-2.5`}>
        <div
          ref={progressRef}
          className="bg-yellow-400 h-2.5 rounded-full"
          style={{ width: '0%' }}
        />
      </div>
    </div>
  );
};

// --- Main Loading Screen Component ---
export const LoadingScreen: React.FC = () => {
  const [progress, setProgress] = useState(0);
  const { theme } = useAppSelector((state) => state.app);
  const [stageText, setStageText] = useState('Initializing analysis...');
  const [tip, setTip] = useState('');

  const stages = [
    'Verifying address...',
    'Analyzing images for authenticity...',
    'Checking host reputation online...',
    'Analyzing description and reviews...',
    'Performing price sanity check...',
    'Compiling final report...',
  ];

  const tips = [
    'Always verify the property owner\'s identity before making any payments.',
    'Never pay a security deposit using instant cash transfer services.',
    'Trust your gut. If a deal seems too good to be true, it probably is.',
    'Schedule a live video call to tour the property and meet the host.'
  ];

  useEffect(() => {
    let progressInterval: NodeJS.Timeout;
    let tipInterval: NodeJS.Timeout;

    // Reset progress when loading starts
    setProgress(0);
    setTip(tips[0]);

    // Simulate a progress bar that moves but never quite reaches 100%
    progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + Math.random() * 5, 95));
    }, 800);

    // Cycle through tips
    tipInterval = setInterval(() => {
      setTip(prevTip => {
        const currentIndex = tips.indexOf(prevTip);
        const nextIndex = (currentIndex + 1) % tips.length;
        return tips[nextIndex];
      });
    }, 5000); // Change tip every 5 seconds


    return () => {
      clearInterval(progressInterval);
      clearInterval(tipInterval);
    };
  }, []);

  return (
     <div className={`h-full flex items-center justify-center p-4 transition-colors duration-300 ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
       <div className="text-center max-w-lg mx-auto">

        <div className="w-24 h-24 mx-auto mb-6 relative flex items-center justify-center">
          <div className="absolute inset-0 border-2 border-yellow-400/30 rounded-full animate-ping"></div>
          <div className="absolute inset-2 border-2 border-yellow-400/50 rounded-full animate-pulse"></div>
          <ShieldCheck className="w-12 h-12 text-yellow-400" />
        </div>

        <h2 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-700'} mb-3`}>Analysis in Progress</h2>
        <p className={`text-lg mb-8 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{stageText}</p>

        <ProgressBar progress={progress} theme={theme} />
        
        <div className="mt-12 text-center h-16">
            <p className="text-sm font-semibold text-yellow-400 mb-2">PRO TIP</p>
            <p className={`italic ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                "{tip}"
            </p>
        </div>


      </div>
    </div>
  );
};