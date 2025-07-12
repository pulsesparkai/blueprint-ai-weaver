import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';
import { ChatOpenAI } from "https://esm.sh/langchain@0.1.25/chat_models/openai";
import { ChatAnthropic } from "https://esm.sh/langchain@0.1.25/chat_models/anthropic";
import { PromptTemplate } from "https://esm.sh/langchain@0.1.25/prompts";
import { LLMChain } from "https://esm.sh/langchain@0.1.25/chains";
import { OpenAIEmbeddings } from "https://esm.sh/langchain@0.1.25/embeddings/openai";
import { PineconeStore } from "https://esm.sh/langchain@0.1.25/vectorstores/pinecone";
import { WeaviateStore } from "https://esm.sh/langchain@0.1.25/vectorstores/weaviate";
import { BaseOutputParser } from "https://esm.sh/langchain@0.1.25/schema/output_parser";
import { RunnableSequence } from "https://esm.sh/langchain@0.1.25/schema/runnable";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PipelineNode {
  id: string;
  type: string;
  data: any;
  position: { x: number; y: number };
}

interface PipelineEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

class LangChainPipelineExecutor {
  private supabase: any;
  private llmInstances: Map<string, any> = new Map();
  private vectorStores: Map<string, any> = new Map();

  constructor(supabaseUrl: string, supabaseAnonKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseAnonKey);
  }

  async initializeLLM(nodeId: string, config: any, userApiKey: string): Promise<any> {
    const cacheKey = `${nodeId}-${config.provider}`;
    
    if (this.llmInstances.has(cacheKey)) {
      return this.llmInstances.get(cacheKey);
    }

    let llm;
    switch (config.provider) {
      case 'openai':
        llm = new ChatOpenAI({
          openAIApiKey: userApiKey,
          modelName: config.model || 'gpt-4o-mini',
          temperature: config.temperature || 0.7,
          maxTokens: config.maxTokens || 1000,
        });
        break;
      case 'anthropic':
        llm = new ChatAnthropic({
          anthropicApiKey: userApiKey,
          modelName: config.model || 'claude-3-5-sonnet-20241022',
          temperature: config.temperature || 0.7,
          maxTokens: config.maxTokens || 1000,
        });
        break;
      default:
        throw new Error(`Unsupported LLM provider: ${config.provider}`);
    }

    this.llmInstances.set(cacheKey, llm);
    return llm;
  }

  async initializeVectorStore(config: any, userApiKey: string): Promise<any> {
    const cacheKey = `${config.provider}-${config.indexName || config.className}`;
    
    if (this.vectorStores.has(cacheKey)) {
      return this.vectorStores.get(cacheKey);
    }

    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: userApiKey,
    });

    let vectorStore;
    switch (config.provider) {
      case 'pinecone':
        vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
          pineconeIndex: config.indexName,
          textKey: 'text',
          namespace: config.namespace,
        });
        break;
      case 'weaviate':
        vectorStore = await WeaviateStore.fromExistingIndex(embeddings, {
          client: config.client,
          indexName: config.className,
          textKey: 'text',
          metadataKeys: config.metadataKeys || [],
        });
        break;
      default:
        throw new Error(`Unsupported vector store provider: ${config.provider}`);
    }

    this.vectorStores.set(cacheKey, vectorStore);
    return vectorStore;
  }

  async executePromptTemplateNode(node: PipelineNode, input: string, llm: any): Promise<any> {
    const { template, variables } = node.data;
    
    const promptTemplate = PromptTemplate.fromTemplate(template);
    const chain = new LLMChain({ llm, prompt: promptTemplate });
    
    const variableValues = variables.reduce((acc: any, variable: any) => {
      acc[variable.name] = variable.value || input;
      return acc;
    }, {});

    const result = await chain.call(variableValues);
    return {
      success: true,
      data: result.text,
      tokens: result.llmOutput?.tokenUsage || {},
      executionTime: Date.now(),
    };
  }

  async executeRAGNode(node: PipelineNode, input: string, vectorStore: any, llm: any): Promise<any> {
    const { topK, scoreThreshold } = node.data;
    
    // Perform similarity search
    const searchResults = await vectorStore.similaritySearchWithScore(input, topK || 5);
    
    // Filter by score threshold if provided
    const filteredResults = scoreThreshold 
      ? searchResults.filter(([doc, score]: any) => score >= scoreThreshold)
      : searchResults;

    const context = filteredResults
      .map(([doc]: any) => doc.pageContent)
      .join('\n\n');

    // Create RAG prompt template
    const ragTemplate = `Context: {context}

Question: {question}

Answer based on the provided context:`;

    const promptTemplate = PromptTemplate.fromTemplate(ragTemplate);
    const chain = new LLMChain({ llm, prompt: promptTemplate });
    
    const result = await chain.call({
      context,
      question: input,
    });

    return {
      success: true,
      data: result.text,
      context: filteredResults.map(([doc, score]: any) => ({
        content: doc.pageContent,
        metadata: doc.metadata,
        score,
      })),
      tokens: result.llmOutput?.tokenUsage || {},
      executionTime: Date.now(),
    };
  }

  async executeOutputParserNode(node: PipelineNode, input: string): Promise<any> {
    const { parserType, schema } = node.data;

    class CustomOutputParser extends BaseOutputParser<any> {
      async parse(text: string): Promise<any> {
        switch (parserType) {
          case 'json':
            try {
              return JSON.parse(text);
            } catch (error) {
              throw new Error(`Failed to parse JSON: ${error.message}`);
            }
          case 'list':
            return text.split('\n').filter(line => line.trim() !== '');
          case 'structured':
            // Simple structured parsing based on schema
            const lines = text.split('\n');
            const result: any = {};
            schema.fields?.forEach((field: any) => {
              const line = lines.find(l => l.toLowerCase().includes(field.name.toLowerCase()));
              if (line) {
                result[field.name] = line.split(':')[1]?.trim();
              }
            });
            return result;
          default:
            return text;
        }
      }
    }

    const parser = new CustomOutputParser();
    const result = await parser.parse(input);

    return {
      success: true,
      data: result,
      executionTime: Date.now(),
    };
  }

  async executeMemoryNode(node: PipelineNode, input: string, context: any): Promise<any> {
    const { operation, key } = node.data;

    switch (operation) {
      case 'store':
        context.memory = context.memory || {};
        context.memory[key] = input;
        return {
          success: true,
          data: input,
          memory: context.memory,
          executionTime: Date.now(),
        };
      case 'retrieve':
        const value = context.memory?.[key] || '';
        return {
          success: true,
          data: value,
          memory: context.memory,
          executionTime: Date.now(),
        };
      case 'append':
        context.memory = context.memory || {};
        context.memory[key] = (context.memory[key] || '') + '\n' + input;
        return {
          success: true,
          data: context.memory[key],
          memory: context.memory,
          executionTime: Date.now(),
        };
      default:
        throw new Error(`Unsupported memory operation: ${operation}`);
    }
  }

  async executeStateTrackerNode(node: PipelineNode, input: string, context: any): Promise<any> {
    const { conditions, transitions } = node.data;

    context.state = context.state || { current: 'initial', history: [] };

    // Evaluate conditions
    for (const condition of conditions) {
      const { field, operator, value, targetState } = condition;
      
      let fieldValue = input;
      if (field && context.memory?.[field] !== undefined) {
        fieldValue = context.memory[field];
      }

      let conditionMet = false;
      switch (operator) {
        case 'equals':
          conditionMet = fieldValue === value;
          break;
        case 'contains':
          conditionMet = fieldValue.includes(value);
          break;
        case 'greater_than':
          conditionMet = parseFloat(fieldValue) > parseFloat(value);
          break;
        case 'less_than':
          conditionMet = parseFloat(fieldValue) < parseFloat(value);
          break;
      }

      if (conditionMet) {
        context.state.history.push(context.state.current);
        context.state.current = targetState;
        break;
      }
    }

    return {
      success: true,
      data: input,
      state: context.state,
      executionTime: Date.now(),
    };
  }

  async executePipeline(nodes: PipelineNode[], edges: PipelineEdge[], initialInput: string, userId: string): Promise<any> {
    const context: any = { memory: {}, state: null };
    const results: Map<string, any> = new Map();
    const executionOrder = this.topologicalSort(nodes, edges);

    // Get user's API keys
    const { data: integrations } = await this.supabase
      .from('integrations')
      .select('*')
      .eq('user_id', userId);

    const userApiKeys: any = {};
    for (const integration of integrations || []) {
      userApiKeys[integration.type] = integration.credential_refs?.api_key;
    }

    let currentInput = initialInput;

    for (const nodeId of executionOrder) {
      const node = nodes.find(n => n.id === nodeId);
      if (!node) continue;

      try {
        let result;
        const startTime = Date.now();

        switch (node.type) {
          case 'promptTemplate':
            const llm = await this.initializeLLM(nodeId, node.data, userApiKeys[node.data.provider]);
            result = await this.executePromptTemplateNode(node, currentInput, llm);
            break;

          case 'ragRetriever':
            const ragLlm = await this.initializeLLM(nodeId, node.data.llm, userApiKeys[node.data.llm.provider]);
            const vectorStore = await this.initializeVectorStore(node.data.vectorStore, userApiKeys.openai);
            result = await this.executeRAGNode(node, currentInput, vectorStore, ragLlm);
            break;

          case 'outputParser':
            result = await this.executeOutputParserNode(node, currentInput);
            break;

          case 'memoryStore':
            result = await this.executeMemoryNode(node, currentInput, context);
            break;

          case 'stateTracker':
            result = await this.executeStateTrackerNode(node, currentInput, context);
            break;

          default:
            result = {
              success: false,
              error: `Unknown node type: ${node.type}`,
              executionTime: Date.now() - startTime,
            };
        }

        result.executionTime = Date.now() - startTime;
        results.set(nodeId, result);

        if (result.success) {
          currentInput = result.data;
        } else {
          throw new Error(result.error || 'Node execution failed');
        }

      } catch (error) {
        results.set(nodeId, {
          success: false,
          error: error.message,
          executionTime: Date.now(),
        });
        break;
      }
    }

    return {
      success: true,
      results: Object.fromEntries(results),
      finalOutput: currentInput,
      context,
    };
  }

  private topologicalSort(nodes: PipelineNode[], edges: PipelineEdge[]): string[] {
    const graph: Map<string, string[]> = new Map();
    const inDegree: Map<string, number> = new Map();

    // Initialize graph
    nodes.forEach(node => {
      graph.set(node.id, []);
      inDegree.set(node.id, 0);
    });

    // Build graph and calculate in-degrees
    edges.forEach(edge => {
      graph.get(edge.source)?.push(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    });

    // Topological sort using Kahn's algorithm
    const queue: string[] = [];
    const result: string[] = [];

    // Find all nodes with no incoming edges
    inDegree.forEach((degree, nodeId) => {
      if (degree === 0) {
        queue.push(nodeId);
      }
    });

    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);

      graph.get(current)?.forEach(neighbor => {
        inDegree.set(neighbor, inDegree.get(neighbor)! - 1);
        if (inDegree.get(neighbor) === 0) {
          queue.push(neighbor);
        }
      });
    }

    if (result.length !== nodes.length) {
      throw new Error('Circular dependency detected in pipeline');
    }

    return result;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { nodes, edges, input, userId } = await req.json();

    if (!nodes || !edges || !input || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: nodes, edges, input, userId' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const executor = new LangChainPipelineExecutor(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );

    const result = await executor.executePipeline(nodes, edges, input, userId);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in pipeline-executor:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});