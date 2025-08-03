import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';

interface ImageItem {
  url: string;
  title: string;
  source?: string;
}

interface ImageCarouselProps {
  images: ImageItem[];
  theme?: 'light' | 'dark';
}

const ImageCarousel: React.FC<ImageCarouselProps> = ({ images, theme = 'light' }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const goToImage = (index: number) => {
    setCurrentIndex(index);
  };

  if (images.length === 0) return null;

  return (
    <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-sm border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} overflow-hidden`}>
      {/* Main Image Display */}
      <div className={`relative aspect-video ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
        <img
          src={images[currentIndex].url}
          alt={images[currentIndex].title}
          className="w-full h-full object-cover"
        />
        
        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className={`absolute left-2 top-1/2 -translate-y-1/2 ${theme === 'dark' ? 'bg-black/60 hover:bg-black/80' : 'bg-black/50 hover:bg-black/70'} text-white p-1.5 rounded-full transition-colors duration-200`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextImage}
              className={`absolute right-2 top-1/2 -translate-y-1/2 ${theme === 'dark' ? 'bg-black/60 hover:bg-black/80' : 'bg-black/50 hover:bg-black/70'} text-white p-1.5 rounded-full transition-colors duration-200`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Image Counter */}
        {images.length > 1 && (
          <div className={`absolute top-2 right-2 ${theme === 'dark' ? 'bg-black/70' : 'bg-black/50'} text-white text-xs px-2 py-1 rounded-full`}>
            {currentIndex + 1} / {images.length}
          </div>
        )}
      </div>

      {/* Image Info */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'} truncate`}>
            {images[currentIndex].title}
          </h3>
          <a
            href={images[currentIndex].url}
            target="_blank"
            rel="noopener noreferrer"
            className={`${theme === 'dark' ? 'text-yellow-400 hover:text-yellow-300' : 'text-yellow-600 hover:text-yellow-700'} transition-colors duration-200`}
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* Thumbnail Navigation */}
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {images.map((image, index) => (
              <button
                key={index}
                onClick={() => goToImage(index)}
                className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                  index === currentIndex
                    ? `${theme === 'dark' ? 'border-yellow-400 ring-2 ring-yellow-400/30' : 'border-yellow-500 ring-2 ring-yellow-200'}`
                    : `${theme === 'dark' ? 'border-gray-600 hover:border-gray-500' : 'border-gray-200 hover:border-gray-300'}`
                }`}
              >
                <img
                  src={image.url}
                  alt={image.title}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}

        {/* Dot Indicators */}
        {images.length > 1 && images.length <= 5 && (
          <div className="flex justify-center gap-1 mt-3">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => goToImage(index)}
                className={`h-2 rounded-full transition-all duration-200 ${
                  index === currentIndex
                    ? `${theme === 'dark' ? 'bg-yellow-400' : 'bg-yellow-500'} w-6`
                    : `${theme === 'dark' ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-300 hover:bg-gray-400'} w-2`
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageCarousel;