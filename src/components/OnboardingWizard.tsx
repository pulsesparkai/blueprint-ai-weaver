import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, Building, Clock, CheckCircle } from 'lucide-react';

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Australia/Sydney'
];

const INTERESTS = [
  'AI/Machine Learning',
  'Data Science',
  'Web Development',
  'Mobile Development',
  'DevOps',
  'Product Management',
  'Design/UX',
  'Marketing',
  'Sales',
  'Other'
];

export default function OnboardingWizard() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    company: '',
    jobTitle: '',
    timezone: 'UTC',
    interests: [] as string[]
  });
  
  const { refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleInterestToggle = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const handleComplete = async () => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('user-onboarding', {
        body: {
          company: formData.company,
          jobTitle: formData.jobTitle,
          timezone: formData.timezone,
          interests: formData.interests
        }
      });

      if (error) throw error;

      await refreshProfile();
      
      toast({
        title: "Welcome to ContextForge!",
        description: "Your account has been set up successfully."
      });

      navigate('/dashboard');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Welcome to ContextForge</h1>
              <p className="text-sm text-muted-foreground">Let's set up your account</p>
            </div>
          </div>
          
          <div className="flex justify-center space-x-2 mb-8">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full ${
                  i <= step ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>

        <Card className="border border-border/50 bg-card/50 backdrop-blur-sm shadow-elegant">
          {step === 1 && (
            <>
              <CardHeader className="text-center">
                <CardTitle className="flex items-center gap-2 justify-center">
                  <Building className="w-5 h-5" />
                  Tell us about yourself
                </CardTitle>
                <CardDescription>
                  Help us personalize your experience
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="company">Company (Optional)</Label>
                  <Input
                    id="company"
                    placeholder="Your company name"
                    value={formData.company}
                    onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jobTitle">Job Title (Optional)</Label>
                  <Input
                    id="jobTitle"
                    placeholder="Your role or position"
                    value={formData.jobTitle}
                    onChange={(e) => setFormData(prev => ({ ...prev, jobTitle: e.target.value }))}
                  />
                </div>
                <div className="flex justify-end">
                  <Button onClick={handleNext}>
                    Next
                  </Button>
                </div>
              </CardContent>
            </>
          )}

          {step === 2 && (
            <>
              <CardHeader className="text-center">
                <CardTitle className="flex items-center gap-2 justify-center">
                  <Clock className="w-5 h-5" />
                  Preferences
                </CardTitle>
                <CardDescription>
                  Set your timezone and areas of interest
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select value={formData.timezone} onValueChange={(value) => setFormData(prev => ({ ...prev, timezone: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz} value={tz}>
                          {tz}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-3">
                  <Label>Areas of Interest (Optional)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {INTERESTS.map((interest) => (
                      <Button
                        key={interest}
                        variant={formData.interests.includes(interest) ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleInterestToggle(interest)}
                        className="justify-start"
                      >
                        {interest}
                      </Button>
                    ))}
                  </div>
                </div>
                
                <div className="flex justify-between">
                  <Button variant="outline" onClick={handleBack}>
                    Back
                  </Button>
                  <Button onClick={handleNext}>
                    Next
                  </Button>
                </div>
              </CardContent>
            </>
          )}

          {step === 3 && (
            <>
              <CardHeader className="text-center">
                <CardTitle className="flex items-center gap-2 justify-center">
                  <CheckCircle className="w-5 h-5" />
                  Ready to get started!
                </CardTitle>
                <CardDescription>
                  Review your information and complete setup
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3 p-4 bg-muted rounded-lg">
                  <div className="flex justify-between">
                    <span className="font-medium">Company:</span>
                    <span>{formData.company || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Job Title:</span>
                    <span>{formData.jobTitle || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Timezone:</span>
                    <span>{formData.timezone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Interests:</span>
                    <span>{formData.interests.length} selected</span>
                  </div>
                </div>
                
                <div className="flex justify-between">
                  <Button variant="outline" onClick={handleBack}>
                    Back
                  </Button>
                  <Button onClick={handleComplete} disabled={loading}>
                    {loading ? "Setting up..." : "Complete Setup"}
                  </Button>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}