import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initializeMonitoring } from "@/lib/monitoring";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Initialize monitoring
initializeMonitoring({
  environment: import.meta.env.MODE || 'development',
  enableConsoleLog: import.meta.env.DEV,
  enablePerformanceTracking: true,
  sentryDsn: import.meta.env.VITE_SENTRY_DSN
});

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
