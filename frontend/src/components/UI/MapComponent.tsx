import { useState, useCallback, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF } from '@react-google-maps/api';

const containerStyle = {
  width: '100%',
  height: '100%',
};

// IMPORTANT: Add your Google Maps API Key to a .env.local file in the /frontend directory
// VITE_Maps_API_KEY=YOUR_KEY_HERE
const googleMapsApiKey = import.meta.env.VITE_Maps_API_KEY;

interface MapComponentProps {
  address: string;
  onAddressChange: (newAddress: string) => void;
}

const MapComponent = ({ address, onAddressChange }: MapComponentProps) => {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: googleMapsApiKey,
  });

  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (isLoaded && address) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ address }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const { lat, lng } = results[0].geometry.location;
          setPosition({ lat: lat(), lng: lng() });
        } else {
          console.error(`Geocode was not successful for the following reason: ${status}`);
        }
      });
    }
  }, [address, isLoaded]);

  const onMarkerDragEnd = useCallback((event: google.maps.MapMouseEvent) => {
    if (event.latLng) {
      const newLat = event.latLng.lat();
      const newLng = event.latLng.lng();
      setPosition({ lat: newLat, lng: newLng });
      
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: { lat: newLat, lng: newLng } }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
              onAddressChange(results[0].formatted_address);
          }
      });
    }
  }, [onAddressChange]);

  if (loadError) return <div>Error loading maps. Please ensure your API key is correct.</div>;
  if (!isLoaded) return <div>Loading Map...</div>;

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={position || { lat: 40.7128, lng: -74.0060 }} // Default to NYC if no position
      zoom={position ? 15 : 10}
    >
      {position && (
        <MarkerF
          position={position}
          draggable={true}
          onDragEnd={onMarkerDragEnd}
        />
      )}
    </GoogleMap>
  );
};

export default MapComponent;
