import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export const KeyboardShortcuts = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if Ctrl/Cmd is pressed
      const isModKey = event.ctrlKey || event.metaKey;
      
      if (!isModKey) return;

      switch (event.key) {
        case 'k':
          event.preventDefault();
          // Open command palette (future implementation)
          toast({
            title: "Command Palette",
            description: "Ctrl+K - Coming soon!"
          });
          break;
        
        case 'h':
          event.preventDefault();
          navigate('/');
          break;
        
        case 'd':
          event.preventDefault();
          navigate('/dashboard');
          break;
        
        case 'e':
          event.preventDefault();
          navigate('/editor');
          break;
        
        case 't':
          event.preventDefault();
          navigate('/templates');
          break;
        
        case 'i':
          event.preventDefault();
          navigate('/integrations');
          break;
        
        case 's':
          event.preventDefault();
          // Trigger autosave
          const saveEvent = new CustomEvent('triggerAutosave');
          window.dispatchEvent(saveEvent);
          break;
        
        case 'z':
          if (event.shiftKey) {
            event.preventDefault();
            // Redo
            const redoEvent = new CustomEvent('triggerRedo');
            window.dispatchEvent(redoEvent);
          } else {
            event.preventDefault();
            // Undo
            const undoEvent = new CustomEvent('triggerUndo');
            window.dispatchEvent(undoEvent);
          }
          break;
        
        case '/':
          event.preventDefault();
          // Focus search
          const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement;
          if (searchInput) {
            searchInput.focus();
          }
          break;
        
        case '?':
          event.preventDefault();
          // Show help
          const helpEvent = new CustomEvent('showHelp');
          window.dispatchEvent(helpEvent);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigate, toast]);

  return null;
};