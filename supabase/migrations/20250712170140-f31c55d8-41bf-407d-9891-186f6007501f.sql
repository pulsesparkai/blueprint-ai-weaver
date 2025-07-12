-- Create blueprint templates table for storing pre-built RAG variants
CREATE TABLE public.blueprint_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'rag',
  tier TEXT NOT NULL DEFAULT 'free', -- free, pro, enterprise
  difficulty TEXT NOT NULL DEFAULT 'beginner', -- beginner, intermediate, advanced
  nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  edges JSONB NOT NULL DEFAULT '[]'::jsonb,
  thumbnail TEXT,
  tags TEXT[] DEFAULT '{}',
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blueprint_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for blueprint templates
CREATE POLICY "Templates are viewable by everyone" 
ON public.blueprint_templates 
FOR SELECT 
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_blueprint_templates_updated_at
BEFORE UPDATE ON public.blueprint_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert the 20 RAG variant templates
INSERT INTO public.blueprint_templates (name, description, category, tier, difficulty, nodes, edges, tags) VALUES
('Naive RAG', 'Basic retrieval-augmented generation with simple vector search and single-pass generation.', 'rag', 'free', 'beginner', 
'[
  {"id": "input", "type": "inputNode", "position": {"x": 100, "y": 100}, "data": {"label": "Query Input", "placeholder": "Enter your question"}},
  {"id": "retriever", "type": "ragRetrieverNode", "position": {"x": 300, "y": 100}, "data": {"label": "Vector Retriever", "vectorStore": "pinecone", "topK": 5, "scoreThreshold": 0.7}},
  {"id": "prompt", "type": "promptTemplateNode", "position": {"x": 500, "y": 100}, "data": {"label": "RAG Prompt", "template": "Context: {context}\n\nQuestion: {query}\n\nAnswer:"}},
  {"id": "llm", "type": "llmNode", "position": {"x": 700, "y": 100}, "data": {"label": "LLM", "model": "gpt-3.5-turbo", "temperature": 0.7}},
  {"id": "output", "type": "outputNode", "position": {"x": 900, "y": 100}, "data": {"label": "Response"}}
]',
'[
  {"id": "e1", "source": "input", "target": "retriever"},
  {"id": "e2", "source": "retriever", "target": "prompt"},
  {"id": "e3", "source": "prompt", "target": "llm"},
  {"id": "e4", "source": "llm", "target": "output"}
]',
'{"naive", "basic", "simple", "vector-search"}'),

('Advanced RAG', 'Enhanced RAG with query expansion, reranking, and response synthesis.', 'rag', 'free', 'intermediate',
'[
  {"id": "input", "type": "inputNode", "position": {"x": 100, "y": 100}, "data": {"label": "Query Input", "placeholder": "Enter your question"}},
  {"id": "query_expand", "type": "llmNode", "position": {"x": 300, "y": 100}, "data": {"label": "Query Expansion", "model": "gpt-3.5-turbo", "temperature": 0.3, "prompt": "Expand this query into 3 related questions: {query}"}},
  {"id": "retriever", "type": "ragRetrieverNode", "position": {"x": 500, "y": 100}, "data": {"label": "Vector Retriever", "vectorStore": "pinecone", "topK": 10, "scoreThreshold": 0.6}},
  {"id": "reranker", "type": "processorNode", "position": {"x": 700, "y": 100}, "data": {"label": "Reranker", "type": "cross_encoder", "model": "ms-marco-MiniLM-L-6-v2"}},
  {"id": "synthesizer", "type": "llmNode", "position": {"x": 900, "y": 100}, "data": {"label": "Response Synthesis", "model": "gpt-4", "temperature": 0.7}},
  {"id": "output", "type": "outputNode", "position": {"x": 1100, "y": 100}, "data": {"label": "Response"}}
]',
'[
  {"id": "e1", "source": "input", "target": "query_expand"},
  {"id": "e2", "source": "query_expand", "target": "retriever"},
  {"id": "e3", "source": "retriever", "target": "reranker"},
  {"id": "e4", "source": "reranker", "target": "synthesizer"},
  {"id": "e5", "source": "synthesizer", "target": "output"}
]',
'{"advanced", "reranking", "query-expansion", "synthesis"}'),

('Modular RAG', 'Modular approach with specialized components for retrieval, processing, and generation.', 'rag', 'free', 'intermediate',
'[
  {"id": "input", "type": "inputNode", "position": {"x": 100, "y": 100}, "data": {"label": "Query Input"}},
  {"id": "doc_retriever", "type": "ragRetrieverNode", "position": {"x": 300, "y": 50}, "data": {"label": "Document Retriever", "vectorStore": "faiss", "topK": 8}},
  {"id": "chunk_retriever", "type": "ragRetrieverNode", "position": {"x": 300, "y": 150}, "data": {"label": "Chunk Retriever", "vectorStore": "chroma", "topK": 5}},
  {"id": "fusion", "type": "processorNode", "position": {"x": 500, "y": 100}, "data": {"label": "Fusion Module", "strategy": "reciprocal_rank_fusion"}},
  {"id": "context_filter", "type": "processorNode", "position": {"x": 700, "y": 100}, "data": {"label": "Context Filter", "relevance_threshold": 0.75}},
  {"id": "generator", "type": "llmNode", "position": {"x": 900, "y": 100}, "data": {"label": "Generator", "model": "gpt-4"}},
  {"id": "output", "type": "outputNode", "position": {"x": 1100, "y": 100}, "data": {"label": "Response"}}
]',
'[
  {"id": "e1", "source": "input", "target": "doc_retriever"},
  {"id": "e2", "source": "input", "target": "chunk_retriever"},
  {"id": "e3", "source": "doc_retriever", "target": "fusion"},
  {"id": "e4", "source": "chunk_retriever", "target": "fusion"},
  {"id": "e5", "source": "fusion", "target": "context_filter"},
  {"id": "e6", "source": "context_filter", "target": "generator"},
  {"id": "e7", "source": "generator", "target": "output"}
]',
'{"modular", "fusion", "multi-retrieval", "filtering"}'),

