import { useEffect, useRef, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

interface AutosaveOptions {
  onSave: (data: any) => Promise<void>;
  interval?: number; // milliseconds
  conflictResolver?: (local: any, remote: any) => any;
}

export const useAutosave = <T>(
  data: T,
  { onSave, interval = 10000, conflictResolver }: AutosaveOptions
) => {
  const { toast } = useToast();
  const lastSavedData = useRef<T>(data);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const isSaving = useRef(false);

  const save = useCallback(async () => {
    if (isSaving.current) return;
    
    try {
      isSaving.current = true;
      await onSave(data);
      lastSavedData.current = data;
      
      toast({
        title: "Autosaved",
        description: "Your changes have been saved automatically.",
        duration: 2000,
      });
    } catch (error) {
      console.error('Autosave failed:', error);
      
      // Check if it's a conflict error
      if (error instanceof Error && error.message.includes('conflict')) {
        if (conflictResolver) {
          try {
            // Get remote data and resolve conflict
            const remoteData = JSON.parse(error.message.split('remote:')[1]);
            const resolvedData = conflictResolver(data, remoteData);
            await onSave(resolvedData);
            
            toast({
              title: "Conflict Resolved",
              description: "Changes were merged automatically.",
              duration: 3000,
            });
          } catch (resolveError) {
            toast({
              title: "Save Conflict",
              description: "Please manually resolve the conflict and save again.",
              variant: "destructive",
            });
          }
        }
      } else {
        toast({
          title: "Autosave Failed",
          description: "Failed to save changes automatically.",
          variant: "destructive",
        });
      }
    } finally {
      isSaving.current = false;
    }
  }, [data, onSave, toast, conflictResolver]);

  // Schedule autosave when data changes
  useEffect(() => {
    if (JSON.stringify(data) === JSON.stringify(lastSavedData.current)) {
      return; // No changes
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(save, interval);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [data, save, interval]);

  // Listen for manual save trigger
  useEffect(() => {
    const handleManualSave = () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      save();
    };

    window.addEventListener('triggerAutosave', handleManualSave);
    return () => window.removeEventListener('triggerAutosave', handleManualSave);
  }, [save]);

  // Save on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (JSON.stringify(data) !== JSON.stringify(lastSavedData.current)) {
        // Synchronous save attempt
        navigator.sendBeacon('/api/autosave', JSON.stringify(data));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [data]);

  return {
    save,
    isSaving: isSaving.current,
    hasUnsavedChanges: JSON.stringify(data) !== JSON.stringify(lastSavedData.current)
  };
};