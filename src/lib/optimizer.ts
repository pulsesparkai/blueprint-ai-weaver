import { supabase } from '@/integrations/supabase/client';

export interface NodeConfig {
  id: string;
  type: string;
  data: {
    label?: string;
    prompt?: string;
    systemPrompt?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    chunkSize?: number;
    overlap?: number;
    topK?: number;
    vectorStore?: string;
    [key: string]: any;
  };
  position: { x: number; y: number };
}

export interface EdgeConfig {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface OptimizationSuggestion {
  id: string;
  type: 'token_reduction' | 'cost_savings' | 'performance' | 'redundancy' | 'caching' | 'rag_optimization';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  impact: {
    tokenReduction?: number;
    costSavings?: number;
    performanceGain?: number;
  };
  before: string;
  after: string;
  nodeId?: string;
  implementation: {
    difficulty: 'easy' | 'medium' | 'hard';
    timeEstimate: string;
    steps: string[];
  };
}

export interface OptimizationReport {
  suggestions: OptimizationSuggestion[];
  summary: {
    totalTokenReduction: number;
    totalCostSavings: number;
    totalPerformanceGain: number;
    totalSuggestions: number;
  };
  nodeAnalysis: {
    [nodeId: string]: {
      currentTokens: number;
      estimatedCost: number;
      optimizationPotential: number;
    };
  };
}

export class PipelineOptimizer {
  private nodes: NodeConfig[];
  private edges: EdgeConfig[];
  private modelPricing: Record<string, { input: number; output: number }>;

  constructor(nodes: NodeConfig[], edges: EdgeConfig[]) {
    this.nodes = nodes;
    this.edges = edges;
    this.modelPricing = {
      'gpt-4.1-2025-04-14': { input: 0.01, output: 0.03 }, // per 1k tokens
      'gpt-4o': { input: 0.005, output: 0.015 },
      'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
      'claude-3.5-sonnet': { input: 0.003, output: 0.015 },
      'claude-3-haiku': { input: 0.00025, output: 0.00125 }
    };
  }

  async analyze(): Promise<OptimizationReport> {
    const suggestions: OptimizationSuggestion[] = [];
    const nodeAnalysis: Record<string, any> = {};

    // Analyze each node
    for (const node of this.nodes) {
      const analysis = this.analyzeNode(node);
      nodeAnalysis[node.id] = analysis;

      // Generate suggestions for this node
      suggestions.push(...this.generateNodeSuggestions(node, analysis));
    }

    // Analyze pipeline structure
    suggestions.push(...this.analyzePipelineStructure());

    // Analyze RAG configurations
    suggestions.push(...this.analyzeRAGNodes());

    // Analyze caching opportunities
    suggestions.push(...this.analyzeCachingOpportunities());

    // Calculate summary
    const summary = this.calculateSummary(suggestions);

    return {
      suggestions: suggestions.sort((a, b) => {
        const severityOrder = { high: 3, medium: 2, low: 1 };
        return severityOrder[b.severity] - severityOrder[a.severity];
      }),
      summary,
      nodeAnalysis
    };
  }

  private analyzeNode(node: NodeConfig) {
    const tokens = this.estimateTokenUsage(node);
    const cost = this.estimateCost(node, tokens);
    const optimizationPotential = this.calculateOptimizationPotential(node);

    return {
      currentTokens: tokens,
      estimatedCost: cost,
      optimizationPotential
    };
  }

  private estimateTokenUsage(node: NodeConfig): number {
    let tokens = 0;

    // Estimate tokens based on node type and configuration
    switch (node.type) {
      case 'PromptTemplateNode':
      case 'LLMNode':
        tokens += this.countTokens(node.data.systemPrompt || '');
        tokens += this.countTokens(node.data.prompt || '');
        tokens += node.data.maxTokens || 1000; // Output tokens
        break;
      case 'RAGRetrieverNode':
        tokens += (node.data.topK || 5) * (node.data.chunkSize || 1000) * 0.25; // Rough estimate
        break;
      case 'ContextBuilderNode':
        tokens += this.countTokens(node.data.template || '') * 2; // Input + processing
        break;
    }

    return Math.ceil(tokens);
  }