('Graph RAG', 'Knowledge graph-enhanced RAG with entity relationships and graph traversal.', 'rag', 'pro', 'advanced',
'[
  {"id": "input", "type": "inputNode", "position": {"x": 100, "y": 100}, "data": {"label": "Query Input"}},
  {"id": "entity_extract", "type": "processorNode", "position": {"x": 300, "y": 100}, "data": {"label": "Entity Extractor", "model": "ner", "entities": ["PERSON", "ORG", "GPE"]}},
  {"id": "graph_query", "type": "processorNode", "position": {"x": 500, "y": 100}, "data": {"label": "Graph Query", "database": "neo4j", "query_type": "cypher"}},
  {"id": "vector_search", "type": "ragRetrieverNode", "position": {"x": 300, "y": 200}, "data": {"label": "Vector Search", "vectorStore": "pinecone", "topK": 5}},
  {"id": "knowledge_fusion", "type": "processorNode", "position": {"x": 700, "y": 150}, "data": {"label": "Knowledge Fusion", "strategy": "graph_vector_merge"}},
  {"id": "reasoning", "type": "llmNode", "position": {"x": 900, "y": 150}, "data": {"label": "Graph Reasoning", "model": "gpt-4", "temperature": 0.2}},
  {"id": "output", "type": "outputNode", "position": {"x": 1100, "y": 150}, "data": {"label": "Response"}}
]',
'[
  {"id": "e1", "source": "input", "target": "entity_extract"},
  {"id": "e2", "source": "input", "target": "vector_search"},
  {"id": "e3", "source": "entity_extract", "target": "graph_query"},
  {"id": "e4", "source": "graph_query", "target": "knowledge_fusion"},
  {"id": "e5", "source": "vector_search", "target": "knowledge_fusion"},
  {"id": "e6", "source": "knowledge_fusion", "target": "reasoning"},
  {"id": "e7", "source": "reasoning", "target": "output"}
]',
'{"graph", "knowledge-graph", "entity-extraction", "neo4j"}'),

('Long RAG', 'RAG optimized for long documents with hierarchical chunking and multi-scale retrieval.', 'rag', 'pro', 'advanced',
'[
  {"id": "input", "type": "inputNode", "position": {"x": 100, "y": 100}, "data": {"label": "Query Input"}},
  {"id": "doc_chunker", "type": "processorNode", "position": {"x": 300, "y": 100}, "data": {"label": "Hierarchical Chunker", "chunk_sizes": [512, 1024, 2048], "overlap": 50}},
  {"id": "multi_retriever", "type": "ragRetrieverNode", "position": {"x": 500, "y": 100}, "data": {"label": "Multi-scale Retriever", "strategies": ["fine", "coarse", "paragraph"], "topK": 15}},
  {"id": "relevance_scorer", "type": "processorNode", "position": {"x": 700, "y": 100}, "data": {"label": "Relevance Scorer", "model": "cross-encoder", "threshold": 0.6}},
  {"id": "context_compressor", "type": "processorNode", "position": {"x": 900, "y": 100}, "data": {"label": "Context Compressor", "max_tokens": 8000, "strategy": "extractive"}},
  {"id": "long_llm", "type": "llmNode", "position": {"x": 1100, "y": 100}, "data": {"label": "Long Context LLM", "model": "gpt-4-turbo", "max_tokens": 32000}},
  {"id": "output", "type": "outputNode", "position": {"x": 1300, "y": 100}, "data": {"label": "Response"}}
]',
'[
  {"id": "e1", "source": "input", "target": "doc_chunker"},
  {"id": "e2", "source": "doc_chunker", "target": "multi_retriever"},
  {"id": "e3", "source": "multi_retriever", "target": "relevance_scorer"},
  {"id": "e4", "source": "relevance_scorer", "target": "context_compressor"},
  {"id": "e5", "source": "context_compressor", "target": "long_llm"},
  {"id": "e6", "source": "long_llm", "target": "output"}
]',
'{"long-context", "hierarchical", "multi-scale", "compression"}'),

