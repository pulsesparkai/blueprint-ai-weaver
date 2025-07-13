import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SimulationRequest {
  sessionId: string;
  input: string;
  provider: 'openai' | 'anthropic' | 'xai';
  model: string;
  apiKey: string;
  useMockMode: boolean;
  nodes: any[];
  edges: any[];
  blueprintId?: string;
}

interface SimulationStep {
  stepId: string;
  nodeType: string;
  stepName: string;
  input: any;
  output: any;
  status: 'pending' | 'running' | 'completed' | 'error';
  executionTime: number;
  tokens?: {
    input: number;
    output: number;
    total: number;
  };
  cost?: number;
  error?: string;
}

class EnhancedPipelineSimulator {
  private supabase: any;
  private rateLimits: Map<string, number> = new Map();

  constructor(supabaseUrl: string, supabaseServiceKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  async simulatePipeline(request: SimulationRequest): Promise<void> {
    const { sessionId, input, provider, model, apiKey, useMockMode, nodes, edges, blueprintId } = request;
    
    console.log(`[SIMULATION] Starting simulation ${sessionId}`);
    
    // Create simulation log
    const { data: simLog, error: logError } = await this.supabase
      .from('simulation_logs')
      .insert({
        session_id: sessionId,
        blueprint_id: blueprintId,
        input_query: input,
        llm_provider: provider,
        status: 'running',
        started_at: new Date().toISOString(),
        pipeline_config: { nodes, edges },
        user_id: 'system' // Will be updated with actual user ID
      })
      .select()
      .single();

    if (logError) {
      console.error('Failed to create simulation log:', logError);
    }

    try {
      const executionSteps: SimulationStep[] = [];
      const sortedNodes = this.topologicalSort(nodes, edges);
      let currentInput = input;

      // Broadcast simulation start
      await this.broadcastUpdate(sessionId, 'simulation_started', {
        totalSteps: sortedNodes.length,
        progress: 0
      });

      for (let i = 0; i < sortedNodes.length; i++) {
        const nodeId = sortedNodes[i];
        const node = nodes.find(n => n.id === nodeId);
        if (!node) continue;

        const stepId = `${nodeId}-${Date.now()}`;
        const startTime = Date.now();

        console.log(`[SIMULATION] Executing step ${i + 1}/${sortedNodes.length}: ${node.type}`);

        // Broadcast step start
        await this.broadcastUpdate(sessionId, 'step_update', {
          stepId,
          status: 'running',
          progress: (i / sortedNodes.length) * 100
        });

        try {
          let stepResult;

          switch (node.type) {
            case 'promptTemplate':
            case 'PromptTemplateNode':
              stepResult = await this.executePromptNode(node, currentInput, provider, model, apiKey, useMockMode);
              break;
            case 'ragRetriever':
            case 'RAGRetrieverNode':
              stepResult = await this.executeRAGNode(node, currentInput, provider, model, apiKey, useMockMode);
              break;
            case 'outputParser':
            case 'OutputParserNode':
              stepResult = await this.executeOutputParserNode(node, currentInput);
              break;
            case 'memoryStore':
            case 'MemoryStoreNode':
              stepResult = await this.executeMemoryNode(node, currentInput);
              break;
            case 'stateTracker':
            case 'StateTrackerNode':
              stepResult = await this.executeStateTrackerNode(node, currentInput);
              break;
            default:
              stepResult = {
                output: currentInput,
                tokens: { input: 0, output: 0, total: 0 },
                cost: 0
              };
          }

          const executionTime = Date.now() - startTime;
          const step: SimulationStep = {
            stepId,
            nodeType: node.type,
            stepName: node.data?.label || node.type,
            input: currentInput,
            output: stepResult.output,
            status: 'completed',
            executionTime,
            tokens: stepResult.tokens,
            cost: stepResult.cost
          };

          executionSteps.push(step);
          currentInput = stepResult.output;

          // Broadcast step completion
          await this.broadcastUpdate(sessionId, 'step_update', {
            stepId,
            status: 'completed',
            output: stepResult.output,
            tokens: stepResult.tokens,
            cost: stepResult.cost,
            executionTime,
            progress: ((i + 1) / sortedNodes.length) * 100
          });

        } catch (error) {
          const executionTime = Date.now() - startTime;
          const step: SimulationStep = {
            stepId,
            nodeType: node.type,
            stepName: node.data?.label || node.type,
            input: currentInput,
            output: null,
            status: 'error',
            executionTime,
            error: error.message
          };

          executionSteps.push(step);

          // Broadcast step error
          await this.broadcastUpdate(sessionId, 'step_update', {
            stepId,
            status: 'error',
            error: error.message,
            executionTime
          });

          throw error;
        }
      }

      // Calculate final metrics
      const totalTokens = executionSteps.reduce((sum, step) => sum + (step.tokens?.total || 0), 0);
      const totalCost = executionSteps.reduce((sum, step) => sum + (step.cost || 0), 0);
      const totalTime = executionSteps.reduce((sum, step) => sum + step.executionTime, 0);

      // Update simulation log
      if (simLog) {
        await this.supabase
          .from('simulation_logs')
          .update({
            status: 'completed',
            final_output: currentInput,
            execution_steps: executionSteps,
            completed_at: new Date().toISOString(),
            execution_time_ms: totalTime,
            metrics: {
              totalTokens,
              totalCost,
              totalTime,
              stepCount: executionSteps.length
            }
          })
          .eq('id', simLog.id);
      }

      // Broadcast completion
      await this.broadcastUpdate(sessionId, 'simulation_completed', {
        finalOutput: currentInput,
        executionSteps,
        metrics: {
          totalTokens,
          totalCost,
          totalTime,
          stepCount: executionSteps.length
        },
        progress: 100
      });

      console.log(`[SIMULATION] Completed simulation ${sessionId}`);

    } catch (error) {
      console.error(`[SIMULATION] Error in simulation ${sessionId}:`, error);

      // Update simulation log with error
      if (simLog) {
        await this.supabase
          .from('simulation_logs')
          .update({
            status: 'error',
            error_message: error.message,
            completed_at: new Date().toISOString()
          })
          .eq('id', simLog.id);
      }

      // Broadcast error
      await this.broadcastUpdate(sessionId, 'simulation_error', {
        error: error.message
      });

      throw error;
    }
  }

  private async executePromptNode(node: any, input: string, provider: string, model: string, apiKey: string, useMockMode: boolean) {
    if (useMockMode) {
      return {
        output: `Mock response for: ${input}`,
        tokens: { input: 10, output: 15, total: 25 },
        cost: 0.0005
      };
    }

    const { template = '{input}', systemPrompt = '', temperature = 0.7, maxTokens = 1000 } = node.data || {};
    const prompt = template.replace('{input}', input);

    const startTime = Date.now();
    
    try {
      let response;
      const tokenEstimate = Math.ceil((prompt.length + systemPrompt.length) / 4);

      switch (provider) {
        case 'openai':
          response = await this.callOpenAI(apiKey, model, prompt, systemPrompt, temperature, maxTokens);
          break;
        case 'anthropic':
          response = await this.callAnthropic(apiKey, model, prompt, systemPrompt, temperature, maxTokens);
          break;
        case 'xai':
          response = await this.callXAI(apiKey, model, prompt, systemPrompt, temperature, maxTokens);
          break;
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }

      return {
        output: response.content,
        tokens: response.usage || { input: tokenEstimate, output: Math.ceil(response.content.length / 4), total: tokenEstimate + Math.ceil(response.content.length / 4) },
        cost: this.calculateCost(provider, model, response.usage || { input: tokenEstimate, output: Math.ceil(response.content.length / 4), total: tokenEstimate + Math.ceil(response.content.length / 4) })
      };

    } catch (error) {
      console.error(`Error calling ${provider}:`, error);
      throw new Error(`LLM API call failed: ${error.message}`);
    }
  }

  private async executeRAGNode(node: any, input: string, provider: string, model: string, apiKey: string, useMockMode: boolean) {
    if (useMockMode) {
      const mockContext = [
        `Context 1: Information related to "${input}"`,
        `Context 2: Additional details about "${input}"`,
        `Context 3: Background information for "${input}"`
      ];
      
      return {
        output: `Based on the retrieved context: ${mockContext.join(' ')}. The answer to "${input}" is a comprehensive response based on the available information.`,
        tokens: { input: 50, output: 75, total: 125 },
        cost: 0.0025,
        context: mockContext
      };
    }

    const { topK = 3, scoreThreshold = 0.7, indexName = 'default' } = node.data || {};
    
    // Real vector search implementation
    let searchResults = [];
    
    try {
      // Get vector store configuration from node data
      const { vectorStore, embeddings } = node.data || {};
      
      if (vectorStore?.provider === 'pinecone' && vectorStore?.apiKey) {
        searchResults = await this.searchPinecone(input, vectorStore, topK, scoreThreshold);
      } else if (vectorStore?.provider === 'weaviate' && vectorStore?.endpoint) {
        searchResults = await this.searchWeaviate(input, vectorStore, topK, scoreThreshold);
      } else {
        // Fallback to mock results if no real vector store configured
        searchResults = [
          { content: `Relevant information about ${input}`, score: 0.95 },
          { content: `Additional context for ${input}`, score: 0.87 },
          { content: `Background details on ${input}`, score: 0.76 }
        ].slice(0, topK).filter(result => result.score >= scoreThreshold);
      }
    } catch (error) {
      console.warn('Vector search failed, using mock results:', error);
      searchResults = [
        { content: `Fallback context for ${input}`, score: 0.8 }
      ];
    }

    const context = searchResults.map(result => result.content).join('\n\n');
    const ragPrompt = `Context:\n${context}\n\nQuestion: ${input}\n\nAnswer based on the context:`;

    // Call LLM with RAG context
    return await this.executePromptNode(
      { data: { template: ragPrompt, systemPrompt: 'You are a helpful assistant. Answer based only on the provided context.' } },
      ragPrompt,
      provider,
      model,
      apiKey,
      false
    );
  }

  private async executeOutputParserNode(node: any, input: string) {
    const { parserType = 'text', schema } = node.data || {};

    let parsedOutput;
    switch (parserType) {
      case 'json':
        try {
          parsedOutput = JSON.parse(input);
        } catch {
          parsedOutput = { error: 'Invalid JSON', original: input };
        }
        break;
      case 'list':
        parsedOutput = input.split('\n').filter(line => line.trim());
        break;
      case 'structured':
        const lines = input.split('\n');
        parsedOutput = {};
        (schema?.fields || []).forEach((field: any) => {
          const line = lines.find(l => l.toLowerCase().includes(field.name.toLowerCase()));
          if (line) {
            parsedOutput[field.name] = line.split(':')[1]?.trim();
          }
        });
        break;
      default:
        parsedOutput = input;
    }

    return {
      output: parsedOutput,
      tokens: { input: 0, output: 0, total: 0 },
      cost: 0
    };
  }

  private async executeMemoryNode(node: any, input: string) {
    const { operation = 'store', key = 'default' } = node.data || {};

    return {
      output: input,
      tokens: { input: 0, output: 0, total: 0 },
      cost: 0,
      memory: {
        operation,
        key,
        value: input
      }
    };
  }

  private async executeStateTrackerNode(node: any, input: string) {
    const { conditions = [], transitions = [] } = node.data || {};

    return {
      output: input,
      tokens: { input: 0, output: 0, total: 0 },
      cost: 0,
      state: {
        current: 'processed',
        conditions: conditions.length,
        transitions: transitions.length
      }
    };
  }

  private async callOpenAI(apiKey: string, model: string, prompt: string, systemPrompt: string, temperature: number, maxTokens: number) {
    const messages = [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      { role: 'user', content: prompt }
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0].message.content,
      usage: data.usage
    };
  }

  private async callAnthropic(apiKey: string, model: string, prompt: string, systemPrompt: string, temperature: number, maxTokens: number) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        system: systemPrompt || 'You are a helpful assistant.',
        messages: [{ role: 'user', content: prompt }],
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${error}`);
    }

    const data = await response.json();
    return {
      content: data.content[0].text,
      usage: data.usage
    };
  }

  private async callXAI(apiKey: string, model: string, prompt: string, systemPrompt: string, temperature: number, maxTokens: number) {
    const messages = [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      { role: 'user', content: prompt }
    ];

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`xAI API error: ${error}`);
    }

    const data = await response.json();
    return {
      content: data.choices[0].message.content,
      usage: data.usage
    };
  }

  private async searchPinecone(query: string, config: any, topK: number, scoreThreshold: number): Promise<any[]> {
    const response = await fetch(`https://${config.indexName}-${config.projectId}.svc.${config.environment}.pinecone.io/query`, {
      method: 'POST',
      headers: {
        'Api-Key': config.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        vector: await this.getQueryEmbedding(query, config.embeddingApiKey),
        topK,
        includeMetadata: true,
        namespace: config.namespace || ''
      })
    });

    if (!response.ok) {
      throw new Error(`Pinecone query failed: ${response.status}`);
    }

    const data = await response.json();
    return data.matches?.map((match: any) => ({
      content: match.metadata?.text || '',
      score: match.score,
      metadata: match.metadata
    })).filter((result: any) => result.score >= scoreThreshold) || [];
  }

  private async searchWeaviate(query: string, config: any, topK: number, scoreThreshold: number): Promise<any[]> {
    const response = await fetch(`${config.endpoint}/v1/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey ? { 'Authorization': `Bearer ${config.apiKey}` } : {})
      },
      body: JSON.stringify({
        query: `{
          Get {
            ${config.className}(
              nearText: { concepts: ["${query}"] }
              limit: ${topK}
            ) {
              text
              _additional { certainty }
            }
          }
        }`
      })
    });

    if (!response.ok) {
      throw new Error(`Weaviate query failed: ${response.status}`);
    }

    const data = await response.json();
    const results = data.data?.Get?.[config.className] || [];
    
    return results
      .map((item: any) => ({
        content: item.text || '',
        score: item._additional?.certainty || 0,
        metadata: item
      }))
      .filter((result: any) => result.score >= scoreThreshold);
  }

  private async getQueryEmbedding(text: string, apiKey: string): Promise<number[]> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'text-embedding-ada-002',
        input: text
      })
    });

    if (!response.ok) {
      throw new Error(`Embedding generation failed: ${response.status}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  }

  private calculateCost(provider: string, model: string, usage: any): number {
    const rates: any = {
      openai: {
        'gpt-4o': { input: 0.005, output: 0.015 },
        'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
        'gpt-4.1-2025-04-14': { input: 0.01, output: 0.03 }
      },
      anthropic: {
        'claude-opus-4-20250514': { input: 0.015, output: 0.075 },
        'claude-sonnet-4-20250514': { input: 0.003, output: 0.015 },
        'claude-3-5-haiku-20241022': { input: 0.00025, output: 0.00125 }
      },
      xai: {
        'grok-beta': { input: 0.005, output: 0.015 },
        'grok-vision-beta': { input: 0.01, output: 0.03 }
      }
    };

    const rate = rates[provider]?.[model] || { input: 0.001, output: 0.002 };
    return ((usage.input || 0) / 1000 * rate.input) + ((usage.output || 0) / 1000 * rate.output);
  }

  private topologicalSort(nodes: any[], edges: any[]): string[] {
    const graph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    nodes.forEach(node => {
      graph.set(node.id, []);
      inDegree.set(node.id, 0);
    });

    edges.forEach(edge => {
      graph.get(edge.source)?.push(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    });

    const queue: string[] = [];
    const result: string[] = [];

    inDegree.forEach((degree, nodeId) => {
      if (degree === 0) {
        queue.push(nodeId);
      }
    });

    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);

      graph.get(current)?.forEach(neighbor => {
        inDegree.set(neighbor, inDegree.get(neighbor)! - 1);
        if (inDegree.get(neighbor) === 0) {
          queue.push(neighbor);
        }
      });
    }

    if (result.length !== nodes.length) {
      throw new Error('Circular dependency detected in pipeline');
    }

    return result;
  }

  private async broadcastUpdate(sessionId: string, eventType: string, data: any) {
    try {
      await this.supabase.channel(`simulation_${sessionId}`)
        .send({
          type: 'broadcast',
          event: 'simulation_progress',
          payload: {
            type: eventType,
            data,
            timestamp: new Date().toISOString()
          }
        });
    } catch (error) {
      console.error('Failed to broadcast update:', error);
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const request: SimulationRequest = await req.json();
    console.log('[ENHANCED-SIMULATOR] Received request:', {
      sessionId: request.sessionId,
      provider: request.provider,
      model: request.model,
      nodeCount: request.nodes.length,
      useMockMode: request.useMockMode
    });

    const simulator = new EnhancedPipelineSimulator(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Start simulation asynchronously
    simulator.simulatePipeline(request).catch(error => {
      console.error('[ENHANCED-SIMULATOR] Simulation failed:', error);
    });

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Simulation started',
      sessionId: request.sessionId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[ENHANCED-SIMULATOR] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});