import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// Import text processing libraries for advanced optimization
import { RecursiveCharacterTextSplitter } from "https://esm.sh/@langchain/textsplitters@0.1.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OptimizationRequest {
  blueprintId: string;
  optimizationType: 'auto' | 'aggressive' | 'conservative';
  strategies: string[];
}

interface OptimizationMetrics {
  nodeCount: number;
  edgeCount: number;
  totalTokens: number;
  averagePromptLength: number;
  duplicateTemplates: number;
  unusedNodes: number;
}

// Advanced text compression using LangChain and heuristics
async function compressTextAdvanced(text: string, compressionLevel: number = 0.3): Promise<string> {
  if (!text || typeof text !== 'string') return text;
  
  // First apply basic compression
  let compressed = compressText(text, compressionLevel);
  
  // Use LangChain text splitter for large texts to find optimal chunks
  if (compressed.length > 1000) {
    try {
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 500,
        chunkOverlap: 50,
        separators: ['\n\n', '\n', '. ', '! ', '? ', '; ', ', ', ' ']
      });
      
      const chunks = await splitter.splitText(compressed);
      
      // Merge chunks back but remove redundancies between chunks
      compressed = chunks
        .map(chunk => chunk.trim())
        .filter(chunk => chunk.length > 10) // Remove very short chunks
        .join(' ')
        .replace(/\s+/g, ' ');
    } catch (error) {
      console.log('Advanced compression failed, using basic compression:', error);
    }
  }
  
  return compressed;
}

// Basic text compression using heuristics
function compressText(text: string, compressionLevel: number = 0.3): string {
  if (!text || typeof text !== 'string') return text;
  
  // Remove extra whitespace
  let compressed = text.replace(/\s+/g, ' ').trim();
  
  // Remove redundant phrases with enhanced patterns
  const redundantPhrases = [
    /please\s+/gi,
    /kindly\s+/gi,
    /you\s+are\s+requested\s+to\s+/gi,
    /i\s+would\s+like\s+you\s+to\s+/gi,
    /could\s+you\s+(please\s+)?/gi,
    /\s+and\s+also\s+/gi,
    /\s+as\s+well\s+as\s+/gi,
    /\s+in\s+addition\s+to\s+/gi,
    /\s+furthermore\s+/gi,
    /\s+moreover\s+/gi,
    /\s+additionally\s+/gi
  ];
  
  redundantPhrases.forEach(phrase => {
    compressed = compressed.replace(phrase, ' ');
  });
  
  // Simplify complex sentences (basic approach)
  if (compressionLevel > 0.5) {
    compressed = compressed
      .replace(/in\s+order\s+to\s+/gi, 'to ')
      .replace(/for\s+the\s+purpose\s+of\s+/gi, 'to ')
      .replace(/with\s+regard\s+to\s+/gi, 'regarding ')
      .replace(/it\s+is\s+important\s+to\s+note\s+that\s+/gi, '')
      .replace(/please\s+note\s+that\s+/gi, '')
      .replace(/it\s+should\s+be\s+noted\s+that\s+/gi, '')
      .replace(/one\s+must\s+consider\s+that\s+/gi, '');
  }
  
  // Aggressive compression (might affect meaning but saves tokens)
  if (compressionLevel > 0.8) {
    compressed = compressed
      .replace(/\s+the\s+/gi, ' ')
      .replace(/\s+a\s+/gi, ' ')
      .replace(/\s+an\s+/gi, ' ')
      .replace(/\s+is\s+/gi, ' ')
      .replace(/\s+are\s+/gi, ' ')
      .replace(/\s+will\s+be\s+/gi, ' ')
      .replace(/\s+can\s+be\s+/gi, ' ');
  }
  
  return compressed.replace(/\s+/g, ' ').trim();
}

// Estimate token count (rough approximation)
function estimateTokens(text: string): number {
  if (!text) return 0;
  // Rough estimate: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4);
}

