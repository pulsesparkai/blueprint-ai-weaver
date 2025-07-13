import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LLMRequest {
  integrationId: string;
  model?: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  stream?: boolean;
}

// Token counting utilities
const TOKEN_COSTS = {
  'gpt-4.1-2025-04-14': { input: 0.00003, output: 0.00006 },
  'gpt-4.1-mini-2025-04-14': { input: 0.00000015, output: 0.0000006 },
  'o3-2025-04-16': { input: 0.000015, output: 0.00006 },
  'o4-mini-2025-04-16': { input: 0.0000003, output: 0.0000012 },
  'claude-opus-4-20250514': { input: 0.000015, output: 0.000075 },
  'claude-sonnet-4-20250514': { input: 0.000003, output: 0.000015 },
  'claude-3-5-haiku-20241022': { input: 0.00000025, output: 0.00000125 }
};

function estimateTokens(text: string): number {
  // Rough estimation: ~4 characters per token
  return Math.ceil(text.length / 4);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const request: LLMRequest = await req.json();
    const startTime = Date.now();

    // Get integration details
    const { data: integration, error: integrationError } = await supabaseClient
      .from('integrations')
      .select('*')
      .eq('id', request.integrationId)
      .eq('user_id', user.id)
      .single();

    if (integrationError || !integration) {
      throw new Error('Integration not found');
    }

    const credentials = JSON.parse(integration.credential_refs);
    const config = integration.config;
    
    // Use provided model or default from config
    const model = request.model || config.model;
    const temperature = request.temperature || config.temperature || 0.7;
    const maxTokens = request.maxTokens || config.maxTokens || 4000;

    let response: Response;
    let usage: any = {};
    let totalCost = 0;

    if (integration.type === 'openai') {
      response = await processOpenAI({
        credentials,
        model,
        prompt: request.prompt,
        systemPrompt: request.systemPrompt,
        temperature,
        maxTokens,
        stream: request.stream
      });
    } else if (integration.type === 'anthropic') {
      response = await processAnthropic({
        credentials,
        model,
        prompt: request.prompt,
        systemPrompt: request.systemPrompt,
        temperature,
        maxTokens,
        stream: request.stream
      });
    } else {
      throw new Error(`Unsupported LLM provider: ${integration.type}`);
    }

    const responseData = await response.json();
    const responseTime = Date.now() - startTime;

    // Extract usage and calculate cost
    if (integration.type === 'openai' && responseData.usage) {
      usage = responseData.usage;
      const costs = TOKEN_COSTS[model as keyof typeof TOKEN_COSTS];
      if (costs) {
        totalCost = (usage.prompt_tokens * costs.input) + (usage.completion_tokens * costs.output);
      }
    } else if (integration.type === 'anthropic') {
      // Estimate tokens for Anthropic
      const inputTokens = estimateTokens(request.prompt + (request.systemPrompt || ''));
      const outputTokens = estimateTokens(responseData.content?.[0]?.text || '');
      usage = { prompt_tokens: inputTokens, completion_tokens: outputTokens, total_tokens: inputTokens + outputTokens };
      
      const costs = TOKEN_COSTS[model as keyof typeof TOKEN_COSTS];
      if (costs) {
        totalCost = (inputTokens * costs.input) + (outputTokens * costs.output);
      }
    }

    // Log usage
    await supabaseClient
      .from('integration_usage_logs')
      .insert({
        integration_id: request.integrationId,
        user_id: user.id,
        operation_type: 'llm_completion',
        success: response.ok,
        response_time_ms: responseTime,
        request_count: 1,
        error_message: response.ok ? null : responseData.error?.message
      });

    // Return enhanced response with cost tracking
    return new Response(
      JSON.stringify({
        success: response.ok,
        data: responseData,
        metadata: {
          model,
          usage,
          cost: totalCost,
          responseTime,
          provider: integration.type
        }
      }),
      {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('LLM processing error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function processOpenAI(params: any): Promise<Response> {
  const messages = [];
  if (params.systemPrompt) {
    messages.push({ role: 'system', content: params.systemPrompt });
  }
  messages.push({ role: 'user', content: params.prompt });

  return await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${params.credentials.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: params.model,
      messages,
      temperature: params.temperature,
      max_tokens: params.maxTokens,
      stream: params.stream || false
    }),
  });
}

async function processAnthropic(params: any): Promise<Response> {
  const requestBody: any = {
    model: params.model,
    max_tokens: params.maxTokens,
    temperature: params.temperature,
    messages: [{ role: 'user', content: params.prompt }]
  };

  if (params.systemPrompt) {
    requestBody.system = params.systemPrompt;
  }

  return await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': params.credentials.apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify(requestBody),
  });
}