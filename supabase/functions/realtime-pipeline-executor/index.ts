import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

interface ExecutionRequest {
  blueprintId: string;
  inputData: any;
  sessionId: string;
  enableStreaming?: boolean;
}

interface ExecutionNode {
  id: string;
  type: string;
  data: any;
  position: { x: number; y: number };
}

interface ExecutionEdge {
  id: string;
  source: string;
  target: string;
}

interface ExecutionContext {
  sessionId: string;
  blueprintId: string;
  userId: string;
  nodeResults: Map<string, any>;
  totalCost: number;
  startTime: number;
  errors: Array<{ nodeId: string; error: string; timestamp: number }>;
  cache: Map<string, any>;
}

// Circuit breaker implementation
class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  constructor(
    private threshold: number = 5,
    private timeout: number = 60000 // 1 minute
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime < this.timeout) {
        throw new Error('Circuit breaker is OPEN - service unavailable');
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
    }
  }
}

// Retry with exponential backoff
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        break;
      }
      
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      console.log(`Retry attempt ${attempt + 1} after ${delay}ms delay`);
    }
  }
  
  throw lastError!;
}

// Cache implementation
class ExecutionCache {
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();

  set(key: string, data: any, ttl: number = 300000) { // 5 minutes default
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  generateKey(nodeId: string, inputData: any): string {
    const dataHash = JSON.stringify(inputData);
    return `${nodeId}:${btoa(dataHash).slice(0, 16)}`;
  }
}

const executionCache = new ExecutionCache();
const circuitBreakers = new Map<string, CircuitBreaker>();

function getCircuitBreaker(service: string): CircuitBreaker {
  if (!circuitBreakers.has(service)) {
    circuitBreakers.set(service, new CircuitBreaker());
  }
  return circuitBreakers.get(service)!;
}

serve(async (req) => {
  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  socket.onopen = () => {
    console.log('WebSocket connection established');
    socket.send(JSON.stringify({
      type: 'connection_established',
      timestamp: new Date().toISOString()
    }));
  };

  socket.onmessage = async (event) => {
    try {
      const request: ExecutionRequest = JSON.parse(event.data);
      console.log('Received execution request:', request);
      
      await executeBlueprint(socket, supabaseClient, request);
    } catch (error: any) {
      console.error('Execution error:', error);
      socket.send(JSON.stringify({
        type: 'execution_error',
        error: error.message,
        timestamp: new Date().toISOString()
      }));
    }
  };

  socket.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  socket.onclose = () => {
    console.log('WebSocket connection closed');
  };

  return response;
});

async function executeBlueprint(
  socket: WebSocket,
  supabaseClient: any,
  request: ExecutionRequest
) {
  const startTime = Date.now();
  
  // Get blueprint data
  const { data: blueprint, error: blueprintError } = await supabaseClient
    .from('blueprints')
    .select('*')
    .eq('id', request.blueprintId)
    .single();

  if (blueprintError || !blueprint) {
    throw new Error('Blueprint not found');
  }

  const nodes: ExecutionNode[] = blueprint.nodes || [];
  const edges: ExecutionEdge[] = blueprint.edges || [];
  
  // Create execution context
  const context: ExecutionContext = {
    sessionId: request.sessionId,
    blueprintId: request.blueprintId,
    userId: blueprint.user_id,
    nodeResults: new Map(),
    totalCost: 0,
    startTime,
    errors: [],
    cache: new Map()
  };

  // Log execution start
  const { data: executionLog } = await supabaseClient
    .from('simulation_logs')
    .insert({
      id: request.sessionId,
      blueprint_id: request.blueprintId,
      user_id: blueprint.user_id,
      session_id: request.sessionId,
      input_query: JSON.stringify(request.inputData),
      llm_provider: 'multi',
      status: 'running',
      started_at: new Date().toISOString(),
      pipeline_config: { nodes, edges }
    })
    .select()
    .single();

  // Send execution started event
  socket.send(JSON.stringify({
    type: 'execution_started',
    sessionId: request.sessionId,
    blueprintId: request.blueprintId,
    totalNodes: nodes.length,
    timestamp: new Date().toISOString()
  }));

  try {
    // Build execution graph
    const executionGraph = buildExecutionGraph(nodes, edges);
    
    // Execute nodes in parallel where possible
    await executeNodesInParallel(socket, supabaseClient, executionGraph, request.inputData, context);
    
    // Send completion event
    const executionTime = Date.now() - startTime;
    socket.send(JSON.stringify({
      type: 'execution_completed',
      sessionId: request.sessionId,
      executionTime,
      totalCost: context.totalCost,
      nodeResults: Object.fromEntries(context.nodeResults),
      timestamp: new Date().toISOString()
    }));

    // Update execution log
    await supabaseClient
      .from('simulation_logs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        execution_time_ms: executionTime,
        final_output: JSON.stringify(Object.fromEntries(context.nodeResults)),
        metrics: {
          totalCost: context.totalCost,
          nodeCount: nodes.length,
          errorCount: context.errors.length
        }
      })
      .eq('id', request.sessionId);

  } catch (error: any) {
    console.error('Blueprint execution failed:', error);
    
    const executionTime = Date.now() - startTime;
    socket.send(JSON.stringify({
      type: 'execution_failed',
      sessionId: request.sessionId,
      error: error.message,
      executionTime,
      nodeResults: Object.fromEntries(context.nodeResults),
      errors: context.errors,
      timestamp: new Date().toISOString()
    }));

    // Update execution log with error
    await supabaseClient
      .from('simulation_logs')
      .update({
        status: 'error',
        completed_at: new Date().toISOString(),
        execution_time_ms: executionTime,
        error_message: error.message,
        metrics: {
          totalCost: context.totalCost,
          nodeCount: nodes.length,
          errorCount: context.errors.length + 1
        }
      })
      .eq('id', request.sessionId);
  }
}

