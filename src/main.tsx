import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initializeMonitoring } from "@/lib/monitoring";
import { initializeAnalytics } from "@/lib/analytics";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Initialize monitoring
initializeMonitoring({
  environment: import.meta.env.MODE || 'development',
  enableConsoleLog: import.meta.env.DEV,
  enablePerformanceTracking: true,
  sentryDsn: import.meta.env.VITE_SENTRY_DSN
});

// Initialize analytics
initializeAnalytics({
  environment: import.meta.env.MODE || 'development',
  enableConsoleLog: import.meta.env.DEV,
  enableMixpanel: !!import.meta.env.VITE_MIXPANEL_TOKEN,
  mixpanelToken: import.meta.env.VITE_MIXPANEL_TOKEN
});

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
