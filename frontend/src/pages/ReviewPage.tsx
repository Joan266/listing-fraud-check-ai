import React, { useState, useRef, useEffect } from 'react';
import { Edit3, MapPin, User, Home, Image, DollarSign, MessageSquare, Plus, X } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../hooks/redux';
import { submitAnalysisAsync } from '../store/appSlice';
import { ExtractedData } from '../types';
import MapComponent from '../components/UI/MapComponent';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import { gsap } from 'gsap';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";


const ReviewPage: React.FC = () => {
  const { currentAnalysis, loading, loadingMessage, theme } = useAppSelector((state) => state.app);
  const dispatch = useAppDispatch();

  // --- Main state for all form data ---
  const [editableData, setEditableData] = useState<ExtractedData>(
    currentAnalysis?.extractedData || {}
  );

  // --- Local UI state for better UX ---
  const [addressInputValue, setAddressInputValue] = useState(currentAnalysis?.extractedData?.address || '');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [startDate, endDate] = dateRange;

  const containerRef = useRef<HTMLDivElement>(null);

  // Debouncing for address input
  useEffect(() => {
    if (addressInputValue === editableData.address) return;
    const debounceTimer = setTimeout(() => {
      setEditableData(prev => ({ ...prev, address: addressInputValue }));
    }, 500);
    return () => clearTimeout(debounceTimer);
  }, [addressInputValue, editableData.address]);

  // Sync state if Redux data changes
  useEffect(() => {
    if (currentAnalysis?.extractedData) {
      setEditableData(currentAnalysis.extractedData);
    }
  }, [currentAnalysis]);

  // Entrance animation
  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(containerRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }
      );
    }
  }, []);

  // --- Handlers ---
  const handleInputChange = (field: keyof ExtractedData, value: any) => {
    setEditableData(prev => ({ ...prev, [field]: value }));
  };

  const handleDateChange = (update: [Date | null, Date | null]) => {
  const [start, end] = update;
  setDateRange(update);

  handleInputChange('check_in', start ? start.toISOString() : null);
  handleInputChange('check_out', end ? end.toISOString() : null);
};
  const handleAddImageUrl = () => {
    const trimmedUrl = newImageUrl.trim();
    if (trimmedUrl && (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) && !(editableData.image_urls || []).includes(trimmedUrl)) {
      const updatedUrls = [...(editableData.image_urls || []), trimmedUrl];
      handleInputChange('image_urls', updatedUrls);
      setNewImageUrl('');
    }
  };

  const handleRemoveImageUrl = (indexToRemove: number) => {
    const updatedUrls = (editableData.image_urls || []).filter((_, index) => index !== indexToRemove);
    handleInputChange('image_urls', updatedUrls);
  };

  const handleMapUpdate = (newLocation: { lat: number; lng: number; address: string }) => {
    setEditableData(prev => ({ ...prev, address: newLocation.address }));
    setAddressInputValue(newLocation.address);
  };

  const handleSubmit = () => {
    dispatch(submitAnalysisAsync(editableData));
  };

  if (!currentAnalysis) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="text-center">
          <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            No analysis data found
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'} p-6`}>
      <div ref={containerRef} className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <Edit3 size={28} className="text-yellow-400" />
            <h1 className={`text-3xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Review & Edit Details
            </h1>
          </div>
          <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Verify the extracted information before running the full analysis
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 lg:items-start">

          {/* Editable Form - Left Side */}
          <div className="lg:col-span-2 space-y-6">

            {/* Property Information */}
            <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6`}>
              <div className="flex items-center space-x-2 mb-4">
                <Home size={20} className="text-yellow-400" />
                <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Property Information
                </h2>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Listing URL
                  </label>
                  <input
                    type="url"
                    value={editableData.listing_url || ''}
                    onChange={(e) => handleInputChange('listing_url', e.target.value)}
                    placeholder="https://www.airbnb.com/rooms/..."
                    className={`w-full p-3 border rounded-lg ${theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Property Type
                  </label>
                  <input
                    type="text"
                    value={editableData.property_type || ''}
                    onChange={(e) => handleInputChange('property_type', e.target.value)}
                    placeholder="e.g., Entire apartment"
                    className={`w-full p-3 border rounded-lg ${theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Address
                </label>
                <input
                  type="text"
                  value={addressInputValue}
                  onChange={(e) => setAddressInputValue(e.target.value)} // Actualiza el estado local al instante.
                  className={`w-full p-3 border rounded-lg ${theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                />
              </div>

              <div className="mt-4">
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  Description
                </label>
                <textarea
                  value={editableData.description || ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={4}
                  placeholder="A short description of the property..."
                  className={`w-full p-3 border rounded-lg resize-y ${theme === 'dark'
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                />
              </div>
            </div>

            {/* Host Information */}
            <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6`}>
              <div className="flex items-center space-x-2 mb-4">
                <User size={20} className="text-yellow-400" />
                <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Host Information
                </h2>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Host Name
                  </label>
                  <input
                    type="text"
                    value={editableData.host_name || ''}
                    onChange={(e) => handleInputChange('host_name', e.target.value)}
                    placeholder="e.g., John D."
                    className={`w-full p-3 border rounded-lg ${theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={editableData.email || ''}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="e.g., host@example.com"
                    className={`w-full p-3 border rounded-lg ${theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={editableData.phone || ''}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="e.g., +1 555-123-4567"
                    className={`w-full p-3 border rounded-lg ${theme === 'dark'
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                      }`}
                  />
                </div>
              </div>
            </div>

            {/* Communication */}
            <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6`}>
              <div className="flex items-center space-x-2 mb-4">
                <MessageSquare size={20} className="text-yellow-400" />
                <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Communication Text
                </h2>
              </div>
              <textarea
                value={editableData.communication_text || ''}
                onChange={(e) => handleInputChange('communication_text', e.target.value)}
                rows={4}
                placeholder="Paste any messages or communication with the host here..."
                className={`w-full p-3 border rounded-lg resize-y ${theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                  }`}
              />
            </div>

            {/* Image URLs */}
            <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6`}>
              <div className="flex items-center space-x-2 mb-4">
                <Image size={20} className="text-yellow-400" />
                <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Image URLs</h2>
              </div>

              <div className="flex items-center space-x-2 mb-4">
                <input
                  type="url"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddImageUrl()}
                  placeholder="https://example.com/image.jpg"
                  className={`flex-grow p-3 border rounded-lg ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
                />
                <button
                  onClick={handleAddImageUrl}
                  className="bg-yellow-400 text-gray-900 p-3 rounded-lg hover:bg-yellow-500 transition-colors flex-shrink-0"
                  aria-label="Add Image URL"
                >
                  <Plus size={24} />
                </button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {(editableData.image_urls || []).map((url, index) => (
                  <div key={index} className={`flex items-center justify-between p-2 rounded-md ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <span className={`truncate text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>{url}</span>
                    <button
                      onClick={() => handleRemoveImageUrl(index)}
                      className="text-red-500 hover:text-red-700 ml-4 flex-shrink-0"
                      aria-label={`Remove ${url}`}
                    >
                      <X size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Price Details */}
            <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6`}>
              <div className="flex items-center space-x-2 mb-4">
                <DollarSign size={20} className="text-yellow-400" />
                <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Price Details</h2>
              </div>
              <textarea
                value={editableData.price_details || ''}
                onChange={(e) => handleInputChange('price_details', e.target.value)}
                rows={4}
                placeholder="e.g., €150 per night"
                className={`w-full p-3 border rounded-lg ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
              />
            </div>

            {/* Reviews Display */}
            {(editableData.reviews && editableData.reviews.length > 0) && (
              <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6`}>
                <div className="flex items-center space-x-2 mb-4">
                  <MessageSquare size={20} className="text-yellow-400" />
                  <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Extracted Reviews</h2>
                </div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'} mb-4`}>
                  Reviews are included in the analysis but cannot be edited here.
                </p>
                <div className="space-y-3 max-h-48 overflow-y-auto pr-2">
                  {editableData.reviews.map((review, index) => (
                    <div key={index} className={`p-3 rounded-md text-sm ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                      <p className={`font-semibold ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>{review.reviewer_name} - {review.review_date}</p>
                      <p className={`mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{review.review_text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Side */}
          <div className="sticky top-6 lg:col-span-1 space-y-6">
            <div className="sticky top-6 space-y-6">

              {/* --- Trip Details Card --- */}
              <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6`}>
                <h2 className={`text-xl font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Trip Details
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Check-in / Check-out Dates
                    </label>
                    <div className={theme}> {/* This wrapper helps the calendar inherit the theme */}
                      <DatePicker
                        selectsRange={true}
                        startDate={startDate}
                        endDate={endDate}
                        onChange={handleDateChange}
                        isClearable={true}
                        minDate={new Date()}
                        placeholderText="Select your trip dates"
                        className={`w-full p-3 border rounded-lg ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                      Number of People
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g., 2"
                      value={editableData.number_of_people || ''}
                      onChange={(e) => handleInputChange('number_of_people', e.target.value ? parseInt(e.target.value) : null)}
                      className={`w-full p-3 border rounded-lg ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'}`}
                    />
                  </div>
                </div>
              </div>

              {/* Map Container */}
              <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg p-6`}>
                <div className="flex items-center space-x-2 mb-4">
                  <MapPin size={20} className="text-yellow-400" />
                  <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Location Verification
                  </h2>
                </div>
                <MapComponent
                  address={editableData.address}
                  theme={theme}
                  className="h-64"
                  onLocationChange={handleMapUpdate}
                />
              </div>

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full bg-yellow-400 hover:bg-yellow-500 disabled:bg-gray-400 disabled:cursor-not-allowed text-gray-900 font-semibold py-4 px-6 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" color="text-gray-900" />
                    <span>{loadingMessage}</span>
                  </>
                ) : (
                  <span>Start Full Analysis</span>
                )}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ReviewPage;