import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export default function IntegrationsOAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing OAuth callback...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const code = searchParams.get('code');
        const provider = localStorage.getItem('oauth_provider');
        const redirectUri = localStorage.getItem('oauth_redirect_uri');

        if (!code || !provider || !redirectUri) {
          throw new Error('Missing OAuth parameters');
        }

        const { data, error } = await supabase.functions.invoke('integration-manager', {
          body: {
            action: 'oauth-callback',
            provider,
            code,
            redirectUri,
            integrationName: `${provider} Integration`
          }
        });

        if (error) throw error;

        if (data.success) {
          setStatus('success');
          setMessage(`${provider} integration connected successfully!`);
          
          // Clean up localStorage
          localStorage.removeItem('oauth_provider');
          localStorage.removeItem('oauth_redirect_uri');
          
          toast({
            title: "Integration Connected",
            description: `${provider} has been successfully integrated`
          });
        } else {
          throw new Error(data.error || 'OAuth callback failed');
        }
      } catch (error: any) {
        console.error('OAuth callback error:', error);
        setStatus('error');
        setMessage(error.message || 'Failed to complete OAuth flow');
        
        toast({
          title: "Integration Failed",
          description: error.message,
          variant: "destructive"
        });
      }
    };

    handleCallback();
  }, [searchParams, toast]);

  return (
    <div className="container mx-auto p-6 max-w-md">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {status === 'processing' && <RefreshCw className="w-5 h-5 animate-spin" />}
            {status === 'success' && <CheckCircle className="w-5 h-5 text-green-500" />}
            {status === 'error' && <XCircle className="w-5 h-5 text-red-500" />}
            OAuth Callback
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">{message}</p>
          
          {status !== 'processing' && (
            <Button onClick={() => navigate('/integrations')} className="w-full">
              Return to Integrations
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}