// Template consolidation - find and merge similar templates
function consolidateTemplates(nodes: any[]): { optimizedNodes: any[], consolidations: number } {
  const promptNodes = nodes.filter(node => node.type === 'prompt-template');
  const consolidations: number[] = [];
  const optimizedNodes = [...nodes];
  
  // Find similar templates (simple similarity check)
  for (let i = 0; i < promptNodes.length; i++) {
    for (let j = i + 1; j < promptNodes.length; j++) {
      const template1 = promptNodes[i].data?.template || '';
      const template2 = promptNodes[j].data?.template || '';
      
      if (template1 && template2) {
        const similarity = calculateTextSimilarity(template1, template2);
        
        if (similarity > 0.7) { // 70% similarity threshold
          // Merge templates
          const mergedTemplate = mergeTemplates(template1, template2);
          const nodeIndex = optimizedNodes.findIndex(n => n.id === promptNodes[i].id);
          
          if (nodeIndex !== -1) {
            optimizedNodes[nodeIndex] = {
              ...optimizedNodes[nodeIndex],
              data: {
                ...optimizedNodes[nodeIndex].data,
                template: mergedTemplate,
                variables: [...(promptNodes[i].data?.variables || []), ...(promptNodes[j].data?.variables || [])]
              }
            };
          }
          
          // Remove the duplicate node
          const duplicateIndex = optimizedNodes.findIndex(n => n.id === promptNodes[j].id);
          if (duplicateIndex !== -1) {
            optimizedNodes.splice(duplicateIndex, 1);
            consolidations.push(j);
          }
        }
      }
    }
  }
  
  return { optimizedNodes, consolidations: consolidations.length };
}

function calculateTextSimilarity(text1: string, text2: string): number {
  const words1 = text1.toLowerCase().split(/\s+/);
  const words2 = text2.toLowerCase().split(/\s+/);
  
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}

function mergeTemplates(template1: string, template2: string): string {
  // Simple merge - take the shorter template as base and add unique parts
  const shorter = template1.length <= template2.length ? template1 : template2;
  const longer = template1.length > template2.length ? template1 : template2;
  
  // Extract unique parts from longer template
  const shorterWords = shorter.toLowerCase().split(/\s+/);
  const longerWords = longer.toLowerCase().split(/\s+/);
  
  const uniqueWords = longerWords.filter(word => !shorterWords.includes(word));
  
  if (uniqueWords.length > 0) {
    return `${shorter} ${uniqueWords.join(' ')}`.trim();
  }
  
  return shorter;
}

// Node pruning - remove unnecessary or redundant nodes
function pruneNodes(nodes: any[], edges: any[]): { optimizedNodes: any[], optimizedEdges: any[], prunedCount: number } {
  const optimizedNodes = [...nodes];
  const optimizedEdges = [...edges];
  let prunedCount = 0;
  
  // Find isolated nodes (no connections)
  const connectedNodeIds = new Set([
    ...edges.map(e => e.source),
    ...edges.map(e => e.target)
  ]);
  
  const isolatedNodes = nodes.filter(node => !connectedNodeIds.has(node.id));
  
  // Remove isolated nodes
  isolatedNodes.forEach(node => {
    const index = optimizedNodes.findIndex(n => n.id === node.id);
    if (index !== -1) {
      optimizedNodes.splice(index, 1);
      prunedCount++;
    }
  });
  
  // Find redundant memory store nodes
  const memoryNodes = optimizedNodes.filter(node => node.type === 'memory-store');
  if (memoryNodes.length > 1) {
    // Keep only the first memory node, remove others
    for (let i = 1; i < memoryNodes.length; i++) {
      const nodeIndex = optimizedNodes.findIndex(n => n.id === memoryNodes[i].id);
      if (nodeIndex !== -1) {
        optimizedNodes.splice(nodeIndex, 1);
        
        // Remove associated edges
        const edgesToRemove = optimizedEdges.filter(e => 
          e.source === memoryNodes[i].id || e.target === memoryNodes[i].id
        );
        
        edgesToRemove.forEach(edge => {
          const edgeIndex = optimizedEdges.findIndex(e => e.id === edge.id);
          if (edgeIndex !== -1) {
            optimizedEdges.splice(edgeIndex, 1);
          }
        });
        
        prunedCount++;
      }
    }
  }
  
  return { optimizedNodes, optimizedEdges, prunedCount };
}