  private countTokens(text: string): number {
    // Rough token estimation: ~4 characters per token for English
    return Math.ceil(text.length / 4);
  }

  private estimateCost(node: NodeConfig, tokens: number): number {
    const model = node.data.model || 'gpt-4o-mini';
    const pricing = this.modelPricing[model] || this.modelPricing['gpt-4o-mini'];
    
    // Assume 70% input tokens, 30% output tokens
    const inputTokens = tokens * 0.7;
    const outputTokens = tokens * 0.3;
    
    return (inputTokens * pricing.input + outputTokens * pricing.output) / 1000;
  }

  private calculateOptimizationPotential(node: NodeConfig): number {
    let potential = 0;

    // Check for optimization opportunities
    if (node.type === 'PromptTemplateNode' || node.type === 'LLMNode') {
      const promptLength = (node.data.prompt || '').length;
      const systemPromptLength = (node.data.systemPrompt || '').length;
      
      // High potential if prompts are very long
      if (promptLength > 2000) potential += 30;
      if (systemPromptLength > 1000) potential += 20;
      
      // Check for redundant instructions
      if (this.hasRedundantInstructions(node.data.prompt || '')) potential += 15;
      
      // Check for inefficient model selection
      if (node.data.model === 'gpt-4.1-2025-04-14' && !this.requiresAdvancedReasoning(node)) {
        potential += 25;
      }
    }

    if (node.type === 'RAGRetrieverNode') {
      const chunkSize = node.data.chunkSize || 1000;
      const topK = node.data.topK || 5;
      
      // High potential if chunk size is not optimal
      if (chunkSize > 1500 || chunkSize < 500) potential += 20;
      if (topK > 10) potential += 15;
    }

    return Math.min(potential, 100);
  }

  private hasRedundantInstructions(prompt: string): boolean {
    const redundantPhrases = [
      'please', 'kindly', 'make sure to', 'ensure that', 'be sure to',
      'it is important', 'remember to', 'do not forget'
    ];
    
    let count = 0;
    for (const phrase of redundantPhrases) {
      if (prompt.toLowerCase().includes(phrase)) count++;
    }
    
    return count > 3;
  }

  private requiresAdvancedReasoning(node: NodeConfig): boolean {
    const prompt = (node.data.prompt || '').toLowerCase();
    const systemPrompt = (node.data.systemPrompt || '').toLowerCase();
    const combined = prompt + ' ' + systemPrompt;
    
    const advancedKeywords = [
      'analyze', 'reasoning', 'complex', 'multi-step', 'logic', 'solve',
      'calculate', 'mathematical', 'research', 'academic', 'scientific'
    ];
    
    return advancedKeywords.some(keyword => combined.includes(keyword));
  }

  private generateNodeSuggestions(node: NodeConfig, analysis: any): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // Token reduction suggestions
    if (node.type === 'PromptTemplateNode' || node.type === 'LLMNode') {
      const prompt = node.data.prompt || '';
      const systemPrompt = node.data.systemPrompt || '';

      // Suggest prompt optimization
      if (prompt.length > 1500) {
        suggestions.push({
          id: `${node.id}-prompt-reduction`,
          type: 'token_reduction',
          severity: 'medium',
          title: 'Optimize Prompt Length',
          description: 'This prompt is quite long and could be made more concise without losing effectiveness.',
          impact: {
            tokenReduction: Math.ceil(prompt.length * 0.3 / 4),
            costSavings: analysis.estimatedCost * 0.3
          },
          before: prompt.substring(0, 100) + '...',
          after: this.optimizePrompt(prompt).substring(0, 100) + '...',
          nodeId: node.id,
          implementation: {
            difficulty: 'medium',
            timeEstimate: '15-30 minutes',
            steps: [
              'Remove redundant instructions',
              'Use bullet points instead of paragraphs',
              'Combine similar requirements',
              'Remove filler words and phrases'
            ]
          }
        });
      }

      // Model optimization
      if (node.data.model === 'gpt-4.1-2025-04-14' && !this.requiresAdvancedReasoning(node)) {
        suggestions.push({
          id: `${node.id}-model-optimization`,
          type: 'cost_savings',
          severity: 'high',
          title: 'Use More Cost-Effective Model',
          description: 'This task doesn\'t require advanced reasoning and could use a cheaper model.',
          impact: {
            costSavings: analysis.estimatedCost * 0.7
          },
          before: `Model: ${node.data.model}`,
          after: 'Model: gpt-4o-mini',
          nodeId: node.id,
          implementation: {
            difficulty: 'easy',
            timeEstimate: '2 minutes',
            steps: [
              'Change model to gpt-4o-mini',
              'Test output quality',
              'Adjust temperature if needed'
            ]
          }
        });
      }

      // Temperature optimization
      if (node.data.temperature && node.data.temperature > 0.7) {
        suggestions.push({
          id: `${node.id}-temperature-optimization`,
          type: 'performance',
          severity: 'low',
          title: 'Optimize Temperature Setting',
          description: 'Lower temperature can improve consistency and reduce processing time.',
          impact: {
            performanceGain: 15
          },
          before: `Temperature: ${node.data.temperature}`,
          after: 'Temperature: 0.3-0.5',
          nodeId: node.id,
          implementation: {
            difficulty: 'easy',
            timeEstimate: '1 minute',
            steps: [
              'Reduce temperature to 0.3-0.5',
              'Test for consistency improvements'
            ]
          }
        });
      }
    }

