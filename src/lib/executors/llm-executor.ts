import { Node } from '@xyflow/react';
import { supabase } from '@/integrations/supabase/client';
import { ExecutorResult, ExecutorContext } from './index';

export class LLMExecutor {
  async execute(node: Node, context: ExecutorContext): Promise<ExecutorResult> {
    const startTime = Date.now();
    
    try {
      // Update status to running
      context.onStatusUpdate?.(context.nodeId, 'running');
      
      const config = node.data?.config as {
        model?: string;
        temperature?: number;
        maxTokens?: number;
        integrationId?: string;
      } || {};
      
      const model = config.model || 'gpt-4o-mini';
      const temperature = config.temperature || 0.7;
      const maxTokens = config.maxTokens || 1000;
      const integrationId = config.integrationId;
      
      if (!integrationId) {
        throw new Error('LLM integration not configured. Please select an integration in node settings.');
      }
      
      // Prepare input data
      let inputText = '';
      if (typeof context.data === 'string') {
        inputText = context.data;
      } else if (context.data?.data) {
        inputText = typeof context.data.data === 'string' ? context.data.data : JSON.stringify(context.data.data);
      } else {
        inputText = JSON.stringify(context.data);
      }
      
      // Call LLM API Edge Function
      const { data, error } = await supabase.functions.invoke('api-llm', {
        body: {
          integration_id: integrationId,
          prompt: inputText,
          model,
          temperature,
          max_tokens: maxTokens
        }
      });
      
      if (error) {
        throw new Error(`LLM processing failed: ${error.message}`);
      }
      
      const result = {
        type: 'llm',
        originalInput: inputText,
        llmResponse: data.response,
        model,
        temperature,
        maxTokens,
        tokensUsed: data.tokens_used || 0,
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error in LLM executor';
      
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