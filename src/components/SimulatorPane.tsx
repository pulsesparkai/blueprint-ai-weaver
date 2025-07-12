import React, { useState, useEffect, useRef } from 'react';
import { ChevronUp, ChevronDown, Play, Settings, Key, Loader2, History, Zap, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
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
  };
  error?: string;
}

interface SimulationResult {
  id: string;
  status: 'running' | 'completed' | 'error';
  steps: SimulationStep[];
  finalOutput?: string;
  totalMetrics: {
    totalTokens: number;
    totalCost: number;
    executionTime: number;
  };
  contextWindow: any[];
}

export function SimulatorPane({ isCollapsed, onToggle, blueprintId }: SimulatorPaneProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [input, setInput] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('openai');
  const [selectedModel, setSelectedModel] = useState('gpt-4o-mini');
  const [apiKeys, setApiKeys] = useState({
    openai: '',
    anthropic: '',
    xai: '' // Grok
  });
  const [useMockMode, setUseMockMode] = useState(false);
  const [currentSimulation, setCurrentSimulation] = useState<SimulationResult | null>(null);
  const [simulationHistory, setSimulationHistory] = useState<any[]>([]);
  const [progress, setProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('test');
  const [realtimeChannel, setRealtimeChannel] = useState<any>(null);
  
  const { user } = useAuth();
  const { state } = useGraph();
  const { toast } = useToast();

  useEffect(() => {
    loadSimulationHistory();
    
    // Set up realtime channel for simulation updates
    if (user && blueprintId) {
      const sessionId = generateSessionId();
      const channel = supabase.channel(`simulation_${sessionId}`)
        .on('broadcast', { event: 'simulation_progress' }, (payload) => {
          handleSimulationUpdate(payload);
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

    if (!blueprintId && state.nodes.length === 0) {
      toast({
        title: "No pipeline to simulate",
        description: "Please create a pipeline with nodes first.",
        variant: "destructive"
      });
      return;
    }

    setIsRunning(true);
    setProgress(0);
    setActiveTab('test');
    
    // Initialize simulation state
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

      // Call the enhanced pipeline simulator
      const { data, error } = await supabase.functions.invoke('enhanced-pipeline-simulator', {
        body: requestBody
      });

      if (error) throw error;

      // Results will come through realtime updates
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

  const handleRefreshSimulation = async () => {
    if (!currentSimulation) return;
    
    try {
      const { data, error } = await supabase
        .from('simulation_logs')
        .select('*')
        .eq('session_id', currentSimulation.id)
        .single();

      if (error) throw error;

      if (data) {
        setCurrentSimulation(prev => prev ? {
          ...prev,
          status: (data.status === 'completed' || data.status === 'error' || data.status === 'running') 
            ? data.status as 'running' | 'completed' | 'error' 
            : 'running',
          finalOutput: data.final_output || prev.finalOutput,
          steps: Array.isArray(data.execution_steps) 
            ? data.execution_steps.map((step: any) => ({
                stepName: step.stepName || step.nodeType || 'Unknown',
                status: step.status || 'completed',
                output: step.output,
                metrics: step.metrics ? {
                  tokensInput: step.metrics.input || 0,
                  tokensOutput: step.metrics.output || 0,
                  latencyMs: step.executionTime || 0,
                  costUsd: step.cost || 0
                } : undefined,
                error: step.error
              } as SimulationStep))
            : prev.steps,
          totalMetrics: (typeof data.metrics === 'object' && data.metrics && !Array.isArray(data.metrics)) ? {
            totalTokens: (data.metrics as any).totalTokens || prev.totalMetrics.totalTokens,
            totalCost: (data.metrics as any).totalCost || prev.totalMetrics.totalCost,
            executionTime: (data.metrics as any).totalTime || (data.metrics as any).executionTime || prev.totalMetrics.executionTime
          } : prev.totalMetrics
        } : null);
        
        if (data.status === 'completed') {
          setIsRunning(false);
          setProgress(100);
        }
      }
    } catch (error: any) {
      console.error('Error refreshing simulation:', error);
    }
  };

  const formatCost = (cost: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4
    }).format(cost);
  };

  return (
    <div
      className={cn(
        'border-t border-border bg-card transition-all duration-300',
        isCollapsed ? 'h-12' : 'h-96'
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
            <span className="text-xs text-muted-foreground">
              {isRunning ? `Running... ${progress.toFixed(0)}%` : 'Test your context pipeline in real-time'}
            </span>
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
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="test" className="text-xs">
                <Zap className="w-3 h-3 mr-1" />
                Test
              </TabsTrigger>
              <TabsTrigger value="results" className="text-xs">
                <AlertCircle className="w-3 h-3 mr-1" />
                Results
              </TabsTrigger>
              <TabsTrigger value="history" className="text-xs">
                <History className="w-3 h-3 mr-1" />
                History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="test" className="flex-1 flex flex-col mt-3">
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
                          <SelectItem value="gpt-4.1-2025-04-14">GPT-4.1</SelectItem>
                        </>
                      )}
                      {selectedProvider === 'anthropic' && (
                        <>
                          <SelectItem value="claude-opus-4-20250514">Claude 4 Opus</SelectItem>
                          <SelectItem value="claude-sonnet-4-20250514">Claude 4 Sonnet</SelectItem>
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
                        Running...
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3 mr-1" />
                        Run Simulation
                      </>
                    )}
                  </Button>
                  {currentSimulation && (
                    <Button
                      onClick={handleRefreshSimulation}
                      variant="outline"
                      size="sm"
                      className="h-8"
                    >
                      <RefreshCw className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="results" className="flex-1 flex flex-col mt-3">
              {currentSimulation ? (
                <div className="space-y-3 overflow-auto">
                  {/* Pipeline Steps */}
                  <div className="space-y-2">
                    {currentSimulation.steps.map((step, index) => (
                      <div key={index} className="border border-border rounded p-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium">{step.stepName}</span>
                          <Badge variant={
                            step.status === 'completed' ? 'default' :
                            step.status === 'running' ? 'secondary' :
                            step.status === 'error' ? 'destructive' : 'outline'
                          } className="text-xs">
                            {step.status}
                          </Badge>
                        </div>
                        
                        {step.metrics && (
                          <div className="text-xs text-muted-foreground">
                            Tokens: {step.metrics.tokensInput + step.metrics.tokensOutput} | 
                            Cost: {formatCost(step.metrics.costUsd)} | 
                            Time: {step.metrics.latencyMs}ms
                          </div>
                        )}
                        
                        {step.output && (
                          <div className="mt-1 p-2 bg-muted/30 rounded text-xs font-mono">
                            {typeof step.output === 'string' ? step.output : JSON.stringify(step.output, null, 2)}
                          </div>
                        )}
                        
                        {step.error && (
                          <div className="mt-1 p-2 bg-destructive/10 text-destructive rounded text-xs">
                            {step.error}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Final Output */}
                  {currentSimulation.finalOutput && (
                    <div className="border border-border rounded p-3">
                      <h4 className="text-xs font-medium mb-2">Final Output</h4>
                      <div className="bg-muted/30 rounded p-2 text-xs font-mono">
                        {currentSimulation.finalOutput}
                      </div>
                    </div>
                  )}

                  {/* Total Metrics */}
                  <div className="border border-border rounded p-3">
                    <h4 className="text-xs font-medium mb-2">Total Metrics</h4>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Tokens:</span>
                        <div className="font-medium">{currentSimulation.totalMetrics.totalTokens}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Cost:</span>
                        <div className="font-medium">{formatCost(currentSimulation.totalMetrics.totalCost)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Time:</span>
                        <div className="font-medium">{currentSimulation.totalMetrics.executionTime}ms</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">
                  Run a simulation to see results
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="flex-1 flex flex-col mt-3">
              <div className="space-y-2 overflow-auto">
                {simulationHistory.map((simulation) => (
                  <div key={simulation.id} className="border border-border rounded p-2 hover:bg-muted/30 cursor-pointer">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium truncate">{simulation.input_query}</span>
                      <Badge variant={
                        simulation.status === 'completed' ? 'default' :
                        simulation.status === 'error' ? 'destructive' : 'secondary'
                      } className="text-xs">
                        {simulation.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(simulation.started_at).toLocaleString()} | 
                      {simulation.llm_provider} | 
                      {simulation.execution_time_ms}ms
                    </div>
                  </div>
                ))}
                
                {simulationHistory.length === 0 && (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">
                    No simulation history yet
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}