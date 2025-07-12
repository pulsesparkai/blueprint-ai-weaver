import { Node } from '@xyflow/react';
import { ExecutorResult, ExecutorContext } from './index';

export class OutputExecutor {
  async execute(node: Node, context: ExecutorContext): Promise<ExecutorResult> {
    const startTime = Date.now();
    
    try {
      // Update status to running
      context.onStatusUpdate?.(context.nodeId, 'running');
      
      // Get configuration from node
      const config = node.data?.config as {
        format?: string;
      } || {};
      
      const format = config.format || 'text';
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Get input data
      let inputData = context.data;
      
      // Extract the most relevant data for output
      let dataToFormat;
      if (inputData?.processedData !== undefined) {
        // From processor
        dataToFormat = inputData.processedData;
      } else if (inputData?.llmResponse) {
        // From LLM
        dataToFormat = inputData.llmResponse;
      } else if (inputData?.results) {
        // From RAG
        dataToFormat = inputData.results;
      } else if (inputData?.data) {
        // From input
        dataToFormat = inputData.data;
      } else {
        dataToFormat = inputData;
      }
      
      let formattedOutput;
      
      switch (format) {
        case 'text':
          if (typeof dataToFormat === 'string') {
            formattedOutput = dataToFormat;
          } else if (Array.isArray(dataToFormat)) {
            formattedOutput = dataToFormat.map((item, index) => 
              `${index + 1}. ${typeof item === 'string' ? item : JSON.stringify(item)}`
            ).join('\n');
          } else {
            formattedOutput = JSON.stringify(dataToFormat, null, 2);
          }
          break;
          
        case 'json':
          formattedOutput = JSON.stringify(dataToFormat, null, 2);
          break;
          
        case 'markdown':
          if (typeof dataToFormat === 'string') {
            formattedOutput = `# Pipeline Output\n\n${dataToFormat}`;
          } else if (Array.isArray(dataToFormat)) {
            formattedOutput = `# Pipeline Output\n\n${dataToFormat.map((item, index) => 
              `## Result ${index + 1}\n${typeof item === 'string' ? item : '```json\n' + JSON.stringify(item, null, 2) + '\n```'}`
            ).join('\n\n')}`;
          } else {
            formattedOutput = `# Pipeline Output\n\n\`\`\`json\n${JSON.stringify(dataToFormat, null, 2)}\n\`\`\``;
          }
          break;
          
        case 'html':
          if (typeof dataToFormat === 'string') {
            formattedOutput = `<div class="pipeline-output"><h1>Pipeline Output</h1><p>${dataToFormat.replace(/\n/g, '<br>')}</p></div>`;
          } else if (Array.isArray(dataToFormat)) {
            const listItems = dataToFormat.map((item, index) => 
              `<li><strong>Result ${index + 1}:</strong> ${typeof item === 'string' ? item : JSON.stringify(item)}</li>`
            ).join('');
            formattedOutput = `<div class="pipeline-output"><h1>Pipeline Output</h1><ol>${listItems}</ol></div>`;
          } else {
            formattedOutput = `<div class="pipeline-output"><h1>Pipeline Output</h1><pre>${JSON.stringify(dataToFormat, null, 2)}</pre></div>`;
          }
          break;
          
        default:
          formattedOutput = String(dataToFormat);
      }
      
      const result = {
        type: 'output',
        format,
        originalData: inputData,
        formattedOutput,
        metadata: {
          inputType: typeof dataToFormat,
          outputLength: formattedOutput.length,
          isArray: Array.isArray(dataToFormat)
        },
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error in output executor';
      
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