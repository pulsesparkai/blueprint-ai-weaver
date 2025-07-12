import { useToast } from '@/hooks/use-toast';
import { AppError, ERROR_CODES } from '@/lib/errors';

export interface ErrorHandlerOptions {
  showToast?: boolean;
  logError?: boolean;
  fallbackMessage?: string;
}

export function useErrorHandler() {
  const { toast } = useToast();

  const handleError = (
    error: Error | AppError | any,
    options: ErrorHandlerOptions = {}
  ) => {
    const {
      showToast = true,
      logError = true,
      fallbackMessage = 'An unexpected error occurred'
    } = options;

    // Log error for debugging
    if (logError) {
      console.error('Error handled:', error);
    }

    // Determine error details
    let title = 'Error';
    let description = fallbackMessage;
    let variant: 'default' | 'destructive' = 'destructive';

    if (error instanceof AppError) {
      title = getErrorTitle(error.code);
      description = error.message;
      variant = error.statusCode >= 500 ? 'destructive' : 'default';
    } else if (error?.message) {
      description = error.message;
    }

    // Show toast notification
    if (showToast) {
      toast({
        title,
        description,
        variant
      });
    }

    return {
      title,
      description,
      variant,
      code: error instanceof AppError ? error.code : 'UNKNOWN_ERROR'
    };
  };

  const handleValidationError = (field: string, message: string) => {
    toast({
      title: 'Validation Error',
      description: `${field}: ${message}`,
      variant: 'destructive'
    });
  };

  const handleSuccess = (message: string, description?: string) => {
    toast({
      title: 'Success',
      description: description || message,
      variant: 'default'
    });
  };

  return {
    handleError,
    handleValidationError,
    handleSuccess
  };
}

function getErrorTitle(errorCode: string): string {
  switch (errorCode) {
    case ERROR_CODES.INVALID_GRAPH.code:
    case ERROR_CODES.MISSING_ENTRY_NODES.code:
    case ERROR_CODES.CYCLIC_DEPENDENCY.code:
    case ERROR_CODES.DISCONNECTED_NODES.code:
      return 'Graph Validation Error';
      
    case ERROR_CODES.INVALID_NODE_CONFIG.code:
    case ERROR_CODES.MISSING_REQUIRED_FIELDS.code:
      return 'Node Configuration Error';
      
    case ERROR_CODES.UNAUTHORIZED.code:
    case ERROR_CODES.FORBIDDEN.code:
      return 'Authentication Error';
      
    case ERROR_CODES.BLUEPRINT_NOT_FOUND.code:
    case ERROR_CODES.INTEGRATION_NOT_FOUND.code:
      return 'Resource Not Found';
      
    case ERROR_CODES.LLM_API_ERROR.code:
    case ERROR_CODES.INTEGRATION_ERROR.code:
      return 'External Service Error';
      
    case ERROR_CODES.SIMULATION_ERROR.code:
      return 'Simulation Error';
      
    default:
      return 'System Error';
  }
}