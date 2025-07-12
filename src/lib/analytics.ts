// Analytics integration with Mixpanel and custom events

interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
  userId?: string;
  timestamp?: string;
}

interface AnalyticsConfig {
  mixpanelToken?: string;
  environment: string;
  enableConsoleLog: boolean;
  enableMixpanel: boolean;
}

let analyticsConfig: AnalyticsConfig = {
  environment: 'development',
  enableConsoleLog: true,
  enableMixpanel: false
};

// Initialize analytics
export function initializeAnalytics(config: Partial<AnalyticsConfig>) {
  analyticsConfig = { ...analyticsConfig, ...config };
  
  if (config.mixpanelToken && config.enableMixpanel && typeof window !== 'undefined') {
    // In production, you would install mixpanel-browser and use:
    // import mixpanel from 'mixpanel-browser';
    // mixpanel.init(config.mixpanelToken, {
    //   debug: config.environment === 'development',
    //   track_pageview: true,
    //   persistence: 'localStorage'
    // });
    
    console.log('Analytics initialized with Mixpanel token:', config.mixpanelToken);
  }
}

// Track events
export function trackEvent(event: string, properties?: Record<string, any>) {
  const analyticsEvent: AnalyticsEvent = {
    event,
    properties: {
      ...properties,
      timestamp: new Date().toISOString(),
      environment: analyticsConfig.environment,
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined
    },
    timestamp: new Date().toISOString()
  };
  
  if (analyticsConfig.enableConsoleLog) {
    console.log('Analytics Event:', analyticsEvent);
  }
  
  // Send to Mixpanel
  if (analyticsConfig.enableMixpanel && typeof window !== 'undefined') {
    // mixpanel.track(event, analyticsEvent.properties);
  }
  
  // Send to custom analytics endpoint
  if (typeof window !== 'undefined') {
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(analyticsEvent)
    }).catch(console.error);
  }
}

// Page view tracking
export function trackPageView(page: string, properties?: Record<string, any>) {
  trackEvent('page_view', {
    page,
    ...properties
  });
}

// User action tracking
export function trackUserAction(action: string, category: string, properties?: Record<string, any>) {
  trackEvent('user_action', {
    action,
    category,
    ...properties
  });
}

// Blueprint operations
export function trackBlueprintEvent(action: string, blueprintId?: string, properties?: Record<string, any>) {
  trackEvent('blueprint_action', {
    action,
    blueprint_id: blueprintId,
    ...properties
  });
}

// Simulation tracking
export function trackSimulation(action: string, properties?: Record<string, any>) {
  trackEvent('simulation', {
    action,
    ...properties
  });
}

// Error tracking
export function trackError(error: Error, context?: Record<string, any>) {
  trackEvent('error', {
    error_message: error.message,
    error_stack: error.stack,
    error_name: error.name,
    ...context
  });
}

// Performance tracking
export function trackPerformance(name: string, duration: number, properties?: Record<string, any>) {
  trackEvent('performance', {
    metric_name: name,
    duration_ms: duration,
    ...properties
  });
}

// Identify user (when they log in)
export function identifyUser(userId: string, properties?: Record<string, any>) {
  if (analyticsConfig.enableMixpanel && typeof window !== 'undefined') {
    // mixpanel.identify(userId);
    // mixpanel.people.set({
    //   $email: properties?.email,
    //   $name: properties?.name,
    //   ...properties
    // });
  }
  
  trackEvent('user_identified', {
    user_id: userId,
    ...properties
  });
}

// Custom hook for analytics
export function useAnalytics() {
  return {
    track: trackEvent,
    trackPageView,
    trackUserAction,
    trackBlueprintEvent,
    trackSimulation,
    trackError,
    trackPerformance,
    identifyUser
  };
}