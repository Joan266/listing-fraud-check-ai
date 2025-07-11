// src/components/ReportView.tsx
import React from 'react';
import { APIProvider, Map, Marker } from '@vis.gl/react-google-maps';
import './ReportView.css';
import type { AnalysisResult } from '../types';

interface ReportViewProps {
  result: AnalysisResult;
}

const ReportView: React.FC<ReportViewProps> = ({ result }) => {
  const riskClass = `risk-score ${result.risk_score.toLowerCase()}`;
  
  // Get coordinates from the result, with a fallback
  const position = result.raw_google_data?.coordinates || { lat: 0, lng: 0 };
  
  const apiKey = import.meta.env.VITE_Maps_API_KEY;

  if (!apiKey) {
    return <div>Error: Google Maps API Key is missing.</div>;
  }

  return (
    <div className="report-container">
      {/* MAP AND STREET VIEW SECTION */}
      <div className="map-container">
        <APIProvider apiKey={apiKey}>
          <Map
            defaultCenter={position}
            defaultZoom={15}
            mapId="fraud-check-map" // Optional: for custom styling
          >
            <Marker position={position} />
          </Map>
        </APIProvider>
      </div>
      <div className="street-view-container">
        <iframe
          loading="lazy"
          allowFullScreen
          src={`https://www.google.com/maps/embed/v1/streetview?key=${apiKey}&location=${position.lat},${position.lng}&heading=235&pitch=10&fov=90`}>
        </iframe>
      </div>

      {/* REPORT DETAILS SECTION */}
      <h3>Analysis Report</h3>
      <div className={riskClass}>
        <span>Risk Score:</span>
        <strong>{result.risk_score}</strong>
      </div>
      <p className="summary">{result.summary}</p>
      
      <h4>Detected Red Flags:</h4>
      {result.red_flags.length > 0 ? (
        <ul className="red-flags-list">
          {result.red_flags.map((flag, index) => (
            <li key={index} className={`severity-${flag.severity.toLowerCase()}`}>
              <strong>{flag.type}:</strong> {flag.message}
            </li>
          ))}
        </ul>
      ) : (
        <p>No specific red flags were detected.</p>
      )}
    </div>
  );
};

export default ReportView;