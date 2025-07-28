import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';
import { AppState, Analysis, ExtractedData, ChatMessage } from '../types';
import { apiClient } from '../api/client';

/**
 * Retrieves the session ID from sessionStorage or creates a new one.
 * This ensures the user's session persists across page reloads.
 */
const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('safeLease_sessionId');
  if (!sessionId) {
    sessionId = uuidv4();
    sessionStorage.setItem('safeLease_sessionId', sessionId);
  }
  return sessionId;
};

/**
 * Loads the analysis history from localStorage.
 */
const getStoredHistory = (): Analysis[] => {
  try {
    const stored = localStorage.getItem('safeLease_history');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

/**
 * Saves the analysis history to localStorage.
 * @param history The array of analysis objects to save.
 */
const saveHistoryToStorage = (history: Analysis[]) => {
  try {
    localStorage.setItem('safeLease_history', JSON.stringify(history));
  } catch (error) {
    console.warn('Failed to save history to localStorage:', error);
  }
};

// Define the initial state of the application
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

// --- ASYNCHRONOUS THUNKS ---

/**
 * Thunk for the initial data extraction from raw text.
 */
export const extractDataAsync = createAsyncThunk(
  'app/extractData',
  async (listingText: string, { getState, dispatch }) => {
    const state = getState() as { app: AppState };
    dispatch(setLoadingMessage('Extracting listing details...'));
    const response = await apiClient.extractData(listingText, state.app.currentSessionId);
    return response;
  }
);

/**
 * Thunk for submitting the confirmed data to start the full analysis pipeline.
 */
export const submitAnalysisAsync = createAsyncThunk(
  'app/submitAnalysis',
  async (extractedData: ExtractedData, { getState, dispatch }) => {
    const state = getState() as { app: AppState };
    dispatch(setLoadingMessage('Running full analysis, this may take a minute...'));
    const response = await apiClient.submitAnalysis(extractedData, state.app.currentSessionId);
    // Once submitted, start polling for the result.
    dispatch(pollAnalysisStatus(response.job_id));
    return response;
  }
);

/**
 * Thunk for polling the analysis status until it's completed or fails.
 */
export const pollAnalysisStatus = createAsyncThunk(
  'app/pollAnalysisStatus',
  async (checkId: string, { getState }) => {
    const state = getState() as { app: AppState };
    const sessionId = state.app.currentSessionId;

    const poll = async (): Promise<any> => {
      // Add a delay before the first poll to give the backend time to start
      await new Promise(resolve => setTimeout(resolve, 3000));
      const analysisStatus = await apiClient.getAnalysisStatus(checkId, sessionId);
      
      if (analysisStatus.status === 'COMPLETED') {
        return analysisStatus;
      } else if (analysisStatus.status === 'FAILED') {
        throw new Error('Analysis failed. Please try again.');
      } else {
        // Continue polling every 3 seconds
        return poll();
      }
    };
    return poll();
  }
);

/**
 * Thunk for sending a message in the post-analysis chat.
 */
export const sendChatMessageAsync = createAsyncThunk(
  'app/sendChatMessage',
  async (message: ChatMessage, { getState }) => {
      const state = getState() as { app: AppState };
      const { currentSessionId, currentAnalysis } = state.app;
      
      if (!currentAnalysis || !currentAnalysis.chatId) {
          throw new Error("Cannot send message: no active analysis or chat session.");
      }

      const response = await apiClient.sendChatMessage(message, currentAnalysis.chatId, currentSessionId);
      
      // Return the AI's response to be added to the state
      return {
          id: uuidv4(),
          type: response.response.role,
          content: response.response.content,
          timestamp: new Date().toISOString()
      } as ChatMessage;
  }
);


const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    // Reducers for synchronous state updates
    setLoadingMessage: (state, action: PayloadAction<string>) => {
      state.loading = true;
      state.loadingMessage = action.payload;
      state.error = null;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.loading = false;
      state.loadingMessage = '';
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
    addUserMessage: (state, action: PayloadAction<ChatMessage>) => {
        if (state.currentAnalysis) {
            state.currentAnalysis.chatMessages.push(action.payload);
        }
    }
  },
  // Reducers for handling async thunk lifecycle actions
  extraReducers: (builder) => {
    builder
      // Initial data extraction
      .addCase(extractDataAsync.pending, (state) => {
          state.loading = true;
          state.loadingMessage = 'Extracting data...';
      })
      .addCase(extractDataAsync.fulfilled, (state, action) => {
        const newAnalysis: Analysis = {
          id: '', // The real analysis ID will be set after submission
          chatId: action.payload.chat_id, // Store the chat ID
          sessionId: state.currentSessionId,
          status: 'PENDING',
          extractedData: action.payload.extracted_data,
          chatMessages: [], // Initialize chat history
          createdAt: new Date().toISOString(),
        };
        state.currentAnalysis = newAnalysis;
        state.loading = false;
      })
      .addCase(extractDataAsync.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to extract data';
        state.loading = false;
      })
      
      // Analysis submission
      .addCase(submitAnalysisAsync.pending, (state) => {
          state.loading = true;
          state.loadingMessage = 'Submitting for full analysis...';
      })
      .addCase(submitAnalysisAsync.fulfilled, (state, action) => {
        if (state.currentAnalysis) {
          state.currentAnalysis.id = action.payload.job_id;
          state.currentAnalysis.status = 'RUNNING';
          state.loadingMessage = 'Analysis in progress... this may take a minute.';
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
          state.currentAnalysis.finalReport = action.payload.final_report;
          
          // Initialize chat with the AI's opening summary
          state.currentAnalysis.chatMessages.push({
            id: uuidv4(),
            type: 'assistant',
            content: action.payload.final_report.chat_explanation,
            timestamp: new Date().toISOString()
          });

          // Update history
          const existingIndex = state.analysisHistory.findIndex(a => a.id === state.currentAnalysis!.id);
          if (existingIndex !== -1) {
            state.analysisHistory[existingIndex] = state.currentAnalysis;
          } else {
            state.analysisHistory.unshift(state.currentAnalysis);
          }
          
          state.analysisHistory = state.analysisHistory.slice(0, 50); // Limit history size
          saveHistoryToStorage(state.analysisHistory);
        }
        state.loading = false;
      })
      .addCase(pollAnalysisStatus.rejected, (state, action) => {
        state.error = action.error.message || 'Analysis polling failed';
        state.loading = false;
        if (state.currentAnalysis) {
          state.currentAnalysis.status = 'FAILED';
        }
      })

      // Post-analysis chat
      .addCase(sendChatMessageAsync.fulfilled, (state, action) => {
          if (state.currentAnalysis) {
              state.currentAnalysis.chatMessages.push(action.payload);
          }
      });
  },
});

export const {
  setLoadingMessage,
  setError,
  toggleTheme,
  toggleSidebar,
  resetCurrentAnalysis,
  loadAnalysisFromHistory,
  addUserMessage,
} = appSlice.actions;

export default appSlice.reducer;
