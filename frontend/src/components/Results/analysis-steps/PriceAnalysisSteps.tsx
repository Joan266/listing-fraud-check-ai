import React from 'react';
import { DollarSign, MapPin, Home, Users, Calendar, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

interface PriceAnalysisStepProps {
  inputs_used: {
    address?: string;
    description?: string;
    price_details?: string;
    property_type?: string;
  };
  result: {
    reason?: string;
    verdict?: string;
  };
  theme?: 'light' | 'dark';
}

const PriceAnalysisStep: React.FC<PriceAnalysisStepProps> = ({ inputs_used, result, theme = 'light' }) => {
  const getVerdictIcon = (verdict: string) => {
    switch (verdict?.toLowerCase()) {
      case 'reasonable': return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'suspicious': return <AlertTriangle className="w-6 h-6 text-yellow-500" />;
      case 'unreasonable': return <XCircle className="w-6 h-6 text-red-500" />;
      default: return <DollarSign className="w-6 h-6 text-gray-500" />;
    }
  };

  const getVerdictColor = (verdict: string) => {
    switch (verdict?.toLowerCase()) {
      case 'reasonable': return 'text-green-500';
      case 'suspicious': return 'text-yellow-500';
      case 'unreasonable': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getVerdictBg = (verdict: string) => {
    switch (verdict?.toLowerCase()) {
      case 'reasonable': 
        return theme === 'dark' ? 'bg-green-900/30 border-green-700' : 'bg-green-50 border-green-200';
      case 'suspicious': 
        return theme === 'dark' ? 'bg-yellow-900/30 border-yellow-700' : 'bg-yellow-50 border-yellow-200';
      case 'unreasonable': 
        return theme === 'dark' ? 'bg-red-900/30 border-red-700' : 'bg-red-50 border-red-200';
      default: 
        return theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200';
    }
  };

  // Extract price from price_details string
  const extractPrice = (priceDetails: string) => {
    const match = priceDetails.match(/€\s*([0-9,]+)/);
    return match ? match[0] : priceDetails;
  };

  // Extract duration from price_details
  const extractDuration = (priceDetails: string) => {
    const weekMatch = priceDetails.match(/(\d+)\s*week/i);
    const dayMatch = priceDetails.match(/(\d+)\s*day/i);
    const nightMatch = priceDetails.match(/(\d+)\s*night/i);
    
    if (weekMatch) return `${weekMatch[1]} week${weekMatch[1] !== '1' ? 's' : ''}`;
    if (dayMatch) return `${dayMatch[1]} day${dayMatch[1] !== '1' ? 's' : ''}`;
    if (nightMatch) return `${nightMatch[1]} night${nightMatch[1] !== '1' ? 's' : ''}`;
    return 'Stay duration';
  };

  // Extract guests from price_details
  const extractGuests = (priceDetails: string) => {
    const match = priceDetails.match(/(\d+)\s*adult/i);
    return match ? `${match[1]} adults` : 'Guests';
  };

  // Extract accommodation type from price_details
  const extractAccommodation = (priceDetails: string) => {
    const suiteMatch = priceDetails.match(/(\d+)\s*suite/i);
    const roomMatch = priceDetails.match(/(\d+)\s*room/i);
    
    if (suiteMatch) return `${suiteMatch[1]} suite${suiteMatch[1] !== '1' ? 's' : ''}`;
    if (roomMatch) return `${roomMatch[1]} room${roomMatch[1] !== '1' ? 's' : ''}`;
    return inputs_used.property_type || 'Accommodation';
  };

  // Truncate description for display
  const truncateDescription = (text: string, maxLength: number = 200) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className="space-y-6">
      {/* Price Overview */}
      <div className={`p-6 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center gap-4 mb-6">
          <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-yellow-400/20' : 'bg-yellow-100'}`}>
            <DollarSign className={`w-6 h-6 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`} />
          </div>
          <div>
            <h4 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {inputs_used.price_details ? extractPrice(inputs_used.price_details) : 'Price not available'}
            </h4>
            <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {inputs_used.price_details ? extractDuration(inputs_used.price_details) : 'Duration not specified'}
            </p>
          </div>
        </div>

        {/* Booking Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Property Type */}
          <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-2 mb-2">
              <Home className={`w-5 h-5 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`} />
              <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Property
              </span>
            </div>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              {extractAccommodation(inputs_used.price_details || '')}
            </p>
          </div>

          {/* Guests */}
          <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-2 mb-2">
              <Users className={`w-5 h-5 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`} />
              <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Guests
              </span>
            </div>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              {extractGuests(inputs_used.price_details || '')}
            </p>
          </div>

          {/* Duration */}
          <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-2 mb-2">
              <Calendar className={`w-5 h-5 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`} />
              <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Duration
              </span>
            </div>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              {extractDuration(inputs_used.price_details || '')}
            </p>
          </div>

          {/* Location */}
          <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-2 mb-2">
              <MapPin className={`w-5 h-5 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`} />
              <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Location
              </span>
            </div>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} line-clamp-2`}>
              {inputs_used.address ? inputs_used.address.split(',')[0] : 'Location not specified'}
            </p>
          </div>
        </div>

        {/* Price Verdict */}
        <div className={`p-4 rounded-lg border ${getVerdictBg(result.verdict || 'unknown')}`}>
          <div className="flex items-center gap-3 mb-3">
            {getVerdictIcon(result.verdict || 'unknown')}
            <div>
              <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Price Analysis
              </span>
              <p className={`text-lg font-semibold ${getVerdictColor(result.verdict || 'unknown')}`}>
                {result.verdict || 'Unknown'}
              </p>
            </div>
          </div>
          {result.reason && (
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              {result.reason}
            </p>
          )}
        </div>
      </div>

      {/* Property Description */}
      {inputs_used.description && (
        <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h5 className={`font-medium mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Property Description
          </h5>
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
            {truncateDescription(inputs_used.description)}
          </p>
        </div>
      )}

      {/* Full Address */}
      {inputs_used.address && (
        <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-start gap-3">
            <MapPin className={`w-5 h-5 mt-0.5 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`} />
            <div>
              <h5 className={`font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Full Address
              </h5>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                {inputs_used.address}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PriceAnalysisStep;