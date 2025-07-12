import { Node, Edge } from '@xyflow/react';
import { supabase } from '@/integrations/supabase/client';
import { 
  InputExecutor, 
  LLMExecutor, 
  RAGExecutor, 
  ProcessorExecutor, 
  OutputExecutor,
  ExecutorResult,
  ExecutorContext
} from './executors';

export interface NodeConfig {
  testData?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  database?: string;
  queryTemplate?: string;
  topK?: number;
  operation?: string;
  format?: string;
}

export interface ExecutionStatus {
  nodeId?: string;
  status: 'pending' | 'running' | 'success' | 'error';
  error?: string;
  executionTime?: number;
  data?: any;
  tokens?: any;
  context?: any;
}

export type StatusUpdateCallback = (statuses: Map<string, ExecutionStatus>) => void;

export class PipelineExecutor {
  private inputExecutor: InputExecutor;
  private llmExecutor: LLMExecutor;
  private ragExecutor: RAGExecutor;
  private processorExecutor: ProcessorExecutor;
  private outputExecutor: OutputExecutor;
  private executionStatuses: Map<string, ExecutionStatus>;
  private nodeData: Map<string, any>;

  constructor() {
    this.inputExecutor = new InputExecutor();
    this.llmExecutor = new LLMExecutor();
    this.ragExecutor = new RAGExecutor();
    this.processorExecutor = new ProcessorExecutor();
    this.outputExecutor = new OutputExecutor();
    this.executionStatuses = new Map();
    this.nodeData = new Map();
  }

  private topologicalSort(nodes: Node[], edges: Edge[]): string[] {
    const graph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    // Initialize graph and in-degree count
    nodes.forEach(node => {
      graph.set(node.id, []);
      inDegree.set(node.id, 0);
    });

    // Build graph and calculate in-degrees
    edges.forEach(edge => {
      const from = edge.source;
      const to = edge.target;
      
      if (graph.has(from)) {
        graph.get(from)!.push(to);
      }
      if (inDegree.has(to)) {
        inDegree.set(to, inDegree.get(to)! + 1);
      }
    });

    // Kahn's algorithm for topological sorting
    const queue: string[] = [];
    const result: string[] = [];

    // Add all nodes with in-degree 0 to queue
    inDegree.forEach((degree, nodeId) => {
      if (degree === 0) {
        queue.push(nodeId);
      }
    });

    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);

