import toast from 'react-hot-toast';
import { ExtractedData } from '../types';

const API_BASE_URL = 'http://localhost:8000/api/v1';

class ApiClient {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }));
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Network error occurred';
      toast.error(`API Error: ${message}`);
      throw error;
    }
  }

  async extractData(listingText: string, sessionId: string) {
    return this.request<{
      chat_id: string;
      extracted_data: ExtractedData;
    }>('/extract-data', {
      method: 'POST',
      body: JSON.stringify({
        session_id: sessionId,
        message: { role: 'user', content: listingText }
      }),
    });
  }

  async submitAnalysis(extractedData: any, sessionId: string, chatId?: string) {
    const payload = {
      ...extractedData,
      session_id: sessionId,
      chat_history: chatId ? [{ role: 'user', content: 'Initial data' }] : [],
    };

    return this.request<{
      job_id: string;
    }>('/analysis', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }


  async getAnalysisStatus(checkId: string, sessionId: string) {
    return this.request<{
      id: string;
      status: string;
      final_report?: any;
    }>(`/analysis/${checkId}`, {
      headers: {
        'session_id': sessionId,
      },
    });
  }
  
}

export const apiClient = new ApiClient();
