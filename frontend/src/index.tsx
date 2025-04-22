import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Load environment variables
declare global {
  interface Window {
    env: {
      REACT_APP_API_URL: string;
    };
  }
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
); 