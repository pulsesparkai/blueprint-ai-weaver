import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { crypto } from "https://deno.land/std@0.190.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IntegrationRequest {
  action: 'create' | 'test' | 'list' | 'update' | 'delete' | 'oauth-start' | 'oauth-callback' | 'fetch-data' | 'webhook-trigger';
  integrationId?: string;
  name?: string;
  type?: string;
  config?: any;
  credentials?: any;
  provider?: string;
  redirectUri?: string;
  code?: string;
  dataType?: string;
  webhookData?: any;
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

// New app integration validators
async function validateNotionIntegration(config: any, credentials: any): Promise<{ success: boolean; error?: string; metadata?: any }> {
  try {
    const { accessToken } = credentials;
    if (!accessToken) {
      return { success: false, error: 'Notion access token required' };
    }

    const response = await fetch('https://api.notion.com/v1/users/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Notion-Version': '2022-06-28'
      }
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Notion API error: ${error}` };
    }

    const userData = await response.json();
    return { 
      success: true, 
      metadata: { 
        user: userData.name,
        workspace: userData.owner?.workspace 
      }
    };
  } catch (error: any) {
    return { success: false, error: `Notion validation failed: ${error.message}` };
  }
}

async function validateGoogleWorkspaceIntegration(config: any, credentials: any): Promise<{ success: boolean; error?: string; metadata?: any }> {
  try {
    const { accessToken } = credentials;
    if (!accessToken) {
      return { success: false, error: 'Google access token required' };
    }

    const response = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Google API error: ${error}` };
    }

    const userData = await response.json();
    return { 
      success: true, 
      metadata: { 
        user: userData.user?.displayName,
        email: userData.user?.emailAddress 
      }
    };
  } catch (error: any) {
    return { success: false, error: `Google Workspace validation failed: ${error.message}` };
  }
}

