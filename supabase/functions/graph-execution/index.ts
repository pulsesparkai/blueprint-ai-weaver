import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExecutionContext {
  blueprintId: string;
  userId: string;
  inputData: any;
  sessionId?: string;
}

interface NodeExecutionResult {
  nodeId: string;
  status: 'success' | 'error' | 'pending';
  output?: any;
  error?: string;
  executionTime?: number;
}

// Mock execution functions for different node types
async function executeRAGRetriever(nodeData: any, input: any): Promise<any> {
  // Simulate RAG retrieval
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return {
    documents: [
      { content: "Retrieved document 1", score: 0.95 },
      { content: "Retrieved document 2", score: 0.87 }
    ],
    query: input.query || "default query"
  };
}

async function executePromptTemplate(nodeData: any, input: any): Promise<any> {
  const template = nodeData.template || "Default template: {input}";
  const variables = nodeData.variables || [];
  
  let processedTemplate = template;
  
  // Replace variables in template
  variables.forEach((variable: string) => {
    const value = input[variable] || `[${variable}]`;
    processedTemplate = processedTemplate.replace(`{${variable}}`, value);
  });
  
  return {
    prompt: processedTemplate,
    variables: variables
  };
}

async function executeMemoryStore(nodeData: any, input: any): Promise<any> {
  // Simulate memory storage/retrieval
  return {
    stored: true,
    memoryKey: `memory_${Date.now()}`,
    previousContext: input.context || null
  };
}

async function executeStateTracker(nodeData: any, input: any): Promise<any> {
  const maxHistory = nodeData.maxHistory || 10;
  
  return {
    currentState: input,
    historyLength: Math.min(maxHistory, 5), // Simulated
    trackingType: nodeData.trackingType || 'conversation'
  };
}

async function executeOutputParser(nodeData: any, input: any): Promise<any> {
  const parserType = nodeData.parserType || 'json';
  
  try {
    switch (parserType) {
      case 'json':
        return {
          parsed: typeof input === 'string' ? JSON.parse(input) : input,
          format: 'json'
        };
      case 'structured':
        return {
          parsed: {
            answer: input.answer || "Structured answer",
            confidence: input.confidence || 0.8
          },
          format: 'structured'
        };
      default:
        return {
          parsed: input,
          format: parserType
        };
    }
  } catch (error) {
    throw new Error(`Parsing failed: ${error.message}`);
  }
}

async function executeNode(node: any, input: any): Promise<NodeExecutionResult> {
  const startTime = Date.now();
  
  try {
    let output;
    
    switch (node.type) {
      case 'rag-retriever':
        output = await executeRAGRetriever(node.data, input);
        break;
      case 'prompt-template':
        output = await executePromptTemplate(node.data, input);
        break;
      case 'memory-store':
        output = await executeMemoryStore(node.data, input);
        break;
      case 'state-tracker':
        output = await executeStateTracker(node.data, input);
        break;
      case 'output-parser':
        output = await executeOutputParser(node.data, input);
        break;
      default:
        throw new Error(`Unknown node type: ${node.type}`);
    }
    
    return {
      nodeId: node.id,
      status: 'success',
      output,
      executionTime: Date.now() - startTime
    };
  } catch (error: any) {
    return {
      nodeId: node.id,
      status: 'error',
      error: error.message,
      executionTime: Date.now() - startTime
    };
  }
}

// Execute graph in topological order
async function executeGraph(nodes: any[], edges: any[], inputData: any) {
  const results: NodeExecutionResult[] = [];
  const nodeOutputs: { [nodeId: string]: any } = {};
  
  // Find entry points (nodes with no incoming edges)
  const entryNodes = nodes.filter(node => 
    !edges.some(edge => edge.target === node.id)
  );
  
  if (entryNodes.length === 0) {
    throw new Error('No entry point found in graph');
  }
  
  // Execute nodes in dependency order
  const executed = new Set<string>();
  const executing = new Set<string>();
  
  async function executeNodeAndDependents(nodeId: string): Promise<void> {
    if (executed.has(nodeId) || executing.has(nodeId)) {
      return;
    }
    
    executing.add(nodeId);
    
    // Get incoming edges for this node
    const incomingEdges = edges.filter(edge => edge.target === nodeId);
    
    // Execute all source nodes first
    for (const edge of incomingEdges) {
      await executeNodeAndDependents(edge.source);
    }
    
    // Collect inputs from source nodes
    const nodeInputs = incomingEdges.reduce((acc, edge) => {
      const sourceOutput = nodeOutputs[edge.source];
      return { ...acc, ...sourceOutput };
    }, incomingEdges.length === 0 ? inputData : {});
    
    // Execute this node
    const node = nodes.find(n => n.id === nodeId);
    if (node) {
      const result = await executeNode(node, nodeInputs);
      results.push(result);
      
      if (result.status === 'success') {
        nodeOutputs[nodeId] = result.output;
      }
    }
    
    executing.delete(nodeId);
    executed.add(nodeId);
  }
  
  // Execute all entry nodes
  for (const entryNode of entryNodes) {
    await executeNodeAndDependents(entryNode.id);
  }
  
  return results;
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

    const { blueprintId, inputData, sessionId }: ExecutionContext = await req.json();

    // Get blueprint
    const { data: blueprint, error: blueprintError } = await supabaseClient
      .from('blueprints')
      .select('*')
      .eq('id', blueprintId)
      .single();

    if (blueprintError) throw blueprintError;

    // Check if user has access
    if (blueprint.user_id !== user.id && !blueprint.is_public) {
      throw new Error('Access denied');
    }

    // Execute the graph
    const executionResults = await executeGraph(
      blueprint.nodes,
      blueprint.edges,
      inputData
    );

    // Store execution log
    const { error: logError } = await supabaseClient
      .from('execution_logs')
      .insert({
        blueprint_id: blueprintId,
        user_id: user.id,
        session_id: sessionId,
        input_data: inputData,
        execution_results: executionResults,
        executed_at: new Date().toISOString()
      });

    if (logError) console.error('Log error:', logError);

    const finalOutput = executionResults
      .filter(r => r.status === 'success')
      .reduce((acc, r) => ({ ...acc, ...r.output }), {});

    return new Response(JSON.stringify({
      success: true,
      executionResults,
      finalOutput,
      executionTime: executionResults.reduce((sum, r) => sum + (r.executionTime || 0), 0)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Graph execution error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});