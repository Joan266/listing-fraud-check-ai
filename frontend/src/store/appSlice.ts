import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';
import { AppState, Analysis, ExtractedData, FinalReport } from '../types';
import { apiClient } from '../api/client';

const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('safeLease_sessionId');
  if (!sessionId) {
    sessionId = uuidv4();
    sessionStorage.setItem('safeLease_sessionId', sessionId);
  }
  return sessionId;
};

const getStoredHistory = (): Analysis[] => {
  try {
    const stored = localStorage.getItem('safeLease_history');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveHistoryToStorage = (history: Analysis[]) => {
  try {
    localStorage.setItem('safeLease_history', JSON.stringify(history));
  } catch (error) {
    console.warn('Failed to save history to localStorage:', error);
  }
};

const initialState: AppState = {
  currentSessionId: getSessionId(),
  currentAnalysis: null,
  analysisHistory: getStoredHistory(),
  loading: false,
  loadingMessage: '',
  error: null,
  theme: (localStorage.getItem('safeLease_theme') as 'light' | 'dark') || 'dark',
  sidebarCollapsed: localStorage.getItem('safeLease_sidebarCollapsed') === 'true',
};

// Async thunks
export const extractDataAsync = createAsyncThunk(
  'app/extractData',
  async (listingText: string, { getState, dispatch }) => {
    const state = getState() as { app: AppState };
    const sessionId = state.app.currentSessionId;

    dispatch(setLoadingMessage('Extracting listing details...'));
    
    const response = await apiClient.extractData(listingText, sessionId);
    
    // Start polling for geocode job
    dispatch(setLoadingMessage('Verifying address on map...'));
    dispatch(pollGeocodeJob(response.geocode_job_id));
    
    return response;
  }
);

export const pollGeocodeJob = createAsyncThunk(
  'app/pollGeocodeJob',
  async (jobId: string, { dispatch }) => {
    const poll = async (): Promise<any> => {
      const jobStatus = await apiClient.getJobStatus(jobId);
      
      if (jobStatus.status === 'finished') {
        return jobStatus.result;
      } else if (jobStatus.status === 'failed') {
        throw new Error(jobStatus.error || 'Geocoding failed');
      } else {
        await new Promise(resolve => setTimeout(resolve, 3000));
        return poll();
      }
    };
    
    return poll();
  }
);

export const submitAnalysisAsync = createAsyncThunk(
  'app/submitAnalysis',
  async (extractedData: ExtractedData, { getState, dispatch }) => {
    const state = getState() as { app: AppState };
    const sessionId = state.app.currentSessionId;

    dispatch(setLoadingMessage('Running full analysis, this may take a minute...'));
    
    const response = await apiClient.submitAnalysis(extractedData, sessionId);
    
    // Start polling for analysis completion
    dispatch(pollAnalysisStatus(response.check_id));
    
    return response;
  }
);

export const pollAnalysisStatus = createAsyncThunk(
  'app/pollAnalysisStatus',
  async (checkId: string, { getState }) => {
    const state = getState() as { app: AppState };
    const sessionId = state.app.currentSessionId;

    const poll = async (): Promise<any> => {
      const analysisStatus = await apiClient.getAnalysisStatus(checkId, sessionId);
      
      if (analysisStatus.status === 'COMPLETED') {
        return analysisStatus.final_report;
      } else if (analysisStatus.status === 'FAILED') {
        throw new Error('Analysis failed');
      } else {
        await new Promise(resolve => setTimeout(resolve, 3000));
        return poll();
      }
    };
    
    return poll();
  }
);

export const updateAnalysisAsync = createAsyncThunk(
  'app/updateAnalysis',
  async ({ checkId, extractedData }: { checkId: string; extractedData: ExtractedData }, { getState, dispatch }) => {
    const state = getState() as { app: AppState };
    const sessionId = state.app.currentSessionId;

    dispatch(setLoadingMessage('Updating analysis...'));
    
    const response = await apiClient.updateAnalysis(checkId, extractedData, sessionId);
    
    // Start polling for updated analysis completion
    dispatch(pollAnalysisStatus(response.check_id));
    
    return response;
  }
);

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setLoadingMessage: (state, action: PayloadAction<string>) => {
      state.loading = true;
      state.loadingMessage = action.payload;
      state.error = null;
    },
    clearLoading: (state) => {
      state.loading = false;
      state.loadingMessage = '';
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.loading = false;
      state.loadingMessage = '';
    },
    clearError: (state) => {
      state.error = null;
    },
    toggleTheme: (state) => {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('safeLease_theme', state.theme);
    },
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
      localStorage.setItem('safeLease_sidebarCollapsed', state.sidebarCollapsed.toString());
    },
    resetCurrentAnalysis: (state) => {
      state.currentAnalysis = null;
      state.loading = false;
      state.loadingMessage = '';
      state.error = null;
    },
    loadAnalysisFromHistory: (state, action: PayloadAction<string>) => {
      const analysis = state.analysisHistory.find(a => a.id === action.payload);
      if (analysis) {
        state.currentAnalysis = analysis;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Extract data
      .addCase(extractDataAsync.fulfilled, (state, action) => {
        const newAnalysis: Analysis = {
          id: uuidv4(),
          sessionId: state.currentSessionId,
          status: 'PENDING',
          extractedData: action.payload.extracted_data,
          createdAt: new Date().toISOString(),
        };
        state.currentAnalysis = newAnalysis;
      })
      .addCase(extractDataAsync.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to extract data';
        state.loading = false;
      })
      
      // Geocode polling
      .addCase(pollGeocodeJob.fulfilled, (state, action) => {
        if (state.currentAnalysis) {
          state.currentAnalysis.geocodeResult = action.payload;
        }
        state.loading = false;
        state.loadingMessage = '';
      })
      .addCase(pollGeocodeJob.rejected, (state, action) => {
        state.error = action.error.message || 'Geocoding failed';
        state.loading = false;
      })
      
      // Submit analysis
      .addCase(submitAnalysisAsync.fulfilled, (state, action) => {
        if (state.currentAnalysis) {
          state.currentAnalysis.id = action.payload.check_id;
          state.currentAnalysis.status = 'RUNNING';
        }
      })
      .addCase(submitAnalysisAsync.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to submit analysis';
        state.loading = false;
      })
      
      // Analysis polling
      .addCase(pollAnalysisStatus.fulfilled, (state, action) => {
        if (state.currentAnalysis) {
          state.currentAnalysis.status = 'COMPLETED';
          state.currentAnalysis.finalReport = action.payload;
          
          // Add to history
          const existingIndex = state.analysisHistory.findIndex(a => a.id === state.currentAnalysis!.id);
          if (existingIndex >= 0) {
            state.analysisHistory[existingIndex] = state.currentAnalysis;
          } else {
            state.analysisHistory.unshift(state.currentAnalysis);
          }
          
          // Keep only last 50 analyses
          state.analysisHistory = state.analysisHistory.slice(0, 50);
          saveHistoryToStorage(state.analysisHistory);
        }
        state.loading = false;
        state.loadingMessage = '';
      })
      .addCase(pollAnalysisStatus.rejected, (state, action) => {
        state.error = action.error.message || 'Analysis failed';
        state.loading = false;
        if (state.currentAnalysis) {
          state.currentAnalysis.status = 'FAILED';
        }
      });
  },
});

export const {
  setLoadingMessage,
  clearLoading,
  setError,
  clearError,
  toggleTheme,
  toggleSidebar,
  resetCurrentAnalysis,
  loadAnalysisFromHistory,
} = appSlice.actions;

export default appSlice.reducer;