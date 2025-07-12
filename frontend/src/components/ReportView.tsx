// src/components/ReportView.tsx
import React from 'react';
import { Map, Marker } from '@vis.gl/react-google-maps'; // Keep these imports
import './ReportView.css';
import type { AnalysisResult } from '../types';

interface ReportViewProps {
  result: AnalysisResult;
}

const ReportView: React.FC<ReportViewProps> = ({ result }) => {
  const riskClass = `risk-score ${result.risk_score.toLowerCase()}`;
  const position = result.raw_google_data?.coordinates || { lat: 0, lng: 0 };
  const apiKey = import.meta.env.VITE_Maps_API_KEY;

  // The component now starts directly with the report-container div
  return (
    <div className="report-container">
      <div className="map-container">
        {/* The Map component will now get its context from the provider in App.tsx */}
        <Map
          defaultCenter={position}
          defaultZoom={15}
          mapId="fraud-check-map"
          streetViewControl={false}
        >
          <Marker position={position} />
        </Map>
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