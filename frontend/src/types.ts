// src/types.ts

// Define the shape of a single red flag
export interface RedFlag {
  type: string;
  message: string;
  severity: 'Low' | 'Medium' | 'High'; // The strict, correct type
}

// Define the shape of the entire analysis result
export interface AnalysisResult {
  summary: string;
  risk_score: 'Low' | 'Medium' | 'High';
  red_flags: RedFlag[];
  raw_google_data?: {
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
}
export interface ListingData {
  address: string;
  description: string;
  image_urls: string[];
}