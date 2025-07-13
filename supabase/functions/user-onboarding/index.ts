import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OnboardingRequest {
  company?: string;
  jobTitle?: string;
  timezone?: string;
  interests?: string[];
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

    const { company, jobTitle, timezone, interests }: OnboardingRequest = await req.json();

    // Update user profile with onboarding data
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .update({
        company,
        job_title: jobTitle,
        timezone: timezone || 'UTC',
        is_onboarded: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (profileError) throw profileError;

    // Get user's personal workspace and set it up
    const { data: workspace } = await supabaseClient
      .from('workspaces')
      .select('id')
      .eq('owner_id', user.id)
      .eq('is_personal', true)
      .single();

    if (workspace) {
      // Update workspace settings with user preferences
      await supabaseClient
        .from('workspaces')
        .update({
          settings: {
            timezone: timezone || 'UTC',
            interests: interests || [],
            onboarded_at: new Date().toISOString()
          }
        })
        .eq('id', workspace.id);
    }

    // Log onboarding completion
    await supabaseClient
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'create',
        resource_type: 'onboarding',
        resource_id: user.id,
        metadata: {
          company,
          job_title: jobTitle,
          timezone: timezone || 'UTC',
          completed_at: new Date().toISOString()
        }
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Onboarding completed successfully',
        redirectTo: '/dashboard'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Onboarding error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});