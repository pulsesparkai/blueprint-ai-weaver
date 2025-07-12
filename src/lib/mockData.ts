// Mock data for testing and development

export interface MockLLMResponse {
  response: string;
  metrics: {
    tokensInput: number;
    tokensOutput: number;
    costUsd: number;
    latencyMs: number;
  };
}

export const MOCK_LLM_RESPONSES: { [key: string]: MockLLMResponse } = {
  'default': {
    response: 'This is a mock response for testing purposes. The context has been processed successfully.',
    metrics: {
      tokensInput: 150,
      tokensOutput: 75,
      costUsd: 0.002,
      latencyMs: 500
    }
  },
  'rag-query': {
    response: 'Based on the retrieved documents, here is the answer to your question: The information shows that the query has been processed with relevant context from the knowledge base.',
    metrics: {
      tokensInput: 250,
      tokensOutput: 120,
      costUsd: 0.004,
      latencyMs: 750
    }
  },
  'summarization': {
    response: 'Summary: The provided content has been analyzed and condensed into key points while maintaining the essential information.',
    metrics: {
      tokensInput: 500,
      tokensOutput: 80,
      costUsd: 0.006,
      latencyMs: 600
    }
  },
  'classification': {
    response: '{"category": "technology", "confidence": 0.89, "reasoning": "The content discusses technical concepts and implementations."}',
    metrics: {
      tokensInput: 200,
      tokensOutput: 45,
      costUsd: 0.003,
      latencyMs: 400
    }
  },
  'generation': {
    response: 'Generated content based on the input: This is a creative response that demonstrates the capabilities of the language model in producing relevant and coherent text.',
    metrics: {
      tokensInput: 100,
      tokensOutput: 150,
      costUsd: 0.005,
      latencyMs: 800
    }
  }
};

export const MOCK_RAG_DOCUMENTS = [
  {
    content: 'This is a sample document from the knowledge base containing relevant information about the query topic.',
    score: 0.95,
    metadata: {
      source: 'knowledge_base',
      chunk_id: 'doc_1_chunk_1',
      timestamp: '2024-01-15T10:30:00Z'
    }
  },
  {
    content: 'Additional context document that provides supplementary information and background details for comprehensive understanding.',
    score: 0.87,
    metadata: {
      source: 'knowledge_base',
      chunk_id: 'doc_2_chunk_1',
      timestamp: '2024-01-14T14:20:00Z'
    }
  },
  {
    content: 'Supporting document with specific examples and use cases that demonstrate practical applications of the concepts.',
    score: 0.82,
    metadata: {
      source: 'knowledge_base',
      chunk_id: 'doc_3_chunk_2',
      timestamp: '2024-01-13T09:15:00Z'
    }
  }
];

export const MOCK_INTEGRATION_CONFIGS = {
  pinecone: {
    type: 'pinecone',
    config: {
      environment: 'test-env',
      indexName: 'test-index',
      dimension: 1536,
      metric: 'cosine'
    },
    status: 'active',
    lastValidated: new Date().toISOString()
  },
  weaviate: {
    type: 'weaviate',
    config: {
      host: 'localhost:8080',
      scheme: 'http',
      className: 'TestDocument'
    },
    status: 'active',
    lastValidated: new Date().toISOString()
  },
  chroma: {
    type: 'chroma',
    config: {
      host: 'localhost',
      port: 8000,
      collectionName: 'test-collection'
    },
    status: 'active',
    lastValidated: new Date().toISOString()
  }
};

export function getMockLLMResponse(prompt: string, context?: any): MockLLMResponse {
  // Simple keyword matching for different response types
  const lowerPrompt = prompt.toLowerCase();
  
  if (lowerPrompt.includes('summarize') || lowerPrompt.includes('summary')) {
    return MOCK_LLM_RESPONSES.summarization;
  }
  
  if (lowerPrompt.includes('classify') || lowerPrompt.includes('category')) {
    return MOCK_LLM_RESPONSES.classification;
  }
  
  if (lowerPrompt.includes('generate') || lowerPrompt.includes('create')) {
    return MOCK_LLM_RESPONSES.generation;
  }
  
  if (context?.documents || lowerPrompt.includes('based on')) {
    return MOCK_LLM_RESPONSES['rag-query'];
  }
  
  return MOCK_LLM_RESPONSES.default;
}

export function getMockRAGDocuments(query: string, limit = 3) {
  // Return mock documents with slight variations based on query
  return MOCK_RAG_DOCUMENTS.slice(0, limit).map((doc, index) => ({
    ...doc,
    content: `${doc.content} (Query: "${query.substring(0, 20)}...")`,
    score: doc.score - (index * 0.02) // Slightly decrease scores
  }));
}

export const MOCK_ERROR_SCENARIOS = {
  llmTimeout: {
    type: 'timeout',
    message: 'LLM request timed out after 30 seconds',
    code: 'REQUEST_TIMEOUT'
  },
  invalidApiKey: {
    type: 'authentication',
    message: 'Invalid API key provided',
    code: 'INVALID_API_KEY'
  },
  rateLimitExceeded: {
    type: 'rate_limit',
    message: 'Rate limit exceeded. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  integrationDown: {
    type: 'service_unavailable',
    message: 'Vector database integration is currently unavailable',
    code: 'INTEGRATION_UNAVAILABLE'
  }
};