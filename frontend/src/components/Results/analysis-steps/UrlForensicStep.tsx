import React from 'react';
import { Shield, Clock, Archive, AlertTriangle, CheckCircle } from 'lucide-react';
import UrlPreview from '../../UI/UrlPreview';

interface UrlForensicsStepProps {
  inputs_used: {
    listing_url?: string;
  };
  result: {
    domain_age?: any;
    blacklist_check?: any;
    archive_check?: any;
  };
  theme?: 'light' | 'dark';
}

const UrlForensicsStep: React.FC<UrlForensicsStepProps> = ({ inputs_used, result, theme = 'light' }) => {
  // Extract relevant data from potentially nested objects
  const extractDomainAge = (domainData: any) => {
    if (!domainData) return null;
    if (typeof domainData === 'object') {
      return {
        years: domainData.reason || domainData.age || 0,
        status: (!domainData.is_new)
      };
    }
    return null;
  };

  const extractBlacklistCheck = (blacklistData: any) => {
    if (!blacklistData) return null;
    if (typeof blacklistData === 'object') {
      return {
        clean: blacklistData.is_blacklisted === false,
      };
    }
    return null;
  };

  const extractArchiveCheck = (archiveData: any) => {
    if (!archiveData) return null;
    if (typeof archiveData === 'object') {
      return {
        found: archiveData.found !== false,
        consistent: archiveData.consistent !== false
      };
    }
    return null;
  };

  const domainAge = extractDomainAge(result.domain_age);
  const blacklistCheck = extractBlacklistCheck(result.blacklist_check);
  const archiveCheck = extractArchiveCheck(result.archive_check);

  const getStatusIcon = (status: Boolean) => {
    if (status) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
    return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
  };

  const getDomainFromUrl = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  if (!inputs_used.listing_url) {
    return (
      <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100'}`}>
        <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          No URL provided for analysis
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* URL Preview */}
      <div>
        <h4 className={`font-semibold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Analyzed URL
        </h4>
        <UrlPreview
          url={inputs_used.listing_url}
          title={`Listing on ${getDomainFromUrl(inputs_used.listing_url)}`}
          description="Airbnb property listing under forensic analysis"
          theme={theme}
        />
      </div>

      {/* Forensics Results */}
      <div>
        <h4 className={`font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          Security Analysis Results
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Domain Age */}
          {domainAge && (
            <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center gap-3 mb-2">
                <Clock className={`w-5 h-5 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`} />
                <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Domain Age</span>
                {getStatusIcon(domainAge.status)}
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-medium font-semibold ${domainAge.status ? 'text-green-500' : 'text-red-500'}`}>
                  {domainAge.years}
                </span>
              </div>
              <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {domainAge.status ? 'Established domain' : 'New domain'}
              </p>
            </div>
          )}

          {/* Blacklist Check */}
          {blacklistCheck && (
            <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center gap-3 mb-2">
                <Shield className={`w-5 h-5 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`} />
                <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Blacklist Status</span>
                {getStatusIcon(blacklistCheck.clean)}
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-lg font-semibold ${blacklistCheck.clean ? 'text-green-500' : 'text-red-500'}`}>
                  {blacklistCheck.clean ? 'Clean' : 'Listed'}
                </span>
              </div>
              <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {blacklistCheck.clean ? 'Not on security blacklists' : 'Found on blacklists'}
              </p>
            </div>
          )}

          {/* Archive Check */}
          {archiveCheck && (
            <div className={`p-4 rounded-lg border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center gap-3 mb-2">
                <Archive className={`w-5 h-5 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`} />
                <span className={`font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Archive History</span>

                {getStatusIcon(archiveCheck.found)}
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-lg font-semibold ${archiveCheck.found ? 'text-green-500' : 'text-yellow-500'}`}>
                  {archiveCheck.found ? 'Found' : 'Not Found'}
                </span>
              </div>
              <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                {archiveCheck.consistent ? 'Consistent history' : 'Inconsistent data'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UrlForensicsStep;