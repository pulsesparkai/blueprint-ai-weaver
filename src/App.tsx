import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./components/ThemeProvider";
import { Suspense, lazy } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";
import { OnboardingTour } from "@/components/OnboardingTour";
import { CookieConsent } from "@/components/CookieConsent";

// Lazy load pages for code splitting
const Landing = lazy(() => import("./pages/Landing"));
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Editor = lazy(() => import("./pages/Editor"));
const Templates = lazy(() => import("./pages/Templates"));
const Integrations = lazy(() => import("./pages/Integrations"));
const IntegrationsOAuthCallback = lazy(() => import("./pages/IntegrationsOAuthCallback"));
const ApiKeys = lazy(() => import("./pages/ApiKeys"));
const TestIntegrations = lazy(() => import("./pages/TestIntegrations"));
const Billing = lazy(() => import("./pages/Billing"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const DataExport = lazy(() => import("./pages/DataExport"));
const StatusPage = lazy(() => import("./pages/StatusPage"));
const ApiDocs = lazy(() => import("./pages/ApiDocs"));
const Support = lazy(() => import("./pages/Support"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="dark">
      <AuthProvider>
        <TooltipProvider>
          <ErrorBoundary>
            <Toaster />
            <Sonner />
            <OnboardingTour isOpen={false} onClose={() => {}} onUpgradePrompt={() => {}} />
            <CookieConsent />
            <BrowserRouter>
              <KeyboardShortcuts />
              <Suspense fallback={<LoadingSpinner />}>
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/dashboard" element={<Index />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/billing" element={<Billing />} />
                  <Route path="/editor/:id?" element={<Editor />} />
                  <Route path="/templates" element={<Templates />} />
                  <Route path="/integrations" element={<Integrations />} />
                  <Route path="/integrations/oauth-callback" element={<IntegrationsOAuthCallback />} />
                  <Route path="/test-integrations" element={<TestIntegrations />} />
                  <Route path="/api-keys" element={<ApiKeys />} />
                  <Route path="/terms" element={<TermsOfService />} />
                  <Route path="/privacy" element={<PrivacyPolicy />} />
                  <Route path="/data-export" element={<DataExport />} />
                  <Route path="/status" element={<StatusPage />} />
                  <Route path="/api-docs" element={<ApiDocs />} />
                  <Route path="/support" element={<Support />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </ErrorBoundary>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