async function validateZapierIntegration(config: any, credentials: any): Promise<{ success: boolean; error?: string; metadata?: any }> {
  try {
    const { webhookUrl } = credentials;
    if (!webhookUrl) {
      return { success: false, error: 'Zapier webhook URL required' };
    }

    // Test webhook with a ping
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: true, timestamp: new Date().toISOString() })
    });

    return { 
      success: response.ok, 
      error: response.ok ? undefined : `Webhook test failed: ${response.status}`,
      metadata: { webhookStatus: response.status }
    };
  } catch (error: any) {
    return { success: false, error: `Zapier validation failed: ${error.message}` };
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
    case 'notion':
      return await validateNotionIntegration(config, credentials);
    case 'google-workspace':
      return await validateGoogleWorkspaceIntegration(config, credentials);
    case 'zapier':
      return await validateZapierIntegration(config, credentials);
    // For other app integrations, return success for now
    case 'microsoft-365':
    case 'salesforce':
    case 'trello':
    case 'evernote':
    case 'todoist':
      return await this.validateTodoist(credentials);
    
    case 'evernote':
      return await this.validateEvernote(credentials);
      
    case 'typeform':
      return await this.validateTypeform(credentials);
      
    case 'canva':
      return await this.validateCanva(credentials);
      
    case 'salesforce':
      return await this.validateSalesforce(credentials);
      
    case 'microsoft-365':
      return await this.validateMicrosoft365(credentials);
      
    case 'google-workspace':
      return await this.validateGoogleWorkspace(credentials);
      
    case 'trello':
      return { success: true, metadata: { type } };
    case 'canva':
    case 'typeform':
      return { success: true, metadata: { type } };
    default:
      return { success: false, error: `Unsupported integration type: ${type}` };
  }

  private async validateTodoist(credentials: any): Promise<ValidationResult> {
    try {
      const response = await fetch('https://api.todoist.com/rest/v2/projects', {
        headers: {
          'Authorization': `Bearer ${credentials.api_token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Todoist API error: ${response.status}`);
      }

      const projects = await response.json();
      return {
        isValid: true,
        message: `Successfully connected to Todoist with ${projects.length} projects`,
        metadata: { projectCount: projects.length }
      };
    } catch (error) {
      return {
        isValid: false,
        message: error.message,
        error: error.message
      };
    }
  }

  private async validateEvernote(credentials: any): Promise<ValidationResult> {
    try {
      // Evernote uses OAuth, so we validate the access token
      const response = await fetch('https://sandbox-api.evernote.com/v1/user', {
        headers: {
          'Authorization': `Bearer ${credentials.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Evernote API error: ${response.status}`);
      }

      const user = await response.json();
      return {
        isValid: true,
        message: `Successfully connected to Evernote as ${user.name}`,
        metadata: { username: user.name }
      };
    } catch (error) {
      return {
        isValid: false,
        message: error.message,
        error: error.message
      };
    }
  }

  private async validateTypeform(credentials: any): Promise<ValidationResult> {
    try {
      const response = await fetch('https://api.typeform.com/me', {
        headers: {
          'Authorization': `Bearer ${credentials.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Typeform API error: ${response.status}`);
      }

      const user = await response.json();
      return {
        isValid: true,
        message: `Successfully connected to Typeform as ${user.email}`,
        metadata: { email: user.email }
      };
    } catch (error) {
      return {
        isValid: false,
        message: error.message,
        error: error.message
      };
    }
  }

  private async validateCanva(credentials: any): Promise<ValidationResult> {
    try {
      const response = await fetch('https://api.canva.com/v1/me', {
        headers: {
          'Authorization': `Bearer ${credentials.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Canva API error: ${response.status}`);
      }

      const user = await response.json();
      return {
        isValid: true,
        message: `Successfully connected to Canva`,
        metadata: { userId: user.id }
      };
    } catch (error) {
      return {
        isValid: false,
        message: error.message,
        error: error.message
      };
    }
  }

  private async validateSalesforce(credentials: any): Promise<ValidationResult> {
    try {
      const response = await fetch(`${credentials.instance_url}/services/data/v57.0/sobjects/`, {
        headers: {
          'Authorization': `Bearer ${credentials.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Salesforce API error: ${response.status}`);
      }

      const data = await response.json();
      return {
        isValid: true,
        message: `Successfully connected to Salesforce with ${data.sobjects.length} object types`,
        metadata: { objectCount: data.sobjects.length }
      };
    } catch (error) {
      return {
        isValid: false,
        message: error.message,
        error: error.message
      };
    }
  }

  private async validateMicrosoft365(credentials: any): Promise<ValidationResult> {
    try {
      const response = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: {
          'Authorization': `Bearer ${credentials.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Microsoft Graph API error: ${response.status}`);
      }

      const user = await response.json();
      return {
        isValid: true,
        message: `Successfully connected to Microsoft 365 as ${user.displayName}`,
        metadata: { displayName: user.displayName, userPrincipalName: user.userPrincipalName }
      };
    } catch (error) {
      return {
        isValid: false,
        message: error.message,
        error: error.message
      };
    }
  }

  private async validateGoogleWorkspace(credentials: any): Promise<ValidationResult> {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${credentials.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Google API error: ${response.status}`);
      }

      const user = await response.json();
      return {
        isValid: true,
        message: `Successfully connected to Google Workspace as ${user.email}`,
        metadata: { email: user.email, name: user.name }
      };
    } catch (error) {
      return {
        isValid: false,
        message: error.message,
        error: error.message
      };
    }
  }

  private async validateTrello(credentials: any): Promise<ValidationResult> {
    try {
      const response = await fetch(`https://api.trello.com/1/members/me?key=${credentials.api_key}&token=${credentials.access_token}`);

      if (!response.ok) {
        throw new Error(`Trello API error: ${response.status}`);
      }

      const user = await response.json();
      return {
        isValid: true,
        message: `Successfully connected to Trello as ${user.fullName}`,
        metadata: { username: user.username, fullName: user.fullName }
      };
    } catch (error) {
      return {
        isValid: false,
        message: error.message,
        error: error.message
      };
    }
  }
}

// OAuth helper functions
async function generateOAuthUrl(provider: string, redirectUri: string): Promise<string> {
  const baseUrls: Record<string, string> = {
    'notion': `https://api.notion.com/v1/oauth/authorize?client_id=${Deno.env.get('NOTION_CLIENT_ID')}&response_type=code&owner=user&redirect_uri=${encodeURIComponent(redirectUri)}`,
    'google-workspace': `https://accounts.google.com/o/oauth2/auth?client_id=${Deno.env.get('GOOGLE_CLIENT_ID')}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent('https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/documents.readonly')}&response_type=code&access_type=offline`,
    'microsoft-365': `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${Deno.env.get('MICROSOFT_CLIENT_ID')}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent('https://graph.microsoft.com/Files.Read https://graph.microsoft.com/Mail.Read')}`
  };

  const authUrl = baseUrls[provider];
  if (!authUrl) {
    throw new Error(`OAuth not supported for provider: ${provider}`);
  }

  return authUrl;
}

async function handleOAuthCallback(supabaseClient: any, userId: string, provider: string, code: string, redirectUri: string, integrationName?: string): Promise<any> {
  let tokenData: any = {};

  switch (provider) {
    case 'notion':
      tokenData = await exchangeNotionCode(code, redirectUri);
      break;
    case 'google-workspace':
      tokenData = await exchangeGoogleCode(code, redirectUri);
      break;
    case 'microsoft-365':
      tokenData = await exchangeMicrosoftCode(code, redirectUri);
      break;
    default:
      throw new Error(`OAuth callback not supported for provider: ${provider}`);
  }

  // Store the OAuth tokens securely
  const encryptionKey = Deno.env.get('INTEGRATION_ENCRYPTION_KEY') || 'default-key-change-in-production';
  const encryptedTokens = await encryptCredentials(tokenData, encryptionKey);
  const credentialRef = `oauth_${Date.now()}_${userId}`;

  await supabaseClient
    .from('integration_credentials')
    .insert({
      user_id: userId,
      credential_ref: credentialRef,
      encrypted_data: encryptedTokens,
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year
    });

  // Create integration record
  const { data: integration, error } = await supabaseClient
    .from('integrations')
    .insert({
      user_id: userId,
      name: integrationName || `${provider} Integration`,
      type: provider,
      config: { 
        connected_at: new Date().toISOString(),
        oauth: true
      },
      credential_refs: { oauth_ref: credentialRef },
      status: 'active',
      last_validated: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  return integration;
}

async function exchangeNotionCode(code: string, redirectUri: string): Promise<any> {
  const credentials = btoa(`${Deno.env.get('NOTION_CLIENT_ID')}:${Deno.env.get('NOTION_CLIENT_SECRET')}`);
  
  const response = await fetch('https://api.notion.com/v1/oauth/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri
    })
  });

  const data = await response.json();
  return {
    accessToken: data.access_token,
    workspaceName: data.workspace_name
  };
}

async function exchangeGoogleCode(code: string, redirectUri: string): Promise<any> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get('GOOGLE_CLIENT_ID') || '',
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') || '',
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri
    })
  });

  const tokens = await response.json();
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token
  };
}

