import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';
import { ChatOpenAI } from "https://esm.sh/langchain@0.1.25/chat_models/openai";
import { ChatAnthropic } from "https://esm.sh/langchain@0.1.25/chat_models/anthropic";
import { PromptTemplate } from "https://esm.sh/langchain@0.1.25/prompts";
import { LLMChain } from "https://esm.sh/langchain@0.1.25/chains";
import { OpenAIEmbeddings } from "https://esm.sh/langchain@0.1.25/embeddings/openai";
import { RunnableSequence, RunnablePassthrough } from "https://esm.sh/langchain@0.1.25/schema/runnable";
import { StringOutputParser } from "https://esm.sh/langchain@0.1.25/schema/output_parser";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BlueprintExecutionRequest {
  blueprintId: string;
  input: string;
  userId: string;
}

interface ExecutionStep {
  stepId: string;
  nodeType: string;
  input: any;
  output: any;
  executionTime: number;
  tokens?: any;
  error?: string;
}

class LangChainBlueprintExecutor {
  private supabase: any;

  constructor(supabaseUrl: string, supabaseAnonKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseAnonKey);
  }

  async executeBlueprint(request: BlueprintExecutionRequest): Promise<any> {
    const { blueprintId, input, userId } = request;

    // Fetch blueprint data
    const { data: blueprint, error: blueprintError } = await this.supabase
      .from('blueprints')
      .select('*')
      .eq('id', blueprintId)
      .single();

    if (blueprintError || !blueprint) {
      throw new Error(`Blueprint not found: ${blueprintError?.message}`);
    }

    // Get user's integrations and API keys
    const { data: integrations } = await this.supabase
      .from('integrations')
      .select('*')
      .eq('user_id', userId);

    const apiKeys: any = {};
    for (const integration of integrations || []) {
      apiKeys[integration.type] = integration.credential_refs?.api_key;
    }

    const nodes = blueprint.nodes || [];
    const edges = blueprint.edges || [];
    const executionSteps: ExecutionStep[] = [];
    
    // Create simulation log
    const { data: simulationLog, error: logError } = await this.supabase
      .from('simulation_logs')
      .insert({
        blueprint_id: blueprintId,
        user_id: userId,
        session_id: crypto.randomUUID(),
        input_query: input,
        llm_provider: this.detectPrimaryLLMProvider(nodes),
        pipeline_config: { nodes, edges },
        status: 'running'
      })
      .select()
      .single();

    if (logError) {
      console.error('Failed to create simulation log:', logError);
    }

    try {
      const result = await this.executeLangChainSequence(nodes, edges, input, apiKeys, executionSteps);
      
      // Update simulation log with results
      if (simulationLog) {
        await this.supabase
          .from('simulation_logs')
          .update({
            status: 'completed',
            final_output: result.output,
            execution_steps: executionSteps,
            completed_at: new Date().toISOString(),
            metrics: {
              totalSteps: executionSteps.length,
              totalTokens: executionSteps.reduce((sum, step) => sum + (step.tokens?.total || 0), 0),
              totalCost: this.calculateTotalCost(executionSteps)
            }
          })
          .eq('id', simulationLog.id);
      }

      return {
        success: true,
        output: result.output,
        executionSteps,
        simulationId: simulationLog?.id,
        metrics: {
          totalSteps: executionSteps.length,
          totalTime: executionSteps.reduce((sum, step) => sum + step.executionTime, 0),
          totalTokens: executionSteps.reduce((sum, step) => sum + (step.tokens?.total || 0), 0),
          totalCost: this.calculateTotalCost(executionSteps)
        }
      };

    } catch (error) {
      // Update simulation log with error
      if (simulationLog) {
        await this.supabase
          .from('simulation_logs')
          .update({
            status: 'error',
            error_message: error.message,
            execution_steps: executionSteps,
            completed_at: new Date().toISOString()
          })
          .eq('id', simulationLog.id);
      }

      throw error;
    }
  }

  private async executeLangChainSequence(
    nodes: any[], 
    edges: any[], 
    input: string, 
    apiKeys: any,
    executionSteps: ExecutionStep[]
  ): Promise<any> {
    // Sort nodes topologically
    const sortedNodes = this.topologicalSort(nodes, edges);
    let currentInput = input;

    for (const nodeId of sortedNodes) {
      const node = nodes.find(n => n.id === nodeId);
      if (!node) continue;

      const startTime = Date.now();
      const stepId = crypto.randomUUID();

      try {
        let stepResult;

        switch (node.type) {
          case 'promptTemplate':
            stepResult = await this.executePromptTemplateNode(node, currentInput, apiKeys);
            break;
          case 'ragRetriever':
            stepResult = await this.executeRAGNode(node, currentInput, apiKeys);
            break;
          case 'outputParser':
            stepResult = await this.executeOutputParserNode(node, currentInput);
            break;
          case 'memoryStore':
            stepResult = await this.executeMemoryNode(node, currentInput);
            break;
          case 'stateTracker':
            stepResult = await this.executeStateTrackerNode(node, currentInput);
            break;
          default:
            stepResult = { output: currentInput, tokens: {} };
        }

        const executionTime = Date.now() - startTime;
        
        executionSteps.push({
          stepId,
          nodeType: node.type,
          input: currentInput,
          output: stepResult.output,
          executionTime,
          tokens: stepResult.tokens
        });

        currentInput = stepResult.output;

      } catch (error) {
        const executionTime = Date.now() - startTime;
        
        executionSteps.push({
          stepId,
          nodeType: node.type,
          input: currentInput,
          output: null,
          executionTime,
          error: error.message
        });

        throw error;
      }
    }

    return { output: currentInput };
  }

  private async executePromptTemplateNode(node: any, input: string, apiKeys: any): Promise<any> {
    const { provider, model, temperature, maxTokens, template, variables } = node.data;
    
    if (!apiKeys[provider]) {
      throw new Error(`API key not found for provider: ${provider}`);
    }

    let llm;
    switch (provider) {
      case 'openai':
        llm = new ChatOpenAI({
          openAIApiKey: apiKeys.openai,
          modelName: model || 'gpt-4o-mini',
          temperature: temperature || 0.7,
          maxTokens: maxTokens || 1000,
        });
        break;
      case 'anthropic':
        llm = new ChatAnthropic({
          anthropicApiKey: apiKeys.anthropic,
          modelName: model || 'claude-3-5-sonnet-20241022',
          temperature: temperature || 0.7,
          maxTokens: maxTokens || 1000,
        });
        break;
      default:
        throw new Error(`Unsupported LLM provider: ${provider}`);
    }

    const promptTemplate = PromptTemplate.fromTemplate(template || '{input}');
    
    // Prepare variables
    const templateVars: any = { input };
    for (const variable of variables || []) {
      templateVars[variable.name] = variable.value || input;
    }

    const chain = RunnableSequence.from([
      promptTemplate,
      llm,
      new StringOutputParser()
    ]);

    const result = await chain.invoke(templateVars);

    return {
      output: result,
      tokens: {
        input: this.estimateTokens(template + input),
        output: this.estimateTokens(result),
        total: this.estimateTokens(template + input + result)
      }
    };
  }

  private async executeRAGNode(node: any, input: string, apiKeys: any): Promise<any> {
    const { vectorStore, llm: llmConfig, topK, scoreThreshold } = node.data;
    
    if (!apiKeys.openai) {
      throw new Error('OpenAI API key required for embeddings');
    }

    // For demo purposes, simulate vector search results
    const mockResults = [
      { content: `Context information related to: ${input}`, score: 0.95 },
      { content: `Additional context about the query: ${input}`, score: 0.87 },
      { content: `Background information for: ${input}`, score: 0.76 }
    ].slice(0, topK || 3);

    const context = mockResults
      .filter(result => !scoreThreshold || result.score >= scoreThreshold)
      .map(result => result.content)
      .join('\n\n');

    // Create RAG prompt
    const ragTemplate = `Context:\n{context}\n\nQuestion: {question}\n\nAnswer based on the context:`;
    
    let llm;
    switch (llmConfig.provider) {
      case 'openai':
        llm = new ChatOpenAI({
          openAIApiKey: apiKeys.openai,
          modelName: llmConfig.model || 'gpt-4o-mini',
          temperature: llmConfig.temperature || 0.7,
          maxTokens: llmConfig.maxTokens || 1000,
        });
        break;
      case 'anthropic':
        llm = new ChatAnthropic({
          anthropicApiKey: apiKeys.anthropic,
          modelName: llmConfig.model || 'claude-3-5-sonnet-20241022',
          temperature: llmConfig.temperature || 0.7,
          maxTokens: llmConfig.maxTokens || 1000,
        });
        break;
      default:
        throw new Error(`Unsupported LLM provider: ${llmConfig.provider}`);
    }

    const promptTemplate = PromptTemplate.fromTemplate(ragTemplate);
    const chain = RunnableSequence.from([
      promptTemplate,
      llm,
      new StringOutputParser()
    ]);

    const result = await chain.invoke({
      context,
      question: input
    });

    return {
      output: result,
      context: mockResults,
      tokens: {
        input: this.estimateTokens(ragTemplate + context + input),
        output: this.estimateTokens(result),
        total: this.estimateTokens(ragTemplate + context + input + result)
      }
    };
  }

  private async executeOutputParserNode(node: any, input: string): Promise<any> {
    const { parserType, schema } = node.data;

    let parsedOutput;
    switch (parserType) {
      case 'json':
        try {
          parsedOutput = JSON.parse(input);
        } catch (error) {
          throw new Error(`Failed to parse JSON: ${error.message}`);
        }
        break;
      case 'list':
        parsedOutput = input.split('\n').filter(line => line.trim() !== '');
        break;
      case 'structured':
        const lines = input.split('\n');
        parsedOutput = {};
        for (const field of schema?.fields || []) {
          const line = lines.find(l => l.toLowerCase().includes(field.name.toLowerCase()));
          if (line) {
            parsedOutput[field.name] = line.split(':')[1]?.trim();
          }
        }
        break;
      default:
        parsedOutput = input;
    }

    return {
      output: parsedOutput,
      tokens: {}
    };
  }

  private async executeMemoryNode(node: any, input: string): Promise<any> {
    // For demo purposes, simulate memory operations
    const { operation, key } = node.data;
    
    return {
      output: input,
      tokens: {},
      memory: {
        operation,
        key,
        value: input
      }
    };
  }

  private async executeStateTrackerNode(node: any, input: string): Promise<any> {
    // For demo purposes, simulate state tracking
    const { conditions, transitions } = node.data;
    
    return {
      output: input,
      tokens: {},
      state: {
        current: 'processed',
        transitions: transitions || []
      }
    };
  }

  private topologicalSort(nodes: any[], edges: any[]): string[] {
    const graph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    // Initialize
    nodes.forEach(node => {
      graph.set(node.id, []);
      inDegree.set(node.id, 0);
    });

    // Build graph
    edges.forEach(edge => {
      graph.get(edge.source)?.push(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    });

    // Topological sort
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
      throw new Error('Circular dependency detected');
    }

    return result;
  }

  private detectPrimaryLLMProvider(nodes: any[]): string {
    for (const node of nodes) {
      if (node.type === 'promptTemplate' || node.type === 'ragRetriever') {
        const provider = node.data?.provider || node.data?.llm?.provider;
        if (provider) return provider;
      }
    }
    return 'openai'; // default
  }

  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  private calculateTotalCost(steps: ExecutionStep[]): number {
    // Simplified cost calculation
    return steps.reduce((total, step) => {
      const tokens = step.tokens?.total || 0;
      const costPerToken = 0.00002; // Rough estimate
      return total + (tokens * costPerToken);
    }, 0);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const request: BlueprintExecutionRequest = await req.json();

    if (!request.blueprintId || !request.input || !request.userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const executor = new LangChainBlueprintExecutor(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );

    const result = await executor.executeBlueprint(request);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in langchain-blueprint-executor:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});