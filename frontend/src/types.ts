// src/types.ts

export interface Alert {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: 'high' | 'medium' | 'low';
}

// The new, final AnalysisResult structure
export interface AnalysisResult {
  trustScore: number;
  executiveSummary: string;
  location: {
    lat: number;
    lng: number;
    verified: boolean;
  };
  alerts: Alert[];
}

// Updated form data to match InputForm.tsx
export interface AnalysisData {
  address: string;
  description: string;
  imageUrls: string;
  hostConversation: string;
  rawListing: string;
}

// NEW: The shape of a chat message object
export interface ChatMessageData {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}