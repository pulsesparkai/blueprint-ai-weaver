import { Node } from '@xyflow/react';
import { ExecutorResult, ExecutorContext } from './index';

export class InputExecutor {
  async execute(node: Node, context: ExecutorContext): Promise<ExecutorResult> {
    const startTime = Date.now();
    
    try {
      // Update status to running
      context.onStatusUpdate?.(context.nodeId, 'running');
      
      // Simulate brief processing time
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Get test data from node configuration
      const config = node.data?.config as { testData?: string } || {};
      const testData = config.testData || 'Default input data';
      
      const result = {
        type: 'input',
        data: testData,
        timestamp: new Date().toISOString(),
        nodeId: node.id
      };
      
      // Update status to success
      context.onStatusUpdate?.(context.nodeId, 'success', result);
      
      return {
        success: true,
        data: result,
        executionTime: Date.now() - startTime
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error in input executor';
      
      // Update status to error
      context.onStatusUpdate?.(context.nodeId, 'error');
      
      return {
        success: false,
        error: errorMessage,
        executionTime: Date.now() - startTime
      };
    }
  }
}