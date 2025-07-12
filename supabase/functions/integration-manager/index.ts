import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { crypto } from "https://deno.land/std@0.190.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IntegrationRequest {
  action: 'create' | 'test' | 'list' | 'update' | 'delete';
  integrationId?: string;
  name?: string;
  type?: string;
  config?: any;
  credentials?: any;
}

// Encryption helpers for temporary credential storage
async function encryptCredentials(credentials: any, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(credentials));
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key.padEnd(32, '0').slice(0, 32)),
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    data
  );
  
  const result = new Uint8Array(iv.length + encrypted.byteLength);
  result.set(iv);
  result.set(new Uint8Array(encrypted), iv.length);
  
  return btoa(String.fromCharCode(...result));
}

async function decryptCredentials(encryptedData: string, key: string): Promise<any> {
  const data = new Uint8Array(atob(encryptedData).split('').map(c => c.charCodeAt(0)));
  const iv = data.slice(0, 12);
  const encrypted = data.slice(12);
  
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(key.padEnd(32, '0').slice(0, 32)),
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );
  
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    cryptoKey,
    encrypted
  );
  
  const decoder = new TextDecoder();
  return JSON.parse(decoder.decode(decrypted));
}

// Integration validators for different services
async function validatePineconeIntegration(config: any, credentials: any): Promise<{ success: boolean; error?: string; metadata?: any }> {
  try {
    const { apiKey, environment } = credentials;
    const { indexName } = config;
    
    if (!apiKey) {
      return { success: false, error: 'Pinecone API key is required' };
    }
    
    // Test Pinecone connection
    const response = await fetch(`https://controller.${environment || 'us-west1-gcp'}.pinecone.io/databases`, {
      headers: {
        'Api-Key': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `Pinecone API error: ${response.status} - ${errorText}` };
    }
    
    const data = await response.json();
    const indexExists = indexName ? data.find((idx: any) => idx.name === indexName) : true;
    
    if (indexName && !indexExists) {
      return { success: false, error: `Index '${indexName}' not found in Pinecone` };
    }
    
    return { 
      success: true, 
      metadata: {
        availableIndexes: data.length,
        indexExists: !!indexExists,
        environment: environment || 'us-west1-gcp'
      }
    };
  } catch (error: any) {
    return { success: false, error: `Pinecone validation failed: ${error.message}` };
  }
}

async function validateWeaviateIntegration(config: any, credentials: any): Promise<{ success: boolean; error?: string; metadata?: any }> {
  try {
    const { apiKey, endpoint } = credentials;
    const { className } = config;
    
    if (!endpoint) {
      return { success: false, error: 'Weaviate endpoint is required' };
    }
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
    
    // Test Weaviate connection
    const response = await fetch(`${endpoint}/v1/meta`, { headers });
    
    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `Weaviate API error: ${response.status} - ${errorText}` };
    }
    
    const data = await response.json();
    
    // If className is specified, check if it exists
    if (className) {
      const schemaResponse = await fetch(`${endpoint}/v1/schema/${className}`, { headers });
      const classExists = schemaResponse.ok;
      
      if (!classExists) {
        return { success: false, error: `Class '${className}' not found in Weaviate` };
      }
    }
    
    return { 
      success: true, 
      metadata: {
        version: data.version,
        hostname: data.hostname,
        classExists: !!className
      }
    };
  } catch (error: any) {
    return { success: false, error: `Weaviate validation failed: ${error.message}` };
  }
}

async function validateQdrantIntegration(config: any, credentials: any): Promise<{ success: boolean; error?: string; metadata?: any }> {
  try {
    const { apiKey, endpoint } = credentials;
    const { collectionName } = config;
    
    if (!endpoint) {
      return { success: false, error: 'Qdrant endpoint is required' };
    }
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (apiKey) {
      headers['api-key'] = apiKey;
    }
    
    // Test Qdrant connection
    const response = await fetch(`${endpoint}/collections`, { headers });
    
    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `Qdrant API error: ${response.status} - ${errorText}` };
    }
    
    const data = await response.json();
    const collections = data.result?.collections || [];
    
    if (collectionName) {
      const collectionExists = collections.some((c: any) => c.name === collectionName);
      if (!collectionExists) {
        return { success: false, error: `Collection '${collectionName}' not found in Qdrant` };
      }
    }
    
    return { 
      success: true, 
      metadata: {
        availableCollections: collections.length,
        collectionExists: !!collectionName
      }
    };
  } catch (error: any) {
    return { success: false, error: `Qdrant validation failed: ${error.message}` };
  }
}

async function validateChromaIntegration(config: any, credentials: any): Promise<{ success: boolean; error?: string; metadata?: any }> {
  try {
    const { endpoint } = credentials;
    const { collectionName } = config;
    
    if (!endpoint) {
      return { success: false, error: 'Chroma endpoint is required' };
    }
    
    // Test Chroma connection
    const response = await fetch(`${endpoint}/api/v1/heartbeat`);
    
    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `Chroma API error: ${response.status} - ${errorText}` };
    }
    
    // Check collections if specified
    if (collectionName) {
      const collectionsResponse = await fetch(`${endpoint}/api/v1/collections`);
      if (collectionsResponse.ok) {
        const collections = await collectionsResponse.json();
        const collectionExists = collections.some((c: any) => c.name === collectionName);
        
        if (!collectionExists) {
          return { success: false, error: `Collection '${collectionName}' not found in Chroma` };
        }
      }
    }
    
    return { 
      success: true, 
      metadata: {
        status: 'connected',
        collectionExists: !!collectionName
      }
    };
  } catch (error: any) {
    return { success: false, error: `Chroma validation failed: ${error.message}` };
  }
}

