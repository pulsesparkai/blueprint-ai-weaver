import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SimulationRequest {
  blueprintId: string;
  inputQuery: string;
  llmProvider: string;
  apiKey: string;
  sessionId: string;
  pipelineConfig: {
    nodes: any[];
    edges: any[];
  };
}

interface LLMMetrics {
  tokensInput: number;
  tokensOutput: number;
  costUsd: number;
  latencyMs: number;
}

// LLM pricing per 1K tokens (approximate)
const LLM_PRICING: { [key: string]: { input: number; output: number } } = {
  'claude-sonnet-4-20250514': { input: 0.003, output: 0.015 },
  'claude-opus-4-20250514': { input: 0.015, output: 0.075 },
  'claude-3-5-haiku-20241022': { input: 0.0008, output: 0.004 },
  'gpt-4o': { input: 0.005, output: 0.015 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
};

async function callLLM(provider: string, apiKey: string, prompt: string, context: any): Promise<{ response: string; metrics: LLMMetrics }> {
  const startTime = Date.now();
  
  try {
    let response: Response;
    let requestBody: any;
    let headers: Record<string, string>;

    // Prepare request based on provider
    if (provider.startsWith('claude')) {
      headers = {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      };
      
      requestBody = {
        model: provider,
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: `Context: ${JSON.stringify(context)}\n\nQuery: ${prompt}`
          }
        ]
      };
      
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });
    } else if (provider.startsWith('gpt')) {
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      };
      
      requestBody = {
        model: provider,
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: `Context: ${JSON.stringify(context)}\n\nQuery: ${prompt}`
          }
        ]
      };
      
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });
    } else {
      throw new Error(`Unsupported LLM provider: ${provider}`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LLM API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const latencyMs = Date.now() - startTime;
    
    let responseText: string;
    let tokensInput: number;
    let tokensOutput: number;

    if (provider.startsWith('claude')) {
      responseText = data.content[0].text;
      tokensInput = data.usage.input_tokens;
      tokensOutput = data.usage.output_tokens;
    } else {
      responseText = data.choices[0].message.content;
      tokensInput = data.usage.prompt_tokens;
      tokensOutput = data.usage.completion_tokens;
    }

    const pricing = LLM_PRICING[provider] || { input: 0.001, output: 0.001 };
    const costUsd = (tokensInput / 1000 * pricing.input) + (tokensOutput / 1000 * pricing.output);

    return {
      response: responseText,
      metrics: {
        tokensInput,
        tokensOutput,
        costUsd,
        latencyMs
      }
    };
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    throw new Error(`LLM call failed: ${error.message}`);
  }
}

