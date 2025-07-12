import React, { useState, useEffect, useRef } from 'react';
import { ChevronUp, ChevronDown, Play, Settings, Key, Loader2, History, Zap, AlertCircle, RefreshCw, GitCompare, Plus, X, BarChart3, ArrowLeftRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGraph } from '@/contexts/GraphContext';
import { useToast } from '@/hooks/use-toast';

interface SimulatorPaneProps {
  isCollapsed: boolean;
  onToggle: () => void;
  blueprintId?: string;
}

interface SimulationStep {
  stepName: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  output?: any;
  metrics?: {
    tokensInput: number;
    tokensOutput: number;
    latencyMs: number;
    costUsd: number;
    relevanceScore?: number;
  };
  error?: string;
}

interface SimulationResult {
  id: string;
  blueprintId?: string;
  blueprintName?: string;
  status: 'running' | 'completed' | 'error';
  steps: SimulationStep[];
  finalOutput?: string;
  totalMetrics: {
    totalTokens: number;
    totalCost: number;
    executionTime: number;
    averageRelevance?: number;
  };
  contextWindow: any[];
}

interface ComparisonBlueprint {
  id: string;
  name: string;
  nodes: any[];
  edges: any[];
}

export function SimulatorPane({ isCollapsed, onToggle, blueprintId }: SimulatorPaneProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [input, setInput] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('openai');
  const [selectedModel, setSelectedModel] = useState('gpt-4o-mini');
  const [apiKeys, setApiKeys] = useState({
    openai: '',
    anthropic: '',
    xai: ''
  });
  const [useMockMode, setUseMockMode] = useState(false);
  const [currentSimulation, setCurrentSimulation] = useState<SimulationResult | null>(null);
  const [simulationHistory, setSimulationHistory] = useState<any[]>([]);
  const [progress, setProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('test');
  const [realtimeChannel, setRealtimeChannel] = useState<any>(null);
  
  // Comparison state
  const [compareMode, setCompareMode] = useState(false);
  const [availableBlueprints, setAvailableBlueprints] = useState<ComparisonBlueprint[]>([]);
  const [selectedBlueprints, setSelectedBlueprints] = useState<string[]>([]);
  const [comparisonResults, setComparisonResults] = useState<SimulationResult[]>([]);
  const [maxComparisons, setMaxComparisons] = useState(2); // tier-based limit
  
  const { user } = useAuth();
  const { state } = useGraph();
  const { toast } = useToast();

  useEffect(() => {
    loadSimulationHistory();
    loadAvailableBlueprints();
    setUserTierLimits();
    
    // Set up realtime channel for simulation updates
    if (user && blueprintId) {
      const sessionId = generateSessionId();
      const channel = supabase.channel(`simulation_${sessionId}`)
        .on('broadcast', { event: 'simulation_progress' }, (payload) => {
          handleSimulationUpdate(payload);
        })
        .on('broadcast', { event: 'comparison_progress' }, (payload) => {
          handleComparisonUpdate(payload);
        })
        .subscribe();

      setRealtimeChannel(channel);

      return () => {
        if (channel) {
          supabase.removeChannel(channel);
        }
      };
    }
  }, [user, blueprintId]);

  const setUserTierLimits = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', user?.id)
        .single();

      if (profile?.subscription_tier === 'free') {
        setMaxComparisons(2);
      } else {
        setMaxComparisons(10); // unlimited for paid tiers
      }
    } catch (error) {
      console.error('Error fetching user tier:', error);
      setMaxComparisons(2); // default to free tier
    }
  };

  const loadAvailableBlueprints = async () => {
    try {
      // Load user's blueprints
      const { data: userBlueprints } = await supabase
        .from('blueprints')
        .select('id, title, nodes, edges')
        .eq('user_id', user?.id)
        .order('updated_at', { ascending: false });

      // Load RAG templates
      const { data: templates } = await supabase
        .from('blueprint_templates')
        .select('id, name, nodes, edges')
        .order('name');

      const allBlueprints = [
        ...(userBlueprints?.map(bp => ({
          id: bp.id,
          name: bp.title,
          nodes: bp.nodes as any[],
          edges: bp.edges as any[]
        })) || []),
        ...(templates?.map(tmpl => ({
          id: tmpl.id,
          name: `[Template] ${tmpl.name}`,
          nodes: tmpl.nodes as any[],
          edges: tmpl.edges as any[]
        })) || [])
      ];

      setAvailableBlueprints(allBlueprints);
    } catch (error) {
      console.error('Error loading blueprints:', error);
    }
  };

  const generateSessionId = () => {
    return `${user?.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const loadSimulationHistory = async () => {
    if (!user || !blueprintId) return;
    
    try {
      const { data, error } = await supabase
        .from('simulation_logs')
        .select(`
          *,
          simulation_metrics(*)
        `)
        .eq('blueprint_id', blueprintId)
        .order('started_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setSimulationHistory(data || []);
    } catch (error: any) {
      console.error('Error loading simulation history:', error);
    }
  };

  const handleSimulationUpdate = (payload: any) => {
    const { type, data } = payload.payload;
    
    switch (type) {
      case 'step_update':
        setCurrentSimulation(prev => {
          if (!prev) return null;
          const updatedSteps = prev.steps.map(step => 
            step.stepName === data.stepName ? { ...step, ...data } : step
          );
          return { ...prev, steps: updatedSteps };
        });
        break;
        
      case 'progress':
        setProgress(data.progress);
        break;
        
      case 'completed':
        setCurrentSimulation(prev => prev ? { ...prev, ...data } : null);
        setIsRunning(false);
        setProgress(100);
        loadSimulationHistory();
        toast({
          title: "Simulation Completed",
          description: `Pipeline executed in ${data.totalMetrics.executionTime}ms`,
        });
        break;
        
      case 'error':
        setCurrentSimulation(prev => prev ? { ...prev, status: 'error' } : null);
        setIsRunning(false);
        setProgress(0);
        toast({
          title: "Simulation Error",
          description: data.error,
          variant: "destructive"
        });
        break;
    }
  };

  const handleComparisonUpdate = (payload: any) => {
    const { type, data } = payload.payload;
    
    switch (type) {
      case 'comparison_step':
        setComparisonResults(prev => {
          const updated = [...prev];
          const index = updated.findIndex(r => r.id === data.blueprintId);
          if (index >= 0) {
            updated[index] = { ...updated[index], ...data };
          } else {
            updated.push(data);
          }
          return updated;
        });
        break;
        
      case 'comparison_completed':
        setComparisonResults(data.results);
        setIsRunning(false);
        setProgress(100);
        toast({
          title: "Comparison Completed",
          description: `Compared ${data.results.length} blueprints successfully`,
        });
        break;
    }
  };

  const handleRunSimulation = async () => {
    if (!input.trim()) {
      toast({
        title: "Input required",
        description: "Please enter a query to simulate.",
        variant: "destructive"
      });
      return;
    }

    if (!useMockMode && !apiKeys[selectedProvider as keyof typeof apiKeys]?.trim()) {
      toast({
        title: "API Key required",
        description: `Please enter your ${selectedProvider.toUpperCase()} API key or enable mock mode.`,
        variant: "destructive"
      });
      return;
    }

    setIsRunning(true);
    setProgress(0);
    setActiveTab('results');

    if (compareMode && selectedBlueprints.length > 0) {
      await runComparison();
    } else {
      await runSingleSimulation();
    }
  };

  const runSingleSimulation = async () => {
    const sessionId = generateSessionId();
    const initialSteps: SimulationStep[] = state.nodes.map(node => ({
      stepName: (node.data?.label || node.type) as string,
      status: 'pending' as const
    }));
    
    setCurrentSimulation({
      id: sessionId,
      status: 'running',
      steps: initialSteps,
      totalMetrics: {
        totalTokens: 0,
        totalCost: 0,
        executionTime: 0
      },
      contextWindow: []
    });

    try {
      const requestBody = {
        sessionId,
        input,
        provider: selectedProvider,
        model: selectedModel,
        apiKey: useMockMode ? 'mock-key' : apiKeys[selectedProvider as keyof typeof apiKeys],
        useMockMode,
        nodes: state.nodes,
        edges: state.edges,
        blueprintId: blueprintId || null
      };

      const { data, error } = await supabase.functions.invoke('enhanced-pipeline-simulator', {
        body: requestBody
      });

      if (error) throw error;

      toast({
        title: "Simulation started",
        description: "Processing your pipeline..."
      });

    } catch (error: any) {
      console.error('Simulation error:', error);
      setIsRunning(false);
      setProgress(0);
      setCurrentSimulation(prev => prev ? { ...prev, status: 'error' } : null);
      toast({
        title: "Simulation failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive"
      });
    }
  };

  const runComparison = async () => {
    const sessionId = generateSessionId();
    setComparisonResults([]);

    try {
      const requestBody = {
        sessionId,
        input,
        provider: selectedProvider,
        model: selectedModel,
        apiKey: useMockMode ? 'mock-key' : apiKeys[selectedProvider as keyof typeof apiKeys],
        useMockMode,
        blueprintIds: selectedBlueprints,
        mode: 'comparison'
      };

      const { data, error } = await supabase.functions.invoke('pipeline-comparison', {
        body: requestBody
      });

      if (error) throw error;

      toast({
        title: "Comparison started",
        description: `Running comparison across ${selectedBlueprints.length} blueprints...`
      });

    } catch (error: any) {
      console.error('Comparison error:', error);
      setIsRunning(false);
      setProgress(0);
      toast({
        title: "Comparison failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive"
      });
    }
  };

  const addBlueprintToComparison = (blueprintId: string) => {
    if (selectedBlueprints.length >= maxComparisons) {
      toast({
        title: "Comparison limit reached",
        description: `Free tier allows up to ${maxComparisons} comparisons. Upgrade for unlimited comparisons.`,
        variant: "destructive"
      });
      return;
    }
    setSelectedBlueprints(prev => [...prev, blueprintId]);
  };

  const removeBlueprintFromComparison = (blueprintId: string) => {
    setSelectedBlueprints(prev => prev.filter(id => id !== blueprintId));
  };

  const formatCost = (cost: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4
    }).format(cost);
  };

  const getComparisonChartData = () => {
    return comparisonResults.map(result => ({
      name: result.blueprintName || 'Blueprint',
      tokens: result.totalMetrics.totalTokens,
      cost: result.totalMetrics.totalCost * 1000, // convert to milli-dollars for better scale
      latency: result.totalMetrics.executionTime,
      relevance: result.totalMetrics.averageRelevance || 0
    }));
  };

  return (
    <div
      className={cn(
        'border-t border-border bg-card transition-all duration-300',
        isCollapsed ? 'h-12' : compareMode ? 'h-[600px]' : 'h-96'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-2 h-2 rounded-full transition-colors",
            isRunning ? "bg-warning animate-pulse" : "bg-success"
          )}></div>
          <h3 className="font-medium text-foreground">Pipeline Simulator</h3>
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {isRunning ? `Running... ${progress.toFixed(0)}%` : 'Test your context pipeline in real-time'}
              </span>
              <Button
                variant={compareMode ? "default" : "outline"}
                size="sm"
                onClick={() => setCompareMode(!compareMode)}
                className="h-6 text-xs px-2"
              >
                <GitCompare className="w-3 h-3 mr-1" />
                Compare
              </Button>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {isRunning && !isCollapsed && (
            <Progress value={progress} className="w-20 h-2" />
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="h-6 w-6 p-0"
          >
            {isCollapsed ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="p-3 h-[calc(100%-49px)] flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className={cn(
              "grid w-full",
              compareMode ? "grid-cols-4" : "grid-cols-3"
            )}>
              <TabsTrigger value="test" className="text-xs">
                <Zap className="w-3 h-3 mr-1" />
                Test
              </TabsTrigger>
              <TabsTrigger value="results" className="text-xs">
                <AlertCircle className="w-3 h-3 mr-1" />
                Results
              </TabsTrigger>
              {compareMode && (
                <TabsTrigger value="comparison" className="text-xs">
                  <BarChart3 className="w-3 h-3 mr-1" />
                  Compare
                </TabsTrigger>
              )}
              <TabsTrigger value="history" className="text-xs">
                <History className="w-3 h-3 mr-1" />
                History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="test" className="flex-1 flex flex-col mt-3">
              {/* Comparison Mode Blueprint Selection */}
              {compareMode && (
                <Card className="mb-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <ArrowLeftRight className="w-4 h-4" />
                      Blueprint Comparison ({selectedBlueprints.length}/{maxComparisons})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {selectedBlueprints.map(blueprintId => {
                        const blueprint = availableBlueprints.find(bp => bp.id === blueprintId);
                        return (
                          <Badge key={blueprintId} variant="secondary" className="flex items-center gap-1">
                            {blueprint?.name || 'Unknown Blueprint'}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-4 w-4 p-0 ml-1"
                              onClick={() => removeBlueprintFromComparison(blueprintId)}
                            >
                              <X className="h-2 w-2" />
                            </Button>
                          </Badge>
                        );
                      })}
                    </div>
                    <Select onValueChange={addBlueprintToComparison}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Add blueprint to compare..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableBlueprints
                          .filter(bp => !selectedBlueprints.includes(bp.id))
                          .map(blueprint => (
                            <SelectItem key={blueprint.id} value={blueprint.id}>
                              {blueprint.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </CardContent>
                </Card>
              )}

              {/* LLM Configuration */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1">
                    LLM Provider
                  </Label>
                  <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openai">OpenAI</SelectItem>
                      <SelectItem value="anthropic">Anthropic</SelectItem>
                      <SelectItem value="xai">xAI (Grok)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1">
                    Model
                  </Label>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedProvider === 'openai' && (
                        <>
                          <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                          <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                        </>
                      )}
                      {selectedProvider === 'anthropic' && (
                        <>
                          <SelectItem value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</SelectItem>
                          <SelectItem value="claude-3-5-haiku-20241022">Claude 3.5 Haiku</SelectItem>
                        </>
                      )}
                      {selectedProvider === 'xai' && (
                        <>
                          <SelectItem value="grok-beta">Grok Beta</SelectItem>
                          <SelectItem value="grok-vision-beta">Grok Vision Beta</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* API Key Input */}
              <div className="mb-3">
                <Label className="text-xs font-medium text-muted-foreground mb-1">
                  API Key ({selectedProvider.toUpperCase()})
                </Label>
                <div className="relative">
                  <Input
                    type="password"
                    placeholder={`Enter your ${selectedProvider.toUpperCase()} API key...`}
                    value={apiKeys[selectedProvider as keyof typeof apiKeys]}
                    onChange={(e) => setApiKeys(prev => ({
                      ...prev,
                      [selectedProvider]: e.target.value
                    }))}
                    className="h-8 text-xs pr-8"
                    disabled={useMockMode}
                  />
                  <Key className="absolute right-2 top-1.5 h-3 w-3 text-muted-foreground" />
                </div>
              </div>

              {/* Mock Mode Toggle */}
              <div className="flex items-center justify-between mb-3">
                <Label className="text-xs font-medium text-muted-foreground">
                  Mock Mode (for testing)
                </Label>
                <Switch
                  checked={useMockMode}
                  onCheckedChange={setUseMockMode}
                />
              </div>

              {/* Input/Run */}
              <div className="flex-1 flex flex-col">
                <Label className="text-xs font-medium text-muted-foreground mb-1">
                  Test Query
                </Label>
                <Textarea
                  placeholder="Enter your test query here (e.g., 'What is machine learning?')..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="flex-1 text-xs resize-none"
                />
                <div className="flex gap-2 mt-2">
                  <Button
                    onClick={handleRunSimulation}
                    disabled={isRunning || !input.trim() || (!useMockMode && !apiKeys[selectedProvider as keyof typeof apiKeys]?.trim())}
                    className="flex-1 h-8"
                    size="sm"
                  >
                    {isRunning ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        {compareMode ? 'Comparing...' : 'Running...'}
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3 mr-1" />
                        {compareMode ? 'Run Comparison' : 'Run Simulation'}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="results" className="flex-1 flex flex-col mt-3">
              {currentSimulation ? (
                <div className="space-y-3">
                  {/* Status and Metrics */}
                  <div className="grid grid-cols-3 gap-2">
                    <Card className="p-2">
                      <div className="text-xs text-muted-foreground">Status</div>
                      <div className={cn(
                        "text-sm font-medium capitalize",
                        currentSimulation.status === 'completed' ? 'text-green-600' : 
                        currentSimulation.status === 'error' ? 'text-red-600' : 'text-yellow-600'
                      )}>
                        {currentSimulation.status}
                      </div>
                    </Card>
                    <Card className="p-2">
                      <div className="text-xs text-muted-foreground">Tokens</div>
                      <div className="text-sm font-medium">{currentSimulation.totalMetrics.totalTokens}</div>
                    </Card>
                    <Card className="p-2">
                      <div className="text-xs text-muted-foreground">Cost</div>
                      <div className="text-sm font-medium">{formatCost(currentSimulation.totalMetrics.totalCost)}</div>
                    </Card>
                  </div>

                  {/* Steps */}
                  <ScrollArea className="flex-1">
                    <div className="space-y-2">
                      {currentSimulation.steps.map((step, index) => (
                        <Card key={index} className="p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">{step.stepName}</span>
                            <Badge variant={
                              step.status === 'completed' ? 'default' :
                              step.status === 'error' ? 'destructive' : 'secondary'
                            }>
                              {step.status}
                            </Badge>
                          </div>
                          {step.metrics && (
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>Latency: {step.metrics.latencyMs}ms</div>
                              <div>Tokens: {step.metrics.tokensInput + step.metrics.tokensOutput}</div>
                            </div>
                          )}
                          {step.output && (
                            <div className="mt-2 p-2 bg-muted rounded text-xs">
                              {typeof step.output === 'string' ? step.output : JSON.stringify(step.output, null, 2)}
                            </div>
                          )}
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>

                  {/* Final Output */}
                  {currentSimulation.finalOutput && (
                    <Card className="p-3">
                      <div className="text-sm font-medium mb-2">Final Output</div>
                      <div className="text-xs p-2 bg-muted rounded">
                        {currentSimulation.finalOutput}
                      </div>
                    </Card>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No simulation results yet</p>
                  </div>
                </div>
              )}
            </TabsContent>

            {compareMode && (
              <TabsContent value="comparison" className="flex-1 flex flex-col mt-3">
                {comparisonResults.length > 0 ? (
                  <div className="space-y-4">
                    {/* Metrics Chart */}
                    <Card className="p-4">
                      <CardTitle className="text-sm mb-3">Performance Comparison</CardTitle>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={getComparisonChartData()}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" fontSize={10} />
                          <YAxis fontSize={10} />
                          <Tooltip />
                          <Bar dataKey="tokens" fill="#8884d8" name="Tokens" />
                          <Bar dataKey="latency" fill="#82ca9d" name="Latency (ms)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </Card>

                    {/* Cost Comparison */}
                    <Card className="p-4">
                      <CardTitle className="text-sm mb-3">Cost Comparison</CardTitle>
                      <ResponsiveContainer width="100%" height={150}>
                        <BarChart data={getComparisonChartData()}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" fontSize={10} />
                          <YAxis fontSize={10} />
                          <Tooltip formatter={(value: any) => [`$${(value / 1000).toFixed(4)}`, 'Cost']} />
                          <Bar dataKey="cost" fill="#ffc658" name="Cost (m$)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </Card>

                    {/* Side-by-side Results */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {comparisonResults.map((result, index) => (
                        <Card key={result.id} className="p-3">
                          <CardTitle className="text-sm mb-2">{result.blueprintName}</CardTitle>
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between">
                              <span>Status:</span>
                              <Badge variant={result.status === 'completed' ? 'default' : 'destructive'}>
                                {result.status}
                              </Badge>
                            </div>
                            <div className="flex justify-between">
                              <span>Total Tokens:</span>
                              <span>{result.totalMetrics.totalTokens}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Cost:</span>
                              <span>{formatCost(result.totalMetrics.totalCost)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Time:</span>
                              <span>{result.totalMetrics.executionTime}ms</span>
                            </div>
                            {result.finalOutput && (
                              <div className="mt-2 p-2 bg-muted rounded">
                                <div className="font-medium mb-1">Output:</div>
                                <div className="text-xs">{result.finalOutput}</div>
                              </div>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    <div className="text-center">
                      <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No comparison results yet</p>
                      <p className="text-xs">Select blueprints and run a comparison</p>
                    </div>
                  </div>
                )}
              </TabsContent>
            )}

            <TabsContent value="history" className="flex-1 flex flex-col mt-3">
              <ScrollArea className="flex-1">
                <div className="space-y-2">
                  {simulationHistory.map((sim, index) => (
                    <Card key={sim.id} className="p-3 cursor-pointer hover:bg-accent">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{sim.input_query}</span>
                        <Badge variant={sim.status === 'completed' ? 'default' : 'destructive'}>
                          {sim.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(sim.started_at).toLocaleString()}
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}