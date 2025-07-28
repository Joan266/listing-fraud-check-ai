import React from 'react';
import { MapPin } from 'lucide-react';

interface MapComponentProps {
  address?: string;
  latitude?: number;
  longitude?: number;
  theme: 'light' | 'dark';
  className?: string;
}

const MapComponent: React.FC<MapComponentProps> = ({ 
  address, 
  latitude, 
  longitude, 
  theme, 
  className = '' 
}) => {
  // For demo purposes, we'll show a placeholder map
  // In production, you'd integrate with Google Maps, Mapbox, etc.
  
  return (
    <div className={`${className} relative overflow-hidden rounded-lg ${
      theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'
    } border`}>
      {latitude && longitude ? (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center">
            <MapPin size={48} className="mx-auto mb-4 text-yellow-400" />
            <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Location Verified
            </h3>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
              {address}
            </p>
            <div className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-500'} mt-2`}>
              {latitude.toFixed(6)}, {longitude.toFixed(6)}
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <div className="text-center">
            <MapPin size={48} className={`mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {address ? 'Verifying location...' : 'No address provided'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapComponent;