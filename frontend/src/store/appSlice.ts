import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import apiClient from '../api/client';
import { AppState, ExtractedListingData, FraudCheckRequest, Message, ChatRequest } from '../types';
import { v4 as uuidv4 } from 'uuid';

// --- Initial State ---

const initialState: AppState = {
  status: 'idle',
  error: null,
  sessionId: null,
  chatId: null,
  extractedData: null,
  finalReport: null,
  chatHistory: [],
};

// --- Async Thunks ---

export const extractData = createAsyncThunk(
  'app/extractData',
  async (text: string, { rejectWithValue, dispatch }) => {
    try {
      const sessionId = uuidv4();
      dispatch(setSessionId(sessionId));
      
      const response = await apiClient.post('/extract-data', {
        session_id: sessionId,
        message: { role: 'user', content: text },
      });

      return { ...response.data, sessionId };
    } catch (error) {
      return rejectWithValue(apiClient.handleError(error));
    }
  }
);

export const startAnalysis = createAsyncThunk(
  'app/startAnalysis',
  async (data: FraudCheckRequest, { rejectWithValue }) => {
    try {
      const response = await apiClient.post('/analysis', data);
      return response.data;
    } catch (error) {
      return rejectWithValue(apiClient.handleError(error));
    }
  }
);

export const pollAnalysisStatus = createAsyncThunk(
  'app/pollAnalysisStatus',
  async (checkId: string, { getState, rejectWithValue }) => {
    try {
      const { app } = getState() as { app: AppState };
      const response = await apiClient.get(`/analysis/${checkId}`, {
        headers: { 'session-id': app.sessionId },
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(apiClient.handleError(error));
    }
  }
);

export const sendMessage = createAsyncThunk(
    'app/sendMessage',
    async (message: Message, { getState, rejectWithValue }) => {
        try {
            const { app } = getState() as { app: AppState };
            if (!app.sessionId || !app.chatId) {
                throw new Error("Session or Chat ID is missing.");
            }
            const payload: ChatRequest = {
                session_id: app.sessionId,
                chat_id: app.chatId,
                message: message,
            };
            const response = await apiClient.post('/chat', payload);
            return response.data.response; 
        } catch (error) {
            return rejectWithValue(apiClient.handleError(error));
        }
    }
);

// --- Slice Definition ---

const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setSessionId: (state, action: PayloadAction<string>) => {
      state.sessionId = action.payload;
    },
    setExtractedData: (state, action: PayloadAction<ExtractedListingData>) => {
        state.extractedData = action.payload;
    },
    resetState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(extractData.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(extractData.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.extractedData = action.payload.extracted_data;
        state.chatId = action.payload.chat_id;
        state.chatHistory = [
            action.payload.response
        ];
      })
      .addCase(extractData.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      .addCase(startAnalysis.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(startAnalysis.fulfilled, (state) => {
        state.status = 'processing';
      })
      .addCase(startAnalysis.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload as string;
      })
      .addCase(pollAnalysisStatus.fulfilled, (state, action) => {
        if (action.payload.status === 'COMPLETED') {
            state.status = 'completed';
            state.finalReport = action.payload.final_report;
            if (action.payload.final_report?.chat_explanation) {
                state.chatHistory.push({
                    role: 'assistant',
                    content: action.payload.final_report.chat_explanation,
                });
            }
        }
      })
      .addCase(pollAnalysisStatus.rejected, (state, action) => {
          state.status = 'failed';
          state.error = action.payload as string;
      })
      .addCase(sendMessage.pending, (state, action) => {
          state.status = 'loading';
          state.chatHistory.push(action.meta.arg);
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
          state.status = 'completed';
          state.chatHistory.push(action.payload);
      })
      .addCase(sendMessage.rejected, (state, action) => {
          state.status = 'failed';
          state.error = action.payload as string;
          state.chatHistory.pop();
      });
  },
});

export const { setSessionId, setExtractedData, resetState } = appSlice.actions;
export default appSlice.reducer;
