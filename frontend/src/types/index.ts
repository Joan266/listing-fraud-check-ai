// src/types/index.ts

// --- Reusable Core Types ---
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// --- API Response Types ---
export interface JobCreationResponse {
  job_id: string;
}

export interface HistoryResponse {
  history: Analysis[];
}

export interface ChatResponse {
  chat_id: string;
  response: ChatMessage;
}


// --- Data Structures ---
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
  price_details?: string;
  host_profile?: { [key: string]: any };
  property_type?: string;
  check_in?: string | null;
  check_out?: string | null;
  number_of_people?: number | null;
}

export interface FinalReport {
  authenticity_score: number;
  quality_score: number;
  sidebar_summary: string;
  chat_explanation: string;
  suggested_actions: string[];
  flags: Array<{ category: string; description: string; }>;
}

// Represents a single, complete analysis record from the backend
export interface Analysis {
  id: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  input_data: ExtractedData;
  final_report: FinalReport | null;
  created_at: string;
  chat_id?: string;
}

// --- Frontend Redux State ---
export interface AppState {
  sessionId: string;
  // --- Data for the current workflow ---
  currentAnalysisId: string | null;
  extractedData: ExtractedData | null;
  finalReport: FinalReport | null;
  // --- Global App State ---
  sessionHistory: Analysis[];
  isLoading: boolean;
  loadingMessage: string;
  error: string | null;
  chatMessages: ChatMessage[];
  // --- UI State ---
  theme: 'light' | 'dark';
  sidebarCollapsed: boolean;
}
