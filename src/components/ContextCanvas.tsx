import React, { useCallback, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  ReactFlowProvider,
  Panel
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { RAGRetrieverNode } from './nodes/RAGRetrieverNode';
import { MemoryStoreNode } from './nodes/MemoryStoreNode';
import { PromptTemplateNode } from './nodes/PromptTemplateNode';
import { StateTrackerNode } from './nodes/StateTrackerNode';
import { OutputParserNode } from './nodes/OutputParserNode';
import { Button } from '@/components/ui/button';
import { Play, Save, Download, Zap } from 'lucide-react';

const nodeTypes = {
  'rag-retriever': RAGRetrieverNode,
  'memory-store': MemoryStoreNode,
  'prompt-template': PromptTemplateNode,
  'state-tracker': StateTrackerNode,
  'output-parser': OutputParserNode,
};

const initialNodes: Node[] = [
  {
    id: 'welcome',
    type: 'prompt-template',
    position: { x: 250, y: 100 },
    data: {
      label: 'Welcome Prompt',
      template: 'You are an AI assistant specialized in context engineering. Help users build effective context pipelines.',
      variables: ['user_input']
    },
  },
];

const initialEdges: Edge[] = [];

interface ContextCanvasProps {
  onAddNode: (nodeType: any) => void;
}

export function ContextCanvas({ onAddNode }: ContextCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

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
      const position = reactFlowInstance?.screenToFlowPosition({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const newNode: Node = {
        id: `${nodeData.id}-${Date.now()}`,
        type: nodeData.id,
        position,
        data: {
          label: nodeData.label,
          ...getDefaultNodeData(nodeData.id)
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
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
    const newNode: Node = {
      id: `${nodeType.id}-${Date.now()}`,
      type: nodeType.id,
      position: { x: Math.random() * 400 + 100, y: Math.random() * 400 + 100 },
      data: {
        label: nodeType.label,
        ...getDefaultNodeData(nodeType.id)
      },
    };

    setNodes((nds) => nds.concat(newNode));
  };

  React.useEffect(() => {
    onAddNode(handleAddNode);
  }, [onAddNode]);

  return (
    <div className="flex-1 h-full bg-gradient-canvas" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={setReactFlowInstance}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={nodeTypes}
        fitView
        className="bg-gradient-canvas"
      >
        <Controls 
          className="bg-card border border-border shadow-elegant"
          position="bottom-left"
        />
        
        <MiniMap 
          className="bg-card border border-border shadow-elegant"
          nodeColor="#8b5cf6"
          maskColor="rgba(139, 92, 246, 0.1)"
          position="bottom-right"
        />
        
        <Background 
          gap={20} 
          size={1}
          className="opacity-30"
        />

        <Panel position="top-center" className="flex gap-2">
          <Button className="shadow-elegant" size="sm">
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
          <Button variant="outline" size="sm" className="shadow-elegant">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </Panel>

        <Panel position="top-left" className="bg-card border border-border rounded-lg p-3 shadow-elegant">
          <h3 className="font-semibold text-foreground mb-1">Context Pipeline</h3>
          <p className="text-xs text-muted-foreground">
            {nodes.length} nodes • {edges.length} connections
          </p>
        </Panel>
      </ReactFlow>
    </div>
  );
}