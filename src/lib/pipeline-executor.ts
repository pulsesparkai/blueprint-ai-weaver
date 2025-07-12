import { Node, Edge } from '@xyflow/react';

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

export interface ExecutionContext {
  data: any;
  metadata: {
    executionTime?: number;
    timestamp: number;
    nodeId: string;
  };
}

export interface NodeExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
  executionTime: number;
}

export interface ExecutionStatus {
  nodeId: string;
  status: 'pending' | 'running' | 'success' | 'error';
  error?: string;
  executionTime?: number;
  data?: any;
}

export type StatusUpdateCallback = (statuses: Map<string, ExecutionStatus>) => void;

class NodeExecutor {
  async executeInput(node: Node, _context?: ExecutionContext): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      // For input nodes, return the test data from configuration
      const config = node.data?.config as NodeConfig || {};
      const testData = config.testData || 'Default input data';
      
      return {
        success: true,
        data: testData,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in input node',
        executionTime: Date.now() - startTime
      };
    }
  }

  async executeLLM(node: Node, context?: ExecutionContext): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      // Simulate LLM processing
      const inputData = context?.data || 'No input provided';
      const config = node.data?.config as NodeConfig || {};
      const model = config.model || 'gpt-4o-mini';
      const temperature = config.temperature || 0.7;
      const maxTokens = config.maxTokens || 1000;

      // Simulate processing time based on model
      const processingTime = model.includes('gpt-4o') ? 2000 : 1500;
      await new Promise(resolve => setTimeout(resolve, processingTime));

      const result = {
        originalInput: inputData,
        llmResponse: `Processed by ${model} (temp: ${temperature}, max tokens: ${maxTokens}): ${inputData}`,
        model,
        temperature,
        maxTokens,
        timestamp: new Date().toISOString()
      };

      return {
        success: true,
        data: result,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in LLM node',
        executionTime: Date.now() - startTime
      };
    }
  }

  async executeRAG(node: Node, context?: ExecutionContext): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const inputData = context?.data || 'No query provided';
      const config = node.data?.config as NodeConfig || {};
      const database = config.database || 'vector-db';
      const queryTemplate = config.queryTemplate || 'Search for: {query}';
      const topK = config.topK || 5;

      // Simulate RAG retrieval
      await new Promise(resolve => setTimeout(resolve, 1000));

      const query = typeof inputData === 'string' ? inputData : JSON.stringify(inputData);
      const formattedQuery = queryTemplate.replace('{query}', query);

      const mockResults = Array.from({ length: topK }, (_, i) => ({
        id: `doc_${i + 1}`,
        content: `Retrieved document ${i + 1} for query: ${formattedQuery}`,
        score: 0.9 - (i * 0.1),
        metadata: {
          source: `document_${i + 1}.txt`,
          timestamp: new Date().toISOString()
        }
      }));

      const result = {
        query: formattedQuery,
        database,
        topK,
        results: mockResults,
        retrievalMetadata: {
          totalResults: topK,
          processingTime: Date.now() - startTime
        }
      };

      return {
        success: true,
        data: result,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in RAG node',
        executionTime: Date.now() - startTime
      };
    }
  }

  async executeProcessor(node: Node, context?: ExecutionContext): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const inputData = context?.data || {};
      const config = node.data?.config as NodeConfig || {};
      const operation = config.operation || 'transform';

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 500));

      let result;
      switch (operation) {
        case 'transform':
          result = {
            operation,
            originalData: inputData,
            transformedData: typeof inputData === 'string' 
              ? inputData.toUpperCase() 
              : JSON.stringify(inputData).toUpperCase(),
            timestamp: new Date().toISOString()
          };
          break;
        case 'filter':
          result = {
            operation,
            originalData: inputData,
            filteredData: inputData, // In real implementation, apply filtering logic
            timestamp: new Date().toISOString()
          };
          break;
        case 'validate':
          result = {
            operation,
            data: inputData,
            isValid: true, // In real implementation, apply validation logic
            validationRules: ['non-empty', 'valid-format'],
            timestamp: new Date().toISOString()
          };
          break;
        case 'extract':
          result = {
            operation,
            originalData: inputData,
            extractedFeatures: {
              length: typeof inputData === 'string' ? inputData.length : JSON.stringify(inputData).length,
              type: typeof inputData,
              hasContent: Boolean(inputData)
            },
            timestamp: new Date().toISOString()
          };
          break;
        default:
          throw new Error(`Unknown processor operation: ${operation}`);
      }

      return {
        success: true,
        data: result,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in processor node',
        executionTime: Date.now() - startTime
      };
    }
  }

  async executeOutput(node: Node, context?: ExecutionContext): Promise<NodeExecutionResult> {
    const startTime = Date.now();
    
    try {
      const inputData = context?.data || {};
      const config = node.data?.config as NodeConfig || {};
      const format = config.format || 'text';

      // Simulate output formatting
      await new Promise(resolve => setTimeout(resolve, 200));

      let formattedOutput;
      switch (format) {
        case 'text':
          formattedOutput = typeof inputData === 'string' ? inputData : JSON.stringify(inputData, null, 2);
          break;
        case 'json':
          formattedOutput = JSON.stringify(inputData, null, 2);
          break;
        case 'markdown':
          formattedOutput = `# Pipeline Output\n\n\`\`\`\n${JSON.stringify(inputData, null, 2)}\n\`\`\``;
          break;
        case 'html':
          formattedOutput = `<div class="pipeline-output"><pre>${JSON.stringify(inputData, null, 2)}</pre></div>`;
          break;
        default:
          formattedOutput = String(inputData);
      }

      const result = {
        format,
        originalData: inputData,
        formattedOutput,
        timestamp: new Date().toISOString()
      };

      return {
        success: true,
        data: result,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error in output node',
        executionTime: Date.now() - startTime
      };
    }
  }
}