async function exchangeMicrosoftCode(code: string, redirectUri: string): Promise<any> {
  const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get('MICROSOFT_CLIENT_ID') || '',
      client_secret: Deno.env.get('MICROSOFT_CLIENT_SECRET') || '',
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri
    })
  });

  const tokens = await response.json();
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token
  };
}

// Data fetching functions
async function fetchIntegrationData(supabaseClient: any, userId: string, integrationId: string, dataType: string, encryptionKey: string): Promise<any> {
  // Get integration
  const { data: integration, error } = await supabaseClient
    .from('integrations')
    .select('*')
    .eq('id', integrationId)
    .eq('user_id', userId)
    .single();

  if (error) throw error;

  // Get credentials
  const credRef = integration.credential_refs?.oauth_ref || integration.credential_refs?.encrypted_ref;
  if (!credRef) {
    throw new Error('No credentials found for this integration');
  }

  const { data: credData, error: credError } = await supabaseClient
    .from('integration_credentials')
    .select('encrypted_data')
    .eq('credential_ref', credRef)
    .eq('user_id', userId)
    .single();

  if (credError) throw credError;

  const credentials = await decryptCredentials(credData.encrypted_data, encryptionKey);

  switch (integration.type) {
    case 'notion':
      return await fetchNotionData(credentials, dataType);
    case 'google-workspace':
      return await fetchGoogleWorkspaceData(credentials, dataType);
    case 'microsoft-365':
      return await fetchMicrosoft365Data(credentials, dataType);
    default:
      throw new Error(`Data fetching not supported for ${integration.type}`);
  }
}

