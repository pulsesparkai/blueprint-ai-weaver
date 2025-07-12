import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { Node, Edge, Connection } from '@xyflow/react';
import { addEdge } from '@xyflow/react';

interface NodeSchema {
  inputs: string[];
  outputs: string[];
  required: string[];
}

interface NodeConfiguration {
  [key: string]: any;
}

interface GraphState {
  nodes: Node[];
  edges: Edge[];
  selectedNode: Node | null;
  configPanelOpen: boolean;
  validationErrors: string[];
  isDirty: boolean;
}

type GraphAction =
  | { type: 'SET_NODES'; payload: Node[] }
  | { type: 'SET_EDGES'; payload: Edge[] }
  | { type: 'ADD_NODE'; payload: Node }
  | { type: 'UPDATE_NODE'; payload: { id: string; data: Partial<NodeConfiguration> } }
  | { type: 'DELETE_NODE'; payload: string }
  | { type: 'ADD_EDGE'; payload: Connection }
  | { type: 'DELETE_EDGE'; payload: string }
  | { type: 'SELECT_NODE'; payload: Node | null }
  | { type: 'OPEN_CONFIG_PANEL'; payload: boolean }
  | { type: 'SET_VALIDATION_ERRORS'; payload: string[] }
  | { type: 'SET_DIRTY'; payload: boolean }
  | { type: 'RESET_GRAPH' };

const nodeSchemas: Record<string, NodeSchema> = {
  'rag-retriever': {
    inputs: [],
    outputs: ['context'],
    required: ['vectorDB', 'topK']
  },
  'memory-store': {
    inputs: ['conversation'],
    outputs: ['memory'],
    required: ['storeType', 'maxTokens']
  },
  'prompt-template': {
    inputs: ['context', 'memory', 'variables'],
    outputs: ['prompt'],
    required: ['template']
  },
  'state-tracker': {
    inputs: ['conversation'],
    outputs: ['state'],
    required: ['trackingType']
  },
  'output-parser': {
    inputs: ['llm_output'],
    outputs: ['parsed_output'],
    required: ['parserType']
  }
};

const initialState: GraphState = {
  nodes: [],
  edges: [],
  selectedNode: null,
  configPanelOpen: false,
  validationErrors: [],
  isDirty: false
};

function graphReducer(state: GraphState, action: GraphAction): GraphState {
  switch (action.type) {
    case 'SET_NODES':
      return { 
        ...state, 
        nodes: action.payload,
        isDirty: true
      };
    
    case 'SET_EDGES':
      return { 
        ...state, 
        edges: action.payload,
        isDirty: true
      };
    
    case 'ADD_NODE':
      return {
        ...state,
        nodes: [...state.nodes, action.payload],
        isDirty: true
      };
    
    case 'UPDATE_NODE':
      return {
        ...state,
        nodes: state.nodes.map(node =>
          node.id === action.payload.id
            ? { ...node, data: { ...node.data, ...action.payload.data } }
            : node
        ),
        isDirty: true
      };
    
    case 'DELETE_NODE':
      return {
        ...state,
        nodes: state.nodes.filter(node => node.id !== action.payload),
        edges: state.edges.filter(edge => 
          edge.source !== action.payload && edge.target !== action.payload
        ),
        selectedNode: state.selectedNode?.id === action.payload ? null : state.selectedNode,
        isDirty: true
      };
    
    case 'ADD_EDGE':
      const newEdge = addEdge(action.payload, state.edges);
      return {
        ...state,
        edges: newEdge,
        isDirty: true
      };
    
    case 'DELETE_EDGE':
      return {
        ...state,
        edges: state.edges.filter(edge => edge.id !== action.payload),
        isDirty: true
      };
    
    case 'SELECT_NODE':
      return {
        ...state,
        selectedNode: action.payload,
        configPanelOpen: !!action.payload
      };
    
    case 'OPEN_CONFIG_PANEL':
      return {
        ...state,
        configPanelOpen: action.payload
      };
    
    case 'SET_VALIDATION_ERRORS':
      return {
        ...state,
        validationErrors: action.payload
      };
    
    case 'SET_DIRTY':
      return {
        ...state,
        isDirty: action.payload
      };
    
    case 'RESET_GRAPH':
      return initialState;
    
    default:
      return state;
  }
}

