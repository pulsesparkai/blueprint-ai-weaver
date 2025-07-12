import { describe, it, expect } from 'vitest';
import { AppError, ERROR_CODES, validateGraph, validateNodeConfig, createErrorResponse } from '@/lib/errors';

describe('AppError', () => {
  it('should create an error with correct properties', () => {
    const error = new AppError(ERROR_CODES.INVALID_GRAPH, { reason: 'test' });
    
    expect(error.code).toBe('INVALID_GRAPH');
    expect(error.message).toBe('Graph structure is invalid');
    expect(error.statusCode).toBe(400);
    expect(error.details).toEqual({ reason: 'test' });
  });

  it('should serialize to JSON correctly', () => {
    const error = new AppError(ERROR_CODES.UNAUTHORIZED);
    const json = error.toJSON();
    
    expect(json).toEqual({
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
      details: undefined,
      statusCode: 401
    });
  });
});

describe('createErrorResponse', () => {
  it('should handle AppError correctly', () => {
    const error = new AppError(ERROR_CODES.BLUEPRINT_NOT_FOUND);
    const response = createErrorResponse(error);
    
    expect(response).toEqual({
      success: false,
      error: {
        code: 'BLUEPRINT_NOT_FOUND',
        message: 'Blueprint not found',
        details: undefined
      },
      statusCode: 404
    });
  });

  it('should handle generic Error correctly', () => {
    const error = new Error('Something went wrong');
    const response = createErrorResponse(error);
    
    expect(response).toEqual({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Something went wrong'
      },
      statusCode: 500
    });
  });
});

describe('validateGraph', () => {
  const createNode = (id: string) => ({ id, type: 'test' });
  const createEdge = (source: string, target: string) => ({ source, target });

  it('should pass validation for valid graph', () => {
    const nodes = [createNode('1'), createNode('2')];
    const edges = [createEdge('1', '2')];
    
    expect(() => validateGraph(nodes, edges)).not.toThrow();
  });

  it('should throw error for empty nodes', () => {
    expect(() => validateGraph([], [])).toThrow(AppError);
  });

  it('should throw error for missing entry nodes', () => {
    const nodes = [createNode('1'), createNode('2')];
    const edges = [createEdge('1', '2'), createEdge('2', '1')];
    
    expect(() => validateGraph(nodes, edges)).toThrow(AppError);
  });

  it('should throw error for cyclic dependency', () => {
    const nodes = [createNode('1'), createNode('2'), createNode('3')];
    const edges = [createEdge('1', '2'), createEdge('2', '3'), createEdge('3', '1')];
    
    expect(() => validateGraph(nodes, edges)).toThrow(AppError);
  });

  it('should throw error for disconnected nodes', () => {
    const nodes = [createNode('1'), createNode('2'), createNode('3')];
    const edges = [createEdge('1', '2')]; // node 3 is disconnected
    
    expect(() => validateGraph(nodes, edges)).toThrow(AppError);
  });
});

describe('validateNodeConfig', () => {
  it('should validate prompt-template node correctly', () => {
    const validConfig = {
      template: 'Hello {name}',
      variables: ['name']
    };
    
    expect(() => validateNodeConfig('prompt-template', validConfig)).not.toThrow();
  });

  it('should throw error for missing template in prompt-template', () => {
    const invalidConfig = {
      variables: ['name']
    };
    
    expect(() => validateNodeConfig('prompt-template', invalidConfig)).toThrow(AppError);
  });

  it('should throw error for missing variables in prompt-template', () => {
    const invalidConfig = {
      template: 'Hello {name}'
    };
    
    expect(() => validateNodeConfig('prompt-template', invalidConfig)).toThrow(AppError);
  });

  it('should validate rag-retriever node correctly', () => {
    const validConfig = {
      integration: 'pinecone-test'
    };
    
    expect(() => validateNodeConfig('rag-retriever', validConfig)).not.toThrow();
  });

  it('should throw error for missing integration in rag-retriever', () => {
    const invalidConfig = {};
    
    expect(() => validateNodeConfig('rag-retriever', invalidConfig)).toThrow(AppError);
  });
});