// src/components/InputForm.tsx
import React, { useState, useRef, useEffect } from 'react';
import type { ListingData } from '../types';
import './InputForm.css';
import { useMapsLibrary } from '@vis.gl/react-google-maps'; // <-- Import the hook

interface InputFormProps {
  onSubmit: (data: ListingData) => void;
  isLoading: boolean;
}

const InputForm: React.FC<InputFormProps> = ({ onSubmit, isLoading }) => {
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrls, setImageUrls] = useState('');
  
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  // --- NEW: Use the hook to safely load the 'places' library ---
  const places = useMapsLibrary('places');

  // This useEffect will now re-run when the 'places' library is loaded
  useEffect(() => {
    // Wait until both the input element and the places library are ready
    if (!inputRef.current || !places) {
      return;
    }

    // Now it's safe to create the Autocomplete instance
    autocompleteRef.current = new places.Autocomplete(inputRef.current, {
      types: ['address'],
      fields: ['formatted_address']
    });

    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current?.getPlace();
      if (place?.formatted_address) {
        setAddress(place.formatted_address);
      }
    });

  }, [places]); // The dependency array ensures this runs when 'places' is ready

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const urls = imageUrls.split('\n').filter(url => url.trim() !== '');
    onSubmit({
      address,
      description,
      image_urls: urls
    });
  };

  return (
    <form className="input-form-container" onSubmit={handleSubmit}>
      <div className="form-field">
        <label htmlFor="address-input">1. Rental Address</label>
        <input
          ref={inputRef}
          id="address-input"
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Type and select the address..."
          required
          disabled={isLoading}
        />
      </div>
      {/* ... rest of the form is the same ... */}
       <div className="form-field">
        <label htmlFor="description-input">2. Listing Description (Optional)</label>
        <textarea
          id="description-input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Paste the full description text here..."
          disabled={isLoading}
        />
      </div>
      <div className="form-field">
        <label htmlFor="image-urls-input">3. Listing Image URLs (Optional)</label>
        <textarea
          id="image-urls-input"
          value={imageUrls}
          onChange={(e) => setImageUrls(e.target.value)}
          placeholder="Paste image URLs, one per line..."
          disabled={isLoading}
        />
      </div>
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Analyzing...' : 'Run Full Analysis'}
      </button>
    </form>
  );
};

export default InputForm;