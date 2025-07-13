import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VectorRequest {
  integrationId: string;
  operation: 'search' | 'upsert' | 'delete' | 'create_collection' | 'list_collections';
  query?: string;
  vectors?: Array<{ id: string; values: number[]; metadata?: any }>;
  topK?: number;
  filter?: any;
  collectionName?: string;
  dimension?: number;
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

    const request: VectorRequest = await req.json();
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

    let result: any;

    switch (integration.type) {
      case 'pinecone':
        result = await handlePineconeOperation(credentials, config, request);
        break;
      case 'weaviate':
        result = await handleWeaviateOperation(credentials, config, request);
        break;
      case 'qdrant':
        result = await handleQdrantOperation(credentials, config, request);
        break;
      case 'chroma':
        result = await handleChromaOperation(credentials, config, request);
        break;
      case 'faiss':
        result = await handleFAISSOperation(credentials, config, request);
        break;
      default:
        throw new Error(`Unsupported vector database: ${integration.type}`);
    }

    const responseTime = Date.now() - startTime;

    // Log operation
    await supabaseClient
      .from('integration_usage_logs')
      .insert({
        integration_id: request.integrationId,
        user_id: user.id,
        operation_type: `vector_${request.operation}`,
        success: result.success,
        response_time_ms: responseTime,
        error_message: result.error
      });

    return new Response(
      JSON.stringify({
        success: result.success,
        data: result.data,
        error: result.error,
        metadata: {
          operation: request.operation,
          provider: integration.type,
          responseTime
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Vector operation error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Pinecone operations
async function handlePineconeOperation(credentials: any, config: any, request: VectorRequest) {
  const baseUrl = `https://${config.indexName}-${config.environment}.svc.${config.environment}.pinecone.io`;
  const headers = {
    'Api-Key': credentials.apiKey,
    'Content-Type': 'application/json'
  };

  try {
    switch (request.operation) {
      case 'search':
        if (!request.query) throw new Error('Query vector required for search');
        
        // Convert query to embeddings first (would need OpenAI integration)
        const queryVector = await getEmbedding(request.query);
        
        const searchResponse = await fetch(`${baseUrl}/query`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            vector: queryVector,
            topK: request.topK || 10,
            filter: request.filter,
            includeMetadata: true,
            includeValues: false
          })
        });

        if (!searchResponse.ok) {
          throw new Error(`Pinecone search failed: ${searchResponse.status}`);
        }

        const searchData = await searchResponse.json();
        return { success: true, data: searchData.matches };

      case 'upsert':
        if (!request.vectors) throw new Error('Vectors required for upsert');

        const upsertResponse = await fetch(`${baseUrl}/vectors/upsert`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            vectors: request.vectors
          })
        });

        if (!upsertResponse.ok) {
          throw new Error(`Pinecone upsert failed: ${upsertResponse.status}`);
        }

        return { success: true, data: { upserted: request.vectors.length } };

      case 'delete':
        const deleteResponse = await fetch(`${baseUrl}/vectors/delete`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            ids: request.vectors?.map(v => v.id) || [],
            filter: request.filter
          })
        });

        if (!deleteResponse.ok) {
          throw new Error(`Pinecone delete failed: ${deleteResponse.status}`);
        }

        return { success: true, data: { deleted: true } };

      case 'list_collections':
        const listResponse = await fetch(`https://controller.${config.environment}.pinecone.io/databases`, {
          headers: { 'Api-Key': credentials.apiKey }
        });

        if (!listResponse.ok) {
          throw new Error(`Pinecone list failed: ${listResponse.status}`);
        }

        const indexes = await listResponse.json();
        return { success: true, data: indexes };

      default:
        throw new Error(`Unsupported operation: ${request.operation}`);
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Weaviate operations
async function handleWeaviateOperation(credentials: any, config: any, request: VectorRequest) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (credentials.apiKey) {
    headers['Authorization'] = `Bearer ${credentials.apiKey}`;
  }

  try {
    switch (request.operation) {
      case 'search':
        const searchResponse = await fetch(`${config.endpoint}/v1/graphql`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            query: `{
              Get {
                ${config.className}(
                  nearText: { concepts: ["${request.query}"] }
                  limit: ${request.topK || 10}
                ) {
                  _additional { id, distance, certainty }
                }
              }
            }`
          })
        });

        if (!searchResponse.ok) {
          throw new Error(`Weaviate search failed: ${searchResponse.status}`);
        }

        const searchData = await searchResponse.json();
        return { success: true, data: searchData.data?.Get?.[config.className] || [] };

      case 'upsert':
        if (!request.vectors) throw new Error('Vectors required for upsert');

        const objects = request.vectors.map(v => ({
          class: config.className,
          id: v.id,
          vector: v.values,
          properties: v.metadata
        }));

        const upsertResponse = await fetch(`${config.endpoint}/v1/batch/objects`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ objects })
        });

        if (!upsertResponse.ok) {
          throw new Error(`Weaviate upsert failed: ${upsertResponse.status}`);
        }

        return { success: true, data: { upserted: objects.length } };

      case 'create_collection':
        const schema = {
          class: request.collectionName || config.className,
          vectorizer: 'none',
          properties: [
            { name: 'content', dataType: ['text'] },
            { name: 'metadata', dataType: ['object'] }
          ]
        };

        const createResponse = await fetch(`${config.endpoint}/v1/schema`, {
          method: 'POST',
          headers,
          body: JSON.stringify(schema)
        });

        return { success: createResponse.ok, data: schema };

      default:
        throw new Error(`Unsupported operation: ${request.operation}`);
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// Qdrant operations
async function handleQdrantOperation(credentials: any, config: any, request: VectorRequest) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (credentials.apiKey) {
    headers['api-key'] = credentials.apiKey;
  }

  try {
    switch (request.operation) {
      case 'search':
        if (!request.query) throw new Error('Query required for search');
        
        const queryVector = await getEmbedding(request.query);

        const searchResponse = await fetch(`${config.endpoint}/collections/${config.collectionName}/points/search`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            vector: queryVector,
            limit: request.topK || 10,
            with_payload: true,
            with_vector: false
          })
        });

        if (!searchResponse.ok) {
          throw new Error(`Qdrant search failed: ${searchResponse.status}`);
        }

        const searchData = await searchResponse.json();
        return { success: true, data: searchData.result };

      case 'upsert':
        if (!request.vectors) throw new Error('Vectors required for upsert');

        const points = request.vectors.map(v => ({
          id: v.id,
          vector: v.values,
          payload: v.metadata
        }));

        const upsertResponse = await fetch(`${config.endpoint}/collections/${config.collectionName}/points`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ points })
        });

        if (!upsertResponse.ok) {
          throw new Error(`Qdrant upsert failed: ${upsertResponse.status}`);
        }

        return { success: true, data: { upserted: points.length } };

      case 'create_collection':
        const createResponse = await fetch(`${config.endpoint}/collections/${request.collectionName}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            vectors: {
              size: request.dimension || 1536,
              distance: 'Cosine'
            }
          })
        });

        return { success: createResponse.ok, data: { collection: request.collectionName } };

      default:
        throw new Error(`Unsupported operation: ${request.operation}`);
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ChromaDB operations
async function handleChromaOperation(credentials: any, config: any, request: VectorRequest) {
  try {
    switch (request.operation) {
      case 'search':
        const searchResponse = await fetch(`${config.endpoint}/api/v1/collections/${config.collectionName}/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query_texts: [request.query],
            n_results: request.topK || 10
          })
        });

        if (!searchResponse.ok) {
          throw new Error(`Chroma search failed: ${searchResponse.status}`);
        }

        const searchData = await searchResponse.json();
        return { success: true, data: searchData };

      case 'upsert':
        if (!request.vectors) throw new Error('Vectors required for upsert');

        const upsertResponse = await fetch(`${config.endpoint}/api/v1/collections/${config.collectionName}/upsert`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ids: request.vectors.map(v => v.id),
            embeddings: request.vectors.map(v => v.values),
            metadatas: request.vectors.map(v => v.metadata)
          })
        });

        return { success: upsertResponse.ok, data: { upserted: request.vectors.length } };

      case 'create_collection':
        const createResponse = await fetch(`${config.endpoint}/api/v1/collections`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: request.collectionName,
            metadata: { description: 'Collection created via API' }
          })
        });

        return { success: createResponse.ok, data: { collection: request.collectionName } };

      default:
        throw new Error(`Unsupported operation: ${request.operation}`);
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// FAISS operations (simplified, would need actual FAISS implementation)
async function handleFAISSOperation(credentials: any, config: any, request: VectorRequest) {
  // This would require a FAISS server or local implementation
  // For now, returning a placeholder
  return { 
    success: false, 
    error: 'FAISS operations require local server implementation' 
  };
}

// Helper function to get embeddings (would use OpenAI or other embedding service)
async function getEmbedding(text: string): Promise<number[]> {
  // This would need to use an actual embedding service
  // For now, returning a dummy vector
  return new Array(1536).fill(0).map(() => Math.random());
}