    return suggestions;
  }

  private optimizePrompt(prompt: string): string {
    let optimized = prompt;
    
    // Remove redundant phrases
    const redundantPhrases = [
      /please\s+/gi,
      /kindly\s+/gi,
      /make sure to\s+/gi,
      /ensure that\s+/gi,
      /be sure to\s+/gi,
      /it is important\s+(to\s+)?/gi,
      /remember to\s+/gi,
      /do not forget\s+(to\s+)?/gi
    ];
    
    redundantPhrases.forEach(phrase => {
      optimized = optimized.replace(phrase, '');
    });
    
    // Convert paragraphs to bullet points
    optimized = optimized.replace(/\.\s+([A-Z])/g, '\n• $1');
    
    // Remove extra whitespace
    optimized = optimized.replace(/\s+/g, ' ').trim();
    
    return optimized;
  }

  private analyzePipelineStructure(): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];

    // Check for redundant nodes
    const redundantNodes = this.findRedundantNodes();
    for (const nodeGroup of redundantNodes) {
      suggestions.push({
        id: `redundant-nodes-${nodeGroup.join('-')}`,
        type: 'redundancy',
        severity: 'medium',
        title: 'Remove Redundant Nodes',
        description: 'These nodes perform similar functions and could be consolidated.',
        impact: {
          tokenReduction: 500,
          costSavings: 0.02,
          performanceGain: 25
        },
        before: `${nodeGroup.length} separate nodes`,
        after: '1 consolidated node',
        implementation: {
          difficulty: 'medium',
          timeEstimate: '30-45 minutes',
          steps: [
            'Analyze node functionalities',
            'Merge similar operations',
            'Update connections',
            'Test consolidated flow'
          ]
        }
      });
    }

    // Check for unnecessary serial processing
    const parallelizableNodes = this.findParallelizableNodes();
    if (parallelizableNodes.length > 0) {
      suggestions.push({
        id: 'parallelize-nodes',
        type: 'performance',
        severity: 'medium',
        title: 'Parallelize Independent Operations',
        description: 'Some nodes can run in parallel to improve overall pipeline speed.',
        impact: {
          performanceGain: 40
        },
        before: 'Sequential execution',
        after: 'Parallel execution',
        implementation: {
          difficulty: 'medium',
          timeEstimate: '20-30 minutes',
          steps: [
            'Identify independent nodes',
            'Restructure pipeline flow',
            'Test parallel execution',
            'Verify output consistency'
          ]
        }
      });
    }

    return suggestions;
  }

  private findRedundantNodes(): string[][] {
    const redundantGroups: string[][] = [];
    const processed = new Set<string>();

    for (const node of this.nodes) {
      if (processed.has(node.id)) continue;

      const similarNodes = this.nodes.filter(n => 
        n.id !== node.id && 
        !processed.has(n.id) &&
        this.nodesAreSimilar(node, n)
      );

      if (similarNodes.length > 0) {
        const group = [node.id, ...similarNodes.map(n => n.id)];
        redundantGroups.push(group);
        group.forEach(id => processed.add(id));
      }
    }

    return redundantGroups;
  }

  private nodesAreSimilar(node1: NodeConfig, node2: NodeConfig): boolean {
    if (node1.type !== node2.type) return false;

    // Check if prompts are very similar
    if (node1.type === 'PromptTemplateNode' || node1.type === 'LLMNode') {
      const prompt1 = node1.data.prompt || '';
      const prompt2 = node2.data.prompt || '';
      return this.textSimilarity(prompt1, prompt2) > 0.8;
    }

    // Check if RAG configurations are similar
    if (node1.type === 'RAGRetrieverNode') {
      return node1.data.vectorStore === node2.data.vectorStore &&
             Math.abs((node1.data.topK || 5) - (node2.data.topK || 5)) <= 1;
    }

    return false;
  }

  private textSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  private findParallelizableNodes(): string[] {
    const parallelizable: string[] = [];
    
    // Find nodes that don't depend on each other
    for (const node of this.nodes) {
      const hasIncomingEdges = this.edges.some(edge => edge.target === node.id);
      const hasOutgoingEdges = this.edges.some(edge => edge.source === node.id);
      
      // Nodes that are independent can potentially be parallelized
      if (!hasIncomingEdges || !hasOutgoingEdges) {
        parallelizable.push(node.id);
      }
    }
    
    return parallelizable.slice(0, 3); // Limit suggestions
  }

  private analyzeRAGNodes(): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    
    const ragNodes = this.nodes.filter(node => node.type === 'RAGRetrieverNode');
    
    for (const node of ragNodes) {
      const chunkSize = node.data.chunkSize || 1000;
      const topK = node.data.topK || 5;
      
      // Suggest optimal chunk size
      if (chunkSize > 1500) {
        suggestions.push({
          id: `${node.id}-chunk-size`,
          type: 'rag_optimization',
          severity: 'medium',
          title: 'Optimize Chunk Size',
          description: 'Large chunk sizes can lead to less precise retrieval and higher costs.',
          impact: {
            tokenReduction: (chunkSize - 1000) * topK,
            costSavings: ((chunkSize - 1000) * topK * 0.00015) / 1000
          },
          before: `Chunk size: ${chunkSize}`,
          after: 'Chunk size: 1000',
          nodeId: node.id,
          implementation: {
            difficulty: 'easy',
            timeEstimate: '5 minutes',
            steps: [
              'Reduce chunk size to 1000 characters',
              'Test retrieval quality',
              'Adjust if needed'
            ]
          }
        });
      }
      
      // Suggest optimal topK
      if (topK > 8) {
        suggestions.push({
          id: `${node.id}-topk-optimization`,
          type: 'rag_optimization',
          severity: 'low',
          title: 'Optimize Retrieval Count',
          description: 'Retrieving too many chunks can introduce noise and increase costs.',
          impact: {
            tokenReduction: (topK - 5) * chunkSize,
            costSavings: ((topK - 5) * chunkSize * 0.00015) / 1000
          },
          before: `Top K: ${topK}`,
          after: 'Top K: 5',
          nodeId: node.id,
          implementation: {
            difficulty: 'easy',
            timeEstimate: '2 minutes',
            steps: [
              'Reduce top K to 5',
              'Test retrieval relevance',
              'Monitor output quality'
            ]
          }
        });
      }
    }
    
    return suggestions;
  }

  private analyzeCachingOpportunities(): OptimizationSuggestion[] {
    const suggestions: OptimizationSuggestion[] = [];
    
    // Look for nodes that could benefit from caching
    const expensiveNodes = this.nodes.filter(node => {
      const analysis = this.analyzeNode(node);
      return analysis.estimatedCost > 0.01; // Nodes costing more than 1 cent
    });
    
    if (expensiveNodes.length > 0) {
      suggestions.push({
        id: 'implement-caching',
        type: 'caching',
        severity: 'medium',
        title: 'Implement Response Caching',
        description: 'Cache responses for expensive operations to avoid repeated costs.',
        impact: {
          costSavings: expensiveNodes.reduce((sum, node) => {
            const analysis = this.analyzeNode(node);
            return sum + analysis.estimatedCost * 0.7; // 70% cache hit rate
          }, 0)
        },
        before: 'No caching',
        after: 'Response caching enabled',
        implementation: {
          difficulty: 'hard',
          timeEstimate: '1-2 hours',
          steps: [
            'Identify cacheable operations',
            'Implement cache key strategy',
            'Add cache storage mechanism',
            'Configure cache expiration',
            'Test cache effectiveness'
          ]
        }
      });
    }
    
    return suggestions;
  }

  private calculateSummary(suggestions: OptimizationSuggestion[]) {
    return {
      totalTokenReduction: suggestions.reduce((sum, s) => sum + (s.impact.tokenReduction || 0), 0),
      totalCostSavings: suggestions.reduce((sum, s) => sum + (s.impact.costSavings || 0), 0),
      totalPerformanceGain: suggestions.reduce((sum, s) => sum + (s.impact.performanceGain || 0), 0),
      totalSuggestions: suggestions.length
    };
  }

  async saveOptimizationReport(blueprintId: string, report: OptimizationReport) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      await supabase.from('optimization_history').insert({
        blueprint_id: blueprintId,
        user_id: user.id,
        optimization_type: 'analysis',
        before_metrics: {
          totalTokens: Object.values(report.nodeAnalysis).reduce((sum, analysis) => sum + analysis.currentTokens, 0),
          totalCost: Object.values(report.nodeAnalysis).reduce((sum, analysis) => sum + analysis.estimatedCost, 0)
        } as any,
        after_metrics: {
          tokenReduction: report.summary.totalTokenReduction,
          costSavings: report.summary.totalCostSavings,
          performanceGain: report.summary.totalPerformanceGain
        } as any,
        strategies_applied: report.suggestions.map(s => s.type) as any,
        improvements: report.summary as any,
        success: true
      });
    } catch (error) {
      console.error('Failed to save optimization report:', error);
    }
  }
}