('Agentic RAG', 'AI agent-driven RAG with planning, tool use, and iterative refinement.', 'rag', 'enterprise', 'advanced',
'[
  {"id": "input", "type": "inputNode", "position": {"x": 100, "y": 100}, "data": {"label": "Query Input"}},
  {"id": "planner", "type": "llmNode", "position": {"x": 300, "y": 100}, "data": {"label": "Query Planner", "model": "gpt-4", "role": "planner", "tools": ["search", "calculate", "retrieve"]}},
  {"id": "tool_selector", "type": "processorNode", "position": {"x": 500, "y": 100}, "data": {"label": "Tool Selector", "available_tools": ["vector_search", "web_search", "calculator", "knowledge_graph"]}},
  {"id": "retriever", "type": "ragRetrieverNode", "position": {"x": 700, "y": 50}, "data": {"label": "Vector Retriever", "vectorStore": "pinecone", "topK": 8}},
  {"id": "web_search", "type": "processorNode", "position": {"x": 700, "y": 150}, "data": {"label": "Web Search", "api": "serp", "num_results": 5}},
  {"id": "reflection", "type": "llmNode", "position": {"x": 900, "y": 100}, "data": {"label": "Reflection Agent", "model": "gpt-4", "task": "evaluate_completeness"}},
  {"id": "synthesizer", "type": "llmNode", "position": {"x": 1100, "y": 100}, "data": {"label": "Response Synthesizer", "model": "gpt-4"}},
  {"id": "output", "type": "outputNode", "position": {"x": 1300, "y": 100}, "data": {"label": "Response"}}
]',
'[
  {"id": "e1", "source": "input", "target": "planner"},
  {"id": "e2", "source": "planner", "target": "tool_selector"},
  {"id": "e3", "source": "tool_selector", "target": "retriever"},
  {"id": "e4", "source": "tool_selector", "target": "web_search"},
  {"id": "e5", "source": "retriever", "target": "reflection"},
  {"id": "e6", "source": "web_search", "target": "reflection"},
  {"id": "e7", "source": "reflection", "target": "synthesizer"},
  {"id": "e8", "source": "synthesizer", "target": "output"}
]',
'{"agentic", "planning", "tool-use", "reflection"}'),

('Fusion RAG', 'Multi-vector fusion RAG combining dense, sparse, and learned representations.', 'rag', 'pro', 'intermediate',
'[
  {"id": "input", "type": "inputNode", "position": {"x": 100, "y": 100}, "data": {"label": "Query Input"}},
  {"id": "dense_retriever", "type": "ragRetrieverNode", "position": {"x": 300, "y": 50}, "data": {"label": "Dense Retriever", "vectorStore": "pinecone", "model": "sentence-transformers", "topK": 10}},
  {"id": "sparse_retriever", "type": "ragRetrieverNode", "position": {"x": 300, "y": 150}, "data": {"label": "Sparse Retriever", "vectorStore": "elasticsearch", "method": "bm25", "topK": 10}},
  {"id": "learned_retriever", "type": "ragRetrieverNode", "position": {"x": 300, "y": 250}, "data": {"label": "Learned Retriever", "model": "colbert", "topK": 10}},
  {"id": "fusion_ranker", "type": "processorNode", "position": {"x": 500, "y": 150}, "data": {"label": "Fusion Ranker", "method": "reciprocal_rank_fusion", "weights": [0.4, 0.3, 0.3]}},
  {"id": "context_selection", "type": "processorNode", "position": {"x": 700, "y": 150}, "data": {"label": "Context Selection", "max_contexts": 5, "diversity_threshold": 0.8}},
  {"id": "generator", "type": "llmNode", "position": {"x": 900, "y": 150}, "data": {"label": "Generator", "model": "gpt-4"}},
  {"id": "output", "type": "outputNode", "position": {"x": 1100, "y": 150}, "data": {"label": "Response"}}
]',
'[
  {"id": "e1", "source": "input", "target": "dense_retriever"},
  {"id": "e2", "source": "input", "target": "sparse_retriever"},
  {"id": "e3", "source": "input", "target": "learned_retriever"},
  {"id": "e4", "source": "dense_retriever", "target": "fusion_ranker"},
  {"id": "e5", "source": "sparse_retriever", "target": "fusion_ranker"},
  {"id": "e6", "source": "learned_retriever", "target": "fusion_ranker"},
  {"id": "e7", "source": "fusion_ranker", "target": "context_selection"},
  {"id": "e8", "source": "context_selection", "target": "generator"},
  {"id": "e9", "source": "generator", "target": "output"}
]',
'{"fusion", "multi-vector", "dense", "sparse", "learned"}'),

('Multi-pass RAG', 'Iterative RAG with multiple retrieval and refinement passes.', 'rag', 'free', 'intermediate',
'[
  {"id": "input", "type": "inputNode", "position": {"x": 100, "y": 100}, "data": {"label": "Query Input"}},
  {"id": "initial_retrieval", "type": "ragRetrieverNode", "position": {"x": 300, "y": 100}, "data": {"label": "Initial Retrieval", "vectorStore": "pinecone", "topK": 5}},
  {"id": "first_gen", "type": "llmNode", "position": {"x": 500, "y": 100}, "data": {"label": "First Generation", "model": "gpt-3.5-turbo", "temperature": 0.7}},
  {"id": "query_refiner", "type": "processorNode", "position": {"x": 700, "y": 100}, "data": {"label": "Query Refiner", "strategy": "extract_keywords"}},
  {"id": "second_retrieval", "type": "ragRetrieverNode", "position": {"x": 500, "y": 200}, "data": {"label": "Refined Retrieval", "vectorStore": "pinecone", "topK": 8}},
  {"id": "final_gen", "type": "llmNode", "position": {"x": 700, "y": 200}, "data": {"label": "Final Generation", "model": "gpt-4", "temperature": 0.5}},
  {"id": "output", "type": "outputNode", "position": {"x": 900, "y": 150}, "data": {"label": "Response"}}
]',
'[
  {"id": "e1", "source": "input", "target": "initial_retrieval"},
  {"id": "e2", "source": "initial_retrieval", "target": "first_gen"},
  {"id": "e3", "source": "first_gen", "target": "query_refiner"},
  {"id": "e4", "source": "query_refiner", "target": "second_retrieval"},
  {"id": "e5", "source": "second_retrieval", "target": "final_gen"},
  {"id": "e6", "source": "final_gen", "target": "output"}
]',
'{"multi-pass", "iterative", "refinement", "progressive"}'),

