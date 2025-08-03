import React from 'react';
import { MapPin, Utensils, ShoppingCart, Train, Trees, Sun, Moon, Map, Satellite, Globe } from 'lucide-react';
import { LocationType, MapFilters } from '../../../types/PlaceTypes';

interface MapControlsProps {
  filters: MapFilters;
  onFilterChange: (type: LocationType) => void;
  theme: 'light' | 'dark';
  mapType: 'roadmap' | 'satellite';
  onMapTypeChange: (type: 'roadmap' | 'satellite') => void;
  className?: string;
  placeDetailsUrl?:string;
}


const MapControls: React.FC<MapControlsProps> = ({
  filters,
  onFilterChange,
  theme,
  mapType,
  onMapTypeChange,
  className = ''
}) => {
  const getLocationConfig = (type: LocationType) => {
    const baseConfig = {
      parks: {
        icon: Trees,
        label: 'Parks',
        activeColor: theme === 'dark' ? 'text-green-400' : 'text-green-600',
        activeBg: theme === 'dark' ? 'bg-green-900/20' : 'bg-green-50',
        activeBorder: theme === 'dark' ? 'border-green-600' : 'border-green-200',
      },
      restaurants: {
        icon: Utensils,
        label: 'Restaurants',
        activeColor: theme === 'dark' ? 'text-orange-400' : 'text-orange-600',
        activeBg: theme === 'dark' ? 'bg-orange-900/20' : 'bg-orange-50',
        activeBorder: theme === 'dark' ? 'border-orange-600' : 'border-orange-200',
      },
      supermarkets: {
        icon: ShoppingCart,
        label: 'Supermarkets',
        activeColor: theme === 'dark' ? 'text-blue-400' : 'text-blue-600',
        activeBg: theme === 'dark' ? 'bg-blue-900/20' : 'bg-blue-50',
        activeBorder: theme === 'dark' ? 'border-blue-600' : 'border-blue-200',
      },
      transit_stations: {
        icon: Train,
        label: 'Transit',
        activeColor: theme === 'dark' ? 'text-purple-400' : 'text-purple-600',
        activeBg: theme === 'dark' ? 'bg-purple-900/20' : 'bg-purple-50',
        activeBorder: theme === 'dark' ? 'border-purple-600' : 'border-purple-200',
      }
    };
    return baseConfig[type];
  };

  return (
    <div className={`${className} ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}  rounded-lg p-4 space-y-4`}>
      <div className="flex gap-2">

        <div className={`flex ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'} rounded-lg p-1`}>
          <button
            onClick={() => onMapTypeChange('roadmap')}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${mapType === 'roadmap'
              ? `${theme === 'dark' ? 'bg-gray-600 text-white' : 'bg-white text-gray-900'} shadow-sm`
              : `${theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`
              }`}
          >
            <Map className="w-4 h-4" />
            Map
          </button>
          <button
            onClick={() => onMapTypeChange('satellite')}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${mapType === 'satellite'
              ? `${theme === 'dark' ? 'bg-gray-600 text-white' : 'bg-white text-gray-900'} shadow-sm`
              : `${theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`
              }`}
          >
            <Satellite className="w-4 h-4" />
            Satellite
          </button>
        </div>
      </div>

      {/* Location Filters */}
      <div className="space-y-2">
        <h3 className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Show Locations</h3>
        <div className="grid grid-cols-4 gap-2">
          {(Object.keys(filters) as LocationType[]).map((type) => {
            const config = getLocationConfig(type);
            const Icon = config.icon;
            const isActive = filters[type];

            return (
              <button
                key={type}
                onClick={() => onFilterChange(type)}
                className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${isActive
                  ? `${config.activeBg} ${config.activeBorder} ${config.activeColor}`
                  : `${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`
                  }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{config.label}</span>
                </div>

              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MapControls;