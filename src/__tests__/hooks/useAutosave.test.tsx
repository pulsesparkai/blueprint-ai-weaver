import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAutosave } from '@/hooks/useAutosave';

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

describe('useAutosave Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should save data after interval', async () => {
    const mockSave = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => 
      useAutosave('initial data', { onSave: mockSave, interval: 1000 })
    );

    // Update data
    act(() => {
      renderHook(() => useAutosave('updated data', { onSave: mockSave, interval: 1000 }));
    });

    // Fast forward time
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledWith('updated data');
    });
  });

  it('should handle save conflicts with resolver', async () => {
    const conflictError = new Error('Conflict: remote:{"data":"remote version"}');
    const mockSave = vi.fn()
      .mockRejectedValueOnce(conflictError)
      .mockResolvedValueOnce(undefined);
    
    const mockResolver = vi.fn((local, remote) => `merged: ${local} + ${remote.data}`);

    const { result } = renderHook(() => 
      useAutosave('local data', { 
        onSave: mockSave, 
        interval: 1000,
        conflictResolver: mockResolver
      })
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(mockResolver).toHaveBeenCalledWith('local data', { data: 'remote version' });
      expect(mockSave).toHaveBeenCalledTimes(2);
    });
  });

  it('should save on manual trigger', async () => {
    const mockSave = vi.fn().mockResolvedValue(undefined);
    renderHook(() => useAutosave('test data', { onSave: mockSave }));

    // Trigger manual save
    act(() => {
      window.dispatchEvent(new CustomEvent('triggerAutosave'));
    });

    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledWith('test data');
    });
  });

  it('should not save if data hasnt changed', async () => {
    const mockSave = vi.fn().mockResolvedValue(undefined);
    renderHook(() => useAutosave('same data', { onSave: mockSave, interval: 1000 }));

    // Don't change data, just advance time
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Should not save since data didn't change
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('should handle save errors gracefully', async () => {
    const mockSave = vi.fn().mockRejectedValue(new Error('Save failed'));
    const { result } = renderHook(() => 
      useAutosave('test data', { onSave: mockSave, interval: 1000 })
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(mockSave).toHaveBeenCalled();
      // Should not throw, error is handled internally
    });
  });

  it('should prevent concurrent saves', async () => {
    let savePromiseResolve: () => void;
    const savePromise = new Promise<void>((resolve) => {
      savePromiseResolve = resolve;
    });
    
    const mockSave = vi.fn().mockReturnValue(savePromise);
    
    renderHook(() => useAutosave('test data', { onSave: mockSave, interval: 100 }));

    // Trigger first save
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Trigger second save before first completes
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Should only call save once
    expect(mockSave).toHaveBeenCalledTimes(1);

    // Resolve the promise
    act(() => {
      savePromiseResolve!();
    });
  });
});