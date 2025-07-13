import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HealthCheckRequest {
  integrationId: string;
  skipCache?: boolean;
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

    const { integrationId, skipCache = false }: HealthCheckRequest = await req.json();

    // Get integration details
    const { data: integration, error: integrationError } = await supabaseClient
      .from('integrations')
      .select('*')
      .eq('id', integrationId)
      .eq('user_id', user.id)
      .single();

    if (integrationError || !integration) {
      throw new Error('Integration not found');
    }

    // Check if we need to skip cache (recent check within 5 minutes)
    const lastChecked = new Date(integration.last_validated || 0);
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    if (!skipCache && lastChecked > fiveMinutesAgo) {
      return new Response(
        JSON.stringify({
          success: true,
          status: integration.status,
          lastChecked: integration.last_validated,
          cached: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const startTime = Date.now();
    let healthResult;

    // Perform health check based on integration type
    switch (integration.type) {
      case 'pinecone':
        healthResult = await checkPineconeHealth(integration);
        break;
      case 'weaviate':
        healthResult = await checkWeaviateHealth(integration);
        break;
      case 'qdrant':
        healthResult = await checkQdrantHealth(integration);
        break;
      case 'chroma':
        healthResult = await checkChromaHealth(integration);
        break;
      case 'openai':
        healthResult = await checkOpenAIHealth(integration);
        break;
      case 'anthropic':
        healthResult = await checkAnthropicHealth(integration);
        break;
      default:
        healthResult = { success: false, error: 'Unsupported integration type' };
    }

    const responseTime = Date.now() - startTime;

    // Update integration status
    await supabaseClient
      .from('integrations')
      .update({
        status: healthResult.success ? 'active' : 'error',
        last_validated: new Date().toISOString(),
        validation_error: healthResult.error || null
      })
      .eq('id', integrationId);

    // Log the health check
    await supabaseClient
      .from('integration_usage_logs')
      .insert({
        integration_id: integrationId,
        user_id: user.id,
        operation_type: 'health_check',
        success: healthResult.success,
        response_time_ms: responseTime,
        error_message: healthResult.error
      });

    return new Response(
      JSON.stringify({
        success: healthResult.success,
        status: healthResult.success ? 'active' : 'error',
        error: healthResult.error,
        responseTime,
        metadata: healthResult.metadata,
        lastChecked: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Health check error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Health check implementations
async function checkPineconeHealth(integration: any) {
  try {
    const credentials = JSON.parse(integration.credential_refs);
    const config = integration.config;
    
    const response = await fetch(`https://controller.${config.environment || 'us-west1-gcp'}.pinecone.io/databases`, {
      headers: {
        'Api-Key': credentials.apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return { success: false, error: `Pinecone API error: ${response.status}` };
    }

    const indexes = await response.json();
    const targetIndex = indexes.find((idx: any) => idx.name === config.indexName);

    return {
      success: true,
      metadata: {
        indexExists: !!targetIndex,
        totalIndexes: indexes.length,
        indexStatus: targetIndex?.status
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function checkWeaviateHealth(integration: any) {
  try {
    const credentials = JSON.parse(integration.credential_refs);
    const config = integration.config;
    
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (credentials.apiKey) {
      headers['Authorization'] = `Bearer ${credentials.apiKey}`;
    }

    const response = await fetch(`${config.endpoint}/v1/meta`, { headers });

    if (!response.ok) {
      return { success: false, error: `Weaviate API error: ${response.status}` };
    }

    const meta = await response.json();

    // Check if class exists
    const classResponse = await fetch(`${config.endpoint}/v1/schema/${config.className}`, { headers });
    const classExists = classResponse.ok;

    return {
      success: true,
      metadata: {
        version: meta.version,
        classExists,
        hostname: meta.hostname
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function checkQdrantHealth(integration: any) {
  try {
    const credentials = JSON.parse(integration.credential_refs);
    const config = integration.config;
    
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (credentials.apiKey) {
      headers['api-key'] = credentials.apiKey;
    }

    const response = await fetch(`${config.endpoint}/collections`, { headers });

    if (!response.ok) {
      return { success: false, error: `Qdrant API error: ${response.status}` };
    }

    const data = await response.json();
    const collections = data.result?.collections || [];
    const targetCollection = collections.find((c: any) => c.name === config.collectionName);

    return {
      success: true,
      metadata: {
        collectionExists: !!targetCollection,
        totalCollections: collections.length,
        collectionStatus: targetCollection?.status
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function checkChromaHealth(integration: any) {
  try {
    const config = integration.config;
    
    const response = await fetch(`${config.endpoint}/api/v1/heartbeat`);

    if (!response.ok) {
      return { success: false, error: `Chroma API error: ${response.status}` };
    }

    // Check collection
    const collectionsResponse = await fetch(`${config.endpoint}/api/v1/collections`);
    let collectionExists = false;
    
    if (collectionsResponse.ok) {
      const collections = await collectionsResponse.json();
      collectionExists = collections.some((c: any) => c.name === config.collectionName);
    }

    return {
      success: true,
      metadata: {
        collectionExists,
        status: 'healthy'
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function checkOpenAIHealth(integration: any) {
  try {
    const credentials = JSON.parse(integration.credential_refs);
    
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${credentials.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return { success: false, error: `OpenAI API error: ${response.status}` };
    }

    const data = await response.json();
    const models = data.data || [];

    return {
      success: true,
      metadata: {
        availableModels: models.length,
        hasGPT4: models.some((m: any) => m.id.includes('gpt-4')),
        organization: response.headers.get('openai-organization')
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function checkAnthropicHealth(integration: any) {
  try {
    const credentials = JSON.parse(integration.credential_refs);
    
    // Test with a minimal completion request
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': credentials.apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'Hi' }]
      })
    });

    if (!response.ok) {
      return { success: false, error: `Anthropic API error: ${response.status}` };
    }

    return {
      success: true,
      metadata: {
        status: 'healthy',
        rateLimit: response.headers.get('anthropic-ratelimit-requests-limit')
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}