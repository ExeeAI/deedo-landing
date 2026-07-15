import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { initAnalytics } from './lib/analytics';
import './index.css';

// Inject Google tags before first paint. No-ops unless VITE_GTM_ID / VITE_GA4_ID
// are set, so dev and preview builds stay free of third-party requests.
initAnalytics();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
