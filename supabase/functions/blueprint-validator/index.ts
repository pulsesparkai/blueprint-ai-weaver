import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  nodeId?: string;
  edgeId?: string;
  message: string;
  field?: string;
  suggestion?: string;
}

interface ValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
  score: number;
  recommendations: string[];
}

class BlueprintValidator {
  private issues: ValidationIssue[] = [];

  validate(blueprint: any): ValidationResult {
    this.issues = [];
    
    this.validateStructure(blueprint);
    this.validateNodes(blueprint.nodes || []);
    this.validateEdges(blueprint.edges || [], blueprint.nodes || []);
    this.validateFlow(blueprint.nodes || [], blueprint.edges || []);
    this.validateConfiguration(blueprint.nodes || []);

    const errorCount = this.issues.filter(i => i.type === 'error').length;
    const warningCount = this.issues.filter(i => i.type === 'warning').length;
    
    // Calculate score based on issues
    const score = Math.max(0, 100 - (errorCount * 15) - (warningCount * 5));
    
    return {
      isValid: errorCount === 0,
      issues: this.issues,
      score,
      recommendations: this.generateRecommendations()
    };
  }

  private validateStructure(blueprint: any) {
    if (!blueprint.title || blueprint.title.trim().length === 0) {
      this.addIssue('error', undefined, undefined, 'Blueprint must have a title', 'title');
    }

    if (!blueprint.nodes || !Array.isArray(blueprint.nodes)) {
      this.addIssue('error', undefined, undefined, 'Blueprint must have a nodes array', 'nodes');
    }

    if (!blueprint.edges || !Array.isArray(blueprint.edges)) {
      this.addIssue('error', undefined, undefined, 'Blueprint must have an edges array', 'edges');
    }

    if (blueprint.nodes && blueprint.nodes.length === 0) {
      this.addIssue('warning', undefined, undefined, 'Blueprint has no nodes - it will not process any data');
    }
  }

  private validateNodes(nodes: any[]) {
    if (!nodes.length) return;

    const nodeIds = new Set();
    const nodeTypes = nodes.map(n => n.type);
    
    for (const node of nodes) {
      // Check for required fields
      if (!node.id) {
        this.addIssue('error', undefined, undefined, 'Node missing required id field');
        continue;
      }

      if (!node.type) {
        this.addIssue('error', node.id, undefined, 'Node missing required type field');
        continue;
      }

      // Check for duplicate IDs
      if (nodeIds.has(node.id)) {
        this.addIssue('error', node.id, undefined, 'Duplicate node ID found');
      }
      nodeIds.add(node.id);

      // Validate node-specific configurations
      this.validateNodeType(node);
    }

    // Check for recommended node types
    if (!nodeTypes.includes('promptTemplate') && !nodeTypes.includes('PromptTemplateNode')) {
      this.addIssue('warning', undefined, undefined, 'Consider adding a Prompt Template node for better AI responses');
    }

    if (nodeTypes.includes('ragRetriever') && !nodeTypes.includes('outputParser')) {
      this.addIssue('info', undefined, undefined, 'RAG pipelines often benefit from output parsing');
    }
  }

  private validateNodeType(node: any) {
    const { type, data = {} } = node;

    switch (type) {
      case 'promptTemplate':
      case 'PromptTemplateNode':
        if (!data.template || data.template.trim() === '') {
          this.addIssue('error', node.id, undefined, 'Prompt template is required', 'template');
        }
        if (data.template && !data.template.includes('{')) {
          this.addIssue('warning', node.id, undefined, 'Prompt template should include variables like {input}');
        }
        break;

      case 'ragRetriever':
      case 'RAGRetrieverNode':
        if (!data.vectorStore) {
          this.addIssue('error', node.id, undefined, 'RAG node requires vector store configuration');
        }
        if (data.topK && (data.topK < 1 || data.topK > 20)) {
          this.addIssue('warning', node.id, undefined, 'Top K should be between 1 and 20 for optimal results');
        }
        break;

      case 'memoryStore':
      case 'MemoryStoreNode':
        if (!data.operation) {
          this.addIssue('error', node.id, undefined, 'Memory node requires operation type');
        }
        if (!data.key) {
          this.addIssue('warning', node.id, undefined, 'Memory node should specify a key for storage');
        }
        break;

      case 'outputParser':
      case 'OutputParserNode':
        if (!data.parserType) {
          this.addIssue('warning', node.id, undefined, 'Output parser type not specified');
        }
        if (data.parserType === 'structured' && !data.schema) {
          this.addIssue('error', node.id, undefined, 'Structured parser requires schema definition');
        }
        break;
    }
  }

  private validateEdges(edges: any[], nodes: any[]) {
    const nodeIds = new Set(nodes.map(n => n.id));
    
    for (const edge of edges) {
      if (!edge.id) {
        this.addIssue('error', undefined, undefined, 'Edge missing required id field');
        continue;
      }

      if (!edge.source || !nodeIds.has(edge.source)) {
        this.addIssue('error', undefined, edge.id, 'Edge source node does not exist');
      }

      if (!edge.target || !nodeIds.has(edge.target)) {
        this.addIssue('error', undefined, edge.id, 'Edge target node does not exist');
      }
    }
  }

