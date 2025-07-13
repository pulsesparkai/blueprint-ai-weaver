import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface ExecutionState {
  sessionId: string | null;
  status: 'idle' | 'connecting' | 'running' | 'completed' | 'failed';
  nodeStates: Map<string, {
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cached';
    result?: any;
    error?: string;
    executionTime?: number;
    cost?: number;
  }>;
  totalCost: number;
  executionTime: number;
  errors: Array<{ nodeId: string; error: string; timestamp: number }>;
  streamingTokens: Map<string, string>;
}

interface ExecutionEvent {
  type: string;
  nodeId?: string;
  sessionId?: string;
  error?: string;
  result?: any;
  executionTime?: number;
  cost?: number;
  totalCost?: number;
  timestamp: string;
  [key: string]: any;
}

export function useRealtimeExecution() {
  const { toast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);
  const [state, setState] = useState<ExecutionState>({
    sessionId: null,
    status: 'idle',
    nodeStates: new Map(),
    totalCost: 0,
    executionTime: 0,
    errors: [],
    streamingTokens: new Map()
  });

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setState(prev => ({ ...prev, status: 'connecting' }));

    // Use the correct Supabase function URL
    const wsUrl = `wss://ieuorllhhfahupcavije.functions.supabase.co/realtime-pipeline-executor`;
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      console.log('WebSocket connected');
      setState(prev => ({ ...prev, status: 'idle' }));
    };

    wsRef.current.onmessage = (event) => {
      try {
        const data: ExecutionEvent = JSON.parse(event.data);
        handleExecutionEvent(data);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      toast({
        title: "Connection Error",
        description: "Failed to connect to execution engine",
        variant: "destructive"
      });
    };

    wsRef.current.onclose = () => {
      console.log('WebSocket disconnected');
      setState(prev => ({ ...prev, status: 'idle' }));
      
      // Auto-reconnect after 3 seconds
      setTimeout(() => {
        if (wsRef.current?.readyState === WebSocket.CLOSED) {
          connect();
        }
      }, 3000);
    };
  }, [toast]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const handleExecutionEvent = useCallback((event: ExecutionEvent) => {
    console.log('Execution event:', event);

    setState(prev => {
      const newState = { ...prev };

      switch (event.type) {
        case 'connection_established':
          break;

        case 'execution_started':
          newState.sessionId = event.sessionId || null;
          newState.status = 'running';
          newState.nodeStates = new Map();
          newState.totalCost = 0;
          newState.executionTime = 0;
          newState.errors = [];
          newState.streamingTokens = new Map();
          break;

        case 'node_execution_started':
          if (event.nodeId) {
            newState.nodeStates.set(event.nodeId, {
              status: 'running'
            });
          }
          break;

        case 'node_execution_completed':
          if (event.nodeId) {
            newState.nodeStates.set(event.nodeId, {
              status: event.cached ? 'cached' : 'completed',
              result: event.result,
              executionTime: event.executionTime,
              cost: event.result?.cost || 0
            });
          }
          newState.totalCost = event.totalCost || newState.totalCost;
          break;

        case 'node_execution_failed':
          if (event.nodeId) {
            newState.nodeStates.set(event.nodeId, {
              status: 'failed',
              error: event.error,
              executionTime: event.executionTime
            });
            newState.errors.push({
              nodeId: event.nodeId,
              error: event.error || 'Unknown error',
              timestamp: Date.now()
            });
          }
          break;

        case 'llm_token_stream':
          if (event.nodeId) {
            const currentTokens = newState.streamingTokens.get(event.nodeId) || '';
            newState.streamingTokens.set(event.nodeId, currentTokens + (event.tokens || ''));
          }
          break;

        case 'execution_completed':
          newState.status = 'completed';
          newState.executionTime = event.executionTime || 0;
          newState.totalCost = event.totalCost || newState.totalCost;
          
          toast({
            title: "Execution Completed",
            description: `Pipeline executed in ${event.executionTime}ms. Total cost: $${event.totalCost?.toFixed(4) || '0.0000'}`
          });
          break;

        case 'execution_failed':
          newState.status = 'failed';
          newState.executionTime = event.executionTime || 0;
          
          toast({
            title: "Execution Failed",
            description: event.error || 'Unknown error',
            variant: "destructive"
          });
          break;

        case 'execution_error':
          newState.status = 'failed';
          
          toast({
            title: "Execution Error",
            description: event.error || 'Unknown error',
            variant: "destructive"
          });
          break;
      }

      return newState;
    });
  }, [toast]);

  const executeBlueprint = useCallback((blueprintId: string, inputData: any) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      toast({
        title: "Connection Error",
        description: "WebSocket not connected. Please try again.",
        variant: "destructive"
      });
      return;
    }

    const sessionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const request = {
      blueprintId,
      inputData,
      sessionId,
      enableStreaming: true
    };

    wsRef.current.send(JSON.stringify(request));

    setState(prev => ({
      ...prev,
      sessionId,
      status: 'running',
      nodeStates: new Map(),
      totalCost: 0,
      executionTime: 0,
      errors: [],
      streamingTokens: new Map()
    }));
  }, [toast]);

  // Auto-connect on mount
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    state,
    executeBlueprint,
    connect,
    disconnect,
    isConnected: wsRef.current?.readyState === WebSocket.OPEN
  };
}