import { Node } from '@xyflow/react';
import { ExecutorResult, ExecutorContext } from './index';

export class ProcessorExecutor {
  async execute(node: Node, context: ExecutorContext): Promise<ExecutorResult> {
    const startTime = Date.now();
    
    try {
      // Update status to running
      context.onStatusUpdate?.(context.nodeId, 'running');
      
      // Get configuration from node
      const config = node.data?.config as {
        operation?: string;
      } || {};
      
      const operation = config.operation || 'transform';
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Get input data
      let inputData = context.data;
      let textContent = '';
      
      if (typeof inputData === 'string') {
        textContent = inputData;
      } else if (inputData?.data) {
        textContent = typeof inputData.data === 'string' ? inputData.data : JSON.stringify(inputData.data);
      } else if (inputData?.llmResponse) {
        textContent = inputData.llmResponse;
      } else if (inputData?.results) {
        // RAG results
        textContent = inputData.results.map((r: any) => r.content).join(' ');
      } else {
        textContent = JSON.stringify(inputData);
      }
      
      let processedData;
      
      switch (operation) {
        case 'lowercase':
          processedData = textContent.toLowerCase();
          break;
          
        case 'uppercase':
          processedData = textContent.toUpperCase();
          break;
          
        case 'extract':
          // Extract key information (words longer than 3 characters)
          const words = textContent.split(/\s+/);
          const keyWords = words.filter(word => word.length > 3 && !/^\d+$/.test(word));
          processedData = {
            keyWords: keyWords.slice(0, 10), // Top 10 key words
            wordCount: words.length,
            characterCount: textContent.length
          };
          break;
          
        case 'summarize':
          // Simple summarization (first 100 words)
          const summaryWords = textContent.split(/\s+/).slice(0, 100);
          processedData = summaryWords.join(' ') + (textContent.split(/\s+/).length > 100 ? '...' : '');
          break;
          
        case 'filter':
          // Filter out common stop words
          const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
          const filteredWords = textContent.split(/\s+/).filter(word => 
            !stopWords.includes(word.toLowerCase()) && word.length > 2
          );
          processedData = filteredWords.join(' ');
          break;
          
        case 'validate':
          // Validate content
          const isValid = textContent.length > 0 && textContent.trim().length > 0;
          processedData = {
            isValid,
            validation: {
              hasContent: textContent.length > 0,
              notEmpty: textContent.trim().length > 0,
              wordCount: textContent.split(/\s+/).length,
              characterCount: textContent.length
            }
          };
          break;
          
        default:
          // Default transform (title case)
          processedData = textContent.replace(/\w\S*/g, (txt) => 
            txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
          );
      }
      
      const result = {
        type: 'processor',
        operation,
        originalData: inputData,
        processedData,
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error in processor executor';
      
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