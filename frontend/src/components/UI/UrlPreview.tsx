import React from 'react';
import { ExternalLink, Globe } from 'lucide-react';

interface UrlPreviewProps {
  url: string;
  title: string;
  description: string;
  thumbnail?: string;
  favicon?: string;
  theme?: 'light' | 'dark';
}

const UrlPreview: React.FC<UrlPreviewProps> = ({
  url,
  title,
  description,
  thumbnail,
  favicon,
  theme = 'light'
}) => {
  const domain = new URL(url).hostname;

  return (
    <div className={`group ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-sm border ${theme === 'dark' ? 'border-gray-700 hover:border-yellow-400' : 'border-gray-200 hover:border-yellow-300'} hover:shadow-lg transition-all duration-300 overflow-hidden`}>
      {thumbnail && (
        <div className="relative overflow-hidden">
          <img
            src={thumbnail}
            alt={title}
            className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className={`absolute inset-0 bg-gradient-to-t ${theme === 'dark' ? 'from-black/40' : 'from-black/20'} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
        </div>
      )}
      
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          {favicon ? (
            <img src={favicon} alt="" className="w-4 h-4 rounded-sm" />
          ) : (
            <Globe className={`w-4 h-4 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`} />
          )}
          <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} truncate`}>{domain}</span>
          <ExternalLink className={`w-3 h-3 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-400'} ml-auto opacity-0 group-hover:opacity-100 transition-opacity duration-200`} />
        </div>
        
        <h3 className={`font-semibold ${theme === 'dark' ? 'text-white group-hover:text-yellow-400' : 'text-gray-900 group-hover:text-yellow-600'} mb-1 line-clamp-2 transition-colors duration-200`}>
          {title}
        </h3>
        
        <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} line-clamp-2 mb-3`}>
          {description}
        </p>
        
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1 text-xs font-medium ${theme === 'dark' ? 'text-yellow-400 hover:text-yellow-300' : 'text-yellow-600 hover:text-yellow-700'} transition-colors duration-200`}
        >
          Visit Link
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};

export default UrlPreview;