('Speculative RAG', 'Speculative execution RAG with parallel hypothesis generation and verification.', 'rag', 'pro', 'advanced',
'[
  {"id": "input", "type": "inputNode", "position": {"x": 100, "y": 100}, "data": {"label": "Query Input"}},
  {"id": "hypothesis_gen", "type": "llmNode", "position": {"x": 300, "y": 100}, "data": {"label": "Hypothesis Generator", "model": "gpt-4", "temperature": 0.8, "num_hypotheses": 3}},
  {"id": "retriever_1", "type": "ragRetrieverNode", "position": {"x": 500, "y": 50}, "data": {"label": "Retriever 1", "vectorStore": "pinecone", "topK": 5}},
  {"id": "retriever_2", "type": "ragRetrieverNode", "position": {"x": 500, "y": 100}, "data": {"label": "Retriever 2", "vectorStore": "pinecone", "topK": 5}},
  {"id": "retriever_3", "type": "ragRetrieverNode", "position": {"x": 500, "y": 150}, "data": {"label": "Retriever 3", "vectorStore": "pinecone", "topK": 5}},
  {"id": "verifier", "type": "llmNode", "position": {"x": 700, "y": 100}, "data": {"label": "Hypothesis Verifier", "model": "gpt-4", "temperature": 0.2}},
  {"id": "selector", "type": "processorNode", "position": {"x": 900, "y": 100}, "data": {"label": "Best Response Selector", "criteria": ["accuracy", "completeness", "confidence"]}},
  {"id": "output", "type": "outputNode", "position": {"x": 1100, "y": 100}, "data": {"label": "Response"}}
]',
'[
  {"id": "e1", "source": "input", "target": "hypothesis_gen"},
  {"id": "e2", "source": "hypothesis_gen", "target": "retriever_1"},
  {"id": "e3", "source": "hypothesis_gen", "target": "retriever_2"},
  {"id": "e4", "source": "hypothesis_gen", "target": "retriever_3"},
  {"id": "e5", "source": "retriever_1", "target": "verifier"},
  {"id": "e6", "source": "retriever_2", "target": "verifier"},
  {"id": "e7", "source": "retriever_3", "target": "verifier"},
  {"id": "e8", "source": "verifier", "target": "selector"},
  {"id": "e9", "source": "selector", "target": "output"}
]',
'{"speculative", "parallel", "hypothesis", "verification"}'),

('HyDE RAG', 'Hypothetical Document Embeddings RAG with synthetic document generation.', 'rag', 'free', 'intermediate',
'[
  {"id": "input", "type": "inputNode", "position": {"x": 100, "y": 100}, "data": {"label": "Query Input"}},
  {"id": "hyde_gen", "type": "llmNode", "position": {"x": 300, "y": 100}, "data": {"label": "HyDE Generator", "model": "gpt-3.5-turbo", "prompt": "Write a hypothetical document that would answer: {query}"}},
  {"id": "embedding", "type": "processorNode", "position": {"x": 500, "y": 100}, "data": {"label": "Document Embedder", "model": "text-embedding-ada-002"}},
  {"id": "retriever", "type": "ragRetrieverNode", "position": {"x": 700, "y": 100}, "data": {"label": "Vector Retriever", "vectorStore": "pinecone", "topK": 8, "use_hyde_embedding": true}},
  {"id": "reranker", "type": "processorNode", "position": {"x": 900, "y": 100}, "data": {"label": "Relevance Reranker", "model": "cross-encoder"}},
  {"id": "generator", "type": "llmNode", "position": {"x": 1100, "y": 100}, "data": {"label": "Final Generator", "model": "gpt-4"}},
  {"id": "output", "type": "outputNode", "position": {"x": 1300, "y": 100}, "data": {"label": "Response"}}
]',
'[
  {"id": "e1", "source": "input", "target": "hyde_gen"},
  {"id": "e2", "source": "hyde_gen", "target": "embedding"},
  {"id": "e3", "source": "embedding", "target": "retriever"},
  {"id": "e4", "source": "retriever", "target": "reranker"},
  {"id": "e5", "source": "reranker", "target": "generator"},
  {"id": "e6", "source": "generator", "target": "output"}
]',
'{"hyde", "hypothetical", "synthetic", "embedding"}'),

