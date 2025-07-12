import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { AppError, ERROR_CODES } from '@/lib/errors';

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

describe('useErrorHandler', () => {
  it('should handle AppError correctly', () => {
    const { result } = renderHook(() => useErrorHandler());
    const error = new AppError(ERROR_CODES.INVALID_GRAPH, { test: 'data' });
    
    const handled = result.current.handleError(error);
    
    expect(handled.title).toBe('Graph Validation Error');
    expect(handled.description).toBe('Graph structure is invalid');
    expect(handled.variant).toBe('default');
    expect(handled.code).toBe('INVALID_GRAPH');
  });

  it('should handle generic Error correctly', () => {
    const { result } = renderHook(() => useErrorHandler());
    const error = new Error('Something went wrong');
    
    const handled = result.current.handleError(error);
    
    expect(handled.title).toBe('Error');
    expect(handled.description).toBe('Something went wrong');
    expect(handled.variant).toBe('destructive');
    expect(handled.code).toBe('UNKNOWN_ERROR');
  });

  it('should use fallback message for errors without message', () => {
    const { result } = renderHook(() => useErrorHandler());
    const error = {};
    
    const handled = result.current.handleError(error, {
      fallbackMessage: 'Custom fallback'
    });
    
    expect(handled.description).toBe('Custom fallback');
  });

  it('should handle validation errors', () => {
    const { result } = renderHook(() => useErrorHandler());
    
    // This should not throw
    expect(() => {
      result.current.handleValidationError('email', 'is required');
    }).not.toThrow();
  });

  it('should handle success messages', () => {
    const { result } = renderHook(() => useErrorHandler());
    
    // This should not throw
    expect(() => {
      result.current.handleSuccess('Operation completed');
    }).not.toThrow();
  });

  it('should set correct variant for server errors', () => {
    const { result } = renderHook(() => useErrorHandler());
    const error = new AppError(ERROR_CODES.INTERNAL_ERROR);
    
    const handled = result.current.handleError(error);
    
    expect(handled.variant).toBe('destructive');
  });

  it('should set correct variant for client errors', () => {
    const { result } = renderHook(() => useErrorHandler());
    const error = new AppError(ERROR_CODES.INVALID_GRAPH);
    
    const handled = result.current.handleError(error);
    
    expect(handled.variant).toBe('default');
  });
});