function buildExecutionGraph(nodes: ExecutionNode[], edges: ExecutionEdge[]) {
  const graph = new Map<string, { node: ExecutionNode; dependencies: string[]; dependents: string[] }>();
  
  // Initialize nodes
  nodes.forEach(node => {
    graph.set(node.id, {
      node,
      dependencies: [],
      dependents: []
    });
  });
  
  // Add dependencies
  edges.forEach(edge => {
    const sourceNode = graph.get(edge.source);
    const targetNode = graph.get(edge.target);
    
    if (sourceNode && targetNode) {
      targetNode.dependencies.push(edge.source);
      sourceNode.dependents.push(edge.target);
    }
  });
  
  return graph;
}

async function executeNodesInParallel(
  socket: WebSocket,
  supabaseClient: any,
  graph: Map<string, any>,
  initialInput: any,
  context: ExecutionContext
) {
  const executedNodes = new Set<string>();
  const runningNodes = new Set<string>();
  
  // Find nodes with no dependencies (starting nodes)
  const readyNodes = Array.from(graph.entries())
    .filter(([_, nodeInfo]) => nodeInfo.dependencies.length === 0)
    .map(([nodeId]) => nodeId);
  
  // Set initial input for starting nodes
  if (readyNodes.length > 0) {
    context.nodeResults.set('input', initialInput);
  }
  
  while (executedNodes.size < graph.size) {
    const availableNodes = Array.from(graph.entries())
      .filter(([nodeId, nodeInfo]) => 
        !executedNodes.has(nodeId) && 
        !runningNodes.has(nodeId) &&
        nodeInfo.dependencies.every((depId: string) => executedNodes.has(depId))
      )
      .map(([nodeId]) => nodeId);
    
    if (availableNodes.length === 0) {
      // Wait for running nodes to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      continue;
    }
    
    // Execute available nodes in parallel
    const promises = availableNodes.map(async (nodeId) => {
      runningNodes.add(nodeId);
      const nodeInfo = graph.get(nodeId)!;
      
      try {
        await executeNode(socket, supabaseClient, nodeInfo.node, context);
        executedNodes.add(nodeId);
      } catch (error: any) {
        context.errors.push({
          nodeId,
          error: error.message,
          timestamp: Date.now()
        });
        executedNodes.add(nodeId); // Mark as processed even if failed
      } finally {
        runningNodes.delete(nodeId);
      }
    });
    
    await Promise.all(promises);
  }
}

async function executeNode(
  socket: WebSocket,
  supabaseClient: any,
  node: ExecutionNode,
  context: ExecutionContext
) {
  const startTime = Date.now();
  
  // Send node execution started event
  socket.send(JSON.stringify({
    type: 'node_execution_started',
    nodeId: node.id,
    nodeType: node.type,
    sessionId: context.sessionId,
    timestamp: new Date().toISOString()
  }));

  try {
    // Check cache first
    const inputData = getNodeInputData(node, context);
    const cacheKey = executionCache.generateKey(node.id, inputData);
    const cachedResult = executionCache.get(cacheKey);
    
    if (cachedResult) {
      console.log(`Using cached result for node ${node.id}`);
      context.nodeResults.set(node.id, cachedResult);
      
      socket.send(JSON.stringify({
        type: 'node_execution_completed',
        nodeId: node.id,
        result: cachedResult,
        executionTime: 0,
        cached: true,
        sessionId: context.sessionId,
        timestamp: new Date().toISOString()
      }));
      
      return;
    }

    // Execute node with circuit breaker and retry
    const circuitBreaker = getCircuitBreaker(node.type);
    
    const result = await circuitBreaker.execute(async () => {
      return await withRetry(async () => {
        return await executeNodeLogic(socket, supabaseClient, node, inputData, context);
      }, 3, 1000);
    });
    
    // Cache result if successful
    if (result.success) {
      executionCache.set(cacheKey, result, 300000); // 5 minutes
      context.nodeResults.set(node.id, result);
      
      if (result.cost) {
        context.totalCost += result.cost;
      }
    }
    
    const executionTime = Date.now() - startTime;
    
    socket.send(JSON.stringify({
      type: 'node_execution_completed',
      nodeId: node.id,
      result,
      executionTime,
      totalCost: context.totalCost,
      sessionId: context.sessionId,
      timestamp: new Date().toISOString()
    }));

    // Log node execution
    await supabaseClient
      .from('simulation_metrics')
      .insert({
        simulation_id: context.sessionId,
        step_name: `${node.type}_${node.id}`,
        latency_ms: executionTime,
        cost_usd: result.cost || 0,
        tokens_input: result.tokensUsed || 0,
        tokens_output: result.tokensUsed || 0,
        model_name: result.model || 'unknown'
      });

  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    
    socket.send(JSON.stringify({
      type: 'node_execution_failed',
      nodeId: node.id,
      error: error.message,
      executionTime,
      sessionId: context.sessionId,
      timestamp: new Date().toISOString()
    }));
    
    throw error;
  }
}