('Corrective RAG', 'Self-correcting RAG with retrieval quality assessment and correction mechanisms.', 'rag', 'pro', 'advanced',
'[
  {"id": "input", "type": "inputNode", "position": {"x": 100, "y": 100}, "data": {"label": "Query Input"}},
  {"id": "retriever", "type": "ragRetrieverNode", "position": {"x": 300, "y": 100}, "data": {"label": "Initial Retriever", "vectorStore": "pinecone", "topK": 10}},
  {"id": "relevance_checker", "type": "llmNode", "position": {"x": 500, "y": 100}, "data": {"label": "Relevance Checker", "model": "gpt-3.5-turbo", "task": "assess_relevance"}},
  {"id": "web_fallback", "type": "processorNode", "position": {"x": 500, "y": 200}, "data": {"label": "Web Search Fallback", "api": "serp", "trigger_threshold": 0.5}},
  {"id": "knowledge_refiner", "type": "processorNode", "position": {"x": 700, "y": 150}, "data": {"label": "Knowledge Refiner", "strategy": "filter_and_augment"}},
  {"id": "corrective_gen", "type": "llmNode", "position": {"x": 900, "y": 150}, "data": {"label": "Corrective Generator", "model": "gpt-4", "temperature": 0.3}},
  {"id": "output", "type": "outputNode", "position": {"x": 1100, "y": 150}, "data": {"label": "Response"}}
]',
'[
  {"id": "e1", "source": "input", "target": "retriever"},
  {"id": "e2", "source": "retriever", "target": "relevance_checker"},
  {"id": "e3", "source": "relevance_checker", "target": "web_fallback"},
  {"id": "e4", "source": "relevance_checker", "target": "knowledge_refiner"},
  {"id": "e5", "source": "web_fallback", "target": "knowledge_refiner"},
  {"id": "e6", "source": "knowledge_refiner", "target": "corrective_gen"},
  {"id": "e7", "source": "corrective_gen", "target": "output"}
]',
'{"corrective", "self-correcting", "relevance-checking", "fallback"}'),

('Self-RAG', 'Self-reflective RAG with adaptive retrieval and response quality control.', 'rag', 'pro', 'advanced',
'[
  {"id": "input", "type": "inputNode", "position": {"x": 100, "y": 100}, "data": {"label": "Query Input"}},
  {"id": "need_retrieval", "type": "llmNode", "position": {"x": 300, "y": 100}, "data": {"label": "Retrieval Decision", "model": "gpt-4", "task": "decide_retrieval_need"}},
  {"id": "retriever", "type": "ragRetrieverNode", "position": {"x": 500, "y": 50}, "data": {"label": "Adaptive Retriever", "vectorStore": "pinecone", "topK": 8}},
  {"id": "direct_gen", "type": "llmNode", "position": {"x": 500, "y": 150}, "data": {"label": "Direct Generator", "model": "gpt-4"}},
  {"id": "relevance_critic", "type": "llmNode", "position": {"x": 700, "y": 100}, "data": {"label": "Relevance Critic", "model": "gpt-4", "task": "critique_relevance"}},
  {"id": "response_critic", "type": "llmNode", "position": {"x": 900, "y": 100}, "data": {"label": "Response Critic", "model": "gpt-4", "task": "critique_response"}},
  {"id": "output", "type": "outputNode", "position": {"x": 1100, "y": 100}, "data": {"label": "Response"}}
]',
'[
  {"id": "e1", "source": "input", "target": "need_retrieval"},
  {"id": "e2", "source": "need_retrieval", "target": "retriever"},
  {"id": "e3", "source": "need_retrieval", "target": "direct_gen"},
  {"id": "e4", "source": "retriever", "target": "relevance_critic"},
  {"id": "e5", "source": "relevance_critic", "target": "response_critic"},
  {"id": "e6", "source": "direct_gen", "target": "response_critic"},
  {"id": "e7", "source": "response_critic", "target": "output"}
]',
'{"self-rag", "adaptive", "self-reflection", "quality-control"}'),

('Chain-of-Verification RAG', 'RAG with systematic verification through chained fact-checking.', 'rag', 'pro', 'advanced',
'[
  {"id": "input", "type": "inputNode", "position": {"x": 100, "y": 100}, "data": {"label": "Query Input"}},
  {"id": "retriever", "type": "ragRetrieverNode", "position": {"x": 300, "y": 100}, "data": {"label": "Retriever", "vectorStore": "pinecone", "topK": 6}},
  {"id": "draft_gen", "type": "llmNode", "position": {"x": 500, "y": 100}, "data": {"label": "Draft Generator", "model": "gpt-4", "temperature": 0.7}},
  {"id": "fact_extractor", "type": "processorNode", "position": {"x": 700, "y": 100}, "data": {"label": "Fact Extractor", "strategy": "claim_identification"}},
  {"id": "verification_retrieval", "type": "ragRetrieverNode", "position": {"x": 700, "y": 200}, "data": {"label": "Verification Retrieval", "vectorStore": "pinecone", "topK": 3}},
  {"id": "fact_checker", "type": "llmNode", "position": {"x": 900, "y": 150}, "data": {"label": "Fact Checker", "model": "gpt-4", "temperature": 0.2}},
  {"id": "final_gen", "type": "llmNode", "position": {"x": 1100, "y": 150}, "data": {"label": "Verified Generator", "model": "gpt-4"}},
  {"id": "output", "type": "outputNode", "position": {"x": 1300, "y": 150}, "data": {"label": "Response"}}
]',
'[
  {"id": "e1", "source": "input", "target": "retriever"},
  {"id": "e2", "source": "retriever", "target": "draft_gen"},
  {"id": "e3", "source": "draft_gen", "target": "fact_extractor"},
  {"id": "e4", "source": "fact_extractor", "target": "verification_retrieval"},
  {"id": "e5", "source": "verification_retrieval", "target": "fact_checker"},
  {"id": "e6", "source": "fact_checker", "target": "final_gen"},
  {"id": "e7", "source": "final_gen", "target": "output"}
]',
'{"verification", "fact-checking", "chain-of-verification", "accuracy"}'),

