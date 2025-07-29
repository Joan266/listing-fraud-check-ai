// src/store/appSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { AppState, Analysis, ExtractedData, ChatMessage, FinalReport } from '../types';
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
  extractedData: {},
  finalReport: null,
  sessionHistory: [],
  isLoading: false,
  loadingMessage: '',
  error: null,
  chatMessages: [],
  theme: 'dark',
  sidebarCollapsed: false,
};

// --- Async Thunks ---

export const extractDataAsync = createAsyncThunk(
  'app/extractData',
  async (listingText: string, { getState }) => {
    const sessionId = (getState() as RootState).app.sessionId;
    const extractedData = await apiClient.extractData(sessionId, listingText);
    return extractedData;
  }
);

export const startAnalysisAsync = createAsyncThunk(
  'app/startAnalysis',
  async (data: ExtractedData, { getState, dispatch }) => {
    const { sessionId } = (getState() as RootState).app;
    const response = await apiClient.startAnalysis(sessionId, data);
    return { analysisId: response.job_id, extractedData: data };
  }
);



export const pollAnalysisStatus = createAsyncThunk<FinalReport | null, string, { state: RootState }>(
  'app/pollAnalysisStatus',
  async (analysisId, { getState, dispatch }) => {
    const { sessionId } = getState().app;

    while (true) {
      try {
        const analysis = await apiClient.getAnalysisStatus(analysisId, sessionId);
        
        if (analysis.status === 'COMPLETED') {
          dispatch(fetchHistoryAsync());
          return analysis.final_report;
        } else if (analysis.status === 'FAILED') {
          throw new Error('Analysis failed.');
        }
        
        await new Promise(resolve => setTimeout(resolve, 3000)); // Poll every 3 seconds
      } catch (error) {
        throw error;
      }
    }
  }
);


export const fetchHistoryAsync = createAsyncThunk(
  'app/fetchHistory',
  async (_, { getState }) => {
    const sessionId = (getState() as RootState).app.sessionId;
    if (!sessionId) {
      throw new Error("Session ID is not set.");
    }
    const response = await apiClient.getSessionHistory(sessionId);
    return response.history;
  }
);

export const fetchAnalysisByIdAsync = createAsyncThunk(
    'app/fetchAnalysisById',
    async(analysisId: string, { getState, dispatch }) => {
        const { sessionId, sessionHistory } = (getState() as RootState).app;
        const existingAnalysis = sessionHistory.find(a => a.id === analysisId);
        if (existingAnalysis && existingAnalysis.status === 'COMPLETED') {
            return existingAnalysis;
        }
        const analysis = await apiClient.getAnalysisStatus(analysisId, sessionId);
      
        return analysis;
    }
);

