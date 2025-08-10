// frontend/src/api/client.ts

import { ExtractedData, Analysis, JobCreationResponse, HistoryResponse, ChatResponse } from '../types';

// Obtiene la URL base de las variables de entorno de Vite.
// import.meta.env.VITE_API_BASE_URL será reemplazada por la URL de producción durante el build.
// Si no existe, usa la URL de desarrollo local como fallback.
const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

class ApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${baseURL}/api/v1${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    try {
      console.log(`url;${url} headers${headers}`)
      const response = await fetch(url, { ...options, headers });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'An unknown error occurred.' }));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }
      // Maneja casos donde la respuesta puede estar vacía (p. ej., 204 Sin Contenido)
      const text = await response.text();
      return text ? JSON.parse(text) : ({} as T);
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
      headers: { 'session-id': sessionId },
    });
  }

  async getSessionHistory(sessionId: string): Promise<HistoryResponse> {
    return this.request<HistoryResponse>(`/analysis/history/${sessionId}`, {
      headers: { 'session-id': sessionId },
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