('Tree RAG', 'Hierarchical tree-based RAG with structured knowledge traversal.', 'rag', 'pro', 'advanced',
'[
  {"id": "input", "type": "inputNode", "position": {"x": 100, "y": 100}, "data": {"label": "Query Input"}},
  {"id": "root_classifier", "type": "processorNode", "position": {"x": 300, "y": 100}, "data": {"label": "Root Classifier", "categories": ["technical", "factual", "conceptual"]}},
  {"id": "branch_retriever_1", "type": "ragRetrieverNode", "position": {"x": 500, "y": 50}, "data": {"label": "Technical Branch", "vectorStore": "pinecone", "namespace": "technical", "topK": 5}},
  {"id": "branch_retriever_2", "type": "ragRetrieverNode", "position": {"x": 500, "y": 100}, "data": {"label": "Factual Branch", "vectorStore": "pinecone", "namespace": "factual", "topK": 5}},
  {"id": "branch_retriever_3", "type": "ragRetrieverNode", "position": {"x": 500, "y": 150}, "data": {"label": "Conceptual Branch", "vectorStore": "pinecone", "namespace": "conceptual", "topK": 5}},
  {"id": "tree_merger", "type": "processorNode", "position": {"x": 700, "y": 100}, "data": {"label": "Tree Merger", "strategy": "hierarchical_fusion"}},
  {"id": "structured_gen", "type": "llmNode", "position": {"x": 900, "y": 100}, "data": {"label": "Structured Generator", "model": "gpt-4"}},
  {"id": "output", "type": "outputNode", "position": {"x": 1100, "y": 100}, "data": {"label": "Response"}}
]',
'[
  {"id": "e1", "source": "input", "target": "root_classifier"},
  {"id": "e2", "source": "root_classifier", "target": "branch_retriever_1"},
  {"id": "e3", "source": "root_classifier", "target": "branch_retriever_2"},
  {"id": "e4", "source": "root_classifier", "target": "branch_retriever_3"},
  {"id": "e5", "source": "branch_retriever_1", "target": "tree_merger"},
  {"id": "e6", "source": "branch_retriever_2", "target": "tree_merger"},
  {"id": "e7", "source": "branch_retriever_3", "target": "tree_merger"},
  {"id": "e8", "source": "tree_merger", "target": "structured_gen"},
  {"id": "e9", "source": "structured_gen", "target": "output"}
]',
'{"tree", "hierarchical", "structured", "classification"}'),

('Hierarchical RAG', 'Multi-level hierarchical RAG with cascading retrieval and abstraction.', 'rag', 'free', 'intermediate',
'[
  {"id": "input", "type": "inputNode", "position": {"x": 100, "y": 100}, "data": {"label": "Query Input"}},
  {"id": "level1_retriever", "type": "ragRetrieverNode", "position": {"x": 300, "y": 100}, "data": {"label": "Document Level", "vectorStore": "pinecone", "chunk_size": 2048, "topK": 5}},
  {"id": "level2_retriever", "type": "ragRetrieverNode", "position": {"x": 500, "y": 100}, "data": {"label": "Section Level", "vectorStore": "pinecone", "chunk_size": 1024, "topK": 8}},
  {"id": "level3_retriever", "type": "ragRetrieverNode", "position": {"x": 700, "y": 100}, "data": {"label": "Passage Level", "vectorStore": "pinecone", "chunk_size": 512, "topK": 10}},
  {"id": "hierarchy_fusion", "type": "processorNode", "position": {"x": 900, "y": 100}, "data": {"label": "Hierarchy Fusion", "strategy": "weighted_abstraction"}},
  {"id": "generator", "type": "llmNode", "position": {"x": 1100, "y": 100}, "data": {"label": "Generator", "model": "gpt-4"}},
  {"id": "output", "type": "outputNode", "position": {"x": 1300, "y": 100}, "data": {"label": "Response"}}
]',
'[
  {"id": "e1", "source": "input", "target": "level1_retriever"},
  {"id": "e2", "source": "level1_retriever", "target": "level2_retriever"},
  {"id": "e3", "source": "level2_retriever", "target": "level3_retriever"},
  {"id": "e4", "source": "level1_retriever", "target": "hierarchy_fusion"},
  {"id": "e5", "source": "level2_retriever", "target": "hierarchy_fusion"},
  {"id": "e6", "source": "level3_retriever", "target": "hierarchy_fusion"},
  {"id": "e7", "source": "hierarchy_fusion", "target": "generator"},
  {"id": "e8", "source": "generator", "target": "output"}
]',
'{"hierarchical", "multi-level", "cascading", "abstraction"}'),

