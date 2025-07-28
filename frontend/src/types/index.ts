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

export interface FinalReport {
  authenticityScore: number;
  qualityScore: number;
  sidebar_summary: string;
  chat_explanation: string;
  suggested_actions: string[];
}

export interface JobStatus {
  id: string;
  status: 'pending' | 'running' | 'finished' | 'failed';
  result?: any;
  error?: string;
}

export interface Analysis {
  id: string;
  sessionId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  extractedData: ExtractedData;
  finalReport?: FinalReport;
  geocodeResult?: {
    latitude: number;
    longitude: number;
    formatted_address: string;
  };
  createdAt: string;
}

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

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ExtractDataResponse {
  extracted_data: ExtractedData;
  geocode_job_id: string;
}

export interface AnalysisResponse {
  check_id: string;
  status: string;
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: string;
}