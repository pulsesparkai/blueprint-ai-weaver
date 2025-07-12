import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  NodeTypes,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// Node component for different types
const CustomNode = ({ data, id }: { data: any; id: string }) => {
  const nodeColors = {
    input: 'border-blue-500 bg-blue-50 text-blue-900',
    llm: 'border-purple-500 bg-purple-50 text-purple-900', 
    rag: 'border-green-500 bg-green-50 text-green-900',
    processor: 'border-orange-500 bg-orange-50 text-orange-900',
    output: 'border-red-500 bg-red-50 text-red-900'
  };

  const colorClass = nodeColors[data.type as keyof typeof nodeColors] || 'border-gray-500 bg-gray-50 text-gray-900';

  return (
    <div className={`px-4 py-3 border-2 rounded-lg shadow-lg min-w-[120px] ${colorClass}`}>
      {data.type !== 'input' && (
        <Handle type="target" position={Position.Left} className="w-3 h-3" />
      )}
      <div className="font-medium text-center">{data.label}</div>
      {data.type !== 'output' && (
        <Handle type="source" position={Position.Right} className="w-3 h-3" />
      )}
    </div>
  );
};

// Sidebar component with draggable nodes
const Sidebar = () => {
  const nodeTypes = [
    { id: 'input', label: 'Input', type: 'input' },
    { id: 'llm', label: 'LLM', type: 'llm' },
    { id: 'rag', label: 'RAG Retriever', type: 'rag' },
    { id: 'processor', label: 'Text Processor', type: 'processor' },
    { id: 'output', label: 'Output', type: 'output' }
  ];

  const onDragStart = (event: React.DragEvent, nodeType: any) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(nodeType));
    event.dataTransfer.effectAllowed = 'move';
  };

  const nodeColors = {
    input: 'border-blue-500 bg-blue-100 hover:bg-blue-200 text-blue-900',
    llm: 'border-purple-500 bg-purple-100 hover:bg-purple-200 text-purple-900',
    rag: 'border-green-500 bg-green-100 hover:bg-green-200 text-green-900', 
    processor: 'border-orange-500 bg-orange-100 hover:bg-orange-200 text-orange-900',
    output: 'border-red-500 bg-red-100 hover:bg-red-200 text-red-900'
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 p-4 h-full overflow-y-auto">
      <h3 className="font-semibold text-lg mb-4 text-gray-800">Node Types</h3>
      <div className="space-y-3">
        {nodeTypes.map((nodeType) => {
          const colorClass = nodeColors[nodeType.type as keyof typeof nodeColors];
          return (
            <div
              key={nodeType.id}
              className={`p-3 border-2 rounded-lg cursor-grab active:cursor-grabbing transition-colors ${colorClass}`}
              draggable
              onDragStart={(event) => onDragStart(event, nodeType)}
            >
              <div className="font-medium text-center">{nodeType.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const FlowCanvas = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const nodeTypes: NodeTypes = useMemo(() => ({
    input: CustomNode,
    llm: CustomNode,
    rag: CustomNode,
    processor: CustomNode,
    output: CustomNode,
  }), []);

  // Load from localStorage on mount
  useEffect(() => {
    const savedFlow = localStorage.getItem('flow-canvas-state');
    if (savedFlow) {
      try {
        const { nodes: savedNodes, edges: savedEdges } = JSON.parse(savedFlow);
        setNodes(savedNodes || []);
        setEdges(savedEdges || []);
      } catch (error) {
        console.error('Error loading flow from localStorage:', error);
      }
    }
  }, [setNodes, setEdges]);

  // Save to localStorage on every change
  useEffect(() => {
    if (nodes.length > 0 || edges.length > 0) {
      localStorage.setItem('flow-canvas-state', JSON.stringify({ nodes, edges }));
    }
  }, [nodes, edges]);

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
      if (!reactFlowBounds) return;

      const nodeData = event.dataTransfer.getData('application/reactflow');
      if (!nodeData) return;

      let nodeType;
      try {
        nodeType = JSON.parse(nodeData);
      } catch {
        return;
      }

      const position = {
        x: event.clientX - reactFlowBounds.left - 60,
        y: event.clientY - reactFlowBounds.top - 20,
      };

      const newNode: Node = {
        id: `${nodeType.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: nodeType.type,
        position,
        data: {
          label: nodeType.label,
          type: nodeType.type,
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes]
  );

  return (
    <div className="h-screen w-full flex">
      <Sidebar />
      <div className="flex-1" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          fitView
          className="bg-gray-50"
        >
          <Background color="#e5e7eb" size={1} />
          <Controls className="bottom-4 right-4" />
          <MiniMap className="bottom-4 left-4" />
        </ReactFlow>
      </div>
    </div>
  );
};