('Multi-query RAG', 'RAG with multiple query variations for comprehensive retrieval coverage.', 'rag', 'free', 'beginner',
'[
  {"id": "input", "type": "inputNode", "position": {"x": 100, "y": 100}, "data": {"label": "Query Input"}},
  {"id": "query_generator", "type": "llmNode", "position": {"x": 300, "y": 100}, "data": {"label": "Query Generator", "model": "gpt-3.5-turbo", "num_variations": 3, "temperature": 0.5}},
  {"id": "retriever_1", "type": "ragRetrieverNode", "position": {"x": 500, "y": 50}, "data": {"label": "Retriever 1", "vectorStore": "pinecone", "topK": 5}},
  {"id": "retriever_2", "type": "ragRetrieverNode", "position": {"x": 500, "y": 100}, "data": {"label": "Retriever 2", "vectorStore": "pinecone", "topK": 5}},
  {"id": "retriever_3", "type": "ragRetrieverNode", "position": {"x": 500, "y": 150}, "data": {"label": "Retriever 3", "vectorStore": "pinecone", "topK": 5}},
  {"id": "result_merger", "type": "processorNode", "position": {"x": 700, "y": 100}, "data": {"label": "Result Merger", "strategy": "union_with_dedup", "similarity_threshold": 0.9}},
  {"id": "generator", "type": "llmNode", "position": {"x": 900, "y": 100}, "data": {"label": "Generator", "model": "gpt-4"}},
  {"id": "output", "type": "outputNode", "position": {"x": 1100, "y": 100}, "data": {"label": "Response"}}
]',
'[
  {"id": "e1", "source": "input", "target": "query_generator"},
  {"id": "e2", "source": "query_generator", "target": "retriever_1"},
  {"id": "e3", "source": "query_generator", "target": "retriever_2"},
  {"id": "e4", "source": "query_generator", "target": "retriever_3"},
  {"id": "e5", "source": "retriever_1", "target": "result_merger"},
  {"id": "e6", "source": "retriever_2", "target": "result_merger"},
  {"id": "e7", "source": "retriever_3", "target": "result_merger"},
  {"id": "e8", "source": "result_merger", "target": "generator"},
  {"id": "e9", "source": "generator", "target": "output"}
]',
'{"multi-query", "query-variations", "comprehensive", "coverage"}'),

('Parent-Child RAG', 'RAG with parent-child document relationships for contextual retrieval.', 'rag', 'free', 'intermediate',
'[
  {"id": "input", "type": "inputNode", "position": {"x": 100, "y": 100}, "data": {"label": "Query Input"}},
  {"id": "child_retriever", "type": "ragRetrieverNode", "position": {"x": 300, "y": 100}, "data": {"label": "Child Retriever", "vectorStore": "pinecone", "index": "child_chunks", "topK": 10}},
  {"id": "parent_resolver", "type": "processorNode", "position": {"x": 500, "y": 100}, "data": {"label": "Parent Resolver", "strategy": "fetch_parent_documents"}},
  {"id": "context_builder", "type": "processorNode", "position": {"x": 700, "y": 100}, "data": {"label": "Context Builder", "max_parent_size": 2048, "include_siblings": true}},
  {"id": "relevance_filter", "type": "processorNode", "position": {"x": 900, "y": 100}, "data": {"label": "Relevance Filter", "threshold": 0.7}},
  {"id": "generator", "type": "llmNode", "position": {"x": 1100, "y": 100}, "data": {"label": "Generator", "model": "gpt-4"}},
  {"id": "output", "type": "outputNode", "position": {"x": 1300, "y": 100}, "data": {"label": "Response"}}
]',
'[
  {"id": "e1", "source": "input", "target": "child_retriever"},
  {"id": "e2", "source": "child_retriever", "target": "parent_resolver"},
  {"id": "e3", "source": "parent_resolver", "target": "context_builder"},
  {"id": "e4", "source": "context_builder", "target": "relevance_filter"},
  {"id": "e5", "source": "relevance_filter", "target": "generator"},
  {"id": "e6", "source": "generator", "target": "output"}
]',
'{"parent-child", "contextual", "document-relationships", "hierarchical"}'),

('Rerank RAG', 'RAG with sophisticated reranking models for precision optimization.', 'rag', 'free', 'beginner',
'[
  {"id": "input", "type": "inputNode", "position": {"x": 100, "y": 100}, "data": {"label": "Query Input"}},
  {"id": "initial_retriever", "type": "ragRetrieverNode", "position": {"x": 300, "y": 100}, "data": {"label": "Initial Retriever", "vectorStore": "pinecone", "topK": 20}},
  {"id": "cross_encoder", "type": "processorNode", "position": {"x": 500, "y": 100}, "data": {"label": "Cross Encoder", "model": "ms-marco-MiniLM-L-6-v2", "batch_size": 8}},
  {"id": "diversity_filter", "type": "processorNode", "position": {"x": 700, "y": 100}, "data": {"label": "Diversity Filter", "strategy": "maximal_marginal_relevance", "lambda": 0.5}},
  {"id": "top_k_selector", "type": "processorNode", "position": {"x": 900, "y": 100}, "data": {"label": "Top-K Selector", "final_k": 5}},
  {"id": "generator", "type": "llmNode", "position": {"x": 1100, "y": 100}, "data": {"label": "Generator", "model": "gpt-4"}},
  {"id": "output", "type": "outputNode", "position": {"x": 1300, "y": 100}, "data": {"label": "Response"}}
]',
'[
  {"id": "e1", "source": "input", "target": "initial_retriever"},
  {"id": "e2", "source": "initial_retriever", "target": "cross_encoder"},
  {"id": "e3", "source": "cross_encoder", "target": "diversity_filter"},
  {"id": "e4", "source": "diversity_filter", "target": "top_k_selector"},
  {"id": "e5", "source": "top_k_selector", "target": "generator"},
  {"id": "e6", "source": "generator", "target": "output"}
]',
'{"reranking", "cross-encoder", "precision", "diversity"}'),

