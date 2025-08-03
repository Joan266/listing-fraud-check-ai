import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import UrlPreview from './UrlPreview';

interface UrlItem {
  url: string;
  title: string;
  description: string;
  thumbnail?: string;
  favicon?: string;
}

interface UrlCarouselProps {
  urls: UrlItem[];
  theme?: 'light' | 'dark';
}

const UrlCarousel: React.FC<UrlCarouselProps> = ({ urls, theme = 'light' }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextUrl = () => {
    setCurrentIndex((prev) => (prev + 1) % urls.length);
  };

  const prevUrl = () => {
    setCurrentIndex((prev) => (prev - 1 + urls.length) % urls.length);
  };

  const goToUrl = (index: number) => {
    setCurrentIndex(index);
  };

  if (urls.length === 0) return null;

  return (
    <div className="relative">
      {/* Main URL Display */}
      <div className="relative overflow-hidden">
        <div className="max-w-md mx-auto">
          <UrlPreview {...urls[currentIndex]} theme={theme} />
        </div>
        
        {/* Navigation Arrows */}
        {urls.length > 1 && (
          <>
            <button
              onClick={prevUrl}
              className={`absolute left-4 top-1/2 -translate-y-1/2 ${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700 border-gray-600' : 'bg-white hover:bg-gray-50 border-gray-200'} shadow-lg border ${theme === 'dark' ? 'text-white' : 'text-gray-700'} p-2 rounded-full transition-all duration-200 hover:shadow-xl z-10`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextUrl}
              className={`absolute right-4 top-1/2 -translate-y-1/2 ${theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700 border-gray-600' : 'bg-white hover:bg-gray-50 border-gray-200'} shadow-lg border ${theme === 'dark' ? 'text-white' : 'text-gray-700'} p-2 rounded-full transition-all duration-200 hover:shadow-xl z-10`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* URL Counter */}
        {urls.length > 1 && (
          <div className={`absolute top-4 right-4 ${theme === 'dark' ? 'bg-black/70' : 'bg-black/50'} text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm`}>
            {currentIndex + 1} / {urls.length}
          </div>
        )}
      </div>

      {/* Navigation Controls */}
      {urls.length > 1 && (
        <div className="mt-6">
          {/* Thumbnail Navigation */}
          <div className="flex justify-center gap-2 overflow-x-auto pb-2 mb-4">
            {urls.map((url, index) => (
              <button
                key={index}
                onClick={() => goToUrl(index)}
                className={`flex-shrink-0 p-2 rounded-lg border-2 transition-all duration-200 ${
                  index === currentIndex
                    ? `${theme === 'dark' ? 'border-yellow-400 bg-yellow-400/10' : 'border-yellow-500 bg-yellow-50'}`
                    : `${theme === 'dark' ? 'border-gray-600 hover:border-gray-500 bg-gray-800' : 'border-gray-200 hover:border-gray-300 bg-white'}`
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {url.favicon ? (
                    <img src={url.favicon} alt="" className="w-4 h-4 rounded-sm flex-shrink-0" />
                  ) : (
                    <div className={`w-4 h-4 ${theme === 'dark' ? 'bg-gray-600' : 'bg-gray-300'} rounded-sm flex-shrink-0`} />
                  )}
                  <span className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'} truncate max-w-20`}>
                    {new URL(url.url).hostname.replace('www.', '')}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Dot Indicators */}
          <div className="flex justify-center gap-2">
            {urls.map((_, index) => (
              <button
                key={index}
                onClick={() => goToUrl(index)}
                className={`h-2 rounded-full transition-all duration-200 ${
                  index === currentIndex
                    ? `${theme === 'dark' ? 'bg-yellow-400' : 'bg-yellow-500'} w-8`
                    : `${theme === 'dark' ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-300 hover:bg-gray-400'} w-2`
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UrlCarousel;