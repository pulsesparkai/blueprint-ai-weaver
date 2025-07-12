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
    console.log('Save Pipeline API function called');

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

    const { 
      id, 
      title, 
      description, 
      nodes, 
      edges, 
      metadata = {},
      is_public = false 
    } = await req.json();

    if (!title) {
      throw new Error('Title is required');
    }

    if (!nodes || !Array.isArray(nodes)) {
      throw new Error('Nodes array is required');
    }

    if (!edges || !Array.isArray(edges)) {
      throw new Error('Edges array is required');
    }

    console.log(`Saving pipeline for user: ${user.id}, title: "${title}"`);

    let result;
    let operation;

    if (id) {
      // Update existing blueprint
      const { data, error } = await supabase
        .from('blueprints')
        .update({
          title,
          description,
          nodes,
          edges,
          is_public,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update blueprint: ${error.message}`);
      }

      result = data;
      operation = 'update';

    } else {
      // Create new blueprint
      const { data, error } = await supabase
        .from('blueprints')
        .insert({
          title,
          description,
          nodes,
          edges,
          is_public,
          user_id: user.id
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create blueprint: ${error.message}`);
      }

      result = data;
      operation = 'create';
    }

    // Create blueprint session for temporary state
    const sessionData = {
      nodes,
      edges,
      metadata,
      lastModified: new Date().toISOString()
    };

    await supabase.from('blueprint_sessions').upsert({
      blueprint_id: result.id,
      user_id: user.id,
      session_data: sessionData,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    });

    console.log(`Pipeline ${operation} completed successfully: ${result.id}`);

    return new Response(JSON.stringify({
      success: true,
      blueprint: {
        id: result.id,
        title: result.title,
        description: result.description,
        nodes: result.nodes,
        edges: result.edges,
        is_public: result.is_public,
        created_at: result.created_at,
        updated_at: result.updated_at
      },
      operation: operation,
      metadata: {
        nodeCount: nodes.length,
        edgeCount: edges.length,
        sessionCreated: true
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in Save Pipeline API:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Unknown error occurred'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});