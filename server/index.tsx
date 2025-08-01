import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.pcss';
import App from './components/App.tsx'; // Changed from './App.tsx' to './components/App.tsx'

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
