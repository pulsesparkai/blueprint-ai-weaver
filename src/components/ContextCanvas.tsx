import React, { useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  Panel,
  useReactFlow
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { RAGRetrieverNode } from './nodes/RAGRetrieverNode';
import { MemoryStoreNode } from './nodes/MemoryStoreNode';
import { PromptTemplateNode } from './nodes/PromptTemplateNode';
import { StateTrackerNode } from './nodes/StateTrackerNode';
import { OutputParserNode } from './nodes/OutputParserNode';
import { NodeConfigModal } from './NodeConfigModal';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useGraph } from '@/contexts/GraphContext';
import { useToast } from '@/hooks/use-toast';
import { Play, Save, Download, Zap, AlertTriangle, CheckCircle } from 'lucide-react';

const nodeTypes = {
  'rag-retriever': RAGRetrieverNode,
  'memory-store': MemoryStoreNode,
  'prompt-template': PromptTemplateNode,
  'state-tracker': StateTrackerNode,
  'output-parser': OutputParserNode,
};

interface ContextCanvasProps {
  onAddNode: (handler: (nodeType: any) => void) => void;
  blueprint?: any;
  validationResults?: any;
}

export function ContextCanvas({ onAddNode, blueprint, validationResults }: ContextCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { state, dispatch, validateConnection, validateGraph, exportGraph } = useGraph();
  const [nodes, setNodes, onNodesChange] = useNodesState(state.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(state.edges);
  const { toast } = useToast();
  const reactFlowInstance = useReactFlow();

  // Sync with global state
  useEffect(() => {
    setNodes(state.nodes);
    setEdges(state.edges);
  }, [state.nodes, state.edges, setNodes, setEdges]);

  // Sync changes back to global state
  useEffect(() => {
    dispatch({ type: 'SET_NODES', payload: nodes });
  }, [nodes, dispatch]);

  useEffect(() => {
    dispatch({ type: 'SET_EDGES', payload: edges });
  }, [edges, dispatch]);

  // Load blueprint data if provided
  useEffect(() => {
    if (blueprint && Array.isArray(blueprint.nodes) && Array.isArray(blueprint.edges)) {
      setNodes(blueprint.nodes);
      setEdges(blueprint.edges);
    }
  }, [blueprint, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => {
      if (validateConnection(params)) {
        setEdges((eds) => {
          const newEdges = [...eds, {
            ...params,
            id: `edge-${params.source}-${params.target}-${Date.now()}`,
            type: 'smoothstep',
            animated: true,
            style: { stroke: '#8b5cf6', strokeWidth: 2 }
          }];
          return newEdges;
        });
        toast({
          title: "Connection created",
          description: "Nodes connected successfully"
        });
      } else {
        toast({
          title: "Invalid connection",
          description: "These node types are not compatible",
          variant: "destructive"
        });
      }
    },
    [validateConnection, setEdges, toast]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    dispatch({ type: 'SELECT_NODE', payload: node });
  }, [dispatch]);

  const onPaneClick = useCallback(() => {
    dispatch({ type: 'SELECT_NODE', payload: null });
  }, [dispatch]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      const nodeType = event.dataTransfer.getData('application/reactflow');

      if (typeof nodeType === 'undefined' || !nodeType || !reactFlowBounds) {
        return;
      }

      const nodeData = JSON.parse(nodeType);
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const newNode: Node = {
        id: `${nodeData.id}-${Date.now()}`,
        type: nodeData.id,
        position,
        data: {
          label: nodeData.label,
          type: nodeData.category,
          icon: nodeData.icon,
          variant: nodeData.variant,
          ...getDefaultNodeData(nodeData.id)
        },
      };

      dispatch({ type: 'ADD_NODE', payload: newNode });
      
      toast({
        title: "Node added",
        description: `${nodeData.label} added to canvas`
      });
    },
    [reactFlowInstance, dispatch, toast]
  );

  const getDefaultNodeData = (nodeType: string) => {
    switch (nodeType) {
      case 'rag-retriever':
        return { vectorDB: 'pinecone', topK: 5, similarityThreshold: 0.7 };
      case 'memory-store':
        return { storeType: 'redis', maxTokens: 2000, ttl: 60 };
      case 'prompt-template':
        return { template: 'You are a helpful assistant.\n\nContext: {context}\nQuestion: {question}', variables: ['context', 'question'] };
      case 'state-tracker':
        return { trackingType: 'conversation', maxHistory: 10 };
      case 'output-parser':
        return { parserType: 'json', schema: {} };
      default:
        return {};
    }
  };

  const handleAddNode = (nodeType: any) => {
    // Null/undefined check
    if (!nodeType || !nodeType.id || !nodeType.label) {
      console.error('Invalid nodeType passed to handleAddNode:', nodeType);
      toast({
        title: "Error adding node",
        description: "Invalid node configuration",
        variant: "destructive"
      });
      return;
    }

    // Generate unique ID with fallback
    const generateId = () => {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
      }
      return `${nodeType.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    };

    const newNode: Node = {
      id: generateId(),
      type: nodeType.id,
      position: { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 },
      data: {
        label: nodeType.label,
        type: nodeType.category || 'default',
        icon: nodeType.icon || 'Circle',
        variant: nodeType.variant || 'default',
        ...getDefaultNodeData(nodeType.id)
      },
    };

    dispatch({ type: 'ADD_NODE', payload: newNode });
  };

  useEffect(() => {
    onAddNode(handleAddNode);
  }, [onAddNode]);

  const handleTestPipeline = () => {
    const errors = validateGraph();
    if (errors.length > 0) {
      toast({
        title: "Pipeline validation failed",
        description: `Found ${errors.length} issues. Please fix them before testing.`,
        variant: "destructive"
      });
      dispatch({ type: 'SET_VALIDATION_ERRORS', payload: errors });
    } else {
      toast({
        title: "Pipeline validated",
        description: "Pipeline is ready for testing"
      });
      dispatch({ type: 'SET_VALIDATION_ERRORS', payload: [] });
    }
  };

  const handleExport = () => {
    const graphData = exportGraph();
    const blob = new Blob([JSON.stringify(graphData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'context-pipeline.json';
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Pipeline exported",
      description: "Pipeline configuration downloaded successfully"
    });
  };

  return (
    <div className="flex-1 h-full bg-gradient-canvas" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        fitView
        className="bg-gradient-canvas"
        connectionLineStyle={{ stroke: '#8b5cf6', strokeWidth: 2 }}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#8b5cf6', strokeWidth: 2 }
        }}
      >
        <Controls 
          className="bg-card border border-border shadow-elegant"
          position="bottom-left"
        />
        
        <MiniMap 
          className="bg-card border border-border shadow-elegant"
          nodeColor={(node) => {
            switch (node.data?.variant) {
              case 'rag': return '#3b82f6';
              case 'memory': return '#f59e0b';
              case 'prompt': return '#10b981';
              case 'state': return '#8b5cf6';
              case 'parser': return '#ef4444';
              default: return '#6b7280';
            }
          }}
          maskColor="rgba(139, 92, 246, 0.1)"
          position="bottom-right"
        />
        
        <Background 
          gap={20} 
          size={1}
          className="opacity-30"
        />

        <Panel position="top-center" className="flex gap-2">
          <Button 
            onClick={handleTestPipeline}
            className="shadow-elegant" 
            size="sm"
          >
            <Play className="w-4 h-4 mr-2" />
            Test Pipeline
          </Button>
          <Button variant="outline" size="sm" className="shadow-elegant">
            <Zap className="w-4 h-4 mr-2" />
            Optimize
          </Button>
          <Button variant="outline" size="sm" className="shadow-elegant">
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
          <Button 
            onClick={handleExport}
            variant="outline" 
            size="sm" 
            className="shadow-elegant"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </Panel>

        <Panel position="top-left" className="bg-card border border-border rounded-lg p-3 shadow-elegant">
          <h3 className="font-semibold text-foreground mb-1">Context Pipeline</h3>
          <p className="text-xs text-muted-foreground">
            {nodes.length} nodes • {edges.length} connections
          </p>
          {state.validationErrors.length > 0 && (
            <div className="mt-2 flex items-center gap-1 text-xs text-destructive">
              <AlertTriangle className="w-3 h-3" />
              {state.validationErrors.length} issues
            </div>
          )}
          {state.validationErrors.length === 0 && nodes.length > 0 && (
            <div className="mt-2 flex items-center gap-1 text-xs text-green-600">
              <CheckCircle className="w-3 h-3" />
              Pipeline valid
            </div>
          )}
        </Panel>

        {state.validationErrors.length > 0 && (
          <Panel position="bottom-center" className="max-w-md">
            <Alert variant="destructive" className="shadow-elegant">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium mb-1">Pipeline Issues:</div>
                <ul className="text-xs space-y-1">
                  {state.validationErrors.slice(0, 3).map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                  {state.validationErrors.length > 3 && (
                    <li>• ...and {state.validationErrors.length - 3} more</li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>
          </Panel>
        )}
      </ReactFlow>
      
      <NodeConfigModal />
    </div>
  );
}