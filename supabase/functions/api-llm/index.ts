import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('LLM API function called');

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    const { model, prompt, temperature = 0.7, max_tokens = 1000, integration_id } = await req.json();

    if (!prompt) {
      throw new Error('Prompt is required');
    }

    if (!integration_id) {
      throw new Error('Integration ID is required');
    }

    console.log(`Processing LLM request for user: ${user.id}, model: ${model}`);

    // Get integration and credentials
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('*')
      .eq('id', integration_id)
      .eq('user_id', user.id)
      .single();

    if (integrationError || !integration) {
      throw new Error('Integration not found or access denied');
    }

    if (integration.status !== 'active') {
      throw new Error('Integration is not active');
    }

    // Get API key from credentials
    const credentialRef = integration.credential_refs?.api_key;
    if (!credentialRef) {
      throw new Error('No API key configured for this integration');
    }

    const { data: credentials, error: credError } = await supabase
      .from('integration_credentials')
      .select('encrypted_data')
      .eq('credential_ref', credentialRef)
      .eq('user_id', user.id)
      .single();

    if (credError || !credentials) {
      throw new Error('API credentials not found');
    }

    // For demo purposes, we'll assume the encrypted_data contains the actual API key
    // In production, you'd decrypt this properly
    const apiKey = credentials.encrypted_data;

    let response;
    let tokensUsed = 0;

    // Handle different LLM providers
    if (integration.type === 'openai') {
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: prompt }
          ],
          temperature: temperature,
          max_tokens: max_tokens,
        }),
      });

      if (!openaiResponse.ok) {
        const errorText = await openaiResponse.text();
        throw new Error(`OpenAI API error: ${openaiResponse.status} - ${errorText}`);
      }

      const data = await openaiResponse.json();
      response = data.choices[0]?.message?.content;
      tokensUsed = data.usage?.total_tokens || 0;

    } else if (integration.type === 'anthropic') {
      const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: model || 'claude-3-haiku-20240307',
          max_tokens: max_tokens,
          temperature: temperature,
          messages: [
            { role: 'user', content: prompt }
          ],
        }),
      });

      if (!anthropicResponse.ok) {
        const errorText = await anthropicResponse.text();
        throw new Error(`Anthropic API error: ${anthropicResponse.status} - ${errorText}`);
      }

      const data = await anthropicResponse.json();
      response = data.content[0]?.text;
      tokensUsed = data.usage?.input_tokens + data.usage?.output_tokens || 0;

    } else {
      throw new Error(`Unsupported LLM provider: ${integration.type}`);
    }

    if (!response) {
      throw new Error('No response generated from LLM');
    }

    // Log usage
    await supabase.from('integration_usage_logs').insert({
      user_id: user.id,
      integration_id: integration_id,
      operation_type: 'llm_completion',
      success: true,
      request_count: 1,
      response_time_ms: Date.now() - parseInt(req.headers.get('x-start-time') || '0')
    });

    console.log('LLM processing completed successfully');

    return new Response(JSON.stringify({
      response: response,
      tokens_used: tokensUsed,
      model: model || (integration.type === 'openai' ? 'gpt-4o-mini' : 'claude-3-haiku-20240307')
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in LLM API:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Unknown error occurred'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});