export const sendChatMessageAsync = createAsyncThunk(
    'app/sendChatMessage',
    async (message: string, { getState }) => {
        const { sessionId, currentAnalysisId, finalReport } = (getState() as RootState).app;
        if (!currentAnalysisId || !finalReport) {
            throw new Error("Cannot send message without an active analysis.");
        }
        
        // This assumes your backend creates a chat session linked to an analysis
        // and you can retrieve a chat_id from the analysis result.
        // For now, we'll placeholder this. Let's assume the analysis object has a chat_id
        const analysis = (getState() as RootState).app.sessionHistory.find(a => a.id === currentAnalysisId);

        if(!analysis || !analysis.chat_id) throw new Error("Chat ID not found for this analysis");

        const response = await apiClient.sendChatMessage(analysis.chat_id, sessionId, message);
        return response.response;
    }
)


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
    toggleTheme: (state) => {
        state.theme = state.theme === 'dark' ? 'light' : 'dark';
    },
    toggleSidebar: (state) => {
        state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    addChatMessage: (state, action: PayloadAction<ChatMessage>) => {
        state.chatMessages.push(action.payload);
    },
    setCurrentAnalysisId: (state, action: PayloadAction<string | null>) => {
        state.currentAnalysisId = action.payload;
        if (action.payload) {
            const analysis = state.sessionHistory.find(a => a.id === action.payload);
            state.extractedData = analysis?.input_data || null;
            state.finalReport = analysis?.final_report || null;
            // For now, we clear chat messages when switching analyses.
            // A more complex implementation could store chat history per analysis.
            state.chatMessages = [];
             if (analysis?.final_report?.chat_explanation) {
                state.chatMessages.push({ role: 'assistant', content: analysis.final_report.chat_explanation });
            }
        } else {
            state.extractedData = null;
            state.finalReport = null;
            state.chatMessages = [];
        }
    }
  },
  extraReducers: (builder) => {
    builder
      // extractData
      .addCase(extractDataAsync.pending, (state) => {
        state.isLoading = true;
        state.loadingMessage = 'Extracting details...';
        state.error = null;
      })
      .addCase(extractDataAsync.fulfilled, (state, action: PayloadAction<ExtractedData>) => {
        state.extractedData = action.payload;
        state.isLoading = false;
      })
      .addCase(extractDataAsync.rejected, (state, action) => {
          state.isLoading = false;
          state.error = action.error.message || 'Failed to extract data.';
      })
      // startAnalysis
      .addCase(startAnalysisAsync.pending, (state) => {
        state.isLoading = true;
        state.loadingMessage = 'Starting full analysis...';
        state.finalReport = null;
        state.chatMessages = [];
      })
      .addCase(startAnalysisAsync.fulfilled, (state, action) => {
        state.currentAnalysisId = action.payload.analysisId;
        state.extractedData = action.payload.extractedData;
      })
       .addCase(startAnalysisAsync.rejected, (state, action) => {
          state.isLoading = false;
          state.error = action.error.message || 'Failed to start analysis.';
      })
      // pollAnalysisStatus
      .addCase(pollAnalysisStatus.fulfilled, (state, action: PayloadAction<FinalReport | null>) => {
        state.finalReport = action.payload;
        state.isLoading = false;
      })
       .addCase(pollAnalysisStatus.rejected, (state, action) => {
          state.isLoading = false;
          state.error = action.error.message || 'Analysis polling failed.';
      })
      // fetchHistory
      .addCase(fetchHistoryAsync.fulfilled, (state, action: PayloadAction<Analysis[]>) => {
        state.sessionHistory = action.payload;
      })
       // fetchAnalysisById
      .addCase(fetchAnalysisByIdAsync.pending, (state) => {
          state.isLoading = true;
          state.loadingMessage = "Loading analysis...";
          state.error = null;
      })
      .addCase(fetchAnalysisByIdAsync.fulfilled, (state, action: PayloadAction<Analysis>) => {
          const loaded = action.payload;
          state.currentAnalysisId = loaded.id;
          state.extractedData = loaded.input_data;
          state.finalReport = loaded.final_report;

          const historyContains = state.sessionHistory.some(a => a.id === loaded.id);
          if (!historyContains) {
              state.sessionHistory.unshift(loaded);
          } else {
              state.sessionHistory = state.sessionHistory.map(a => a.id === loaded.id ? loaded : a);
          }

          if(loaded.status !== 'IN_PROGRESS' && loaded.status !== 'PENDING') {
            state.isLoading = false;
          }

           state.chatMessages = [];
           if (loaded.final_report?.chat_explanation) {
               state.chatMessages.push({ role: 'assistant', content: loaded.final_report.chat_explanation });
           }
      })
      .addCase(fetchAnalysisByIdAsync.rejected, (state, action) => {
          state.isLoading = false;
          state.error = action.error.message || 'Failed to load analysis.';
      })
      // sendChatMessage
      .addCase(sendChatMessageAsync.pending, (state, action) => {
        state.chatMessages.push({role: 'user', content: action.meta.arg});
      })
      .addCase(sendChatMessageAsync.fulfilled, (state, action: PayloadAction<ChatMessage>) => {
          state.chatMessages.push(action.payload);
      })
  },
});

export const { setLoading, setError, toggleTheme, toggleSidebar, addChatMessage, setCurrentAnalysisId } = appSlice.actions;
export default appSlice.reducer;