async function executeNodeStep(node: any, context: any, llmProvider: string, apiKey: string): Promise<{ output: any; metrics?: LLMMetrics }> {
  switch (node.type) {
    case 'rag-retriever':
      // Mock RAG retrieval - in production, this would query a vector database
      await new Promise(resolve => setTimeout(resolve, 200)); // Simulate latency
      return {
        output: {
          documents: [
            { content: "Retrieved document about " + JSON.stringify(context).substring(0, 50), score: 0.95 },
            { content: "Additional context from knowledge base", score: 0.87 }
          ],
          retrievalQuery: context.query || "default query"
        }
      };

    case 'prompt-template':
      const template = node.data.template || "Process this input: {input}";
      const variables = node.data.variables || ['input'];
      
      let processedTemplate = template;
      variables.forEach((variable: string) => {
        const value = context[variable] || context.query || `[${variable}]`;
        processedTemplate = processedTemplate.replace(`{${variable}}`, value);
      });
      
      // If template references context documents, include them
      if (template.includes('{documents}') && context.documents) {
        const docs = context.documents.map((d: any) => d.content).join('\n');
        processedTemplate = processedTemplate.replace('{documents}', docs);
      }

      return {
        output: {
          prompt: processedTemplate,
          variables: variables,
          originalTemplate: template
        }
      };

    case 'memory-store':
      // Mock memory storage
      await new Promise(resolve => setTimeout(resolve, 100));
      return {
        output: {
          stored: true,
          memoryKey: `memory_${Date.now()}`,
          context: context,
          storeType: node.data.storeType || 'conversation'
        }
      };

    case 'state-tracker':
      return {
        output: {
          currentState: context,
          stateHistory: [context], // In production, this would track actual history
          trackingType: node.data.trackingType || 'conversation',
          timestamp: new Date().toISOString()
        }
      };

    case 'output-parser':
      // For output parser, we might need to call the LLM to process the final output
      if (context.prompt) {
        const llmResult = await callLLM(llmProvider, apiKey, context.prompt, context);
        
        const parserType = node.data.parserType || 'text';
        let parsedOutput = llmResult.response;
        
        if (parserType === 'json') {
          try {
            // Try to extract JSON from the response
            const jsonMatch = llmResult.response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              parsedOutput = JSON.parse(jsonMatch[0]);
            }
          } catch (e) {
            // If parsing fails, return as structured text
            parsedOutput = { content: llmResult.response, format: 'text' };
          }
        }

        return {
          output: {
            parsed: parsedOutput,
            original: llmResult.response,
            parserType: parserType
          },
          metrics: llmResult.metrics
        };
      }
      
      return {
        output: {
          parsed: context,
          parserType: node.data.parserType || 'text'
        }
      };

    default:
      throw new Error(`Unknown node type: ${node.type}`);
  }
}

