export interface ExecutorResult {
  success: boolean;
  data?: any;
  error?: string;
  executionTime: number;
}

export interface ExecutorContext {
  data: any;
  nodeId: string;
  onStatusUpdate?: (nodeId: string, status: 'pending' | 'running' | 'success' | 'error', data?: any) => void;
}

export * from './input-executor';
export * from './llm-executor';
export * from './rag-executor';
export * from './processor-executor';
export * from './output-executor';