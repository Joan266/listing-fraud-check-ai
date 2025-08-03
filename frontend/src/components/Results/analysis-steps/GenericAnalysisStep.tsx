import React from 'react';
import { FileText, AlertCircle, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import UrlCarousel from '../../UI/UrlCarousel';
import ImageCarousel from '../../UI/ImageCarousel';

interface GenericAnalysisStepProps {
  job_name: string;
  description: string;
  status: string;
  inputs_used: Record<string, any>;
  result: Record<string, any>;
  theme?: 'light' | 'dark';
}

const GenericAnalysisStep: React.FC<GenericAnalysisStepProps> = ({ 
  job_name, 
  description, 
  status, 
  inputs_used, 
  result, 
  theme = 'light' 
}) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'ERROR': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    }
  };

  const formatJobName = (snakeCaseName: string): string => {
    return snakeCaseName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Helper to detect URLs
  const isUrl = (str: string): boolean => {
    try {
      new URL(str);
      return true;
    } catch {
      return false;
    }
  };

  // Helper to detect image URLs
  const isImageUrl = (str: string): boolean => {
    return isUrl(str) && /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(str);
  };

  // Extract URLs and images from data
  const extractUrls = (obj: any): string[] => {
    const urls: string[] = [];
    const traverse = (item: any) => {
      if (typeof item === 'string' && isUrl(item) && !isImageUrl(item)) {
        urls.push(item);
      } else if (Array.isArray(item)) {
        item.forEach(traverse);
      } else if (typeof item === 'object' && item !== null) {
        Object.values(item).forEach(traverse);
      }
    };
    traverse(obj);
    return [...new Set(urls)]; // Remove duplicates
  };

  const extractImages = (obj: any): string[] => {
    const images: string[] = [];
    const traverse = (item: any) => {
      if (typeof item === 'string' && isImageUrl(item)) {
        images.push(item);
      } else if (Array.isArray(item)) {
        item.forEach(traverse);
      } else if (typeof item === 'object' && item !== null) {
        Object.values(item).forEach(traverse);
      }
    };
    traverse(obj);
    return [...new Set(images)]; // Remove duplicates
  };

  // Filter out large/nested data and focus on key metrics
  const getRelevantData = (data: any) => {
    if (!data || typeof data !== 'object') return data;
    
    const relevant: any = {};
    Object.entries(data).forEach(([key, value]) => {
      // Skip very large objects or arrays
      if (Array.isArray(value) && value.length > 10) {
        relevant[key] = `${value.length} items`;
      } else if (typeof value === 'object' && value !== null) {
        const keys = Object.keys(value);
        if (keys.length > 5) {
          // Show only key metrics for large objects
          const keyMetrics = ['score', 'status', 'count', 'rating', 'percentage', 'level', 'result'];
          const filtered: any = {};
          keyMetrics.forEach(metric => {
            if (value[metric] !== undefined) {
              filtered[metric] = value[metric];
            }
          });
          relevant[key] = Object.keys(filtered).length > 0 ? filtered : `${keys.length} properties`;
        } else {
          relevant[key] = value;
        }
      } else {
        relevant[key] = value;
      }
    });
    return relevant;
  };

  const renderValue = (value: any): React.ReactNode => {
    if (typeof value === 'object' && value !== null) {
      return (
        <pre className={`text-xs ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} whitespace-pre-wrap`}>
          {JSON.stringify(value, null, 2)}
        </pre>
      );
    }
    return <span>{String(value)}</span>;
  };

  const urls = extractUrls({ ...inputs_used, ...result });
  const images = extractImages({ ...inputs_used, ...result });
  const relevantResult = getRelevantData(result);
  const relevantInputs = getRelevantData(inputs_used);

  // Create URL previews for carousel
  const urlPreviews = urls.map(url => ({
    url,
    title: `Analysis URL - ${formatJobName(job_name)}`,
    description: `URL analyzed during ${description.toLowerCase()}`,
  }));

  // Create image items for carousel
  const imageItems = images.map(url => ({
    url,
    title: `Analysis Image - ${formatJobName(job_name)}`,
  }));

  return (
    <div className="space-y-6">

      {/* URL Carousel */}
      {urlPreviews.length > 0 && (
        <div>
          <h5 className={`font-medium mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            URLs Analyzed
          </h5>
          <UrlCarousel urls={urlPreviews} theme={theme} />
        </div>
      )}

      {/* Image Carousel */}
      {imageItems.length > 0 && (
        <div>
          <h5 className={`font-medium mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Images Analyzed
          </h5>
          <ImageCarousel images={imageItems} theme={theme} />
        </div>
      )}

      {/* Results Summary */}
      {Object.keys(relevantResult).length > 0 && (
        <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h5 className={`font-medium mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Analysis Results
          </h5>
          <div className="space-y-3">
            {Object.entries(relevantResult).map(([key, value]) => (
              <div key={key} className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
                <div className="flex justify-between items-start">
                  <span className={`font-medium capitalize ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {key.replace(/_/g, ' ')}
                  </span>
                  <div className={`ml-4 text-right max-w-xs ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {renderValue(value)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inputs Used (if relevant) */}
      {Object.keys(relevantInputs).length > 0 && (
        <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
          <h5 className={`font-medium mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            Input Parameters
          </h5>
          <div className="space-y-2">
            {Object.entries(relevantInputs).map(([key, value]) => (
              <div key={key} className="flex justify-between items-center">
                <span className={`text-sm font-medium capitalize ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  {key.replace(/_/g, ' ')}:
                </span>
                <div className={`text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'} ml-4 text-right max-w-xs`}>
                  {renderValue(value)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GenericAnalysisStep;