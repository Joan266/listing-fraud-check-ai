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
  host_email?: string;
  host_phone?: string;
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
  explanation: string;
  suggested_actions: string[];
  flags: Array<{ category: string; description: string; }>;
}
export interface ChatHistory {
  id: string;
  messages: ChatMessage[];
}
export interface ErrorReport {
  error: string;
}

export interface AnalysisStep {
  job_name: string;
  description: string;
  status: string;
  inputs_used: Record<string, any>;
  result: Record<string, any>;
}

export interface Analysis {
  id: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  input_data: ExtractedData;
  final_report: FinalReport | ErrorReport | null;
  created_at: string;
  analysis_steps: AnalysisStep[] | null;
  chat: ChatHistory | null;
}
// --- Frontend Redux State ---
export interface AppState {
  sessionId: string;
  currentAnalysisId: string | null;
  sessionHistory: Analysis[]; // The history list is global
  isLoading: boolean;
  loadingMessage: string;
  error: string | null;
  theme: 'light' | 'dark';
  sidebarCollapsed: boolean;
  isPolling: boolean;
}