import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Blueprint {
  id?: string;
  title: string;
  description?: string;
  nodes: any[];
  edges: any[];
  thumbnail?: string;
  is_public?: boolean;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Graph validation logic
function validateGraph(nodes: any[], edges: any[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Check for required nodes
  const nodeTypes = nodes.map(n => n.type);
  if (!nodeTypes.includes('prompt-template')) {
    warnings.push('Consider adding a Prompt Template node for better control');
  }
  
  // Validate connections
  for (const edge of edges) {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    
    if (!sourceNode || !targetNode) {
      errors.push(`Invalid connection: ${edge.id}`);
      continue;
    }
    
    // Type compatibility checks
    if (sourceNode.type === 'rag-retriever' && targetNode.type === 'output-parser') {
      if (!targetNode.data?.parserType) {
        warnings.push('RAG Retriever connected to unconfigured Output Parser');
      }
    }
    
    if (sourceNode.type === 'memory-store' && !sourceNode.data?.storeType) {
      errors.push('Memory Store node must be configured before connecting');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// Session caching logic (Redis-like behavior using Supabase)
async function cacheSession(supabase: any, userId: string, blueprintId: string, sessionData: any) {
  const { error } = await supabase
    .from('blueprint_sessions')
    .upsert({
      user_id: userId,
      blueprint_id: blueprintId,
      session_data: sessionData,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    });
  
  if (error) console.error('Session cache error:', error);
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

    const url = new URL(req.url);
    const method = req.method;
    const path = url.pathname.split('/').pop();

    switch (method) {
      case 'GET':
        if (path === 'list') {
          // List user's blueprints with caching
          const { data, error } = await supabaseClient
            .from('blueprints')
            .select('*')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false });

          if (error) throw error;

          return new Response(JSON.stringify({ blueprints: data }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        if (path === 'public') {
          // List public blueprints
          const { data, error } = await supabaseClient
            .from('blueprints')
            .select('*')
            .eq('is_public', true)
            .order('updated_at', { ascending: false })
            .limit(20);

          if (error) throw error;

          return new Response(JSON.stringify({ blueprints: data }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // Get specific blueprint
        const blueprintId = url.searchParams.get('id');
        if (blueprintId) {
          const { data, error } = await supabaseClient
            .from('blueprints')
            .select('*')
            .eq('id', blueprintId)
            .single();

          if (error) throw error;

          // Validate graph structure
          const validation = validateGraph(data.nodes, data.edges);
          
          return new Response(JSON.stringify({ 
            blueprint: data, 
            validation 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        break;

      case 'POST':
        // Create blueprint with validation
        const { blueprint }: { blueprint: Blueprint } = await req.json();
        
        const validation = validateGraph(blueprint.nodes, blueprint.edges);
        if (!validation.isValid) {
          return new Response(JSON.stringify({ 
            error: 'Blueprint validation failed',
            validation 
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const { data, error } = await supabaseClient
          .from('blueprints')
          .insert({
            ...blueprint,
            user_id: user.id
          })
          .select()
          .single();

        if (error) throw error;

        // Cache session
        await cacheSession(supabaseClient, user.id, data.id, { 
          lastModified: new Date().toISOString(),
          nodeCount: blueprint.nodes.length,
          edgeCount: blueprint.edges.length
        });

        return new Response(JSON.stringify({ 
          blueprint: data, 
          validation 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'PUT':
        // Update blueprint with validation
        const { id, blueprint: updatedBlueprint }: { id: string, blueprint: Blueprint } = await req.json();
        
        const updateValidation = validateGraph(updatedBlueprint.nodes, updatedBlueprint.edges);
        
        const { data: updateData, error: updateError } = await supabaseClient
          .from('blueprints')
          .update({
            ...updatedBlueprint,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .eq('user_id', user.id)
          .select()
          .single();

        if (updateError) throw updateError;

        // Update session cache
        await cacheSession(supabaseClient, user.id, id, { 
          lastModified: new Date().toISOString(),
          nodeCount: updatedBlueprint.nodes.length,
          edgeCount: updatedBlueprint.edges.length
        });

        return new Response(JSON.stringify({ 
          blueprint: updateData, 
          validation: updateValidation 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'DELETE':
        const deleteId = url.searchParams.get('id');
        if (!deleteId) {
          throw new Error('Blueprint ID required');
        }

        const { error: deleteError } = await supabaseClient
          .from('blueprints')
          .delete()
          .eq('id', deleteId)
          .eq('user_id', user.id);

        if (deleteError) throw deleteError;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      default:
        throw new Error('Method not allowed');
    }

  } catch (error: any) {
    console.error('Blueprint operations error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});