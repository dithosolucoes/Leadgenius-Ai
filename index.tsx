
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AppProvider } from './context/AppContext';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    {/* FIX: Explicitly passing 'children' prop to AppProvider to fix TypeScript error where children were not being correctly inferred. */}
    <AppProvider children={<App />} />
  </React.StrictMode>
);