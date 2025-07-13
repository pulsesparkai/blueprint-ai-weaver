import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { crypto } from "https://deno.land/std@0.190.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ApiKeyRequest {
  action: 'create' | 'list' | 'revoke' | 'rotate';
  name?: string;
  permissions?: string[];
  keyId?: string;
  teamId?: string;
  expiresIn?: number; // days
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

    const request: ApiKeyRequest = await req.json();

    switch (request.action) {
      case 'create':
        return await createApiKey(supabaseClient, user.id, request);
      case 'list':
        return await listApiKeys(supabaseClient, user.id, request.teamId);
      case 'revoke':
        return await revokeApiKey(supabaseClient, user.id, request);
      case 'rotate':
        return await rotateApiKey(supabaseClient, user.id, request);
      default:
        throw new Error('Invalid action');
    }

  } catch (error: any) {
    console.error('API key management error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function generateApiKey(): Promise<{ key: string; hash: string; prefix: string }> {
  // Generate 32 random bytes
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  
  // Convert to base64url (URL-safe base64 without padding)
  const key = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  
  // Create prefix (first 8 characters for display)
  const prefix = key.substring(0, 8);
  
  // Hash the full key for storage
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  const hash = btoa(String.fromCharCode(...hashArray));
  
  return { key: `cfk_${key}`, hash, prefix: `cfk_${prefix}...` };
}

async function createApiKey(supabaseClient: any, userId: string, request: ApiKeyRequest) {
  const { name, permissions = [], teamId, expiresIn } = request;

  if (!name) {
    throw new Error('API key name is required');
  }

  // If teamId provided, check user has admin permissions
  if (teamId) {
    const { data: membership } = await supabaseClient
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      throw new Error('Insufficient team permissions');
    }
  }

  // Generate API key
  const { key, hash, prefix } = await generateApiKey();

  // Set expiration date if provided
  let expiresAt = null;
  if (expiresIn && expiresIn > 0) {
    const expDate = new Date();
    expDate.setDate(expDate.getDate() + expiresIn);
    expiresAt = expDate.toISOString();
  }

  // Store API key
  const { data: apiKey, error } = await supabaseClient
    .from('api_keys')
    .insert({
      user_id: userId,
      team_id: teamId || null,
      name,
      key_hash: hash,
      key_prefix: prefix,
      permissions,
      expires_at: expiresAt,
      is_active: true
    })
    .select()
    .single();

  if (error) throw error;

  // Log API key creation
  await supabaseClient
    .from('audit_logs')
    .insert({
      user_id: userId,
      team_id: teamId || null,
      action: 'create',
      resource_type: 'api_key',
      resource_id: apiKey.id,
      metadata: {
        name,
        permissions,
        expires_at: expiresAt
      }
    });

  return new Response(
    JSON.stringify({
      success: true,
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        key, // Only returned once during creation
        prefix: apiKey.key_prefix,
        permissions: apiKey.permissions,
        expires_at: apiKey.expires_at,
        created_at: apiKey.created_at
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function listApiKeys(supabaseClient: any, userId: string, teamId?: string) {
  let query = supabaseClient
    .from('api_keys')
    .select('id, name, key_prefix, permissions, last_used_at, expires_at, is_active, created_at');

  if (teamId) {
    query = query.eq('team_id', teamId);
  } else {
    query = query.eq('user_id', userId).is('team_id', null);
  }

  const { data: apiKeys } = await query
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  return new Response(
    JSON.stringify({ apiKeys: apiKeys || [] }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function revokeApiKey(supabaseClient: any, userId: string, request: ApiKeyRequest) {
  const { keyId, teamId } = request;

  if (!keyId) {
    throw new Error('API key ID is required');
  }

  // Check ownership/permissions
  let query = supabaseClient
    .from('api_keys')
    .select('id, name');

  if (teamId) {
    // Check team admin permissions
    const { data: membership } = await supabaseClient
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      throw new Error('Insufficient team permissions');
    }
    
    query = query.eq('team_id', teamId);
  } else {
    query = query.eq('user_id', userId);
  }

  const { data: apiKey } = await query.eq('id', keyId).single();

  if (!apiKey) {
    throw new Error('API key not found');
  }

  // Revoke the key
  const { error } = await supabaseClient
    .from('api_keys')
    .update({ is_active: false })
    .eq('id', keyId);

  if (error) throw error;

  // Log revocation
  await supabaseClient
    .from('audit_logs')
    .insert({
      user_id: userId,
      team_id: teamId || null,
      action: 'delete',
      resource_type: 'api_key',
      resource_id: keyId,
      metadata: { name: apiKey.name }
    });

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function rotateApiKey(supabaseClient: any, userId: string, request: ApiKeyRequest) {
  const { keyId, teamId } = request;

  if (!keyId) {
    throw new Error('API key ID is required');
  }

  // Check ownership/permissions (same as revoke)
  let query = supabaseClient
    .from('api_keys')
    .select('*');

  if (teamId) {
    const { data: membership } = await supabaseClient
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      throw new Error('Insufficient team permissions');
    }
    
    query = query.eq('team_id', teamId);
  } else {
    query = query.eq('user_id', userId);
  }

  const { data: oldKey } = await query.eq('id', keyId).single();

  if (!oldKey) {
    throw new Error('API key not found');
  }

  // Generate new key
  const { key, hash, prefix } = await generateApiKey();

  // Update the existing record
  const { error } = await supabaseClient
    .from('api_keys')
    .update({
      key_hash: hash,
      key_prefix: prefix,
      updated_at: new Date().toISOString()
    })
    .eq('id', keyId);

  if (error) throw error;

  // Log rotation
  await supabaseClient
    .from('audit_logs')
    .insert({
      user_id: userId,
      team_id: teamId || null,
      action: 'update',
      resource_type: 'api_key',
      resource_id: keyId,
      metadata: {
        name: oldKey.name,
        action: 'rotated'
      }
    });

  return new Response(
    JSON.stringify({
      success: true,
      newKey: key, // Return the new key once
      prefix
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}