// Monitoring and error tracking utilities

interface MonitoringConfig {
  sentryDsn?: string;
  environment: string;
  enableConsoleLog: boolean;
  enablePerformanceTracking: boolean;
}

let monitoringConfig: MonitoringConfig = {
  environment: 'development',
  enableConsoleLog: true,
  enablePerformanceTracking: true
};

// Initialize Sentry (placeholder - actual implementation would use @sentry/react)
export function initializeMonitoring(config: Partial<MonitoringConfig>) {
  monitoringConfig = { ...monitoringConfig, ...config };
  
  if (config.sentryDsn && typeof window !== 'undefined') {
    // In production, you would install @sentry/react and use:
    // import * as Sentry from "@sentry/react";
    // Sentry.init({
    //   dsn: config.sentryDsn,
    //   environment: config.environment,
    //   integrations: [
    //     new Sentry.BrowserTracing(),
    //   ],
    //   tracesSampleRate: 1.0,
    // });
    
    console.log('Monitoring initialized with Sentry DSN:', config.sentryDsn);
  }
}

// Performance tracking
export function trackPerformance(name: string, fn: () => Promise<any> | any) {
  if (!monitoringConfig.enablePerformanceTracking) return fn();
  
  const start = performance.now();
  
  try {
    const result = fn();
    
    if (result instanceof Promise) {
      return result.finally(() => {
        const duration = performance.now() - start;
        logPerformance(name, duration);
      });
    } else {
      const duration = performance.now() - start;
      logPerformance(name, duration);
      return result;
    }
  } catch (error) {
    const duration = performance.now() - start;
    logPerformance(name, duration, error);
    throw error;
  }
}

// Error tracking
export function trackError(error: Error, context?: Record<string, any>) {
  if (monitoringConfig.enableConsoleLog) {
    console.error('Error tracked:', error, context);
  }
  
  // In production, you would use:
  // Sentry.captureException(error, { extra: context });
  
  // Send to custom analytics endpoint
  if (typeof window !== 'undefined') {
    fetch('/api/analytics/error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name
        },
        context,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      })
    }).catch(console.error);
  }
}

// User action tracking
export function trackUserAction(action: string, properties?: Record<string, any>) {
  if (monitoringConfig.enableConsoleLog) {
    console.log('User action:', action, properties);
  }
  
  // Send to analytics
  if (typeof window !== 'undefined') {
    fetch('/api/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        properties,
        timestamp: new Date().toISOString(),
        sessionId: getSessionId(),
        userId: getUserId()
      })
    }).catch(console.error);
  }
}

// Performance logging
function logPerformance(name: string, duration: number, error?: Error) {
  const logData = {
    name,
    duration,
    timestamp: new Date().toISOString(),
    error: error ? { message: error.message, stack: error.stack } : undefined
  };
  
  if (monitoringConfig.enableConsoleLog) {
    console.log('Performance:', logData);
  }
  
  // Send to monitoring service
  if (typeof window !== 'undefined') {
    fetch('/api/analytics/performance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logData)
    }).catch(console.error);
  }
}

// Utility functions
function getSessionId(): string {
  let sessionId = sessionStorage.getItem('monitoring_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('monitoring_session_id', sessionId);
  }
  return sessionId;
}

function getUserId(): string | null {
  // In a real app, get this from your auth context
  return localStorage.getItem('user_id') || null;
}

// React Error Boundary (placeholder)
export class ErrorBoundary extends Error {
  constructor(message: string, public componentStack?: string) {
    super(message);
    this.name = 'ErrorBoundary';
  }
}

// Custom hooks for monitoring
export function useErrorTracking() {
  return {
    trackError,
    trackUserAction,
    trackPerformance
  };
}

// Health check utilities
export async function healthCheck(): Promise<{ status: 'healthy' | 'unhealthy', checks: Record<string, boolean> }> {
  const checks: Record<string, boolean> = {};
  
  try {
    // Check API connectivity
    const response = await fetch('/health', { method: 'HEAD' });
    checks.api = response.ok;
  } catch {
    checks.api = false;
  }
  
  try {
    // Check local storage
    localStorage.setItem('health_check', 'test');
    localStorage.removeItem('health_check');
    checks.localStorage = true;
  } catch {
    checks.localStorage = false;
  }
  
  // Check essential browser APIs
  checks.fetch = typeof fetch !== 'undefined';
  checks.webSockets = typeof WebSocket !== 'undefined';
  checks.indexedDB = typeof indexedDB !== 'undefined';
  
  const allHealthy = Object.values(checks).every(Boolean);
  
  return {
    status: allHealthy ? 'healthy' : 'unhealthy',
    checks
  };
}