import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, Cookie, Settings } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  functional: boolean;
  marketing: boolean;
}

export function CookieConsent() {
  const [showConsent, setShowConsent] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true,
    analytics: false,
    functional: false,
    marketing: false,
  });

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setShowConsent(true);
    } else {
      const savedPreferences = JSON.parse(consent);
      setPreferences(savedPreferences);
    }
  }, []);

  const handleAcceptAll = () => {
    const allAccepted = {
      essential: true,
      analytics: true,
      functional: true,
      marketing: true,
    };
    setPreferences(allAccepted);
    localStorage.setItem('cookie-consent', JSON.stringify(allAccepted));
    setShowConsent(false);
    applyCookieSettings(allAccepted);
  };

  const handleRejectAll = () => {
    const onlyEssential = {
      essential: true,
      analytics: false,
      functional: false,
      marketing: false,
    };
    setPreferences(onlyEssential);
    localStorage.setItem('cookie-consent', JSON.stringify(onlyEssential));
    setShowConsent(false);
    applyCookieSettings(onlyEssential);
  };

  const handleSavePreferences = () => {
    localStorage.setItem('cookie-consent', JSON.stringify(preferences));
    setShowConsent(false);
    setShowSettings(false);
    applyCookieSettings(preferences);
  };

  const applyCookieSettings = (prefs: CookiePreferences) => {
    // Apply analytics tracking
    if (prefs.analytics) {
      // Enable analytics tracking
      console.log('Analytics tracking enabled');
    } else {
      // Disable analytics tracking
      console.log('Analytics tracking disabled');
    }

    // Apply functional cookies
    if (prefs.functional) {
      // Enable functional features
      console.log('Functional cookies enabled');
    }

    // Apply marketing cookies
    if (prefs.marketing) {
      // Enable marketing features
      console.log('Marketing cookies enabled');
    }
  };

  const updatePreference = (key: keyof CookiePreferences, value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  if (!showConsent) return null;

  return (
    <>
      <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:max-w-md">
        <Card className="border-2 border-primary shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-start gap-3 mb-4">
              <Cookie className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-lg mb-2">We use cookies</h3>
                <p className="text-sm text-muted-foreground">
                  We use cookies to enhance your experience, analyze site traffic, and personalize content. 
                  You can manage your preferences or learn more in our{' '}
                  <a href="/privacy-policy" className="text-primary hover:underline">
                    Privacy Policy
                  </a>.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowConsent(false)}
                className="flex-shrink-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
              <Button
                onClick={handleAcceptAll}
                className="flex-1"
              >
                Accept All
              </Button>
              <Button
                onClick={handleRejectAll}
                variant="outline"
                className="flex-1"
              >
                Reject All
              </Button>
              <Button
                onClick={() => setShowSettings(true)}
                variant="outline"
                size="sm"
                className="sm:px-3"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cookie Preferences</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="essential" className="font-medium">
                    Essential Cookies
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Required for the website to function properly
                  </p>
                </div>
                <Switch
                  id="essential"
                  checked={preferences.essential}
                  disabled
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="analytics" className="font-medium">
                    Analytics Cookies
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Help us understand how you use our website
                  </p>
                </div>
                <Switch
                  id="analytics"
                  checked={preferences.analytics}
                  onCheckedChange={(checked) => updatePreference('analytics', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="functional" className="font-medium">
                    Functional Cookies
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Remember your preferences and settings
                  </p>
                </div>
                <Switch
                  id="functional"
                  checked={preferences.functional}
                  onCheckedChange={(checked) => updatePreference('functional', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="marketing" className="font-medium">
                    Marketing Cookies
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Used to show you relevant advertisements
                  </p>
                </div>
                <Switch
                  id="marketing"
                  checked={preferences.marketing}
                  onCheckedChange={(checked) => updatePreference('marketing', checked)}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleSavePreferences} className="flex-1">
                Save Preferences
              </Button>
              <Button onClick={handleAcceptAll} variant="outline" className="flex-1">
                Accept All
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}