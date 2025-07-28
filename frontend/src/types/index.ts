/**
 * Represents the structured data extracted from a rental listing.
 * All fields are optional as not all listings contain all data points.
 */
export interface ExtractedData {
  listing_url?: string;
  address?: string;
  description?: string;
  image_urls?: string[];
  communication_text?: string;
  host_name?: string;
  email?: string;
  phone?: string;
  reviews?: Array<{ [key: string]: any }>;
  price_details?: { [key: string]: any };
  host_profile?: { [key: string]: any };
  property_type?: string;
}

/**
 * Represents the final synthesized report from the AI analysis.
 */
export interface FinalReport {
  authenticityScore: number;
  qualityScore: number;
  sidebar_summary: string;
  chat_explanation: string;
  suggested_actions: string[];
}

/**
 * Defines the structure for a single chat message.
 */
export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | string; // Allow string for backend role flexibility
  content: string;
  timestamp: string;
}

/**
 * Represents a single analysis job, from initiation to completion.
 * This is the central object for tracking state in the UI.
 */
export interface Analysis {
  id: string; // The main analysis ID (from FraudCheck.id)
  chatId: string; // The ID for the chat session associated with this analysis
  sessionId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  extractedData: ExtractedData;
  chatMessages: ChatMessage[]; // Holds the conversation history for this analysis
  finalReport?: FinalReport;
  geocodeResult?: {
    latitude: number;
    longitude: number;
    formatted_address: string;
  };
  createdAt: string;
}

/**
 * Defines the entire state structure for the Redux store.
 */
export interface AppState {
  currentSessionId: string;
  currentAnalysis: Analysis | null;
  analysisHistory: Analysis[];
  loading: boolean;
  loadingMessage: string;
  error: string | null;
  theme: 'light' | 'dark';
  sidebarCollapsed: boolean;
}