('Ensemble RAG', 'Ensemble RAG combining multiple retrieval strategies with voting mechanisms.', 'rag', 'pro', 'intermediate',
'[
  {"id": "input", "type": "inputNode", "position": {"x": 100, "y": 100}, "data": {"label": "Query Input"}},
  {"id": "dense_retriever", "type": "ragRetrieverNode", "position": {"x": 300, "y": 50}, "data": {"label": "Dense Retriever", "vectorStore": "pinecone", "model": "sentence-transformers", "topK": 10}},
  {"id": "keyword_retriever", "type": "ragRetrieverNode", "position": {"x": 300, "y": 150}, "data": {"label": "Keyword Retriever", "vectorStore": "elasticsearch", "method": "bm25", "topK": 10}},
  {"id": "semantic_retriever", "type": "ragRetrieverNode", "position": {"x": 300, "y": 250}, "data": {"label": "Semantic Retriever", "vectorStore": "pinecone", "model": "mpnet", "topK": 10}},
  {"id": "ensemble_voter", "type": "processorNode", "position": {"x": 500, "y": 150}, "data": {"label": "Ensemble Voter", "strategy": "weighted_voting", "weights": [0.4, 0.3, 0.3]}},
  {"id": "confidence_filter", "type": "processorNode", "position": {"x": 700, "y": 150}, "data": {"label": "Confidence Filter", "min_confidence": 0.6}},
  {"id": "generator", "type": "llmNode", "position": {"x": 900, "y": 150}, "data": {"label": "Generator", "model": "gpt-4"}},
  {"id": "output", "type": "outputNode", "position": {"x": 1100, "y": 150}, "data": {"label": "Response"}}
]',
'[
  {"id": "e1", "source": "input", "target": "dense_retriever"},
  {"id": "e2", "source": "input", "target": "keyword_retriever"},
  {"id": "e3", "source": "input", "target": "semantic_retriever"},
  {"id": "e4", "source": "dense_retriever", "target": "ensemble_voter"},
  {"id": "e5", "source": "keyword_retriever", "target": "ensemble_voter"},
  {"id": "e6", "source": "semantic_retriever", "target": "ensemble_voter"},
  {"id": "e7", "source": "ensemble_voter", "target": "confidence_filter"},
  {"id": "e8", "source": "confidence_filter", "target": "generator"},
  {"id": "e9", "source": "generator", "target": "output"}
]',
'{"ensemble", "voting", "multi-strategy", "confidence"}'),

('Adaptive RAG', 'Adaptive RAG with dynamic strategy selection based on query complexity.', 'rag', 'enterprise', 'advanced',
'[
  {"id": "input", "type": "inputNode", "position": {"x": 100, "y": 100}, "data": {"label": "Query Input"}},
  {"id": "complexity_analyzer", "type": "processorNode", "position": {"x": 300, "y": 100}, "data": {"label": "Complexity Analyzer", "factors": ["length", "ambiguity", "domain", "specificity"]}},
  {"id": "strategy_selector", "type": "processorNode", "position": {"x": 500, "y": 100}, "data": {"label": "Strategy Selector", "strategies": ["simple", "multi_hop", "graph", "agentic"]}},
  {"id": "simple_rag", "type": "ragRetrieverNode", "position": {"x": 700, "y": 50}, "data": {"label": "Simple RAG", "vectorStore": "pinecone", "topK": 5}},
  {"id": "multi_hop_rag", "type": "processorNode", "position": {"x": 700, "y": 100}, "data": {"label": "Multi-hop RAG", "max_hops": 3}},
  {"id": "graph_rag", "type": "processorNode", "position": {"x": 700, "y": 150}, "data": {"label": "Graph RAG", "graph_db": "neo4j"}},
  {"id": "agentic_rag", "type": "processorNode", "position": {"x": 700, "y": 200}, "data": {"label": "Agentic RAG", "agent_tools": ["search", "calculate", "reason"]}},
  {"id": "adaptive_generator", "type": "llmNode", "position": {"x": 900, "y": 125}, "data": {"label": "Adaptive Generator", "model": "gpt-4"}},
  {"id": "output", "type": "outputNode", "position": {"x": 1100, "y": 125}, "data": {"label": "Response"}}
]',
'[
  {"id": "e1", "source": "input", "target": "complexity_analyzer"},
  {"id": "e2", "source": "complexity_analyzer", "target": "strategy_selector"},
  {"id": "e3", "source": "strategy_selector", "target": "simple_rag"},
  {"id": "e4", "source": "strategy_selector", "target": "multi_hop_rag"},
  {"id": "e5", "source": "strategy_selector", "target": "graph_rag"},
  {"id": "e6", "source": "strategy_selector", "target": "agentic_rag"},
  {"id": "e7", "source": "simple_rag", "target": "adaptive_generator"},
  {"id": "e8", "source": "multi_hop_rag", "target": "adaptive_generator"},
  {"id": "e9", "source": "graph_rag", "target": "adaptive_generator"},
  {"id": "e10", "source": "agentic_rag", "target": "adaptive_generator"},
  {"id": "e11", "source": "adaptive_generator", "target": "output"}
]',
'{"adaptive", "dynamic", "complexity-aware", "strategy-selection"}');

-- Create index for efficient template searches
CREATE INDEX idx_blueprint_templates_category ON public.blueprint_templates(category);
CREATE INDEX idx_blueprint_templates_tier ON public.blueprint_templates(tier);
CREATE INDEX idx_blueprint_templates_tags ON public.blueprint_templates USING GIN(tags);