async function validateIntegration(type: string, config: any, credentials: any): Promise<{ success: boolean; error?: string; metadata?: any }> {
  switch (type) {
    case 'pinecone':
      return await validatePineconeIntegration(config, credentials);
    case 'weaviate':
      return await validateWeaviateIntegration(config, credentials);
    case 'qdrant':
      return await validateQdrantIntegration(config, credentials);
    case 'chroma':
      return await validateChromaIntegration(config, credentials);
    default:
      return { success: false, error: `Unsupported integration type: ${type}` };
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

    const { action, integrationId, name, type, config, credentials }: IntegrationRequest = await req.json();
    
    const encryptionKey = Deno.env.get('INTEGRATION_ENCRYPTION_KEY') || 'default-key-change-in-production';

    switch (action) {
      case 'list':
        const { data: integrations, error: listError } = await supabaseClient
          .from('integrations')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (listError) throw listError;

        return new Response(JSON.stringify({
          success: true,
          integrations
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'create':
        if (!name || !type || !config || !credentials) {
          throw new Error('Missing required fields for creating integration');
        }

        // Validate the integration
        const createValidation = await validateIntegration(type, config, credentials);
        if (!createValidation.success) {
          return new Response(JSON.stringify({
            success: false,
            error: createValidation.error
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Encrypt credentials for temporary storage reference
        const encryptedCreds = await encryptCredentials(credentials, encryptionKey);
        const credentialRef = `encrypted_${Date.now()}_${user.id}`;

        // Store encrypted credentials temporarily (in production, use a proper secret management service)
        await supabaseClient
          .from('integration_credentials')
          .insert({
            user_id: user.id,
            credential_ref: credentialRef,
            encrypted_data: encryptedCreds,
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
          });

        // Create integration record
        const { data: newIntegration, error: createError } = await supabaseClient
          .from('integrations')
          .insert({
            user_id: user.id,
            name,
            type,
            config,
            credential_refs: { encrypted_ref: credentialRef },
            status: 'active',
            last_validated: new Date().toISOString()
          })
          .select()
          .single();

        if (createError) throw createError;

        return new Response(JSON.stringify({
          success: true,
          integration: newIntegration,
          validation: createValidation
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'test':
        if (!integrationId) {
          throw new Error('Integration ID required for testing');
        }

        // Get integration
        const { data: integration, error: getError } = await supabaseClient
          .from('integrations')
          .select('*')
          .eq('id', integrationId)
          .eq('user_id', user.id)
          .single();

        if (getError) throw getError;

        // Get credentials
        const credRef = integration.credential_refs?.encrypted_ref;
        if (!credRef) {
          throw new Error('No credentials found for this integration');
        }

        const { data: credData, error: credError } = await supabaseClient
          .from('integration_credentials')
          .select('encrypted_data')
          .eq('credential_ref', credRef)
          .eq('user_id', user.id)
          .single();

        if (credError) throw new Error('Failed to retrieve credentials');

        const decryptedCreds = await decryptCredentials(credData.encrypted_data, encryptionKey);

        // Validate integration
        const testValidation = await validateIntegration(integration.type, integration.config, decryptedCreds);

        // Update integration status
        await supabaseClient
          .from('integrations')
          .update({
            status: testValidation.success ? 'active' : 'error',
            last_validated: new Date().toISOString(),
            validation_error: testValidation.success ? null : testValidation.error
          })
          .eq('id', integrationId);

        // Log usage
        await supabaseClient
          .from('integration_usage_logs')
          .insert({
            integration_id: integrationId,
            user_id: user.id,
            operation_type: 'validate',
            success: testValidation.success,
            error_message: testValidation.error || null
          });

        return new Response(JSON.stringify({
          success: testValidation.success,
          error: testValidation.error,
          metadata: testValidation.metadata
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'delete':
        if (!integrationId) {
          throw new Error('Integration ID required for deletion');
        }

        // Get integration to clean up credentials
        const { data: integrationToDelete, error: getDeleteError } = await supabaseClient
          .from('integrations')
          .select('credential_refs')
          .eq('id', integrationId)
          .eq('user_id', user.id)
          .single();

        if (getDeleteError) throw getDeleteError;

        // Delete credentials
        const credRefToDelete = integrationToDelete.credential_refs?.encrypted_ref;
        if (credRefToDelete) {
          await supabaseClient
            .from('integration_credentials')
            .delete()
            .eq('credential_ref', credRefToDelete)
            .eq('user_id', user.id);
        }

        // Delete integration
        const { error: deleteError } = await supabaseClient
          .from('integrations')
          .delete()
          .eq('id', integrationId)
          .eq('user_id', user.id);

        if (deleteError) throw deleteError;

        return new Response(JSON.stringify({
          success: true,
          message: 'Integration deleted successfully'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      default:
        throw new Error(`Unsupported action: ${action}`);
    }

  } catch (error: any) {
    console.error('Integration manager error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});