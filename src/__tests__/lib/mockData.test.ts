import { describe, it, expect } from 'vitest';
import { getMockLLMResponse, getMockRAGDocuments, MOCK_LLM_RESPONSES } from '@/lib/mockData';

describe('getMockLLMResponse', () => {
  it('should return default response for generic prompt', () => {
    const response = getMockLLMResponse('Hello world');
    expect(response).toEqual(MOCK_LLM_RESPONSES.default);
  });

  it('should return summarization response for summary prompts', () => {
    const response = getMockLLMResponse('Please summarize this text');
    expect(response).toEqual(MOCK_LLM_RESPONSES.summarization);
  });

  it('should return classification response for classify prompts', () => {
    const response = getMockLLMResponse('Classify this content');
    expect(response).toEqual(MOCK_LLM_RESPONSES.classification);
  });

  it('should return generation response for generate prompts', () => {
    const response = getMockLLMResponse('Generate a story');
    expect(response).toEqual(MOCK_LLM_RESPONSES.generation);
  });

  it('should return RAG response when context has documents', () => {
    const context = { documents: ['doc1', 'doc2'] };
    const response = getMockLLMResponse('Answer this question', context);
    expect(response).toEqual(MOCK_LLM_RESPONSES['rag-query']);
  });

  it('should return RAG response for "based on" prompts', () => {
    const response = getMockLLMResponse('Based on the provided context');
    expect(response).toEqual(MOCK_LLM_RESPONSES['rag-query']);
  });
});

describe('getMockRAGDocuments', () => {
  it('should return default number of documents', () => {
    const docs = getMockRAGDocuments('test query');
    expect(docs).toHaveLength(3);
  });

  it('should return specified number of documents', () => {
    const docs = getMockRAGDocuments('test query', 2);
    expect(docs).toHaveLength(2);
  });

  it('should include query in document content', () => {
    const query = 'artificial intelligence';
    const docs = getMockRAGDocuments(query);
    
    docs.forEach(doc => {
      expect(doc.content).toContain('artificial intelligence');
    });
  });

  it('should have decreasing scores', () => {
    const docs = getMockRAGDocuments('test query');
    
    for (let i = 1; i < docs.length; i++) {
      expect(docs[i].score).toBeLessThan(docs[i - 1].score);
    }
  });

  it('should include metadata', () => {
    const docs = getMockRAGDocuments('test query');
    
    docs.forEach(doc => {
      expect(doc.metadata).toBeDefined();
      expect(doc.metadata.source).toBe('knowledge_base');
      expect(doc.metadata.chunk_id).toBeDefined();
      expect(doc.metadata.timestamp).toBeDefined();
    });
  });
});