async function fetchNotionData(credentials: any, dataType: string): Promise<any> {
  const response = await fetch('https://api.notion.com/v1/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${credentials.accessToken}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      filter: { property: 'object', value: 'page' },
      page_size: 100
    })
  });

  const data = await response.json();
  return data.results?.map((page: any) => ({
    id: page.id,
    title: page.properties?.title?.title?.[0]?.plain_text || 'Untitled',
    url: page.url,
    created_time: page.created_time,
    last_edited_time: page.last_edited_time
  })) || [];
}

async function fetchGoogleWorkspaceData(credentials: any, dataType: string): Promise<any> {
  if (dataType === 'documents') {
    const response = await fetch('https://www.googleapis.com/drive/v3/files?q=mimeType%3D%27application%2Fvnd.google-apps.document%27&fields=files(id%2Cname%2CmodifiedTime%2CwebViewLink)', {
      headers: { Authorization: `Bearer ${credentials.accessToken}` }
    });
    const data = await response.json();
    return data.files || [];
  }
  
  return [];
}

async function fetchMicrosoft365Data(credentials: any, dataType: string): Promise<any> {
  if (dataType === 'documents') {
    const response = await fetch('https://graph.microsoft.com/v1.0/me/drive/root/children?filter=file%20ne%20null', {
      headers: { Authorization: `Bearer ${credentials.accessToken}` }
    });
    const data = await response.json();
    return data.value || [];
  }

  return [];
}

// Webhook trigger function
async function triggerWebhook(supabaseClient: any, userId: string, integrationId: string, webhookData: any, encryptionKey: string): Promise<void> {
  // Get integration
  const { data: integration, error } = await supabaseClient
    .from('integrations')
    .select('*')
    .eq('id', integrationId)
    .eq('user_id', userId)
    .single();

  if (error) throw error;

  if (integration.type !== 'zapier') {
    throw new Error('Webhook triggers only supported for Zapier integrations');
  }

  // Get webhook URL from credentials
  const credRef = integration.credential_refs?.encrypted_ref;
  if (!credRef) {
    throw new Error('No webhook URL found for this integration');
  }

  const { data: credData, error: credError } = await supabaseClient
    .from('integration_credentials')
    .select('encrypted_data')
    .eq('credential_ref', credRef)
    .eq('user_id', userId)
    .single();

  if (credError) throw credError;

  const credentials = await decryptCredentials(credData.encrypted_data, encryptionKey);

  // Trigger webhook
  const response = await fetch(credentials.webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...webhookData,
      timestamp: new Date().toISOString(),
      user_id: userId
    })
  });

  // Log usage
  await supabaseClient
    .from('integration_usage_logs')
    .insert({
      integration_id: integrationId,
      user_id: userId,
      operation_type: 'webhook',
      success: response.ok,
      error_message: response.ok ? null : `Webhook failed: ${response.status}`
    });

  if (!response.ok) {
    throw new Error(`Webhook trigger failed: ${response.status}`);
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

    const { action, integrationId, name, type, config, credentials, provider, redirectUri, code, dataType, webhookData }: IntegrationRequest = await req.json();
    
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

      case 'oauth-start':
        if (!provider || !redirectUri) {
          throw new Error('Provider and redirect URI required for OAuth start');
        }
        
        const authUrl = await generateOAuthUrl(provider, redirectUri);
        
        return new Response(JSON.stringify({
          success: true,
          authUrl
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'oauth-callback':
        if (!provider || !code || !redirectUri) {
          throw new Error('Provider, code, and redirect URI required for OAuth callback');
        }
        
        const oauthResult = await handleOAuthCallback(supabaseClient, user.id, provider, code, redirectUri, name);
        
        return new Response(JSON.stringify({
          success: true,
          integration: oauthResult
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'fetch-data':
        if (!integrationId || !dataType) {
          throw new Error('Integration ID and data type required for fetching data');
        }
        
        const fetchedData = await fetchIntegrationData(supabaseClient, user.id, integrationId, dataType, encryptionKey);
        
        return new Response(JSON.stringify({
          success: true,
          data: fetchedData
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'webhook-trigger':
        if (!integrationId || !webhookData) {
          throw new Error('Integration ID and webhook data required');
        }
        
        await triggerWebhook(supabaseClient, user.id, integrationId, webhookData, encryptionKey);
        
        return new Response(JSON.stringify({
          success: true,
          message: 'Webhook triggered successfully'
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