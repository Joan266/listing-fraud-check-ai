import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { ChatMessage, ChatRequest, ChatResponse } from '../types';

const API_BASE_URL = 'http://localhost:8000/api/v1';

export const chatApi = createApi({
  reducerPath: 'chatApi',
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    prepareHeaders: (headers, { getState }) => {
      const sessionId = (getState() as any).app.currentSessionId;
      if (sessionId) {
        headers.set('session_id', sessionId);
      }
      return headers;
    },
  }),
  endpoints: (builder) => ({
    sendMessage: builder.mutation<ChatResponse, ChatRequest>({
      query: (chatRequest) => ({
        url: '/chat',
        method: 'POST',
        body: chatRequest,
      }),
    }),
  }),
});

export const { useSendMessageMutation } = chatApi;