interface GraphContextType {
  state: GraphState;
  dispatch: React.Dispatch<GraphAction>;
  validateConnection: (connection: Connection) => boolean;
  validateGraph: () => string[];
  exportGraph: () => any;
  importGraph: (graphData: any) => void;
}

const GraphContext = createContext<GraphContextType | undefined>(undefined);

export function GraphProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(graphReducer, initialState);

  const validateConnection = useCallback((connection: Connection): boolean => {
    const sourceNode = state.nodes.find(n => n.id === connection.source);
    const targetNode = state.nodes.find(n => n.id === connection.target);
    
    if (!sourceNode || !targetNode) return false;

    const sourceSchema = nodeSchemas[sourceNode.type!];
    const targetSchema = nodeSchemas[targetNode.type!];
    
    if (!sourceSchema || !targetSchema) return false;

    // Check if source has outputs and target has compatible inputs
    const hasCompatibleOutputs = sourceSchema.outputs.length > 0;
    const hasCompatibleInputs = targetSchema.inputs.length > 0;
    
    if (!hasCompatibleOutputs || !hasCompatibleInputs) return false;

    // Check for specific compatibility rules
    const sourceOutputs = sourceSchema.outputs;
    const targetInputs = targetSchema.inputs;
    
    // Simple compatibility check - at least one output should match one input
    const isCompatible = sourceOutputs.some(output => targetInputs.includes(output));
    
    return isCompatible;
  }, [state.nodes]);

  const validateGraph = useCallback((): string[] => {
    const errors: string[] = [];
    
    // Check for isolated nodes
    const connectedNodes = new Set([
      ...state.edges.map(e => e.source),
      ...state.edges.map(e => e.target)
    ]);
    
    const isolatedNodes = state.nodes.filter(node => !connectedNodes.has(node.id));
    if (isolatedNodes.length > 0) {
      errors.push(`${isolatedNodes.length} nodes are not connected to the pipeline`);
    }

    // Check for required configurations
    state.nodes.forEach(node => {
      const schema = nodeSchemas[node.type!];
      if (schema) {
        const missingRequired = schema.required.filter(field => !node.data[field]);
        if (missingRequired.length > 0) {
          errors.push(`Node "${node.data.label}" is missing required configuration: ${missingRequired.join(', ')}`);
        }
      }
    });

    // Check for circular dependencies
    const hasCircular = checkCircularDependency(state.nodes, state.edges);
    if (hasCircular) {
      errors.push('Circular dependency detected in the pipeline');
    }

    return errors;
  }, [state.nodes, state.edges]);

  const exportGraph = useCallback(() => {
    return {
      nodes: state.nodes,
      edges: state.edges,
      metadata: {
        exportedAt: new Date().toISOString(),
        version: '1.0',
        nodeCount: state.nodes.length,
        edgeCount: state.edges.length
      }
    };
  }, [state.nodes, state.edges]);

  const importGraph = useCallback((graphData: any) => {
    if (graphData.nodes && graphData.edges) {
      dispatch({ type: 'SET_NODES', payload: graphData.nodes });
      dispatch({ type: 'SET_EDGES', payload: graphData.edges });
      dispatch({ type: 'SET_DIRTY', payload: false });
    }
  }, []);

  const value = {
    state,
    dispatch,
    validateConnection,
    validateGraph,
    exportGraph,
    importGraph
  };

  return (
    <GraphContext.Provider value={value}>
      {children}
    </GraphContext.Provider>
  );
}

export function useGraph() {
  const context = useContext(GraphContext);
  if (context === undefined) {
    throw new Error('useGraph must be used within a GraphProvider');
  }
  return context;
}

// Helper function to detect circular dependencies
function checkCircularDependency(nodes: Node[], edges: Edge[]): boolean {
  const graph = new Map<string, string[]>();
  
  // Build adjacency list
  nodes.forEach(node => graph.set(node.id, []));
  edges.forEach(edge => {
    const neighbors = graph.get(edge.source) || [];
    neighbors.push(edge.target);
    graph.set(edge.source, neighbors);
  });

  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function hasCycleDFS(nodeId: string): boolean {
    if (recursionStack.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;

    visited.add(nodeId);
    recursionStack.add(nodeId);

    const neighbors = graph.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (hasCycleDFS(neighbor)) return true;
    }

    recursionStack.delete(nodeId);
    return false;
  }

  for (const nodeId of graph.keys()) {
    if (!visited.has(nodeId) && hasCycleDFS(nodeId)) {
      return true;
    }
  }

  return false;
}