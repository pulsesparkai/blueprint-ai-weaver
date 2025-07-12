import React, { useState, useEffect } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { NodeSidebar } from './NodeSidebar';
import { ContextCanvas } from './ContextCanvas';
import { SimulatorPane } from './SimulatorPane';
import { GraphProvider } from '@/contexts/GraphContext';
import { Button } from '@/components/ui/button';
import { Menu, Sparkles, User, Crown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function ContextEngineApp({ blueprint }: { blueprint?: any }) {
  const [simulatorCollapsed, setSimulatorCollapsed] = useState(false);
  const [addNodeHandler, setAddNodeHandler] = useState<((nodeType: any) => void) | null>(null);
  const [validationResults, setValidationResults] = useState<any>(null);
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
        </div>
      </ReactFlowProvider>
    </GraphProvider>
  );
}