export class PipelineExecutor {
  private nodeExecutor: NodeExecutor;
  private executionStatuses: Map<string, ExecutionStatus>;
  private nodeData: Map<string, any>;

  constructor() {
    this.nodeExecutor = new NodeExecutor();
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

  private async executeNode(node: Node, inputs: ExecutionContext[]): Promise<NodeExecutionResult> {
    const nodeType = node.data?.type || node.type;
    
    // Merge input data if multiple inputs
    let context: ExecutionContext | undefined;
    if (inputs.length > 0) {
      const mergedData = inputs.length === 1 
        ? inputs[0].data 
        : inputs.map(input => input.data);
      
      context = {
        data: mergedData,
        metadata: {
          timestamp: Date.now(),
          nodeId: node.id
        }
      };
    }

    switch (nodeType) {
      case 'input':
        return this.nodeExecutor.executeInput(node, context);
      case 'llm':
        return this.nodeExecutor.executeLLM(node, context);
      case 'rag':
        return this.nodeExecutor.executeRAG(node, context);
      case 'processor':
        return this.nodeExecutor.executeProcessor(node, context);
      case 'output':
        return this.nodeExecutor.executeOutput(node, context);
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
    try {
      // Reset state
      this.executionStatuses.clear();
      this.nodeData.clear();

      // Initialize all nodes as pending
      nodes.forEach(node => {
        this.executionStatuses.set(node.id, {
          nodeId: node.id,
          status: 'pending'
        });
      });

      // Get execution order
      const executionOrder = this.topologicalSort(nodes, edges);
      
      // Execute nodes in order
      for (const nodeId of executionOrder) {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) continue;

        // Update status to running
        this.executionStatuses.set(nodeId, {
          nodeId,
          status: 'running'
        });
        
        if (onStatusUpdate) {
          onStatusUpdate(new Map(this.executionStatuses));
        }

        try {
          // Get input data from predecessor nodes
          const inputNodeIds = this.getNodeInputs(nodeId, edges);
          const inputs: ExecutionContext[] = inputNodeIds
            .map(inputId => {
              const data = this.nodeData.get(inputId);
              return data ? {
                data,
                metadata: {
                  timestamp: Date.now(),
                  nodeId: inputId
                }
              } : null;
            })
            .filter(Boolean) as ExecutionContext[];

          // Execute the node
          const result = await this.executeNode(node, inputs);

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

    } catch (error) {
      // Mark all pending/running nodes as error
      this.executionStatuses.forEach((status, nodeId) => {
        if (status.status === 'pending' || status.status === 'running') {
          this.executionStatuses.set(nodeId, {
            nodeId,
            status: 'error',
            error: error instanceof Error ? error.message : 'Pipeline execution failed'
          });
        }
      });

      if (onStatusUpdate) {
        onStatusUpdate(new Map(this.executionStatuses));
      }

      throw error;
    }
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