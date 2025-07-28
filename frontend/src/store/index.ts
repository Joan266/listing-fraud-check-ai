import { configureStore } from '@reduxjs/toolkit';
import appReducer from './appSlice';
import { chatApi } from '../api/chatApi';

export const store = configureStore({
  reducer: {
    app: appReducer,
    [chatApi.reducerPath]: chatApi.reducer,
  },
  middleware: (getDefaultMiddleware: () => string | any[]) =>
    getDefaultMiddleware().concat(chatApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
