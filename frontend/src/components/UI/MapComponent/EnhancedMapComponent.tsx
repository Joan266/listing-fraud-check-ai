import React, { useState, useEffect, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, CircleF } from '@react-google-maps/api';
import { LocationType, MapFilters } from '../../../types/PlaceTypes';
import MapControls from '../MapComponent/MapControls';

// --- Google Maps Styling for Dark Mode ---
const mapStylesDark = [
  { elementType: "geometry", stylers: [{ color: "#1a1a1a" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a1a1a" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8a8a8a" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2a2a2a" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#1a1a1a" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#1e3a5f" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#2a2a2a" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b9a76" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
  { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#4b6878" }] },
  { featureType: "administrative.land_parcel", elementType: "labels.text.fill", stylers: [{ color: "#64779f" }] },
  { featureType: "administrative.province", elementType: "geometry.stroke", stylers: [{ color: "#4b6878" }] },
  { featureType: "landscape.man_made", elementType: "geometry.stroke", stylers: [{ color: "#334e87" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#023e58" }] },
];

interface MapComponentProps {
  address?: string;
  theme: 'light' | 'dark';
  neighborhoodData?: any;
  onLocationChange: (location: { lat: number; lng: number; address: string }) => void;
  isDraggable: boolean;
}

const containerStyle = {
  width: '100%',
  height: '100%',
};

// Default center (e.g., center of Spain)
const defaultCenter = {
  lat: 40.416775,
  lng: -3.703790
};

const MapComponent: React.FC<MapComponentProps> = ({ address, theme, onLocationChange, neighborhoodData, isDraggable = false }) => {
  const apiKey = import.meta.env.VITE_Maps_API_KEY;
  const markerColors = {
    parks: '#059669',
    restaurants: '#ea580c',
    supermarkets: '#2563eb',
    transit_stations: '#7c3aed'
  };

  const [mapType, setMapType] = useState<'roadmap' | 'satellite'>('roadmap');
  const [filters, setFilters] = useState<MapFilters>({
    parks: true,
    restaurants: true,
    supermarkets: true,
    transit_stations: true
  });

  const renderLocationMarkers = () => {
    const markers: JSX.Element[] = [];

    (Object.keys(neighborhoodData) as LocationType[]).forEach((type) => {
      if (filters[type]) {
        neighborhoodData[type].places.forEach((place, index) => {
          markers.push(
            <MarkerF
              key={`${type}-${index}`}
              position={place.location}
              title={place.name}
              icon={{
                url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="8" fill="${markerColors[type]}" stroke="white" stroke-width="2"/>
                    <circle cx="12" cy="12" r="4" fill="white"/>
                  </svg>
                `)}`,
                scaledSize: new window.google.maps.Size(24, 24),
                anchor: new window.google.maps.Point(12, 12)
              }}
              onClick={() => {
                // In a real app, you'd fetch place details here
                console.log(`Clicked on ${place.name}`);
              }}
            />
          );
        });
      }
    });

    return markers;
  };

  if (!apiKey) {
    return <div>Error: Google Maps API key is missing.</div>;
  }

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markerPosition, setMarkerPosition] = useState<google.maps.LatLngLiteral>(defaultCenter);

  // --- Address -> Map Geocoding ---
  useEffect(() => {
    if (isLoaded && address) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address: address }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const location = results[0].geometry.location;
          const newPos = { lat: location.lat(), lng: location.lng() };
          setMarkerPosition(newPos);
          map?.panTo(newPos);
        } else {
          console.error(`Geocode was not successful for the following reason: ${status}`);
        }
      });
    }
  }, [address, isLoaded, map]); // Rerun when address changes

  // --- Map -> Address Reverse Geocoding ---
  const handleMarkerDragEnd = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const newPos = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      setMarkerPosition(newPos); // Update visual position immediately

      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: newPos }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          // Call the parent handler with the new data
          onLocationChange({
            lat: newPos.lat,
            lng: newPos.lng,
            address: results[0].formatted_address,
          });
        }
      });
    }
  };

  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);
  const handleFilterChange = (type: LocationType) => {
    setFilters(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };
  return ( 
    <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border overflow-hidden h-full w-full rounded-lg`}>
      <MapControls
        filters={filters}
        onFilterChange={handleFilterChange}
        theme={theme}
        mapType={mapType}
        onMapTypeChange={setMapType}
      />
      <div className='h-96'>
        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={markerPosition}
            zoom={15}
            onLoad={onLoad}
            onUnmount={onUnmount}
            options={{
              styles: theme === 'dark' ? mapStylesDark : [],
              disableDefaultUI: true,
              zoomControl: true,
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: true,
              mapTypeId: mapType,
              gestureHandling: 'greedy'
            }}
          >
            <MarkerF
              position={markerPosition}
              draggable={isDraggable}
              onDragEnd={handleMarkerDragEnd}
            />
            {neighborhoodData && renderLocationMarkers()}
            <CircleF
              center={markerPosition}
              radius={1000} // 1km in meters
              options={{
                fillColor: '#e9bf0d',
                fillOpacity: 0.05,
                strokeColor: '#e9bf0d',
                strokeOpacity: 0.5,
                strokeWeight: 2,
                clickable: false,
                draggable: false,
                editable: false,
                visible: true,
                zIndex: 0
              }}
            />

          </GoogleMap>
        ) : (
          <div>Loading Map...</div>
        )}

      </div>

    </div>
  );
};

export default MapComponent;