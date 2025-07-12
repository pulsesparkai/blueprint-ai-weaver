import React, { useState } from 'react';
import { Send, Star, MessageSquare, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAnalytics } from '@/lib/analytics';

interface FeedbackFormProps {
  trigger?: React.ReactNode;
  defaultType?: 'bug' | 'feature' | 'general';
  context?: Record<string, any>;
}

export function FeedbackForm({ trigger, defaultType = 'general', context }: FeedbackFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState(defaultType);
  const [rating, setRating] = useState<number>(0);
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { toast } = useToast();
  const { track } = useAnalytics();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim()) {
      toast({
        title: "Message required",
        description: "Please provide your feedback message",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const feedbackData = {
        type,
        rating,
        email,
        subject,
        message,
        context,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      };

      // Track feedback submission
      track('feedback_submitted', {
        feedback_type: type,
        rating,
        has_email: !!email,
        message_length: message.length
      });

      // In a real implementation, you would send this to your backend
      console.log('Feedback submitted:', feedbackData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast({
        title: "Feedback sent!",
        description: "Thank you for your feedback. We'll review it and get back to you if needed.",
      });

      // Reset form
      setType('general');
      setRating(0);
      setEmail('');
      setSubject('');
      setMessage('');
      setIsOpen(false);
      
    } catch (error) {
      toast({
        title: "Failed to send feedback",
        description: "Please try again later or contact support directly.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = () => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-6 h-6 cursor-pointer transition-colors ${
          i < rating 
            ? 'fill-yellow-400 text-yellow-400' 
            : 'text-gray-300 hover:text-yellow-400'
        }`}
        onClick={() => setRating(i + 1)}
      />
    ));
  };

  const getTypeColor = (feedbackType: string) => {
    switch (feedbackType) {
      case 'bug': return 'destructive';
      case 'feature': return 'default';
      default: return 'secondary';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            Feedback
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Send Feedback
          </DialogTitle>
          <DialogDescription>
            Help us improve ContextForge by sharing your thoughts, reporting bugs, or suggesting features.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Feedback Type */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Feedback Type</Label>
            <RadioGroup value={type} onValueChange={(value) => setType(value as typeof type)} className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="general" id="general" />
                <Label htmlFor="general" className="cursor-pointer">General</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="bug" id="bug" />
                <Label htmlFor="bug" className="cursor-pointer">Bug Report</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="feature" id="feature" />
                <Label htmlFor="feature" className="cursor-pointer">Feature Request</Label>
              </div>
            </RadioGroup>
            <Badge variant={getTypeColor(type)} className="w-fit">
              {type === 'bug' ? 'Bug Report' : type === 'feature' ? 'Feature Request' : 'General Feedback'}
            </Badge>
          </div>

          {/* Rating */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              Overall Rating (Optional)
            </Label>
            <div className="flex gap-1">
              {renderStars()}
            </div>
            {rating > 0 && (
              <p className="text-sm text-muted-foreground">
                {rating === 1 && "Poor"}
                {rating === 2 && "Fair"}
                {rating === 3 && "Good"}
                {rating === 4 && "Very Good"}
                {rating === 5 && "Excellent"}
              </p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email (Optional)
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Provide your email if you'd like a response
            </p>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject" className="text-sm font-medium">
              Subject (Optional)
            </Label>
            <Input
              id="subject"
              placeholder="Brief summary of your feedback"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message" className="text-sm font-medium">
              Message *
            </Label>
            <Textarea
              id="message"
              placeholder="Describe your feedback, bug report, or feature request in detail..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              required
            />
          </div>

          {/* Context Info */}
          {context && Object.keys(context).length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Additional Context</Label>
              <div className="bg-muted p-3 rounded-md">
                <pre className="text-xs text-muted-foreground overflow-x-auto">
                  {JSON.stringify(context, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Feedback
                </>
              )}
            </Button>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Quick feedback button for specific contexts
export function QuickFeedbackButton({ context, className }: { context?: Record<string, any>; className?: string }) {
  return (
    <FeedbackForm 
      context={context}
      trigger={
        <Button variant="ghost" size="sm" className={className}>
          <MessageSquare className="w-4 h-4" />
        </Button>
      } 
    />
  );
}