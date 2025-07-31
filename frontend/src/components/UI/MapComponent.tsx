import React, { useState, useEffect, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF } from '@react-google-maps/api';

// --- Google Maps Styling for Dark Mode ---
const mapStylesDark = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  // ... more styles for roads, water, etc. can be found online
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
];

interface MapComponentProps {
  address?: string;
  theme: 'light' | 'dark';
  className?: string;
  onLocationChange: (location: { lat: number; lng: number; address: string }) => void;
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

const MapComponent: React.FC<MapComponentProps> = ({ address, theme, className = '', onLocationChange }) => {
  const apiKey = import.meta.env.VITE_Maps_API_KEY;


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

  return (
    <div className={`${className} overflow-hidden rounded-lg`}>
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
          }}
        >
          <MarkerF
            position={markerPosition}
            draggable={true}
            onDragEnd={handleMarkerDragEnd}
          />
        </GoogleMap>
      ) : (
        <div>Loading Map...</div>
      )}
    </div>
  );
};

export default MapComponent;