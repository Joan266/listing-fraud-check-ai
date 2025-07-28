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

export interface FlagItem {
  category: string;
  description: string;
}

export interface FinalReport {
  authenticity_score: number;
  quality_score: number;
  sidebar_summary: string;
  flags: FlagItem[];
  chat_explanation: string;
  suggested_actions: string[];
}


export interface Analysis {
  id: string;
  sessionId: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  extractedData: ExtractedData;
  finalReport?: FinalReport;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: string;
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
  chatMessages: ChatMessage[];
}

export interface ChatRequest {
    session_id: string;
    chat_id: string;
    message: {
        role: 'user' | 'assistant';
        content: string;
    };
}

export interface ChatResponse {
    chat_id: string;
    response: {
        role: 'assistant';
        content: string;
    };
}
