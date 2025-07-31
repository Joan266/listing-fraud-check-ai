import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AppState, Analysis, ExtractedData } from '../types';
import { apiClient } from '../api/client';
import { v4 as uuidv4 } from 'uuid';
import { RootState } from './index';

const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('sessionId');
  if (!sessionId) {
    sessionId = uuidv4();
    sessionStorage.setItem('sessionId', sessionId);
  }
  return sessionId;
};

const initialState: AppState = {
  sessionId: getSessionId(),
  currentAnalysisId: null,
  sessionHistory: [],
  isLoading: false,
  loadingMessage: '',
  error: null,
  theme: 'dark',
  sidebarCollapsed: false,
  isPolling: false,
};


// --- Async Thunks ---

export const fetchHistoryAsync = createAsyncThunk(
  'app/fetchHistory',
  async (_, { getState }) => {
    const sessionId = (getState() as RootState).app.sessionId;
    const response = await apiClient.getSessionHistory(sessionId);
    return response.history;
  }
);

export const startAnalysisAsync = createAsyncThunk(
  'app/startAnalysis',
  async (extractedData: ExtractedData, { getState, dispatch }) => {
    const { sessionId, sessionHistory } = (getState() as RootState).app;
    if (!sessionId) throw new Error('Session ID is missing.');

    const response = await apiClient.startAnalysis(sessionId, extractedData);
    const existingAnalysis = sessionHistory.find(a => a.id === response.job_id);
    if (existingAnalysis && (existingAnalysis.status === 'COMPLETED' || existingAnalysis.status === 'FAILED')) {
      dispatch(setError("This analysis has already been completed."))
    }
    const pendingAnalysis: Analysis = {
      id: response.job_id,
      status: 'PENDING',
      input_data: extractedData,
      final_report: null,
      created_at: new Date().toISOString(),
      chat: null,
    };
    return pendingAnalysis;
  },
  {
    condition: (_, { getState }) => {
      const { isLoading } = (getState() as RootState).app;
      return !isLoading;
    }
  }
);

export const pollAnalysisStatus = createAsyncThunk<Analysis, string, { state: RootState }>(
  'app/pollAnalysisStatus',
  async (analysisId, { getState, dispatch }) => {
    dispatch(startPolling()); // Set polling to true
    const { sessionId } = (getState() as RootState).app;

    const analysis = await apiClient.getAnalysisStatus(analysisId, sessionId);

    if (analysis.status === 'IN_PROGRESS' || analysis.status === 'PENDING') {
      setTimeout(() => {
        // Before starting a new poll, check if we are still supposed to be polling
        const { isPolling } = (getState() as RootState).app;
        if (isPolling) {
          dispatch(pollAnalysisStatus(analysisId));
        }
      }, 5000);
    } else {
      // When finished or failed, stop polling
      dispatch(stopPolling());
      dispatch(updateAnalysisInHistory(analysis));
    }
    return analysis;
  }
);
export const sendChatMessageAsync = createAsyncThunk(
  'app/sendChatMessage',
  async ({ chatId, message }: { chatId: string; message: string }, { getState }) => {
    const { sessionId } = (getState() as RootState).app;

    if (!sessionId || !chatId) {
      throw new Error("Cannot send message: Missing session or chat ID.");
    }

    const response = await apiClient.sendChatMessage(chatId, sessionId, message);
    return response.response; // Return the AI's message object
  }
);
// --- The Slice ---
const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<{ isLoading: boolean; message?: string }>) => {
      state.isLoading = action.payload.isLoading;
      state.loadingMessage = action.payload.message || '';
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    clearError: (state) => {
      state.error = null;
    },
    toggleTheme: (state) => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
    },
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setCurrentAnalysisId: (state, action: PayloadAction<string | null>) => {
      state.currentAnalysisId = action.payload;
    },
    startPolling: (state) => {
      state.isPolling = true;
    },
    stopPolling: (state) => {
      state.isPolling = false;
    },
    updateAnalysisInHistory: (state, action: PayloadAction<Analysis>) => {
      const index = state.sessionHistory.findIndex(a => a.id === action.payload.id);
      if (index !== -1) {
        state.sessionHistory[index] = action.payload;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchHistoryAsync.fulfilled, (state, action: PayloadAction<Analysis[]>) => {
        state.sessionHistory = action.payload;
      })
      .addCase(startAnalysisAsync.pending, (state) => {
        state.isLoading = true;
        state.loadingMessage = 'Running full analysis...';
      })
      .addCase(startAnalysisAsync.fulfilled, (state, action: PayloadAction<Analysis>) => {
        const returnedAnalysis = action.payload;
        const existingIndex = state.sessionHistory.findIndex(a => a.id === returnedAnalysis.id);

        if (existingIndex === -1) {
          state.sessionHistory.unshift(returnedAnalysis);
        }
      })
      .addCase(startAnalysisAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to start analysis.';
      })
      .addCase(pollAnalysisStatus.fulfilled, (state, action: PayloadAction<Analysis>) => {
        const index = state.sessionHistory.findIndex(a => a.id === action.payload.id);
        if (index !== -1) {
          state.sessionHistory[index] = action.payload;
        }
        if (action.payload.status === 'COMPLETED' || action.payload.status === 'FAILED') {
          state.isLoading = false;
        }
      })
      .addCase(pollAnalysisStatus.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Analysis polling failed.';
        // Find the analysis in history and mark it as FAILED
        const analysisId = action.meta.arg;
        const index = state.sessionHistory.findIndex(a => a.id === analysisId);
        if (index !== -1) {
          state.sessionHistory[index].status = 'FAILED';
        }
      });
  },
});

export const {
  setLoading,
  setError,
  clearError,
  toggleTheme,
  toggleSidebar,
  setCurrentAnalysisId,
  startPolling,
  stopPolling,
  updateAnalysisInHistory
} = appSlice.actions;

export default appSlice.reducer;