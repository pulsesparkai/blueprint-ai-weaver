import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';

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

// Configuration Panel Component
interface NodeConfig {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  database?: string;
  queryTemplate?: string;
  topK?: number;
  testData?: string;
  format?: string;
  operation?: string;
}

const ConfigPanel = ({ selectedNode, onClose, onUpdateNode, onDeleteNode }: {
  selectedNode: Node | null;
  onClose: () => void;
  onUpdateNode: (nodeId: string, data: any) => void;
  onDeleteNode: (nodeId: string) => void;
}) => {
  const [nodeName, setNodeName] = useState(selectedNode?.data?.label || '');
  const [config, setConfig] = useState<NodeConfig>(selectedNode?.data?.config || {});

  useEffect(() => {
    if (selectedNode) {
      setNodeName(String(selectedNode.data?.label || ''));
      setConfig(selectedNode.data?.config || getDefaultConfig(String(selectedNode.data?.type || '')));
    }
  }, [selectedNode]);

  const getDefaultConfig = (nodeType: string): NodeConfig => {
    switch (nodeType) {
      case 'llm':
        return { model: 'gpt-4o-mini', temperature: 0.7, maxTokens: 1000 };
      case 'rag':
        return { database: 'vector-db', queryTemplate: 'Search for: {query}', topK: 5 };
      case 'input':
        return { testData: 'Enter test input here...' };
      case 'output':
        return { format: 'text' };
      case 'processor':
        return { operation: 'transform' };
      default:
        return {};
    }
  };

  const updateConfig = (key: string, value: any) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    if (selectedNode) {
      onUpdateNode(selectedNode.id, {
        ...selectedNode.data,
        label: nodeName,
        config: newConfig
      });
    }
  };

  const updateNodeName = (newName: string) => {
    setNodeName(newName);
    if (selectedNode) {
      onUpdateNode(selectedNode.id, {
        ...selectedNode.data,
        label: newName,
        config: config
      });
    }
  };

  if (!selectedNode) return null;

  const renderConfigFields = () => {
    switch (selectedNode.data?.type) {
      case 'llm':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="model">Model</Label>
              <Select value={config.model || 'gpt-4o-mini'} onValueChange={(value) => updateConfig('model', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border z-50">
                  <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                  <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                  <SelectItem value="claude-3-haiku">Claude 3 Haiku</SelectItem>
                  <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
                  <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="temperature">Temperature: {config.temperature || 0.7}</Label>
              <Slider
                value={[config.temperature || 0.7]}
                onValueChange={(value) => updateConfig('temperature', value[0])}
                max={2}
                min={0}
                step={0.1}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="maxTokens">Max Tokens</Label>
              <Input
                type="number"
                value={config.maxTokens || 1000}
                onChange={(e) => updateConfig('maxTokens', parseInt(e.target.value))}
                className="mt-1"
              />
            </div>
          </div>
        );
      case 'rag':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="database">Database</Label>
              <Select value={config.database || 'vector-db'} onValueChange={(value) => updateConfig('database', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border z-50">
                  <SelectItem value="vector-db">Vector Database</SelectItem>
                  <SelectItem value="elasticsearch">Elasticsearch</SelectItem>
                  <SelectItem value="pinecone">Pinecone</SelectItem>
                  <SelectItem value="weaviate">Weaviate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="queryTemplate">Search Query Template</Label>
              <Textarea
                value={config.queryTemplate || 'Search for: {query}'}
                onChange={(e) => updateConfig('queryTemplate', e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="topK">Top-K Results</Label>
              <Input
                type="number"
                value={config.topK || 5}
                onChange={(e) => updateConfig('topK', parseInt(e.target.value))}
                className="mt-1"
                min={1}
                max={50}
              />
            </div>
          </div>
        );
      case 'input':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="testData">Test Data</Label>
              <Textarea
                value={config.testData || 'Enter test input here...'}
                onChange={(e) => updateConfig('testData', e.target.value)}
                className="mt-1"
                rows={6}
                placeholder="Enter test input data..."
              />
            </div>
          </div>
        );
      case 'output':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="format">Output Format</Label>
              <Select value={config.format || 'text'} onValueChange={(value) => updateConfig('format', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border z-50">
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="markdown">Markdown</SelectItem>
                  <SelectItem value="html">HTML</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      case 'processor':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="operation">Operation</Label>
              <Select value={config.operation || 'transform'} onValueChange={(value) => updateConfig('operation', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border z-50">
                  <SelectItem value="transform">Transform</SelectItem>
                  <SelectItem value="filter">Filter</SelectItem>
                  <SelectItem value="validate">Validate</SelectItem>
                  <SelectItem value="extract">Extract</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      default:
        return <div>No configuration available for this node type.</div>;
    }
  };

  return (
    <div className={`fixed top-0 right-0 h-full w-80 bg-white shadow-lg border-l border-gray-200 transform transition-transform duration-300 ease-in-out z-40 ${selectedNode ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Node Configuration</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="p-4 space-y-4 overflow-y-auto h-full pb-20">
        <div>
          <Label htmlFor="nodeType">Node Type</Label>
          <Input value={String(selectedNode.data?.type || '')} disabled className="mt-1 bg-gray-50" />
        </div>
        
        <div>
          <Label htmlFor="nodeName">Node Name</Label>
          <Input
            value={String(nodeName)}
            onChange={(e) => updateNodeName(e.target.value)}
            className="mt-1"
            placeholder="Enter node name..."
          />
        </div>
        
        {renderConfigFields()}
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
        <Button
          variant="destructive"
          onClick={() => onDeleteNode(selectedNode.id)}
          className="w-full"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Node
        </Button>
      </div>
    </div>
  );
};

export const FlowCanvas = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

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

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleUpdateNode = useCallback((nodeId: string, newData: any) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: newData }
          : node
      )
    );
  }, [setNodes]);

  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    setSelectedNode(null);
  }, [setNodes, setEdges]);

  const handleClosePanel = useCallback(() => {
    setSelectedNode(null);
  }, []);

  return (
    <div className="h-screen w-full flex relative">
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
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          className="bg-gray-50"
        >
          <Background color="#e5e7eb" size={1} />
          <Controls className="bottom-4 right-4" />
          <MiniMap className="bottom-4 left-4" />
        </ReactFlow>
      </div>
      <ConfigPanel
        selectedNode={selectedNode}
        onClose={handleClosePanel}
        onUpdateNode={handleUpdateNode}
        onDeleteNode={handleDeleteNode}
      />
    </div>
  );
};