      // Process all neighbors
      const neighbors = graph.get(current) || [];
      neighbors.forEach(neighbor => {
        const newDegree = inDegree.get(neighbor)! - 1;
        inDegree.set(neighbor, newDegree);
        
        if (newDegree === 0) {
          queue.push(neighbor);
        }
      });
    }

    // Check for cycles
    if (result.length !== nodes.length) {
      throw new Error('Pipeline contains cycles and cannot be executed');
    }

    return result;
  }

  private getNodeInputs(nodeId: string, edges: Edge[]): string[] {
    return edges
      .filter(edge => edge.target === nodeId)
      .map(edge => edge.source);
  }

  private async executeNode(node: Node, inputs: any[], onStatusUpdate?: (nodeId: string, status: 'pending' | 'running' | 'success' | 'error', data?: any) => void): Promise<ExecutorResult> {
    const nodeType = node.data?.type || node.type;
    
    // Prepare context
    const mergedData = inputs.length === 1 ? inputs[0] : inputs;
    const context: ExecutorContext = {
      data: mergedData,
      nodeId: node.id,
      onStatusUpdate
    };

    switch (nodeType) {
      case 'input':
        return this.inputExecutor.execute(node, context);
      case 'llm':
        return this.llmExecutor.execute(node, context);
      case 'rag':
        return this.ragExecutor.execute(node, context);
      case 'processor':
        return this.processorExecutor.execute(node, context);
      case 'output':
        return this.outputExecutor.execute(node, context);
      default:
        return {
          success: false,
          error: `Unknown node type: ${nodeType}`,
          executionTime: 0
        };
    }
  }

  async executePipeline(
    nodes: Node[], 
    edges: Edge[], 
    onStatusUpdate?: StatusUpdateCallback
  ): Promise<Map<string, ExecutionStatus>> {
    this.executionStatuses.clear();
    this.nodeData.clear();
    
    try {
      // Check if we should use LangChain executor (for complex pipelines)
      const shouldUseLangChain = nodes.some(node => 
        ['promptTemplate', 'ragRetriever', 'outputParser', 'memoryStore', 'stateTracker'].includes(node.type)
      );

      if (shouldUseLangChain) {
        return await this.executeLangChainPipeline(nodes, edges, onStatusUpdate);
      }

      // Fallback to original executor for simple pipelines
      return await this.executeTraditionalPipeline(nodes, edges, onStatusUpdate);
    } catch (error: any) {
      throw new Error(`Pipeline execution failed: ${error.message}`);
    }
  }

  private async executeLangChainPipeline(
    nodes: Node[], 
    edges: Edge[], 
    onStatusUpdate?: StatusUpdateCallback
  ): Promise<Map<string, ExecutionStatus>> {
    // Initialize all nodes as pending
    const statuses = new Map<string, ExecutionStatus>();
    nodes.forEach(node => {
      statuses.set(node.id, { status: 'pending' });
    });
    onStatusUpdate?.(statuses);

    try {
      // Get current user ID (this should be passed from the auth context)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Use the new LangChain-powered pipeline executor
      const response = await supabase.functions.invoke('pipeline-executor', {
        body: {
          nodes: nodes.map(node => ({
            id: node.id,
            type: node.type,
            data: node.data,
            position: node.position
          })),
          edges: edges.map(edge => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            sourceHandle: edge.sourceHandle,
            targetHandle: edge.targetHandle
          })),
          input: this.getInitialInput(nodes, edges),
          userId: user.id
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const { results, finalOutput, context } = response.data;
      
      // Convert results to ExecutionStatus format
      Object.entries(results).forEach(([nodeId, result]: [string, any]) => {
        statuses.set(nodeId, {
          status: result.success ? 'success' : 'error',
          data: result.data,
          error: result.error,
          executionTime: result.executionTime,
          tokens: result.tokens,
          context: result.context || context
        });
        this.nodeData.set(nodeId, result.data);
      });

      this.executionStatuses = statuses;
      onStatusUpdate?.(statuses);
      return statuses;
    } catch (error: any) {
      // Mark all nodes as error
      nodes.forEach(node => {
        statuses.set(node.id, {
          status: 'error',
          error: error.message
        });
      });
      onStatusUpdate?.(statuses);
      throw error;
    }
  }

  private async executeTraditionalPipeline(
    nodes: Node[], 
    edges: Edge[], 
    onStatusUpdate?: StatusUpdateCallback
  ): Promise<Map<string, ExecutionStatus>> {
    // Initialize all nodes as pending
    nodes.forEach(node => {
      this.executionStatuses.set(node.id, {
        nodeId: node.id,
        status: 'pending'
      });
    });

    // Get execution order
    const executionOrder = this.topologicalSort(nodes, edges);
    
    // Create status update callback for individual nodes
    const nodeStatusUpdate = (nodeId: string, status: 'pending' | 'running' | 'success' | 'error', data?: any) => {
      const currentStatus = this.executionStatuses.get(nodeId);
      if (currentStatus) {
        this.executionStatuses.set(nodeId, {
          ...currentStatus,
          status,
          data
        });
        if (onStatusUpdate) {
          onStatusUpdate(new Map(this.executionStatuses));
        }
      }
    };
    
    // Execute nodes in order
    for (const nodeId of executionOrder) {
      const node = nodes.find(n => n.id === nodeId);
      if (!node) continue;

      try {
        // Get input data from predecessor nodes
        const inputNodeIds = this.getNodeInputs(nodeId, edges);
        const inputs = inputNodeIds
          .map(inputId => this.nodeData.get(inputId))
          .filter(Boolean);

        // Execute the node
        const result = await this.executeNode(node, inputs, nodeStatusUpdate);

        // Update status based on result
        if (result.success) {
          this.nodeData.set(nodeId, result.data);
          this.executionStatuses.set(nodeId, {
            nodeId,
            status: 'success',
            executionTime: result.executionTime,
            data: result.data
          });
        } else {
          this.executionStatuses.set(nodeId, {
            nodeId,
            status: 'error',
            error: result.error,
            executionTime: result.executionTime
          });
        }

      } catch (error) {
        this.executionStatuses.set(nodeId, {
          nodeId,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown execution error'
        });
      }

      if (onStatusUpdate) {
        onStatusUpdate(new Map(this.executionStatuses));
      }
    }

    return new Map(this.executionStatuses);
  }

  private getInitialInput(nodes: Node[], edges: Edge[]): string {
    // Find the starting node (node with no incoming edges)
    const nodeIds = nodes.map(n => n.id);
    const targetNodes = new Set(edges.map(e => e.target));
    const startingNodes = nodeIds.filter(id => !targetNodes.has(id));
    
    if (startingNodes.length > 0) {
      const startingNode = nodes.find(n => n.id === startingNodes[0]);
      return String(startingNode?.data?.input || startingNode?.data?.template || 'Hello, world!');
    }
    
    return 'Hello, world!';
  }

  getExecutionResults(): Map<string, ExecutionStatus> {
    return new Map(this.executionStatuses);
  }

  getNodeData(nodeId: string): any {
    return this.nodeData.get(nodeId);
  }

  clearResults(): void {
    this.executionStatuses.clear();
    this.nodeData.clear();
  }
}

// Utility function to format execution time
export function formatExecutionTime(timeMs: number): string {
  if (timeMs < 1000) {
    return `${timeMs}ms`;
  } else if (timeMs < 60000) {
    return `${(timeMs / 1000).toFixed(1)}s`;
  } else {
    const minutes = Math.floor(timeMs / 60000);
    const seconds = Math.floor((timeMs % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }
}

// Export singleton instance
export const pipelineExecutor = new PipelineExecutor();