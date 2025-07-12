import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { GitCompare, Play, Loader2, BarChart3, Clock, DollarSign, Zap, Trophy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ComparisonResult {
  blueprintId: string;
  blueprintName: string;
  status: 'running' | 'completed' | 'error';
  finalOutput?: string;
  totalMetrics: {
    totalTokens: number;
    totalCost: number;
    executionTime: number;
    averageRelevance?: number;
  };
  steps: any[];
}

export default function ComparisonDemo() {
  const [selectedTemplates, setSelectedTemplates] = useState<string[]>([]);
  const [availableTemplates, setAvailableTemplates] = useState<any[]>([]);
  const [testQuery, setTestQuery] = useState('What are the benefits of machine learning in healthcare?');
  const [comparisonResults, setComparisonResults] = useState<ComparisonResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [userTier, setUserTier] = useState<'free' | 'pro' | 'enterprise'>('free');
  const { toast } = useToast();

  useEffect(() => {
    loadRAGTemplates();
  }, []);

  const loadRAGTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('blueprint_templates')
        .select('*')
        .order('tier', { ascending: true })
        .order('name');

      if (error) throw error;
      setAvailableTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to load RAG templates',
        variant: 'destructive'
      });
    }
  };

  const getMaxComparisons = () => {
    switch (userTier) {
      case 'free': return 2;
      case 'pro': return 5;
      case 'enterprise': return 10;
      default: return 2;
    }
  };

  const addTemplateToComparison = (templateId: string) => {
    const maxComparisons = getMaxComparisons();
    
    if (selectedTemplates.length >= maxComparisons) {
      toast({
        title: 'Comparison limit reached',
        description: `${userTier} tier allows up to ${maxComparisons} comparisons. ${userTier === 'free' ? 'Upgrade to Pro for more.' : ''}`,
        variant: 'destructive'
      });
      return;
    }

    if (!selectedTemplates.includes(templateId)) {
      setSelectedTemplates(prev => [...prev, templateId]);
    }
  };

  const removeTemplateFromComparison = (templateId: string) => {
    setSelectedTemplates(prev => prev.filter(id => id !== templateId));
  };

  const runComparison = async () => {
    if (selectedTemplates.length < 2) {
      toast({
        title: 'Select templates',
        description: 'Please select at least 2 templates to compare',
        variant: 'destructive'
      });
      return;
    }

    setIsRunning(true);
    setComparisonResults([]);

    try {
      const { data, error } = await supabase.functions.invoke('pipeline-comparison', {
        body: {
          sessionId: `demo_${Date.now()}`,
          input: testQuery,
          provider: 'openai',
          model: 'gpt-4o-mini',
          apiKey: 'mock-key',
          useMockMode: true,
          blueprintIds: selectedTemplates,
          mode: 'comparison'
        }
      });

      if (error) throw error;

      setComparisonResults(data.results || []);
      toast({
        title: 'Comparison Complete',
        description: `Successfully compared ${data.results?.length || 0} RAG variants`,
      });

    } catch (error: any) {
      console.error('Comparison error:', error);
      toast({
        title: 'Comparison Failed',
        description: error.message || 'An error occurred during comparison',
        variant: 'destructive'
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getSelectedTemplateNames = () => {
    return selectedTemplates.map(id => {
      const template = availableTemplates.find(t => t.id === id);
      return template?.name || 'Unknown';
    }).join(' vs ');
  };

  const getComparisonChartData = () => {
    return comparisonResults.map(result => ({
      name: result.blueprintName?.replace('[Template] ', '') || 'Unknown',
      tokens: result.totalMetrics.totalTokens,
      cost: result.totalMetrics.totalCost * 1000, // convert to milli-dollars
      latency: result.totalMetrics.executionTime,
      relevance: (result.totalMetrics.averageRelevance || 0) * 100
    }));
  };

  const getBestPerformer = (metric: string) => {
    if (!comparisonResults.length) return null;
    
    const sortedResults = [...comparisonResults].sort((a, b) => {
      switch (metric) {
        case 'cost':
          return a.totalMetrics.totalCost - b.totalMetrics.totalCost;
        case 'speed':
          return a.totalMetrics.executionTime - b.totalMetrics.executionTime;
        case 'relevance':
          return (b.totalMetrics.averageRelevance || 0) - (a.totalMetrics.averageRelevance || 0);
        default:
          return 0;
      }
    });
    
    return sortedResults[0];
  };

  const formatCost = (cost: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4
    }).format(cost);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <GitCompare className="w-8 h-8 text-primary" />
            RAG Blueprint Comparison
          </h1>
          <p className="text-muted-foreground mt-2">
            Compare different RAG variants side-by-side to find the best approach for your use case
          </p>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
          {/* Tier Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">User Tier</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex gap-1">
                {(['free', 'pro', 'enterprise'] as const).map(tier => (
                  <Button
                    key={tier}
                    variant={userTier === tier ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setUserTier(tier)}
                    className="text-xs capitalize"
                  >
                    {tier}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Max comparisons: {getMaxComparisons()}
              </p>
            </CardContent>
          </Card>

          {/* Template Selection */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">
                Selected Templates ({selectedTemplates.length}/{getMaxComparisons()})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex flex-wrap gap-1">
                {selectedTemplates.map(templateId => {
                  const template = availableTemplates.find(t => t.id === templateId);
                  return (
                    <Badge key={templateId} variant="secondary" className="flex items-center gap-1">
                      {template?.name}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 ml-1"
                        onClick={() => removeTemplateFromComparison(templateId)}
                      >
                        ×
                      </Button>
                    </Badge>
                  );
                })}
              </div>
              <Select onValueChange={addTemplateToComparison}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Add RAG template..." />
                </SelectTrigger>
                <SelectContent>
                  {availableTemplates
                    .filter(template => !selectedTemplates.includes(template.id))
                    .map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex items-center gap-2">
                          <span>{template.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {template.tier}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Run Comparison */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Run Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={runComparison}
                disabled={isRunning || selectedTemplates.length < 2}
                className="w-full"
                size="sm"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Comparing...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Compare
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Test Query */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Test Query</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              value={testQuery}
              onChange={(e) => setTestQuery(e.target.value)}
              placeholder="Enter your test query..."
              className="text-sm"
            />
          </CardContent>
        </Card>

        {/* Results */}
        {comparisonResults.length > 0 && (
          <div className="space-y-6">
            {/* Performance Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['cost', 'speed', 'relevance'].map(metric => {
                const best = getBestPerformer(metric);
                return (
                  <Card key={metric}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm capitalize">Best {metric}</CardTitle>
                      <Trophy className="w-4 h-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-lg font-bold">
                        {best?.blueprintName?.replace('[Template] ', '') || 'N/A'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {metric === 'cost' && best && formatCost(best.totalMetrics.totalCost)}
                        {metric === 'speed' && best && `${best.totalMetrics.executionTime}ms`}
                        {metric === 'relevance' && best && `${((best.totalMetrics.averageRelevance || 0) * 100).toFixed(1)}%`}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Charts */}
            <Tabs defaultValue="performance" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="cost">Cost Analysis</TabsTrigger>
                <TabsTrigger value="detailed">Detailed Results</TabsTrigger>
              </TabsList>

              <TabsContent value="performance" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Performance Comparison</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={getComparisonChartData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" fontSize={12} />
                        <YAxis fontSize={12} />
                        <Tooltip />
                        <Bar dataKey="tokens" fill="#8884d8" name="Tokens" />
                        <Bar dataKey="latency" fill="#82ca9d" name="Latency (ms)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="cost" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Cost & Relevance Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={getComparisonChartData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" fontSize={12} />
                        <YAxis fontSize={12} />
                        <Tooltip formatter={(value: any, name: string) => [
                          name === 'cost' ? `$${(value / 1000).toFixed(4)}` : `${value}%`,
                          name === 'cost' ? 'Cost' : 'Relevance'
                        ]} />
                        <Bar dataKey="cost" fill="#ffc658" name="Cost (m$)" />
                        <Bar dataKey="relevance" fill="#ff7300" name="Relevance %" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="detailed" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {comparisonResults.map((result, index) => (
                    <Card key={result.blueprintId}>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center justify-between">
                          {result.blueprintName?.replace('[Template] ', '')}
                          <Badge variant={result.status === 'completed' ? 'default' : 'destructive'}>
                            {result.status}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex justify-between">
                            <span>Tokens:</span>
                            <span className="font-mono">{result.totalMetrics.totalTokens}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Cost:</span>
                            <span className="font-mono">{formatCost(result.totalMetrics.totalCost)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Time:</span>
                            <span className="font-mono">{result.totalMetrics.executionTime}ms</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Relevance:</span>
                            <span className="font-mono">
                              {((result.totalMetrics.averageRelevance || 0) * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        
                        {result.finalOutput && (
                          <div className="mt-3">
                            <Label className="text-xs font-medium">Output:</Label>
                            <div className="mt-1 p-2 bg-muted rounded text-xs max-h-32 overflow-y-auto">
                              {result.finalOutput}
                            </div>
                          </div>
                        )}

                        <div className="mt-3">
                          <Label className="text-xs font-medium">Steps ({result.steps.length}):</Label>
                          <div className="mt-1 space-y-1">
                            {result.steps.map((step, stepIndex) => (
                              <div key={stepIndex} className="flex items-center justify-between text-xs p-1 bg-muted rounded">
                                <span>{step.stepName}</span>
                                <Badge variant="outline" className="text-xs">
                                  {step.status}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Available Templates Overview */}
        {comparisonResults.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Available RAG Templates</CardTitle>
              <p className="text-sm text-muted-foreground">
                Choose from {availableTemplates.length} pre-built RAG variants to compare
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {availableTemplates.map(template => (
                  <Card 
                    key={template.id} 
                    className={`cursor-pointer transition-colors ${
                      selectedTemplates.includes(template.id) ? 'border-primary' : 'hover:border-accent'
                    }`}
                    onClick={() => {
                      if (selectedTemplates.includes(template.id)) {
                        removeTemplateFromComparison(template.id);
                      } else {
                        addTemplateToComparison(template.id);
                      }
                    }}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-sm">{template.name}</CardTitle>
                        <div className="flex gap-1">
                          <Badge variant="outline" className="text-xs">
                            {template.tier}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {template.difficulty}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground mb-2">
                        {template.description}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {template.tags.slice(0, 3).map((tag: string) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}