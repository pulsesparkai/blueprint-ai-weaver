import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { 
  Play, 
  Square, 
  Clock, 
  DollarSign, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Zap,
  AlertTriangle,
  Activity,
  Database
} from 'lucide-react';
import { useRealtimeExecution } from '@/hooks/useRealtimeExecution';

interface RealtimeExecutionMonitorProps {
  blueprintId: string;
  inputData: any;
  nodes: any[];
  onExecutionComplete?: (result: any) => void;
}

export function RealtimeExecutionMonitor({ 
  blueprintId, 
  inputData, 
  nodes, 
  onExecutionComplete 
}: RealtimeExecutionMonitorProps) {
  const { state, executeBlueprint, isConnected } = useRealtimeExecution();

  const handleExecute = () => {
    executeBlueprint(blueprintId, inputData);
  };

  const getNodeIcon = (nodeType: string) => {
    switch (nodeType) {
      case 'llm':
        return <Activity className="h-4 w-4" />;
      case 'rag':
        return <Database className="h-4 w-4" />;
      case 'processor':
        return <Zap className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'cached':
        return <Zap className="h-4 w-4 text-purple-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'cached':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const completedNodes = Array.from(state.nodeStates.values())
    .filter(node => ['completed', 'failed', 'cached'].includes(node.status)).length;
  
  const progress = nodes.length > 0 ? (completedNodes / nodes.length) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Execution Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Pipeline Execution Monitor
              </CardTitle>
              <CardDescription>
                Real-time execution tracking with cost monitoring
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isConnected ? "default" : "destructive"}>
                {isConnected ? "Connected" : "Disconnected"}
              </Badge>
              <Button
                onClick={handleExecute}
                disabled={!isConnected || state.status === 'running'}
                className="flex items-center gap-2"
              >
                {state.status === 'running' ? (
                  <>
                    <Square className="h-4 w-4" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Execute Pipeline
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Progress Overview */}
          {state.status !== 'idle' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Progress: {completedNodes}/{nodes.length} nodes</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>Time: {state.executionTime}ms</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span>Cost: ${state.totalCost.toFixed(4)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  <span>Errors: {state.errors.length}</span>
                </div>
              </div>
            </div>
          )}

          {/* Session Info */}
          {state.sessionId && (
            <div className="text-xs text-muted-foreground">
              Session: {state.sessionId}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Node Execution States */}
      {nodes.length > 0 && state.status !== 'idle' && (
        <Card>
          <CardHeader>
            <CardTitle>Node Execution Status</CardTitle>
            <CardDescription>
              Real-time status of each pipeline node
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {nodes.map((node) => {
                const nodeState = state.nodeStates.get(node.id);
                const streamingTokens = state.streamingTokens.get(node.id);
                
                return (
                  <div
                    key={node.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {getNodeIcon(node.type)}
                      <div>
                        <div className="font-medium">{node.data?.label || `${node.type} Node`}</div>
                        <div className="text-sm text-muted-foreground">{node.type}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {nodeState && (
                        <>
                          <div className="text-sm space-y-1">
                            {nodeState.executionTime && (
                              <div>⏱️ {nodeState.executionTime}ms</div>
                            )}
                            {nodeState.cost && (
                              <div>💰 ${nodeState.cost.toFixed(4)}</div>
                            )}
                          </div>
                          
                          <Badge className={getStatusColor(nodeState.status)}>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(nodeState.status)}
                              {nodeState.status}
                            </div>
                          </Badge>
                        </>
                      )}
                    </div>

                    {/* Streaming tokens display */}
                    {streamingTokens && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-xs max-w-md">
                        <div className="font-medium mb-1">Streaming Output:</div>
                        <div className="text-gray-700 max-h-20 overflow-y-auto">
                          {streamingTokens}
                        </div>
                      </div>
                    )}

                    {/* Error display */}
                    {nodeState?.error && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs">
                        <div className="font-medium text-red-700 mb-1">Error:</div>
                        <div className="text-red-600">{nodeState.error}</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Summary */}
      {state.errors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Execution Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {state.errors.map((error, index) => (
                <div key={index} className="p-3 bg-red-50 border border-red-200 rounded">
                  <div className="font-medium text-red-700">Node: {error.nodeId}</div>
                  <div className="text-red-600 text-sm">{error.error}</div>
                  <div className="text-red-500 text-xs">
                    {new Date(error.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default RealtimeExecutionMonitor;