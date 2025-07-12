import React, { useState, useEffect } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { NodeSidebar } from './NodeSidebar';
import { ContextCanvas } from './ContextCanvas';
import { SimulatorPane } from './SimulatorPane';
import { GraphProvider } from '@/contexts/GraphContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Menu, Sparkles, User, Crown, Zap, TrendingUp, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function ContextEngineApp({ blueprint }: { blueprint?: any }) {
  const [simulatorCollapsed, setSimulatorCollapsed] = useState(false);
  const [addNodeHandler, setAddNodeHandler] = useState<((nodeType: any) => void) | null>(null);
  const [validationResults, setValidationResults] = useState<any>(null);
  const [optimizationOpen, setOptimizationOpen] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizationResults, setOptimizationResults] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (blueprint) {
      validateBlueprint(blueprint.id);
    }
  }, [blueprint]);

  const validateBlueprint = async (blueprintId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('blueprint-operations', {
        body: { action: 'get', id: blueprintId }
      });
      
      if (error) throw error;
      
      setValidationResults(data.validation);
      
      if (data.validation?.errors?.length > 0) {
        toast({
          title: "Blueprint Validation",
          description: `Found ${data.validation.errors.length} errors`,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Validation error:', error);
    }
  };

  const handleOptimizeBlueprint = async () => {
    if (!blueprint?.id) {
      toast({
        title: "No Blueprint",
        description: "Please load a blueprint first",
        variant: "destructive"
      });
      return;
    }

    setOptimizing(true);
    setOptimizationOpen(true);

    try {
      const { data, error } = await supabase.functions.invoke('blueprint-optimizer', {
        body: {
          blueprintId: blueprint.id,
          optimizationType: 'auto',
          strategies: ['text_compression', 'node_pruning', 'template_consolidation', 'parameter_optimization']
        }
      });

      if (error) throw error;

      setOptimizationResults(data);
      toast({
        title: "Optimization Complete",
        description: `${data.improvements.tokenSavingsPercent.toFixed(1)}% token savings achieved`,
      });
    } catch (error: any) {
      console.error('Optimization error:', error);
      toast({
        title: "Optimization Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setOptimizing(false);
    }
  };

  const handleApplyOptimization = async () => {
    if (!optimizationResults?.optimizationId) return;

    try {
      const { error } = await supabase.rpc('apply_optimization', {
        optimization_id: optimizationResults.optimizationId
      });

      if (error) throw error;

      toast({
        title: "Optimization Applied",
        description: "Blueprint has been optimized successfully",
      });
      
      setOptimizationOpen(false);
      window.location.reload(); // Reload to show optimized blueprint
    } catch (error: any) {
      toast({
        title: "Apply Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleAddNode = (nodeType: any) => {
    if (addNodeHandler) {
      addNodeHandler(nodeType);
    }
  };

  return (
    <GraphProvider>
      <ReactFlowProvider>
        <div className="h-screen flex flex-col bg-background text-foreground">
          {/* Header */}
          <header className="flex items-center justify-between p-4 border-b border-border bg-card/50 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">ContextForge</h1>
                  <p className="text-xs text-muted-foreground">Visual Context Engineering Platform</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleOptimizeBlueprint}
                disabled={!blueprint?.id}
                className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20 hover:from-primary/20 hover:to-accent/20"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Optimize
              </Button>
              
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-accent text-accent-foreground text-sm">
                <Crown className="w-4 h-4" />
                <span className="font-medium">Pro Plan</span>
              </div>
              
              <Button variant="outline" size="sm">
                <Menu className="w-4 h-4 mr-2" />
                Menu
              </Button>
              
              <Button variant="outline" size="sm">
                <User className="w-4 h-4" />
              </Button>
            </div>
          </header>

          {/* Main Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* Sidebar */}
            <NodeSidebar onAddNode={handleAddNode} />

            {/* Canvas Area */}
            <div className="flex-1 flex flex-col">
              <ContextCanvas onAddNode={setAddNodeHandler} blueprint={blueprint} validationResults={validationResults} />
              
              {/* Simulator Pane */}
              <SimulatorPane
                isCollapsed={simulatorCollapsed}
                onToggle={() => setSimulatorCollapsed(!simulatorCollapsed)}
                blueprintId={blueprint?.id}
              />
            </div>
          </div>

          {/* Status Bar */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-border bg-card/30 text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>Ready</span>
              <span>•</span>
              <span>Auto-save enabled</span>
            </div>
            <div className="flex items-center gap-4">
              <span>API: Connected</span>
              <span>•</span>
              <span>Version 1.0.0</span>
            </div>
          </div>

          {/* Optimization Modal */}
          <Dialog open={optimizationOpen} onOpenChange={setOptimizationOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Blueprint Optimization
                </DialogTitle>
                <DialogDescription>
                  AI-powered optimization to reduce token usage and improve performance
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {optimizing ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Analyzing blueprint and applying optimizations...</span>
                    </div>
                    <Progress value={75} className="w-full" />
                    <div className="text-sm text-muted-foreground">
                      This may take a few moments as we compress text, prune unnecessary nodes, and optimize your pipeline.
                    </div>
                  </div>
                ) : optimizationResults ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">Optimization Complete!</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="text-2xl font-bold text-green-600">
                          {optimizationResults.improvements.tokenSavingsPercent.toFixed(1)}%
                        </div>
                        <div className="text-sm text-green-700 dark:text-green-400">Token Savings</div>
                      </div>
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="text-2xl font-bold text-blue-600">
                          {optimizationResults.improvements.performanceImprovementPercent.toFixed(1)}%
                        </div>
                        <div className="text-sm text-blue-700 dark:text-blue-400">Performance Boost</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-medium">Applied Optimizations:</h4>
                      <div className="flex flex-wrap gap-2">
                        {optimizationResults.strategiesApplied.map((strategy: string, index: number) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {strategy.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="font-medium">Before vs After:</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">Original Tokens:</div>
                          <div className="font-medium">{optimizationResults.beforeMetrics.totalTokens.toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Optimized Tokens:</div>
                          <div className="font-medium text-green-600">{optimizationResults.afterMetrics.totalTokens.toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Original Nodes:</div>
                          <div className="font-medium">{optimizationResults.beforeMetrics.nodeCount}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Optimized Nodes:</div>
                          <div className="font-medium text-green-600">{optimizationResults.afterMetrics.nodeCount}</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button onClick={handleApplyOptimization} className="flex-1">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Apply Optimization
                      </Button>
                      <Button variant="outline" onClick={() => setOptimizationOpen(false)}>
                        Review Later
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <AlertCircle className="w-5 h-5" />
                      <span>Ready to optimize your blueprint</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Our AI will analyze your pipeline and apply various optimization strategies including:
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>Text compression and summarization</li>
                        <li>Unnecessary node pruning</li>
                        <li>Template consolidation</li>
                        <li>Parameter optimization</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </ReactFlowProvider>
    </GraphProvider>
  );
}