// Parameter optimization
function optimizeParameters(nodes: any[]): { optimizedNodes: any[], optimizations: string[] } {
  const optimizedNodes = [...nodes];
  const optimizations: string[] = [];
  
  optimizedNodes.forEach(node => {
    switch (node.type) {
      case 'memory-store':
        // Optimize memory parameters
        if (node.data?.maxTokens > 4000) {
          node.data.maxTokens = 2000;
          optimizations.push(`Reduced memory token limit for ${node.id}`);
        }
        if (node.data?.ttl > 120) {
          node.data.ttl = 60;
          optimizations.push(`Optimized TTL for ${node.id}`);
        }
        break;
        
      case 'rag-retriever':
        // Optimize RAG parameters
        if (node.data?.maxResults > 5) {
          node.data.maxResults = 3;
          optimizations.push(`Reduced RAG results for ${node.id}`);
        }
        break;
        
      case 'state-tracker':
        // Optimize state tracking
        if (node.data?.maxHistory > 10) {
          node.data.maxHistory = 5;
          optimizations.push(`Reduced state history for ${node.id}`);
        }
        break;
    }
  });
  
  return { optimizedNodes, optimizations };
}

// Calculate metrics for a blueprint
function calculateMetrics(nodes: any[], edges: any[]): OptimizationMetrics {
  let totalTokens = 0;
  let totalPromptLength = 0;
  let promptCount = 0;
  let duplicateTemplates = 0;
  
  const templates = new Set();
  
  nodes.forEach(node => {
    if (node.type === 'prompt-template' && node.data?.template) {
      const template = node.data.template;
      totalTokens += estimateTokens(template);
      totalPromptLength += template.length;
      promptCount++;
      
      if (templates.has(template)) {
        duplicateTemplates++;
      } else {
        templates.add(template);
      }
    }
    
    // Add tokens from other text fields
    if (node.data?.description) {
      totalTokens += estimateTokens(node.data.description);
    }
    if (node.data?.label) {
      totalTokens += estimateTokens(node.data.label);
    }
  });
  
  // Find unused nodes (nodes with no outgoing edges for non-output nodes)
  const outputNodeTypes = ['output-parser'];
  const connectedSources = new Set(edges.map(e => e.source));
  const unusedNodes = nodes.filter(node => 
    !outputNodeTypes.includes(node.type) && !connectedSources.has(node.id)
  ).length;
  
  return {
    nodeCount: nodes.length,
    edgeCount: edges.length,
    totalTokens,
    averagePromptLength: promptCount > 0 ? totalPromptLength / promptCount : 0,
    duplicateTemplates,
    unusedNodes
  };
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

    const { blueprintId, optimizationType, strategies }: OptimizationRequest = await req.json();
    const optimizationStartTime = Date.now();

    // Get the blueprint
    const { data: blueprint, error: blueprintError } = await supabaseClient
      .from('blueprints')
      .select('*')
      .eq('id', blueprintId)
      .eq('user_id', user.id)
      .single();

    if (blueprintError) throw blueprintError;

    // Calculate before metrics
    const beforeMetrics = calculateMetrics(blueprint.nodes, blueprint.edges);
    
    let optimizedNodes = [...blueprint.nodes];
    let optimizedEdges = [...blueprint.edges];
    const appliedStrategies: string[] = [];
    const optimizationDetails: string[] = [];

    // Apply optimization strategies
    if (strategies.includes('text_compression')) {
      const compressionLevel = optimizationType === 'aggressive' ? 0.8 : 
                              optimizationType === 'conservative' ? 0.3 : 0.5;
      
      // Process nodes with async compression
      const compressionPromises = optimizedNodes.map(async (node) => {
        if (node.type === 'prompt-template' && node.data?.template) {
          const originalTemplate = node.data.template;
          
          // Use advanced compression for larger templates
          const compressedTemplate = originalTemplate.length > 500 
            ? await compressTextAdvanced(originalTemplate, compressionLevel)
            : compressText(originalTemplate, compressionLevel);
          
          if (compressedTemplate !== originalTemplate) {
            optimizationDetails.push(`Compressed template in ${node.id}: ${originalTemplate.length} → ${compressedTemplate.length} chars`);
            
            return {
              ...node,
              data: {
                ...node.data,
                template: compressedTemplate
              }
            };
          }
        }
        return node;
      });
      
      optimizedNodes = await Promise.all(compressionPromises);
      appliedStrategies.push('text_compression');
    }

    if (strategies.includes('template_consolidation')) {
      const consolidationResult = consolidateTemplates(optimizedNodes);
      optimizedNodes = consolidationResult.optimizedNodes;
      
      if (consolidationResult.consolidations > 0) {
        optimizationDetails.push(`Consolidated ${consolidationResult.consolidations} duplicate templates`);
        appliedStrategies.push('template_consolidation');
      }
    }

    if (strategies.includes('node_pruning')) {
      const pruningResult = pruneNodes(optimizedNodes, optimizedEdges);
      optimizedNodes = pruningResult.optimizedNodes;
      optimizedEdges = pruningResult.optimizedEdges;
      
      if (pruningResult.prunedCount > 0) {
        optimizationDetails.push(`Removed ${pruningResult.prunedCount} unnecessary nodes`);
        appliedStrategies.push('node_pruning');
      }
    }

    if (strategies.includes('parameter_optimization')) {
      const paramResult = optimizeParameters(optimizedNodes);
      optimizedNodes = paramResult.optimizedNodes;
      
      if (paramResult.optimizations.length > 0) {
        optimizationDetails.push(...paramResult.optimizations);
        appliedStrategies.push('parameter_optimization');
      }
    }

    // Calculate after metrics
    const afterMetrics = calculateMetrics(optimizedNodes, optimizedEdges);
    
    // Calculate improvements
    const tokenSavingsPercent = beforeMetrics.totalTokens > 0 ? 
      ((beforeMetrics.totalTokens - afterMetrics.totalTokens) / beforeMetrics.totalTokens) * 100 : 0;
    
    const nodeSavingsPercent = beforeMetrics.nodeCount > 0 ? 
      ((beforeMetrics.nodeCount - afterMetrics.nodeCount) / beforeMetrics.nodeCount) * 100 : 0;
    
    // Performance improvement estimation (based on token reduction and node pruning)
    const performanceImprovementPercent = (tokenSavingsPercent * 0.6) + (nodeSavingsPercent * 0.4);

    const executionTime = Date.now() - optimizationStartTime;

    // Save optimization result
    const { data: optimizationRecord, error: saveError } = await supabaseClient
      .from('optimized_blueprints')
      .insert({
        original_blueprint_id: blueprintId,
        user_id: user.id,
        optimized_nodes: optimizedNodes,
        optimized_edges: optimizedEdges,
        optimization_metrics: {
          beforeMetrics,
          afterMetrics,
          improvements: {
            tokenSavingsPercent,
            performanceImprovementPercent,
            nodeReduction: beforeMetrics.nodeCount - afterMetrics.nodeCount
          }
        },
        optimization_strategies: appliedStrategies,
        token_savings_percent: tokenSavingsPercent,
        performance_improvement_percent: performanceImprovementPercent,
        optimization_type: optimizationType
      })
      .select()
      .single();

    if (saveError) throw saveError;

    // Save optimization history
    await supabaseClient
      .from('optimization_history')
      .insert({
        blueprint_id: blueprintId,
        user_id: user.id,
        optimization_type: optimizationType,
        strategies_applied: appliedStrategies,
        before_metrics: beforeMetrics,
        after_metrics: afterMetrics,
        improvements: {
          tokenSavingsPercent,
          performanceImprovementPercent,
          details: optimizationDetails
        },
        execution_time_ms: executionTime
      });

    return new Response(JSON.stringify({
      success: true,
      optimizationId: optimizationRecord.id,
      strategiesApplied: appliedStrategies,
      beforeMetrics,
      afterMetrics,
      improvements: {
        tokenSavingsPercent,
        performanceImprovementPercent,
        nodeReduction: beforeMetrics.nodeCount - afterMetrics.nodeCount,
        details: optimizationDetails
      },
      optimizedNodes,
      optimizedEdges,
      executionTime
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Blueprint optimization error:', error);
    
    // Save failed optimization attempt
    try {
      await supabaseClient
        .from('optimization_history')
        .insert({
          blueprint_id: req.body?.blueprintId,
          user_id: user?.id,
          optimization_type: req.body?.optimizationType || 'auto',
          strategies_applied: req.body?.strategies || [],
          before_metrics: {},
          after_metrics: {},
          improvements: {},
          success: false,
          error_message: error.message,
          execution_time_ms: Date.now()
        });
    } catch (logError) {
      console.error('Failed to log optimization error:', logError);
    }

    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
