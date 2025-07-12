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
    console.log('RAG API function called');

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

    const { integration_id, query, top_k = 5 } = await req.json();

    if (!integration_id) {
      throw new Error('Integration ID is required');
    }

    if (!query) {
      throw new Error('Query is required');
    }

    console.log(`Processing RAG request for user: ${user.id}, query: "${query}"`);

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
    const apiKey = credentials.encrypted_data;
    const config = integration.config || {};

    let results = [];

    // Handle different vector database providers
    if (integration.type === 'pinecone') {
      const environment = config.environment || 'us-east-1-aws';
      const indexName = config.index_name || 'default';
      
      const pineconeResponse = await fetch(`https://${indexName}-${environment}.svc.pinecone.io/query`, {
        method: 'POST',
        headers: {
          'Api-Key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vector: Array(1536).fill(0), // Mock vector - in real app, you'd embed the query
          topK: top_k,
          includeMetadata: true,
        }),
      });

      if (!pineconeResponse.ok) {
        const errorText = await pineconeResponse.text();
        throw new Error(`Pinecone API error: ${pineconeResponse.status} - ${errorText}`);
      }

      const data = await pineconeResponse.json();
      results = data.matches?.map((match: any) => ({
        text: match.metadata?.text || 'No text available',
        score: match.score || 0,
        metadata: match.metadata || {}
      })) || [];

    } else if (integration.type === 'weaviate') {
      const endpoint = config.endpoint || 'https://localhost:8080';
      const className = config.class_name || 'Document';
      
      const weaviateResponse = await fetch(`${endpoint}/v1/graphql`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `{
            Get {
              ${className}(
                nearText: {
                  concepts: ["${query}"]
                }
                limit: ${top_k}
              ) {
                text
                _additional {
                  certainty
                }
              }
            }
          }`
        }),
      });

      if (!weaviateResponse.ok) {
        const errorText = await weaviateResponse.text();
        throw new Error(`Weaviate API error: ${weaviateResponse.status} - ${errorText}`);
      }

      const data = await weaviateResponse.json();
      const documents = data.data?.Get?.[className] || [];
      results = documents.map((doc: any) => ({
        text: doc.text || 'No text available',
        score: doc._additional?.certainty || 0,
        metadata: doc
      }));

    } else if (integration.type === 'qdrant') {
      const endpoint = config.endpoint || 'https://localhost:6333';
      const collectionName = config.collection_name || 'documents';
      
      const qdrantResponse = await fetch(`${endpoint}/collections/${collectionName}/points/search`, {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vector: Array(1536).fill(0), // Mock vector - in real app, you'd embed the query
          limit: top_k,
          with_payload: true,
        }),
      });

      if (!qdrantResponse.ok) {
        const errorText = await qdrantResponse.text();
        throw new Error(`Qdrant API error: ${qdrantResponse.status} - ${errorText}`);
      }

      const data = await qdrantResponse.json();
      results = data.result?.map((point: any) => ({
        text: point.payload?.text || 'No text available',
        score: point.score || 0,
        metadata: point.payload || {}
      })) || [];

    } else {
      // Fallback: Generate mock results for unsupported providers
      console.log(`Unsupported RAG provider: ${integration.type}, generating mock results`);
      
      results = Array.from({ length: top_k }, (_, i) => ({
        text: `Mock result ${i + 1} for query "${query}". This is simulated content from a vector database search. In a real implementation, this would contain relevant documents retrieved based on semantic similarity to your query.`,
        score: 0.9 - (i * 0.1),
        metadata: {
          source: `document_${i + 1}.txt`,
          chunk_id: `chunk_${i + 1}`,
          timestamp: new Date().toISOString()
        }
      }));
    }

    // Log usage
    await supabase.from('integration_usage_logs').insert({
      user_id: user.id,
      integration_id: integration_id,
      operation_type: 'vector_search',
      success: true,
      request_count: 1,
      response_time_ms: Date.now() - parseInt(req.headers.get('x-start-time') || '0')
    });

    console.log(`RAG processing completed: ${results.length} results found`);

    return new Response(JSON.stringify({
      results: results,
      metadata: {
        query: query,
        top_k: top_k,
        provider: integration.type,
        total_results: results.length
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in RAG API:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Unknown error occurred',
      results: []
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});