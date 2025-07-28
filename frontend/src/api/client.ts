import toast from 'react-hot-toast';

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
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
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
      extracted_data: any;
      geocode_job_id: string;
    }>('/extract-data', {
      method: 'POST',
      body: JSON.stringify({
        listing_text: listingText,
        session_id: sessionId,
      }),
    });
  }

  async getJobStatus(jobId: string) {
    return this.request<{
      id: string;
      status: string;
      result?: any;
      error?: string;
    }>(`/jobs/${jobId}`);
  }

  async submitAnalysis(extractedData: any, sessionId: string) {
    return this.request<{
      check_id: string;
      status: string;
    }>('/analysis', {
      method: 'POST',
      headers: {
        'X-Session-ID': sessionId,
      },
      body: JSON.stringify(extractedData),
    });
  }

  async getAnalysisStatus(checkId: string, sessionId: string) {
    return this.request<{
      id: string;
      status: string;
      final_report?: any;
    }>(`/analysis/${checkId}`, {
      headers: {
        'X-Session-ID': sessionId,
      },
    });
  }

  async updateAnalysis(checkId: string, extractedData: any, sessionId: string) {
    return this.request<{
      check_id: string;
      status: string;
    }>(`/analysis/${checkId}`, {
      method: 'PUT',
      headers: {
        'X-Session-ID': sessionId,
      },
      body: JSON.stringify(extractedData),
    });
  }
}

export const apiClient = new ApiClient();