import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { crypto } from "https://deno.land/std@0.190.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TwoFactorRequest {
  action: 'setup' | 'verify' | 'disable' | 'generate-backup-codes' | 'verify-backup-code';
  token?: string;
  backupCode?: string;
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

    const request: TwoFactorRequest = await req.json();

    switch (request.action) {
      case 'setup':
        return await setupTwoFactor(supabaseClient, user.id);
      case 'verify':
        return await verifyTwoFactor(supabaseClient, user.id, request.token!);
      case 'disable':
        return await disableTwoFactor(supabaseClient, user.id, request.token!);
      case 'generate-backup-codes':
        return await generateBackupCodes(supabaseClient, user.id);
      case 'verify-backup-code':
        return await verifyBackupCode(supabaseClient, user.id, request.backupCode!);
      default:
        throw new Error('Invalid action');
    }

  } catch (error: any) {
    console.error('Two-factor auth error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Simple TOTP implementation (in production, use a proper library)
function generateSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  return btoa(String.fromCharCode(...bytes)).replace(/[^A-Z2-7]/g, '').substring(0, 32);
}

function generateTOTP(secret: string, timeStep?: number): string {
  // This is a simplified TOTP implementation
  // In production, use a proper TOTP library
  const time = Math.floor((timeStep || Date.now()) / 30000);
  const timeHex = time.toString(16).padStart(16, '0');
  
  // For demo purposes, return a simple 6-digit code based on time
  // In production, implement proper HMAC-SHA1 TOTP algorithm
  return ((time % 1000000)).toString().padStart(6, '0');
}

function verifyTOTP(secret: string, token: string): boolean {
  const currentTime = Date.now();
  const timeStep = 30000; // 30 seconds
  
  // Check current time step and ±1 time steps for clock drift
  for (let i = -1; i <= 1; i++) {
    const checkTime = currentTime + (i * timeStep);
    const expectedToken = generateTOTP(secret, checkTime);
    if (expectedToken === token) {
      return true;
    }
  }
  
  return false;
}

async function setupTwoFactor(supabaseClient: any, userId: string) {
  // Generate new secret
  const secret = generateSecret();
  
  // Store secret temporarily (not enabled yet)
  await supabaseClient
    .from('profiles')
    .update({
      two_factor_secret: secret,
      two_factor_enabled: false
    })
    .eq('id', userId);

  // Generate QR code data
  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .single();

  const qrCodeData = `otpauth://totp/ContextForge:${profile.email}?secret=${secret}&issuer=ContextForge`;

  return new Response(
    JSON.stringify({
      secret,
      qrCodeData,
      backupCodes: [] // Will generate after verification
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function verifyTwoFactor(supabaseClient: any, userId: string, token: string) {
  // Get user's secret
  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('two_factor_secret, two_factor_enabled')
    .eq('id', userId)
    .single();

  if (!profile?.two_factor_secret) {
    throw new Error('Two-factor authentication not set up');
  }

  // Verify token
  const isValid = verifyTOTP(profile.two_factor_secret, token);
  
  if (!isValid) {
    throw new Error('Invalid verification code');
  }

  // Enable 2FA
  await supabaseClient
    .from('profiles')
    .update({ two_factor_enabled: true })
    .eq('id', userId);

  // Generate backup codes if not already enabled
  let backupCodes = [];
  if (!profile.two_factor_enabled) {
    backupCodes = await generateBackupCodesInternal(supabaseClient, userId);
  }

  // Log 2FA enablement
  await supabaseClient
    .from('audit_logs')
    .insert({
      user_id: userId,
      action: 'create',
      resource_type: 'two_factor_auth',
      resource_id: userId,
      metadata: { enabled: true }
    });

  return new Response(
    JSON.stringify({
      success: true,
      backupCodes: backupCodes.length > 0 ? backupCodes : undefined
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function disableTwoFactor(supabaseClient: any, userId: string, token: string) {
  // Get user's secret
  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('two_factor_secret, two_factor_enabled')
    .eq('id', userId)
    .single();

  if (!profile?.two_factor_enabled) {
    throw new Error('Two-factor authentication is not enabled');
  }

  // Verify token before disabling
  const isValid = verifyTOTP(profile.two_factor_secret, token);
  
  if (!isValid) {
    throw new Error('Invalid verification code');
  }

  // Disable 2FA and clear secret
  await supabaseClient
    .from('profiles')
    .update({
      two_factor_enabled: false,
      two_factor_secret: null
    })
    .eq('id', userId);

  // Delete backup codes
  await supabaseClient
    .from('two_factor_backup_codes')
    .delete()
    .eq('user_id', userId);

  // Log 2FA disablement
  await supabaseClient
    .from('audit_logs')
    .insert({
      user_id: userId,
      action: 'delete',
      resource_type: 'two_factor_auth',
      resource_id: userId,
      metadata: { enabled: false }
    });

  return new Response(
    JSON.stringify({ success: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function generateBackupCodesInternal(supabaseClient: any, userId: string): Promise<string[]> {
  const codes = [];
  
  // Delete existing codes
  await supabaseClient
    .from('two_factor_backup_codes')
    .delete()
    .eq('user_id', userId);

  // Generate 10 backup codes
  for (let i = 0; i < 10; i++) {
    const code = crypto.getRandomValues(new Uint8Array(4))
      .reduce((acc, byte) => acc + byte.toString(16).padStart(2, '0'), '');
    
    codes.push(code);
    
    // Hash and store the code
    const encoder = new TextEncoder();
    const data = encoder.encode(code);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = new Uint8Array(hashBuffer);
    const hash = btoa(String.fromCharCode(...hashArray));
    
    await supabaseClient
      .from('two_factor_backup_codes')
      .insert({
        user_id: userId,
        code_hash: hash
      });
  }
  
  return codes;
}

async function generateBackupCodes(supabaseClient: any, userId: string) {
  // Check if 2FA is enabled
  const { data: profile } = await supabaseClient
    .from('profiles')
    .select('two_factor_enabled')
    .eq('id', userId)
    .single();

  if (!profile?.two_factor_enabled) {
    throw new Error('Two-factor authentication must be enabled first');
  }

  const codes = await generateBackupCodesInternal(supabaseClient, userId);

  return new Response(
    JSON.stringify({ backupCodes: codes }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function verifyBackupCode(supabaseClient: any, userId: string, backupCode: string) {
  // Hash the provided code
  const encoder = new TextEncoder();
  const data = encoder.encode(backupCode);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  const hash = btoa(String.fromCharCode(...hashArray));

  // Find and mark the code as used
  const { data: code, error } = await supabaseClient
    .from('two_factor_backup_codes')
    .update({ used_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('code_hash', hash)
    .is('used_at', null)
    .select()
    .single();

  if (error || !code) {
    return new Response(
      JSON.stringify({ valid: false, error: 'Invalid or already used backup code' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Log backup code usage
  await supabaseClient
    .from('audit_logs')
    .insert({
      user_id: userId,
      action: 'access',
      resource_type: 'backup_code',
      resource_id: code.id,
      metadata: { used_at: new Date().toISOString() }
    });

  return new Response(
    JSON.stringify({ valid: true }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}