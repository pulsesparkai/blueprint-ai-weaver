import { Node } from '@xyflow/react';
import { supabase } from '@/integrations/supabase/client';
import { ExecutorResult, ExecutorContext } from './index';

export class RAGExecutor {
  async execute(node: Node, context: ExecutorContext): Promise<ExecutorResult> {
    const startTime = Date.now();
    
    try {
      // Update status to running
      context.onStatusUpdate?.(context.nodeId, 'running');
      
      const config = node.data?.config as {
        database?: string;
        queryTemplate?: string;
        topK?: number;
        integrationId?: string;
      } || {};
      
      const database = config.database || 'vector-db';
      const queryTemplate = config.queryTemplate || 'Search for: {query}';
      const topK = config.topK || 5;
      const integrationId = config.integrationId;
      
      if (!integrationId) {
        throw new Error('RAG integration not configured. Please select an integration in node settings.');
      }
      
      // Prepare query
      let query = '';
      if (typeof context.data === 'string') {
        query = context.data;
      } else if (context.data?.data) {
        query = typeof context.data.data === 'string' ? context.data.data : JSON.stringify(context.data.data);
      } else {
        query = JSON.stringify(context.data);
      }
      
      const formattedQuery = queryTemplate.replace('{query}', query);
      
      // Call RAG API Edge Function
      const { data, error } = await supabase.functions.invoke('api-rag', {
        body: {
          integration_id: integrationId,
          query: formattedQuery,
          top_k: topK
        }
      });
      
      if (error) {
        throw new Error(`RAG retrieval failed: ${error.message}`);
      }
      
      const result = {
        type: 'rag',
        query: formattedQuery,
        database,
        topK,
        results: data.results,
        retrievalMetadata: data.metadata,
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error in RAG executor';
      
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