import { renderHook, act } from '@testing-library/react';
import { useUndoRedo } from '@/hooks/useUndoRedo';

describe('useUndoRedo Hook', () => {
  it('should initialize with initial state', () => {
    const { result } = renderHook(() => useUndoRedo('initial'));
    
    expect(result.current.currentState).toBe('initial');
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.historySize).toBe(1);
  });

  it('should update state and enable undo', () => {
    const { result } = renderHook(() => useUndoRedo('initial'));
    
    act(() => {
      result.current.updateState('updated');
    });
    
    expect(result.current.currentState).toBe('updated');
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
    expect(result.current.historySize).toBe(2);
  });

  it('should undo to previous state', () => {
    const { result } = renderHook(() => useUndoRedo('initial'));
    
    act(() => {
      result.current.updateState('updated');
    });
    
    act(() => {
      result.current.undo();
    });
    
    expect(result.current.currentState).toBe('initial');
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
  });

  it('should redo to next state', () => {
    const { result } = renderHook(() => useUndoRedo('initial'));
    
    act(() => {
      result.current.updateState('updated');
    });
    
    act(() => {
      result.current.undo();
    });
    
    act(() => {
      result.current.redo();
    });
    
    expect(result.current.currentState).toBe('updated');
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it('should handle function updates', () => {
    const { result } = renderHook(() => useUndoRedo({ count: 0 }));
    
    act(() => {
      result.current.updateState(prev => ({ count: prev.count + 1 }));
    });
    
    expect(result.current.currentState.count).toBe(1);
  });

  it('should clear history when requested', () => {
    const { result } = renderHook(() => useUndoRedo('initial'));
    
    act(() => {
      result.current.updateState('updated1');
      result.current.updateState('updated2');
    });
    
    act(() => {
      result.current.clearHistory();
    });
    
    expect(result.current.historySize).toBe(1);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('should respect max history size', () => {
    const { result } = renderHook(() => useUndoRedo('initial', 3));
    
    act(() => {
      result.current.updateState('update1');
      result.current.updateState('update2');
      result.current.updateState('update3');
      result.current.updateState('update4'); // Should remove initial state
    });
    
    expect(result.current.historySize).toBe(3);
    
    // Undo to the earliest available state
    act(() => {
      result.current.undo();
      result.current.undo();
    });
    
    expect(result.current.currentState).toBe('update2');
  });

  it('should not undo when at beginning of history', () => {
    const { result } = renderHook(() => useUndoRedo('initial'));
    
    act(() => {
      result.current.undo(); // Should not change anything
    });
    
    expect(result.current.currentState).toBe('initial');
    expect(result.current.canUndo).toBe(false);
  });

  it('should not redo when at end of history', () => {
    const { result } = renderHook(() => useUndoRedo('initial'));
    
    act(() => {
      result.current.updateState('updated');
      result.current.redo(); // Should not change anything
    });
    
    expect(result.current.currentState).toBe('updated');
    expect(result.current.canRedo).toBe(false);
  });
});