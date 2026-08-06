import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { Provider } from 'react-redux';
import { store } from './store';
import { BrowserRouter } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import './index.css';


ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
      <Provider store={store}>
        <BrowserRouter>
          <App />
          <Analytics />
        </BrowserRouter>
      </Provider>
  </React.StrictMode>,
);