import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OAuthRequest {
  action: 'start' | 'callback' | 'refresh' | 'revoke';
  provider: string;
  code?: string;
  redirectUri?: string;
  refreshToken?: string;
  integrationId?: string;
}

const OAUTH_CONFIGS = {
  'google-workspace': {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/documents.readonly',
      'https://www.googleapis.com/auth/spreadsheets.readonly',
      'https://www.googleapis.com/auth/presentations.readonly'
    ]
  },
  'notion': {
    authUrl: 'https://api.notion.com/v1/oauth/authorize',
    tokenUrl: 'https://api.notion.com/v1/oauth/token',
    scopes: ['read']
  },
  'slack': {
    authUrl: 'https://slack.com/oauth/v2/authorize',
    tokenUrl: 'https://slack.com/api/oauth.v2.access',
    scopes: [
      'channels:read',
      'channels:history',
      'files:read',
      'users:read',
      'team:read'
    ]
  },
  'microsoft-365': {
    authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    scopes: [
      'https://graph.microsoft.com/Files.Read.All',
      'https://graph.microsoft.com/Mail.Read',
      'https://graph.microsoft.com/User.Read'
    ]
  }
};

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

    const request: OAuthRequest = await req.json();

    switch (request.action) {
      case 'start':
        return await handleOAuthStart(supabaseClient, user.id, request);
      case 'callback':
        return await handleOAuthCallback(supabaseClient, user.id, request);
      case 'refresh':
        return await handleTokenRefresh(supabaseClient, user.id, request);
      case 'revoke':
        return await handleTokenRevoke(supabaseClient, user.id, request);
      default:
        throw new Error('Invalid action');
    }

  } catch (error: any) {
    console.error('OAuth handler error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function handleOAuthStart(supabaseClient: any, userId: string, request: OAuthRequest) {
  const config = OAUTH_CONFIGS[request.provider as keyof typeof OAUTH_CONFIGS];
  if (!config) {
    throw new Error(`Unsupported OAuth provider: ${request.provider}`);
  }

  // Get integration credentials (client ID, secret)
  const { data: integration, error } = await supabaseClient
    .from('integrations')
    .select('credential_refs')
    .eq('type', request.provider)
    .eq('user_id', userId)
    .single();

  if (error || !integration) {
    throw new Error('Integration credentials not found');
  }

  const credentials = JSON.parse(integration.credential_refs);
  
  // Generate state for security
  const state = crypto.randomUUID();
  
  // Store state temporarily (you might want to use a proper session store)
  await supabaseClient
    .from('user_sessions')
    .insert({
      user_id: userId,
      session_token: state,
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
      metadata: { provider: request.provider, redirect_uri: request.redirectUri }
    });

  // Build authorization URL
  const authParams = new URLSearchParams({
    client_id: credentials.clientId,
    redirect_uri: request.redirectUri!,
    scope: config.scopes.join(' '),
    response_type: 'code',
    state,
    access_type: 'offline', // For refresh tokens
    prompt: 'consent'
  });

  const authUrl = `${config.authUrl}?${authParams.toString()}`;

  return new Response(
    JSON.stringify({
      success: true,
      authUrl,
      state
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleOAuthCallback(supabaseClient: any, userId: string, request: OAuthRequest) {
  const config = OAUTH_CONFIGS[request.provider as keyof typeof OAUTH_CONFIGS];
  if (!config) {
    throw new Error(`Unsupported OAuth provider: ${request.provider}`);
  }

  // Verify state and get session
  const { data: session, error: sessionError } = await supabaseClient
    .from('user_sessions')
    .select('*')
    .eq('session_token', request.code) // Assuming state is passed as code
    .eq('user_id', userId)
    .single();

  if (sessionError || !session) {
    throw new Error('Invalid or expired OAuth state');
  }

  const sessionMetadata = session.metadata;

  // Get integration credentials
  const { data: integration, error } = await supabaseClient
    .from('integrations')
    .select('*')
    .eq('type', request.provider)
    .eq('user_id', userId)
    .single();

  if (error || !integration) {
    throw new Error('Integration not found');
  }

  const credentials = JSON.parse(integration.credential_refs);

  // Exchange code for tokens
  const tokenResponse = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: new URLSearchParams({
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      code: request.code!,
      grant_type: 'authorization_code',
      redirect_uri: sessionMetadata.redirect_uri
    })
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  const tokens = await tokenResponse.json();

  // Store tokens securely
  const updatedCredentials = {
    ...credentials,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null,
    scope: tokens.scope
  };

  // Update integration with tokens
  await supabaseClient
    .from('integrations')
    .update({
      credential_refs: JSON.stringify(updatedCredentials),
      status: 'active',
      last_validated: new Date().toISOString()
    })
    .eq('id', integration.id);

  // Clean up session
  await supabaseClient
    .from('user_sessions')
    .delete()
    .eq('session_token', request.code);

  // Test the connection
  const testResult = await testOAuthConnection(request.provider, updatedCredentials);

  return new Response(
    JSON.stringify({
      success: true,
      integration: {
        id: integration.id,
        status: 'active',
        connected: true
      },
      test: testResult
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleTokenRefresh(supabaseClient: any, userId: string, request: OAuthRequest) {
  const config = OAUTH_CONFIGS[request.provider as keyof typeof OAUTH_CONFIGS];
  if (!config) {
    throw new Error(`Unsupported OAuth provider: ${request.provider}`);
  }

  // Get integration
  const { data: integration, error } = await supabaseClient
    .from('integrations')
    .select('*')
    .eq('id', request.integrationId)
    .eq('user_id', userId)
    .single();

  if (error || !integration) {
    throw new Error('Integration not found');
  }

  const credentials = JSON.parse(integration.credential_refs);

  if (!credentials.refreshToken) {
    throw new Error('No refresh token available');
  }

  // Refresh the token
  const refreshResponse = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    },
    body: new URLSearchParams({
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
      refresh_token: credentials.refreshToken,
      grant_type: 'refresh_token'
    })
  });

  if (!refreshResponse.ok) {
    const error = await refreshResponse.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  const tokens = await refreshResponse.json();

  // Update credentials
  const updatedCredentials = {
    ...credentials,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token || credentials.refreshToken, // Some providers don't return new refresh token
    expiresAt: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null
  };

  await supabaseClient
    .from('integrations')
    .update({
      credential_refs: JSON.stringify(updatedCredentials),
      last_validated: new Date().toISOString()
    })
    .eq('id', integration.id);

  return new Response(
    JSON.stringify({
      success: true,
      tokens: {
        accessToken: tokens.access_token,
        expiresAt: updatedCredentials.expiresAt
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function handleTokenRevoke(supabaseClient: any, userId: string, request: OAuthRequest) {
  // Get integration
  const { data: integration, error } = await supabaseClient
    .from('integrations')
    .select('*')
    .eq('id', request.integrationId)
    .eq('user_id', userId)
    .single();

  if (error || !integration) {
    throw new Error('Integration not found');
  }

  const credentials = JSON.parse(integration.credential_refs);

  // Revoke tokens with provider if possible
  try {
    switch (request.provider) {
      case 'google-workspace':
        await fetch(`https://oauth2.googleapis.com/revoke?token=${credentials.accessToken}`, {
          method: 'POST'
        });
        break;
      case 'microsoft-365':
        // Microsoft doesn't have a simple revoke endpoint, tokens expire naturally
        break;
      // Add other providers as needed
    }
  } catch (error) {
    console.warn('Failed to revoke tokens with provider:', error);
  }

  // Clear tokens from our storage
  const clearedCredentials = {
    clientId: credentials.clientId,
    clientSecret: credentials.clientSecret
  };

  await supabaseClient
    .from('integrations')
    .update({
      credential_refs: JSON.stringify(clearedCredentials),
      status: 'inactive',
      validation_error: 'Tokens revoked'
    })
    .eq('id', integration.id);

  return new Response(
    JSON.stringify({
      success: true,
      message: 'Tokens revoked successfully'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function testOAuthConnection(provider: string, credentials: any) {
  try {
    switch (provider) {
      case 'google-workspace':
        const googleResponse = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
          headers: { 'Authorization': `Bearer ${credentials.accessToken}` }
        });
        
        if (googleResponse.ok) {
          const userData = await googleResponse.json();
          return { success: true, user: userData.user };
        }
        break;

      case 'notion':
        const notionResponse = await fetch('https://api.notion.com/v1/users/me', {
          headers: {
            'Authorization': `Bearer ${credentials.accessToken}`,
            'Notion-Version': '2022-06-28'
          }
        });
        
        if (notionResponse.ok) {
          const userData = await notionResponse.json();
          return { success: true, user: userData };
        }
        break;

      case 'slack':
        const slackResponse = await fetch('https://slack.com/api/auth.test', {
          headers: { 'Authorization': `Bearer ${credentials.accessToken}` }
        });
        
        if (slackResponse.ok) {
          const userData = await slackResponse.json();
          return { success: userData.ok, user: userData };
        }
        break;

      case 'microsoft-365':
        const msResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
          headers: { 'Authorization': `Bearer ${credentials.accessToken}` }
        });
        
        if (msResponse.ok) {
          const userData = await msResponse.json();
          return { success: true, user: userData };
        }
        break;
    }

    return { success: false, error: 'Connection test failed' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}