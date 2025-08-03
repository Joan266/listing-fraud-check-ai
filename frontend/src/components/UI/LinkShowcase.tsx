import React, { useState } from 'react';
import UrlCarousel from './UrlCarousel';
import ImageCarousel from './ImageCarousel';
import { Link, Image as ImageIcon, Sun, Moon } from 'lucide-react';

const LinkShowcase: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Mock URL data with previews
  const urlPreviews = [
    {
      url: 'https://github.com',
      title: 'GitHub: Where the world builds software',
      description: 'GitHub is where over 100 million developers shape the future of software, together.',
      thumbnail: 'https://images.pexels.com/photos/11035380/pexels-photo-11035380.jpeg?auto=compress&cs=tinysrgb&w=400&h=200&fit=crop',
      favicon: 'https://github.com/favicon.ico'
    },
    {
      url: 'https://tailwindcss.com',
      title: 'Tailwind CSS - Rapidly build modern websites',
      description: 'A utility-first CSS framework packed with classes to build any design, directly in your markup.',
      thumbnail: 'https://images.pexels.com/photos/196644/pexels-photo-196644.jpeg?auto=compress&cs=tinysrgb&w=400&h=200&fit=crop',
    },
    {
      url: 'https://react.dev',
      title: 'React - The library for web and native user interfaces',
      description: 'React lets you build user interfaces out of individual pieces called components.',
      thumbnail: 'https://images.pexels.com/photos/270348/pexels-photo-270348.jpeg?auto=compress&cs=tinysrgb&w=400&h=200&fit=crop',
    },
    {
      url: 'https://vercel.com',
      title: 'Vercel: Build and deploy the best web experiences',
      description: 'Vercel combines the best developer experience with an obsessive focus on end-user performance.',
      thumbnail: 'https://images.pexels.com/photos/577585/pexels-photo-577585.jpeg?auto=compress&cs=tinysrgb&w=400&h=200&fit=crop',
    }
  ];

  // Mock image data
  const imageGallery = [
    {
      url: 'https://images.pexels.com/photos/1714208/pexels-photo-1714208.jpeg?auto=compress&cs=tinysrgb&w=800',
      title: 'Modern Architecture'
    },
    {
      url: 'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=800',
      title: 'Mountain Landscape'
    },
    {
      url: 'https://images.pexels.com/photos/2662116/pexels-photo-2662116.jpeg?auto=compress&cs=tinysrgb&w=800',
      title: 'Ocean Waves'
    },
    {
      url: 'https://images.pexels.com/photos/1323550/pexels-photo-1323550.jpeg?auto=compress&cs=tinysrgb&w=800',
      title: 'Forest Path'
    }
  ];

  return (
    <div className={`min-h-screen transition-colors duration-300 ${theme === 'dark' ? 'bg-gradient-to-br from-gray-900 to-black' : 'bg-gradient-to-br from-gray-50 to-white'} py-12`}>
      <div className="max-w-6xl mx-auto px-6">
        {/* Header with Theme Toggle */}
        <div className="text-center mb-12 relative">
          <button
            onClick={toggleTheme}
            className={`absolute top-0 right-0 p-3 rounded-full transition-all duration-300 ${theme === 'dark' ? 'bg-yellow-400 text-black hover:bg-yellow-300' : 'bg-gray-800 text-white hover:bg-gray-700'}`}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          
          <h1 className={`text-4xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>
            Modern Link & Image Previews
          </h1>
          <p className={`text-xl ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} max-w-2xl mx-auto`}>
            Beautifully designed components with theme flexibility using black, grey, yellow, and white palette.
          </p>
        </div>

        {/* URL Previews Section */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <div className={`flex items-center justify-center w-10 h-10 ${theme === 'dark' ? 'bg-yellow-400/20' : 'bg-yellow-100'} rounded-lg`}>
              <Link className={`w-5 h-5 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`} />
            </div>
            <div>
              <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>URL Preview Carousel</h2>
              <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Navigate through rich link previews with smooth carousel controls</p>
            </div>
          </div>
          
          <UrlCarousel urls={urlPreviews} theme={theme} />
        </div>

        {/* Image Carousel Section */}
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className={`flex items-center justify-center w-10 h-10 ${theme === 'dark' ? 'bg-yellow-400/20' : 'bg-yellow-100'} rounded-lg`}>
              <ImageIcon className={`w-5 h-5 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`} />
            </div>
            <div>
              <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Image Gallery</h2>
              <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Interactive carousel with smooth navigation and theme support</p>
            </div>
          </div>
          
          <div className="max-w-2xl mx-auto">
            <ImageCarousel images={imageGallery} theme={theme} />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center">
          <div className={`inline-flex items-center gap-2 px-4 py-2 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-full shadow-sm border ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className={`w-2 h-2 ${theme === 'dark' ? 'bg-yellow-400' : 'bg-yellow-500'} rounded-full animate-pulse`}></div>
            <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>Theme-flexible components ready</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LinkShowcase;