function getNodeInputData(node: ExecutionNode, context: ExecutionContext): any {
  // For input nodes, use the initial input
  if (node.type === 'input') {
    return context.nodeResults.get('input') || {};
  }
  
  // For other nodes, combine results from all dependencies
  const inputData: any = {};
  
  // Find all nodes that connect to this node
  for (const [nodeId, result] of context.nodeResults.entries()) {
    if (nodeId !== node.id) {
      inputData[nodeId] = result;
    }
  }
  
  return inputData;
}

async function executeNodeLogic(
  socket: WebSocket,
  supabaseClient: any,
  node: ExecutionNode,
  inputData: any,
  context: ExecutionContext
): Promise<any> {
  const config = node.data?.config || {};
  
  switch (node.type) {
    case 'llm':
      return await executeLLMNode(socket, supabaseClient, config, inputData, context);
    case 'rag':
      return await executeRAGNode(socket, supabaseClient, config, inputData, context);
    case 'processor':
      return await executeProcessorNode(config, inputData);
    case 'input':
      return inputData;
    case 'output':
      return inputData;
    default:
      throw new Error(`Unsupported node type: ${node.type}`);
  }
}

async function executeLLMNode(
  socket: WebSocket,
  supabaseClient: any,
  config: any,
  inputData: any,
  context: ExecutionContext
): Promise<any> {
  if (!config.integrationId) {
    throw new Error('LLM integration not configured');
  }

  const prompt = typeof inputData === 'string' ? inputData : JSON.stringify(inputData);
  
  // Stream tokens if enabled
  const { data, error } = await supabaseClient.functions.invoke('enhanced-llm-processor', {
    body: {
      integrationId: config.integrationId,
      model: config.model,
      prompt,
      temperature: config.temperature,
      maxTokens: config.maxTokens,
      systemPrompt: config.systemPrompt,
      stream: true
    }
  });

  if (error) {
    throw new Error(`LLM processing failed: ${error.message}`);
  }

  // Send streaming tokens
  if (data.metadata?.responseTime) {
    socket.send(JSON.stringify({
      type: 'llm_token_stream',
      nodeId: config.nodeId,
      tokens: data.data?.choices?.[0]?.message?.content || '',
      cost: data.metadata.cost,
      sessionId: context.sessionId,
      timestamp: new Date().toISOString()
    }));
  }

  return {
    success: true,
    data: data.data?.choices?.[0]?.message?.content || data.data?.content?.[0]?.text,
    cost: data.metadata?.cost || 0,
    tokensUsed: data.metadata?.usage?.total_tokens || 0,
    model: data.metadata?.provider || 'unknown',
    responseTime: data.metadata?.responseTime || 0
  };
}

async function executeRAGNode(
  socket: WebSocket,
  supabaseClient: any,
  config: any,
  inputData: any,
  context: ExecutionContext
): Promise<any> {
  if (!config.integrationId) {
    throw new Error('RAG integration not configured');
  }

  const query = typeof inputData === 'string' ? inputData : JSON.stringify(inputData);
  
  const { data, error } = await supabaseClient.functions.invoke('enhanced-vector-operations', {
    body: {
      integrationId: config.integrationId,
      operation: 'search',
      query,
      topK: config.topK || 5
    }
  });

  if (error) {
    throw new Error(`RAG processing failed: ${error.message}`);
  }

  return {
    success: true,
    data: data.data,
    query,
    results: data.data?.length || 0,
    responseTime: data.metadata?.responseTime || 0
  };
}

async function executeProcessorNode(config: any, inputData: any): Promise<any> {
  // Simple text processing operations
  const operations = config.operations || [];
  let result = inputData;
  
  for (const operation of operations) {
    switch (operation.type) {
      case 'uppercase':
        result = typeof result === 'string' ? result.toUpperCase() : result;
        break;
      case 'lowercase':
        result = typeof result === 'string' ? result.toLowerCase() : result;
        break;
      case 'extract':
        if (typeof result === 'object' && operation.field) {
          result = result[operation.field];
        }
        break;
      case 'format':
        result = operation.template ? operation.template.replace('{input}', result) : result;
        break;
    }
  }
  
  return {
    success: true,
    data: result,
    operations: operations.length
  };
}