  private validateFlow(nodes: any[], edges: any[]) {
    if (!nodes.length || !edges.length) return;

    // Check for cycles
    if (this.hasCycles(nodes, edges)) {
      this.addIssue('error', undefined, undefined, 'Blueprint contains circular dependencies');
    }

    // Check for isolated nodes
    const connectedNodes = new Set();
    edges.forEach(edge => {
      connectedNodes.add(edge.source);
      connectedNodes.add(edge.target);
    });

    const isolatedNodes = nodes.filter(node => !connectedNodes.has(node.id));
    if (isolatedNodes.length > 0) {
      this.addIssue('warning', undefined, undefined, `${isolatedNodes.length} nodes are not connected to the pipeline`);
    }

    // Check for entry points
    const targetNodes = new Set(edges.map(e => e.target));
    const entryNodes = nodes.filter(node => !targetNodes.has(node.id));
    
    if (entryNodes.length === 0) {
      this.addIssue('error', undefined, undefined, 'No entry point found - all nodes have inputs');
    } else if (entryNodes.length > 3) {
      this.addIssue('warning', undefined, undefined, 'Multiple entry points detected - consider simplifying the flow');
    }

    // Check for output nodes
    const sourceNodes = new Set(edges.map(e => e.source));
    const outputNodes = nodes.filter(node => !sourceNodes.has(node.id));
    
    if (outputNodes.length === 0) {
      this.addIssue('warning', undefined, undefined, 'No clear output node - results may not be properly captured');
    }
  }

  private validateConfiguration(nodes: any[]) {
    const llmNodes = nodes.filter(n => 
      ['promptTemplate', 'PromptTemplateNode', 'ragRetriever', 'RAGRetrieverNode'].includes(n.type)
    );

    for (const node of llmNodes) {
      const { data = {} } = node;
      
      if (data.temperature && (data.temperature < 0 || data.temperature > 2)) {
        this.addIssue('warning', node.id, undefined, 'Temperature should be between 0 and 2');
      }

      if (data.maxTokens && data.maxTokens > 4000) {
        this.addIssue('warning', node.id, undefined, 'High token limit may increase costs significantly');
      }

      if (!data.provider) {
        this.addIssue('info', node.id, undefined, 'Consider specifying an LLM provider for consistent behavior');
      }
    }
  }

  private hasCycles(nodes: any[], edges: any[]): boolean {
    const graph = new Map<string, string[]>();
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    // Build adjacency list
    nodes.forEach(node => graph.set(node.id, []));
    edges.forEach(edge => {
      if (graph.has(edge.source)) {
        graph.get(edge.source)!.push(edge.target);
      }
    });

    // DFS to detect cycles
    const hasCycleDFS = (nodeId: string): boolean => {
      if (recursionStack.has(nodeId)) return true;
      if (visited.has(nodeId)) return false;

      visited.add(nodeId);
      recursionStack.add(nodeId);

      const neighbors = graph.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (hasCycleDFS(neighbor)) return true;
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const node of nodes) {
      if (!visited.has(node.id)) {
        if (hasCycleDFS(node.id)) return true;
      }
    }

    return false;
  }

  private addIssue(type: 'error' | 'warning' | 'info', nodeId?: string, edgeId?: string, message?: string, field?: string) {
    this.issues.push({
      type,
      nodeId,
      edgeId,
      message: message || 'Unknown validation issue',
      field,
      suggestion: this.getSuggestion(type, message)
    });
  }

  private getSuggestion(type: string, message?: string): string {
    if (!message) return '';
    
    if (message.includes('template')) {
      return 'Add a template with variables like {input} or {context}';
    }
    if (message.includes('vector store')) {
      return 'Configure a vector database connection (Pinecone, Weaviate, etc.)';
    }
    if (message.includes('cycle') || message.includes('circular')) {
      return 'Remove connections that create loops in your pipeline';
    }
    if (message.includes('entry point')) {
      return 'Ensure at least one node has no incoming connections';
    }
    
    return '';
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const errorCount = this.issues.filter(i => i.type === 'error').length;
    const warningCount = this.issues.filter(i => i.type === 'warning').length;

    if (errorCount > 0) {
      recommendations.push(`Fix ${errorCount} critical error${errorCount > 1 ? 's' : ''} before deployment`);
    }

    if (warningCount > 5) {
      recommendations.push('Consider simplifying your pipeline to improve maintainability');
    }

    const nodeTypes = this.issues
      .filter(i => i.nodeId && i.type === 'error')
      .map(i => i.message)
      .filter((msg, i, arr) => arr.indexOf(msg) === i);

    if (nodeTypes.length > 0) {
      recommendations.push('Review node configurations for completeness');
    }

    recommendations.push('Test your pipeline with sample data before production use');
    
    return recommendations;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate user
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Authorization required');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    const { blueprintId } = await req.json();

    if (!blueprintId) {
      throw new Error('Blueprint ID is required');
    }

    // Fetch blueprint
    const { data: blueprint, error: blueprintError } = await supabase
      .from('blueprints')
      .select('*')
      .eq('id', blueprintId)
      .eq('user_id', user.id)
      .single();

    if (blueprintError || !blueprint) {
      throw new Error('Blueprint not found or access denied');
    }

    // Validate blueprint
    const validator = new BlueprintValidator();
    const result = validator.validate(blueprint);

    console.log(`Validation completed for blueprint ${blueprintId}: ${result.isValid ? 'VALID' : 'INVALID'} (Score: ${result.score})`);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Blueprint validation error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});