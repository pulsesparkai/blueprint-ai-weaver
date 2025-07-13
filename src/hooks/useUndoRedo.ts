import { useState, useCallback, useRef, useEffect } from "react";

interface UndoRedoState<T> {
  history: T[];
  currentIndex: number;
}

export const useUndoRedo = <T>(initialState: T, maxHistorySize = 50) => {
  const [state, setState] = useState<UndoRedoState<T>>({
    history: [initialState],
    currentIndex: 0
  });

  const isInternalUpdate = useRef(false);

  const canUndo = state.currentIndex > 0;
  const canRedo = state.currentIndex < state.history.length - 1;

  const updateState = useCallback((newState: T | ((prev: T) => T)) => {
    setState(prev => {
      const resolvedState = typeof newState === 'function' 
        ? (newState as (prev: T) => T)(prev.history[prev.currentIndex])
        : newState;
      
      // Don't add to history if it's an internal update (undo/redo)
      if (isInternalUpdate.current) {
        return prev;
      }

      const newHistory = [
        ...prev.history.slice(0, prev.currentIndex + 1),
        resolvedState
      ].slice(-maxHistorySize);

      return {
        history: newHistory,
        currentIndex: newHistory.length - 1
      };
    });
  }, [maxHistorySize]);

  const undo = useCallback(() => {
    if (!canUndo) return;
    
    isInternalUpdate.current = true;
    setState(prev => ({
      ...prev,
      currentIndex: prev.currentIndex - 1
    }));
    isInternalUpdate.current = false;
  }, [canUndo]);

  const redo = useCallback(() => {
    if (!canRedo) return;
    
    isInternalUpdate.current = true;
    setState(prev => ({
      ...prev,
      currentIndex: prev.currentIndex + 1
    }));
    isInternalUpdate.current = false;
  }, [canRedo]);

  const clearHistory = useCallback(() => {
    setState(prev => ({
      history: [prev.history[prev.currentIndex]],
      currentIndex: 0
    }));
  }, []);

  // Listen for keyboard shortcuts
  useEffect(() => {
    const handleUndo = () => undo();
    const handleRedo = () => redo();

    window.addEventListener('triggerUndo', handleUndo);
    window.addEventListener('triggerRedo', handleRedo);

    return () => {
      window.removeEventListener('triggerUndo', handleUndo);
      window.removeEventListener('triggerRedo', handleRedo);
    };
  }, [undo, redo]);

  return {
    currentState: state.history[state.currentIndex],
    updateState,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
    historySize: state.history.length
  };
};