// Utility functions for optimization
export function estimateOptimizationImpact(
  currentNodes: NodeConfig[],
  optimizedNodes: NodeConfig[]
): { tokenSavings: number; costSavings: number; performanceGain: number } {
  const currentOptimizer = new PipelineOptimizer(currentNodes, []);
  const optimizedOptimizer = new PipelineOptimizer(optimizedNodes, []);
  
  let currentTokens = 0;
  let currentCost = 0;
  let optimizedTokens = 0;
  let optimizedCost = 0;
  
  for (const node of currentNodes) {
    const analysis = currentOptimizer['analyzeNode'](node);
    currentTokens += analysis.currentTokens;
    currentCost += analysis.estimatedCost;
  }
  
  for (const node of optimizedNodes) {
    const analysis = optimizedOptimizer['analyzeNode'](node);
    optimizedTokens += analysis.currentTokens;
    optimizedCost += analysis.estimatedCost;
  }
  
  return {
    tokenSavings: Math.max(0, currentTokens - optimizedTokens),
    costSavings: Math.max(0, currentCost - optimizedCost),
    performanceGain: Math.min(50, Math.max(0, (currentTokens - optimizedTokens) / currentTokens * 100))
  };
}

export function generateOptimizedPrompt(originalPrompt: string): string {
  const optimizer = new PipelineOptimizer([], []);
  return optimizer['optimizePrompt'](originalPrompt);
}

export function recommendOptimalChunkSize(
  documentType: 'code' | 'text' | 'academic' | 'technical',
  averageQueryLength: number
): number {
  const baseSizes = {
    code: 800,
    text: 1000,
    academic: 1200,
    technical: 900
  };
  
  const baseSize = baseSizes[documentType];
  
  // Adjust based on query length
  if (averageQueryLength > 100) {
    return Math.min(1500, baseSize + 200);
  } else if (averageQueryLength < 50) {
    return Math.max(600, baseSize - 200);
  }
  
  return baseSize;
}