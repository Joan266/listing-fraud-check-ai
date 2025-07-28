import toast from 'react-hot-toast';
import { ChatMessage, ExtractedData } from '../types';

// The base URL for your FastAPI backend
const API_BASE_URL = 'http://localhost:8000/api/v1';

class ApiClient {
  /**
   * A generic request handler that abstracts away fetch logic,
   * error handling, and JSON parsing.
   * @param endpoint The API endpoint to hit (e.g., '/analysis').
   * @param options The standard fetch options (method, headers, body, etc.).
   * @returns A promise that resolves to the JSON response.
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    // Default headers, can be overridden by options
    const defaultHeaders = {
      'Content-Type': 'application/json',
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
      });

      // Handle non-successful HTTP responses
      if (!response.ok) {
        // Try to parse error details from the response body
        const errorData = await response.json().catch(() => ({ detail: 'An unknown error occurred.' }));
        // Use the 'detail' field from FastAPI's default error response
        const errorMessage = errorData.detail || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
      }

      return await response.json() as T;
    } catch (error) {
      // Display a toast notification for any errors
      const message = error instanceof Error ? error.message : 'A network error occurred. Is the backend running?';
      toast.error(message);
      // Re-throw the error to be caught by the calling thunk
      throw error;
    }
  }

  /**
   * Sends the initial raw text from the user to the backend for data extraction.
   * This is the first step in the analysis process.
   * @param listingText The full text pasted by the user.
   * @param sessionId The user's unique session ID.
   * @returns A promise with the extracted data and a new chat ID.
   */
  async extractData(listingText: string, sessionId: string) {
    // This now matches the backend's ChatRequest schema
    const requestBody = {
        session_id: sessionId,
        message: {
            role: "user",
            content: listingText
        }
    };
    return this.request<{
      chat_id: string;
      extracted_data: ExtractedData;
    }>('/extract-data', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
  }

  /**
   * Submits the verified (and possibly edited) data to start the full, multi-step fraud analysis.
   * @param extractedData The structured data to be analyzed.
   * @param sessionId The user's session ID, passed in the body.
   * @returns A promise with the new analysis job ID.
   */
  async submitAnalysis(extractedData: ExtractedData, sessionId: string) {
    // The request body now matches the backend's FraudCheckRequest schema
    const requestBody = {
      ...extractedData,
      session_id: sessionId,
    };
    return this.request<{
      job_id: string;
    }>('/analysis', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
  }

  /**
   * Polls the backend for the status of a specific analysis job.
   * @param checkId The ID of the analysis job to check.
   * @param sessionId The user's session ID for authorization.
   * @returns A promise with the current status and the final report if completed.
   */
  async getAnalysisStatus(checkId: string, sessionId: string) {
    return this.request<{
      id: string;
      status: string;
      final_report?: any;
    }>(`/analysis/${checkId}`, {
      method: 'GET',
      headers: {
        // The session_id is required in the header for this endpoint
        'session_id': sessionId,
      },
    });
  }
  
  /**
   * Sends a follow-up message to the chat endpoint after an analysis is complete.
   * @param message The user's message object.
   * @param chatId The ID of the current chat session.
   * @param sessionId The user's unique session ID.
   * @returns The AI's response message.
   */
  async sendChatMessage(message: ChatMessage, chatId: string, sessionId: string) {
    const requestBody = {
        session_id: sessionId,
        chat_id: chatId, // Pass the chat_id for context
        message: {
            role: message.type,
            content: message.content
        }
    };
    return this.request<{
        chat_id: string;
        response: { role: string; content: string };
    }>('/chat', {
        method: 'POST',
        body: JSON.stringify(requestBody)
    });
  }
}

// Export a singleton instance of the ApiClient
export const apiClient = new ApiClient();
