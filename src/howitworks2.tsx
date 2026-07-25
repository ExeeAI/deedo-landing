import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import HowItWorks2 from './components/HowItWorks2';
import { initAnalytics } from './lib/analytics';
import './index.css';

// Google tags (no-op unless VITE_GTM_ID / VITE_GA4_ID are set).
initAnalytics();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HowItWorks2 />
  </StrictMode>
);
