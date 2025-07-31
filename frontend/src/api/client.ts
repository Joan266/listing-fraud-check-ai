// src/api/client.ts
import { ExtractedData, Analysis, JobCreationResponse, HistoryResponse, ChatResponse, ChatMessage } from '../types';

const API_BASE_URL = 'http://localhost:8000/api/v1';

class ApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    try {
      const response = await fetch(url, { ...options, headers });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'An unknown error occurred.' }));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async extractData(sessionId: string, listingContent: string): Promise<ExtractedData> {
    const payload = { session_id: sessionId, listing_content: listingContent };

    const response = await this.request<{ extracted_data: ExtractedData }>('/extract-data', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return response.extracted_data;
  }

  async startAnalysis(sessionId: string, data: ExtractedData): Promise<JobCreationResponse> {
    const payload = { session_id: sessionId, ...data };
    return this.request<JobCreationResponse>('/analysis', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getAnalysisStatus(checkId: string, sessionId: string): Promise<Analysis> {
    return this.request<Analysis>(`/analysis/${checkId}`, {
      headers: { 'session_id': sessionId },
    });
  }

  async getSessionHistory(sessionId: string): Promise<HistoryResponse> {
    return this.request<HistoryResponse>(`/analysis/history/${sessionId}`, {
      headers: { 'session_id': sessionId },
    });
  }

  async sendChatMessage(chatId: string, sessionId: string, message: string): Promise<ChatResponse> {
    const payload = { chat_id: chatId, session_id: sessionId, message: { role: 'user', content: message } };
    return this.request<ChatResponse>('/chat', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
}

export const apiClient = new ApiClient();