async function broadcastUpdate(channel: any, type: string, data: any) {
  try {
    await channel.send({
      type: 'broadcast',
      event: 'simulation_update',
      payload: { type, data }
    });
  } catch (error) {
    console.error('Broadcast error:', error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization required');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    const { 
      blueprintId, 
      inputQuery, 
      llmProvider, 
      apiKey, 
      sessionId, 
      pipelineConfig 
    }: SimulationRequest = await req.json();

    // Set up realtime channel
    const channel = supabaseClient.channel(`simulation_${sessionId}`);
    
    // Create simulation log entry
    const { data: simulationLog, error: logError } = await supabaseClient
      .from('simulation_logs')
      .insert({
        blueprint_id: blueprintId,
        user_id: user.id,
        session_id: sessionId,
        input_query: inputQuery,
        llm_provider: llmProvider,
        pipeline_config: pipelineConfig,
        status: 'running'
      })
      .select()
      .single();

    if (logError) throw logError;

    await broadcastUpdate(channel, 'started', { simulationId: simulationLog.id });

    // Execute pipeline
    const { nodes, edges } = pipelineConfig;
    const executionSteps: any[] = [];
    const contextWindow: any[] = [];
    const totalMetrics = {
      totalTokens: 0,
      totalCost: 0,
      executionTime: 0
    };

    // Build execution order (topological sort)
    const entryNodes = nodes.filter(node => 
      !edges.some(edge => edge.target === node.id)
    );

    if (entryNodes.length === 0) {
      throw new Error('No entry point found in pipeline');
    }

    const executed = new Set<string>();
    const nodeOutputs: { [nodeId: string]: any } = {};
    let stepProgress = 0;
    
    // Initial context from user input
    let currentContext = { query: inputQuery };
    contextWindow.push({ step: 'input', context: currentContext });

    async function executeNodeAndDependents(nodeId: string): Promise<void> {
      if (executed.has(nodeId)) return;

      // Get and execute dependencies first
      const incomingEdges = edges.filter(edge => edge.target === nodeId);
      for (const edge of incomingEdges) {
        await executeNodeAndDependents(edge.source);
      }

      // Merge inputs from dependencies
      const nodeInputs = incomingEdges.reduce((acc, edge) => {
        const sourceOutput = nodeOutputs[edge.source];
        return { ...acc, ...sourceOutput };
      }, incomingEdges.length === 0 ? currentContext : {});

      const node = nodes.find(n => n.id === nodeId);
      if (!node) return;

      // Broadcast step start
      await broadcastUpdate(channel, 'step_update', {
        stepName: node.data.label || node.type,
        status: 'running'
      });

      try {
        const stepStartTime = Date.now();
        const result = await executeNodeStep(node, nodeInputs, llmProvider, apiKey);
        const stepDuration = Date.now() - stepStartTime;

        // Store metrics if available
        if (result.metrics) {
          await supabaseClient
            .from('simulation_metrics')
            .insert({
              simulation_id: simulationLog.id,
              step_name: node.data.label || node.type,
              tokens_input: result.metrics.tokensInput,
              tokens_output: result.metrics.tokensOutput,
              cost_usd: result.metrics.costUsd,
              latency_ms: result.metrics.latencyMs,
              model_name: llmProvider
            });

          totalMetrics.totalTokens += result.metrics.tokensInput + result.metrics.tokensOutput;
          totalMetrics.totalCost += result.metrics.costUsd;
        }

        totalMetrics.executionTime += stepDuration;
        nodeOutputs[nodeId] = result.output;
        currentContext = { ...currentContext, ...result.output };
        
        contextWindow.push({
          step: node.data.label || node.type,
          context: result.output,
          metrics: result.metrics
        });

        executionSteps.push({
          stepName: node.data.label || node.type,
          status: 'completed',
          output: result.output,
          metrics: result.metrics,
          duration: stepDuration
        });

        // Broadcast step completion
        await broadcastUpdate(channel, 'step_update', {
          stepName: node.data.label || node.type,
          status: 'completed',
          output: result.output,
          metrics: result.metrics
        });

        stepProgress = (executed.size / nodes.length) * 100;
        await broadcastUpdate(channel, 'progress', { progress: stepProgress });

        executed.add(nodeId);
      } catch (error: any) {
        executionSteps.push({
          stepName: node.data.label || node.type,
          status: 'error',
          error: error.message
        });

        await broadcastUpdate(channel, 'step_update', {
          stepName: node.data.label || node.type,
          status: 'error',
          error: error.message
        });

        throw error;
      }
    }

    // Execute all entry nodes
    for (const entryNode of entryNodes) {
      await executeNodeAndDependents(entryNode.id);
    }

    // Get final output (from last executed node or parser)
    const outputNodes = nodes.filter(node => 
      !edges.some(edge => edge.source === node.id)
    );
    const finalOutput = outputNodes.length > 0 ? 
      nodeOutputs[outputNodes[0].id] : 
      currentContext;

    // Complete simulation
    await supabaseClient.rpc('complete_simulation', {
      sim_id: simulationLog.id,
      final_result: typeof finalOutput === 'string' ? finalOutput : JSON.stringify(finalOutput)
    });

    // Update with final metrics
    await supabaseClient
      .from('simulation_logs')
      .update({
        execution_steps: executionSteps,
        metrics: totalMetrics,
        context_window: contextWindow
      })
      .eq('id', simulationLog.id);

    // Broadcast completion
    await broadcastUpdate(channel, 'completed', {
      status: 'completed',
      finalOutput: typeof finalOutput === 'string' ? finalOutput : JSON.stringify(finalOutput),
      totalMetrics,
      contextWindow: contextWindow
    });

    return new Response(JSON.stringify({
      success: true,
      simulationId: simulationLog.id,
      finalOutput,
      totalMetrics,
      contextWindow: contextWindow
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Pipeline simulation error:', error);
    
    // Broadcast error if channel available
    try {
      const channel = supabaseClient.channel(`simulation_${Date.now()}`);
      await broadcastUpdate(channel, 'error', { error: error.message });
    } catch (e) {
      console.error('Error broadcasting failure:', e);
    }

    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});