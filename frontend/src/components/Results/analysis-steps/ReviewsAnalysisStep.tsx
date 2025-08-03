import React from 'react';
import { Star, Users, TrendingUp, AlertTriangle, MessageSquare } from 'lucide-react';

interface Review {
  review_text?: string;
  review_date?: string;
  review_name?: string;
  [key: string]: any;
}

interface ReviewsAnalysisStepProps {
  inputs_used: {
    reviews?: Review[];
  };
  result: {
    sentiment?: string;
    reason?: string;
    negative_themes?: string[];
  };
  theme?: 'light' | 'dark';
}

const ReviewsAnalysisStep: React.FC<ReviewsAnalysisStepProps> = ({ inputs_used, result, theme = 'light' }) => {
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive': return 'text-green-500';
      case 'negative': return 'text-red-500';
      case 'mixed': return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive': return '😊';
      case 'negative': return '😞';
      case 'mixed': return '😐';
      default: return '😶';
    }
  };

  const getSentimentBg = (sentiment: string) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive': 
        return theme === 'dark' ? 'bg-green-900/30 border-green-700' : 'bg-green-50 border-green-200';
      case 'negative': 
        return theme === 'dark' ? 'bg-red-900/30 border-red-700' : 'bg-red-50 border-red-200';
      case 'mixed': 
        return theme === 'dark' ? 'bg-yellow-900/30 border-yellow-700' : 'bg-yellow-50 border-yellow-200';
      default: 
        return theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200';
    }
  };

  const reviews = inputs_used.reviews || [];

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < Math.floor(rating) ? 'text-yellow-400 fill-current' : theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}`}
      />
    ));
  };

  return (
    <div className="space-y-6">
      {/* Reviews Overview */}
      <div className={`p-6 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="flex items-center gap-4 mb-6">
          <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-yellow-400/20' : 'bg-yellow-100'}`}>
            <Users className={`w-6 h-6 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`} />
          </div>
          <div>
            <h4 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Reviews Analysis
            </h4>
            <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {reviews.length} reviews analyzed
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Sentiment Analysis */}
          <div className={`p-4 rounded-lg border ${getSentimentBg(result.sentiment || 'neutral')}`}>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{getSentimentIcon(result.sentiment || 'neutral')}</span>
              <div>
                <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Overall Sentiment
                </span>
                <p className={`text-lg font-semibold ${getSentimentColor(result.sentiment || 'neutral')}`}>
                  {result.sentiment || 'Neutral'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Analysis Results */}
      <div className="space-y-4">
        {/* Reason */}
        {result.reason && (
          <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <div className="flex items-start gap-3">
              <TrendingUp className={`w-5 h-5 mt-0.5 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`} />
              <div>
                <h5 className={`font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Analysis Summary
                </h5>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  {result.reason}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Negative Themes */}
        {result.negative_themes && result.negative_themes.length > 0 && (
          <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 mt-0.5 text-red-500" />
              <div className="flex-1">
                <h5 className={`font-medium mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  Recurring Complaints ({result.negative_themes.length})
                </h5>
                <div className="space-y-2">
                  {result.negative_themes.map((theme, index) => (
                    <div 
                      key={index}
                      className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-red-900/30' : 'bg-red-100'}`}
                    >
                      <p className={`text-sm ${theme === 'dark' ? 'text-red-300' : 'text-red-800'}`}>
                        {theme}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* No Complaints Message */}
        {result.negative_themes && result.negative_themes.length === 0 && (
          <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-green-900/20 border-green-800' : 'bg-green-50 border-green-200'}`}>
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className={`font-medium ${theme === 'dark' ? 'text-green-300' : 'text-green-800'}`}>
                No recurring complaints found
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Sample Reviews Preview */}
      {reviews.length > 0 && (
        <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className={`w-5 h-5 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`} />
            <h5 className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Sample Reviews ({Math.min(3, reviews.length)} of {reviews.length})
            </h5>
          </div>
          <div className="space-y-3">
            {reviews.slice(0, 3).map((review, index) => (
              <div 
                key={index}
                className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-900/50' : 'bg-gray-50'}`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {review.rating && (
                    <div className="flex gap-1">
                      {renderStars(review.rating)}
                    </div>
                  )}
                  {review.review_name && (
                    <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                      {review.review_name}
                    </span>
                  )}
                  {review.review_date && (
                    <span className={`text-xs ${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'}`}>
                      {review.review_date}
                    </span>
                  )}
                </div>
                {review.review_text && (
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} line-clamp-2`}>
                    {review.review_text}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewsAnalysisStep;