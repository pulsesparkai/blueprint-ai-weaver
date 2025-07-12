import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ComparisonRequest {
  sessionId: string;
  input: string;
  provider: 'openai' | 'anthropic' | 'xai';
  model: string;
  apiKey: string;
  useMockMode: boolean;
  blueprintIds: string[];
  mode: 'comparison';
}

interface ComparisonResult {
  blueprintId: string;
  blueprintName: string;
  status: 'running' | 'completed' | 'error';
  finalOutput?: string;
  totalMetrics: {
    totalTokens: number;
    totalCost: number;
    executionTime: number;
    averageRelevance?: number;
  };
  steps: Array<{
    stepName: string;
    status: string;
    metrics?: {
      tokensInput: number;
      tokensOutput: number;
      latencyMs: number;
      costUsd: number;
      relevanceScore?: number;
    };
    output?: any;
    error?: string;
  }>;
}

class PipelineComparator {
  private supabase: any;

  constructor(supabaseUrl: string, supabaseServiceKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  async runComparison(request: ComparisonRequest): Promise<ComparisonResult[]> {
    const { sessionId, input, provider, model, apiKey, useMockMode, blueprintIds } = request;
    
    console.log(`[COMPARISON] Starting comparison ${sessionId} with ${blueprintIds.length} blueprints`);

    // Fetch blueprint details
    const blueprints = await this.fetchBlueprints(blueprintIds);
    const results: ComparisonResult[] = [];

    // Run simulations in parallel
    const simulationPromises = blueprints.map(blueprint => 
      this.simulateBlueprint(blueprint, input, provider, model, apiKey, useMockMode, sessionId)
    );

    try {
      const simulationResults = await Promise.allSettled(simulationPromises);
      
      simulationResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error(`[COMPARISON] Blueprint ${blueprintIds[index]} failed:`, result.reason);
          results.push({
            blueprintId: blueprintIds[index],
            blueprintName: blueprints[index]?.name || 'Unknown Blueprint',
            status: 'error',
            totalMetrics: {
              totalTokens: 0,
              totalCost: 0,
              executionTime: 0
            },
            steps: [{
              stepName: 'Error',
              status: 'error',
              error: result.reason?.message || 'Unknown error'
            }]
          });
        }
      });

      // Broadcast comparison completed
      await this.broadcastComparisonUpdate(sessionId, 'comparison_completed', { results });
      
      return results;
    } catch (error) {
      console.error('[COMPARISON] Error in comparison:', error);
      throw error;
    }
  }

  private async fetchBlueprints(blueprintIds: string[]) {
    const blueprints = [];
    
    for (const id of blueprintIds) {
      try {
        // Try user blueprints first
        let { data: blueprint } = await this.supabase
          .from('blueprints')
          .select('id, title, nodes, edges')
          .eq('id', id)
          .single();

        // If not found, try templates
        if (!blueprint) {
          const { data: template } = await this.supabase
            .from('blueprint_templates')
            .select('id, name, nodes, edges')
            .eq('id', id)
            .single();
          
          if (template) {
            blueprint = {
              id: template.id,
              title: `[Template] ${template.name}`,
              nodes: template.nodes,
              edges: template.edges
            };
          }
        }

        if (blueprint) {
          blueprints.push({
            id: blueprint.id,
            name: blueprint.title,
            nodes: blueprint.nodes,
            edges: blueprint.edges
          });
        }
      } catch (error) {
        console.error(`[COMPARISON] Error fetching blueprint ${id}:`, error);
      }
    }
    
    return blueprints;
  }

  private async simulateBlueprint(
    blueprint: any,
    input: string,
    provider: string,
    model: string,
    apiKey: string,
    useMockMode: boolean,
    sessionId: string
  ): Promise<ComparisonResult> {
    const startTime = Date.now();
    console.log(`[COMPARISON] Simulating blueprint: ${blueprint.name}`);

    try {
      const steps = [];
      let totalTokens = 0;
      let totalCost = 0;
      let finalOutput = '';
      let context = input;

      // Simulate each node in the blueprint
      for (const node of blueprint.nodes || []) {
        const stepStartTime = Date.now();
        const stepResult = await this.simulateNode(node, context, provider, model, apiKey, useMockMode);
        const stepEndTime = Date.now();

        const stepMetrics = {
          tokensInput: stepResult.tokensInput || 0,
          tokensOutput: stepResult.tokensOutput || 0,
          latencyMs: stepEndTime - stepStartTime,
          costUsd: stepResult.cost || 0,
          relevanceScore: this.calculateRelevanceScore(stepResult.output, context)
        };

        totalTokens += stepMetrics.tokensInput + stepMetrics.tokensOutput;
        totalCost += stepMetrics.costUsd;

        steps.push({
          stepName: node.data?.label || node.type || 'Unknown Step',
          status: 'completed',
          metrics: stepMetrics,
          output: stepResult.output
        });

        // Update context for next step
        context = stepResult.output || context;
        finalOutput = stepResult.output || finalOutput;

        // Broadcast step update
        await this.broadcastComparisonUpdate(sessionId, 'comparison_step', {
          blueprintId: blueprint.id,
          blueprintName: blueprint.name,
          stepName: node.data?.label || node.type,
          progress: (steps.length / blueprint.nodes.length) * 100
        });
      }

      const totalTime = Date.now() - startTime;
      const averageRelevance = steps.reduce((sum, step) => 
        sum + (step.metrics?.relevanceScore || 0), 0) / steps.length;

      return {
        blueprintId: blueprint.id,
        blueprintName: blueprint.name,
        status: 'completed',
        finalOutput,
        totalMetrics: {
          totalTokens,
          totalCost,
          executionTime: totalTime,
          averageRelevance
        },
        steps
      };

    } catch (error) {
      console.error(`[COMPARISON] Error simulating blueprint ${blueprint.name}:`, error);
      throw error;
    }
  }

  private async simulateNode(
    node: any,
    input: string,
    provider: string,
    model: string,
    apiKey: string,
    useMockMode: boolean
  ): Promise<any> {
    if (useMockMode) {
      return this.simulateNodeMock(node, input);
    }

    const nodeType = node.type;
    
    switch (nodeType) {
      case 'inputNode':
        return { output: input, tokensInput: 0, tokensOutput: 0, cost: 0 };

      case 'ragRetrieverNode':
        return this.simulateRAGRetriever(node, input);

      case 'llmNode':
      case 'promptTemplateNode':
        return this.simulateLLMCall(node, input, provider, model, apiKey);

      case 'processorNode':
        return this.simulateProcessor(node, input);

      case 'outputNode':
        return { output: input, tokensInput: 0, tokensOutput: 0, cost: 0 };

      default:
        return { output: input, tokensInput: 0, tokensOutput: 0, cost: 0 };
    }
  }

  private simulateNodeMock(node: any, input: string): any {
    const nodeType = node.type;
    const mockTokens = Math.floor(Math.random() * 500) + 50;
    
    const mockOutputs = {
      'ragRetrieverNode': `Mock retrieved context for: ${input}`,
      'llmNode': `Mock LLM response for: ${input}`,
      'promptTemplateNode': `Mock prompt template output for: ${input}`,
      'processorNode': `Mock processed: ${input}`,
      'outputNode': input,
      'inputNode': input
    };

    return {
      output: mockOutputs[nodeType as keyof typeof mockOutputs] || `Mock output for ${nodeType}: ${input}`,
      tokensInput: mockTokens,
      tokensOutput: mockTokens,
      cost: mockTokens * 0.00002 // Mock cost calculation
    };
  }

  private async simulateRAGRetriever(node: any, input: string): Promise<any> {
    // Mock RAG retrieval
    const vectorStore = node.data?.vectorStore || 'pinecone';
    const topK = node.data?.topK || 5;
    
    return {
      output: `Retrieved ${topK} documents from ${vectorStore} for query: ${input}`,
      tokensInput: input.length / 4,
      tokensOutput: topK * 100,
      cost: 0.0001
    };
  }

  private async simulateLLMCall(
    node: any,
    input: string,
    provider: string,
    model: string,
    apiKey: string
  ): Promise<any> {
    try {
      const prompt = node.data?.template || node.data?.prompt || input;
      
      let apiUrl = '';
      let headers = {};
      let body = {};

      switch (provider) {
        case 'openai':
          apiUrl = 'https://api.openai.com/v1/chat/completions';
          headers = {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          };
          body = {
            model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 150,
            temperature: 0.7
          };
          break;

        case 'anthropic':
          apiUrl = 'https://api.anthropic.com/v1/messages';
          headers = {
            'x-api-key': apiKey,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01'
          };
          body = {
            model,
            max_tokens: 150,
            messages: [{ role: 'user', content: prompt }]
          };
          break;

        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      let output = '';
      let tokensInput = 0;
      let tokensOutput = 0;
      let cost = 0;

      if (provider === 'openai') {
        output = data.choices[0]?.message?.content || '';
        tokensInput = data.usage?.prompt_tokens || 0;
        tokensOutput = data.usage?.completion_tokens || 0;
        cost = (tokensInput * 0.00003) + (tokensOutput * 0.00006); // Rough GPT-4o-mini pricing
      } else if (provider === 'anthropic') {
        output = data.content[0]?.text || '';
        tokensInput = data.usage?.input_tokens || 0;
        tokensOutput = data.usage?.output_tokens || 0;
        cost = (tokensInput * 0.00003) + (tokensOutput * 0.00015); // Rough Claude pricing
      }

      return { output, tokensInput, tokensOutput, cost };

    } catch (error) {
      console.error('[COMPARISON] LLM call error:', error);
      throw error;
    }
  }

  private async simulateProcessor(node: any, input: string): Promise<any> {
    // Simulate processing steps like reranking, filtering, etc.
    const processorType = node.data?.type || 'generic';
    
    return {
      output: `Processed with ${processorType}: ${input}`,
      tokensInput: 0,
      tokensOutput: 0,
      cost: 0
    };
  }

  private calculateRelevanceScore(output: string, context: string): number {
    // Simple relevance scoring based on common words
    if (!output || !context) return 0;
    
    const outputWords = output.toLowerCase().split(/\s+/);
    const contextWords = context.toLowerCase().split(/\s+/);
    
    const commonWords = outputWords.filter(word => 
      contextWords.includes(word) && word.length > 3
    );
    
    return Math.min(commonWords.length / Math.max(contextWords.length, 1), 1.0);
  }

  private async broadcastComparisonUpdate(sessionId: string, type: string, data: any) {
    try {
      await this.supabase.channel(`simulation_${sessionId}`)
        .send({
          type: 'broadcast',
          event: 'comparison_progress',
          payload: { type, data }
        });
    } catch (error) {
      console.error('[COMPARISON] Broadcast error:', error);
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const comparator = new PipelineComparator(supabaseUrl, supabaseServiceKey);
    const request: ComparisonRequest = await req.json();
    
    console.log(`[COMPARISON] Received comparison request for session ${request.sessionId}`);

    // Validate request
    if (!request.blueprintIds || request.blueprintIds.length === 0) {
      throw new Error('No blueprints specified for comparison');
    }

    if (request.blueprintIds.length > 10) {
      throw new Error('Too many blueprints for comparison (max 10)');
    }

    // Run the comparison
    const results = await comparator.runComparison(request);
    
    console.log(`[COMPARISON] Completed comparison for session ${request.sessionId}`);
    
    return new Response(JSON.stringify({ 
      success: true, 
      results,
      summary: {
        totalBlueprints: results.length,
        completedSuccessfully: results.filter(r => r.status === 'completed').length,
        averageExecutionTime: results.reduce((sum, r) => sum + r.totalMetrics.executionTime, 0) / results.length,
        totalCost: results.reduce((sum, r) => sum + r.totalMetrics.totalCost, 0)
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[COMPARISON] Error in pipeline comparison:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      details: error.toString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});