import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, CheckCircle, Clock, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TestResult {
  success: boolean;
  response?: any;
  error?: string;
  responseTime?: number;
  tokensUsed?: number;
}

export default function TestIntegrations() {
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [selectedIntegration, setSelectedIntegration] = useState('');
  const [testPrompt, setTestPrompt] = useState('Hello, this is a test message. Please respond with a simple greeting.');
  const [ragQuery, setRagQuery] = useState('artificial intelligence machine learning');
  const { toast } = useToast();

  React.useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    try {
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('status', 'active');

      if (error) throw error;
      setIntegrations(data || []);
    } catch (error) {
      console.error('Error loading integrations:', error);
      toast({
        title: "Error",
        description: "Failed to load integrations",
        variant: "destructive"
      });
    }
  };

  const testLLMIntegration = async (integrationId: string) => {
    setTesting(true);
    const startTime = Date.now();
    
    try {
      const { data, error } = await supabase.functions.invoke('api-llm', {
        body: {
          integration_id: integrationId,
          prompt: testPrompt,
          model: 'gpt-4o-mini',
          temperature: 0.7,
          max_tokens: 100
        }
      });

      const responseTime = Date.now() - startTime;

      if (error) {
        setTestResults(prev => ({
          ...prev,
          [integrationId]: {
            success: false,
            error: error.message,
            responseTime
          }
        }));
      } else {
        setTestResults(prev => ({
          ...prev,
          [integrationId]: {
            success: true,
            response: data.response,
            responseTime,
            tokensUsed: data.tokens_used
          }
        }));
      }
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [integrationId]: {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          responseTime: Date.now() - startTime
        }
      }));
    } finally {
      setTesting(false);
    }
  };

  const testRAGIntegration = async (integrationId: string) => {
    setTesting(true);
    const startTime = Date.now();
    
    try {
      const { data, error } = await supabase.functions.invoke('api-rag', {
        body: {
          integration_id: integrationId,
          query: ragQuery,
          top_k: 3
        }
      });

      const responseTime = Date.now() - startTime;

      if (error) {
        setTestResults(prev => ({
          ...prev,
          [integrationId]: {
            success: false,
            error: error.message,
            responseTime
          }
        }));
      } else {
        setTestResults(prev => ({
          ...prev,
          [integrationId]: {
            success: true,
            response: data.results,
            responseTime
          }
        }));
      }
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [integrationId]: {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          responseTime: Date.now() - startTime
        }
      }));
    } finally {
      setTesting(false);
    }
  };

  const testAllIntegrations = async () => {
    setTesting(true);
    setTestResults({});
    
    for (const integration of integrations) {
      if (integration.type === 'openai' || integration.type === 'anthropic') {
        await testLLMIntegration(integration.id);
      } else if (['pinecone', 'weaviate', 'qdrant'].includes(integration.type)) {
        await testRAGIntegration(integration.id);
      }
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setTesting(false);
  };

  const getStatusIcon = (result: TestResult) => {
    if (result.success) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    } else {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = (result: TestResult) => {
    if (result.success) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Success</Badge>;
    } else {
      return <Badge variant="destructive">Failed</Badge>;
    }
  };

  const llmIntegrations = integrations.filter(i => ['openai', 'anthropic'].includes(i.type));
  const ragIntegrations = integrations.filter(i => ['pinecone', 'weaviate', 'qdrant'].includes(i.type));

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Integration Testing</h1>
        <p className="text-muted-foreground">
          Test your API integrations to ensure they're working correctly with real API calls.
        </p>
      </div>

      <div className="grid gap-6">
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Note:</strong> Vector database testing (Pinecone, Qdrant) requires an OpenAI API key for embeddings generation. 
            Make sure to add your OpenAI API key in the Supabase Edge Functions secrets.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Quick Test All Integrations
            </CardTitle>
            <CardDescription>
              Run a quick test on all your configured integrations to verify they're working.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={testAllIntegrations} 
              disabled={testing || integrations.length === 0}
              size="lg"
            >
              {testing ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                'Test All Integrations'
              )}
            </Button>
            {integrations.length === 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                No integrations configured. Go to the Integrations page to add some.
              </p>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="llm" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="llm">LLM Integrations</TabsTrigger>
            <TabsTrigger value="rag">Vector Database (RAG)</TabsTrigger>
          </TabsList>
          
          <TabsContent value="llm" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Test LLM Integrations</CardTitle>
                <CardDescription>
                  Test your OpenAI and Anthropic integrations with a custom prompt.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="test-prompt">Test Prompt</Label>
                  <Textarea
                    id="test-prompt"
                    value={testPrompt}
                    onChange={(e) => setTestPrompt(e.target.value)}
                    placeholder="Enter a test prompt for your LLM..."
                    rows={3}
                  />
                </div>

                <div className="space-y-4">
                  {llmIntegrations.map((integration) => (
                    <Card key={integration.id} className="border">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div>
                              <h3 className="font-medium">{integration.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {integration.type} • {integration.status}
                              </p>
                            </div>
                            {testResults[integration.id] && getStatusIcon(testResults[integration.id])}
                          </div>
                          <div className="flex items-center gap-2">
                            {testResults[integration.id] && getStatusBadge(testResults[integration.id])}
                            <Button
                              onClick={() => testLLMIntegration(integration.id)}
                              disabled={testing}
                              size="sm"
                            >
                              Test
                            </Button>
                          </div>
                        </div>

                        {testResults[integration.id] && (
                          <div className="mt-4">
                            {testResults[integration.id].success ? (
                              <div className="space-y-2">
                                <div className="flex gap-4 text-sm text-muted-foreground">
                                  <span>Response Time: {testResults[integration.id].responseTime}ms</span>
                                  {testResults[integration.id].tokensUsed && (
                                    <span>Tokens Used: {testResults[integration.id].tokensUsed}</span>
                                  )}
                                </div>
                                <Alert>
                                  <CheckCircle className="h-4 w-4" />
                                  <AlertDescription>
                                    <strong>Response:</strong> {testResults[integration.id].response}
                                  </AlertDescription>
                                </Alert>
                              </div>
                            ) : (
                              <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                  <strong>Error:</strong> {testResults[integration.id].error}
                                </AlertDescription>
                              </Alert>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}

                  {llmIntegrations.length === 0 && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        No LLM integrations configured. Add OpenAI or Anthropic integrations to test them here.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rag" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Test Vector Database Integrations</CardTitle>
                <CardDescription>
                  Test your Pinecone, Weaviate, or Qdrant integrations with a search query.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="rag-query">Search Query</Label>
                  <Input
                    id="rag-query"
                    value={ragQuery}
                    onChange={(e) => setRagQuery(e.target.value)}
                    placeholder="Enter a search query to test vector search..."
                  />
                </div>

                <div className="space-y-4">
                  {ragIntegrations.map((integration) => (
                    <Card key={integration.id} className="border">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div>
                              <h3 className="font-medium">{integration.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {integration.type} • {integration.status}
                              </p>
                            </div>
                            {testResults[integration.id] && getStatusIcon(testResults[integration.id])}
                          </div>
                          <div className="flex items-center gap-2">
                            {testResults[integration.id] && getStatusBadge(testResults[integration.id])}
                            <Button
                              onClick={() => testRAGIntegration(integration.id)}
                              disabled={testing}
                              size="sm"
                            >
                              Test
                            </Button>
                          </div>
                        </div>

                        {testResults[integration.id] && (
                          <div className="mt-4">
                            {testResults[integration.id].success ? (
                              <div className="space-y-2">
                                <div className="text-sm text-muted-foreground">
                                  Response Time: {testResults[integration.id].responseTime}ms
                                </div>
                                <Alert>
                                  <CheckCircle className="h-4 w-4" />
                                  <AlertDescription>
                                    <strong>Found {testResults[integration.id].response?.length || 0} results:</strong>
                                    <div className="mt-2 space-y-1">
                                      {testResults[integration.id].response?.slice(0, 2).map((result: any, idx: number) => (
                                        <div key={idx} className="text-xs p-2 bg-muted rounded">
                                          Score: {result.score?.toFixed(3)} - {result.text?.substring(0, 100)}...
                                        </div>
                                      ))}
                                    </div>
                                  </AlertDescription>
                                </Alert>
                              </div>
                            ) : (
                              <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                  <strong>Error:</strong> {testResults[integration.id].error}
                                </AlertDescription>
                              </Alert>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}

                  {ragIntegrations.length === 0 && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        No vector database integrations configured. Add Pinecone, Weaviate, or Qdrant integrations to test them here.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}