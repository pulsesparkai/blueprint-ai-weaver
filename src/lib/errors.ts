// Standardized error handling system

export interface ErrorCode {
  code: string;
  message: string;
  statusCode: number;
}

export const ERROR_CODES = {
  // Graph validation errors (400)
  INVALID_GRAPH: {
    code: 'INVALID_GRAPH',
    message: 'Graph structure is invalid',
    statusCode: 400
  },
  MISSING_ENTRY_NODES: {
    code: 'MISSING_ENTRY_NODES',
    message: 'Graph must have at least one entry node',
    statusCode: 400
  },
  CYCLIC_DEPENDENCY: {
    code: 'CYCLIC_DEPENDENCY',
    message: 'Graph contains cyclic dependencies',
    statusCode: 400
  },
  DISCONNECTED_NODES: {
    code: 'DISCONNECTED_NODES',
    message: 'Graph contains disconnected nodes',
    statusCode: 400
  },

  // Node configuration errors (400)
  INVALID_NODE_CONFIG: {
    code: 'INVALID_NODE_CONFIG',
    message: 'Node configuration is invalid',
    statusCode: 400
  },
  MISSING_REQUIRED_FIELDS: {
    code: 'MISSING_REQUIRED_FIELDS',
    message: 'Required fields are missing',
    statusCode: 400
  },

  // Authentication/Authorization errors (401/403)
  UNAUTHORIZED: {
    code: 'UNAUTHORIZED',
    message: 'Authentication required',
    statusCode: 401
  },
  FORBIDDEN: {
    code: 'FORBIDDEN',
    message: 'Access denied',
    statusCode: 403
  },

  // Resource errors (404)
  BLUEPRINT_NOT_FOUND: {
    code: 'BLUEPRINT_NOT_FOUND',
    message: 'Blueprint not found',
    statusCode: 404
  },
  INTEGRATION_NOT_FOUND: {
    code: 'INTEGRATION_NOT_FOUND',
    message: 'Integration not found',
    statusCode: 404
  },

  // External service errors (502/503)
  LLM_API_ERROR: {
    code: 'LLM_API_ERROR',
    message: 'LLM service is unavailable',
    statusCode: 502
  },
  INTEGRATION_ERROR: {
    code: 'INTEGRATION_ERROR',
    message: 'External integration error',
    statusCode: 502
  },

  // Internal errors (500)
  INTERNAL_ERROR: {
    code: 'INTERNAL_ERROR',
    message: 'Internal server error',
    statusCode: 500
  },
  SIMULATION_ERROR: {
    code: 'SIMULATION_ERROR',
    message: 'Simulation execution failed',
    statusCode: 500
  }
} as const;

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: any;

  constructor(errorCode: ErrorCode, details?: any) {
    super(errorCode.message);
    this.code = errorCode.code;
    this.statusCode = errorCode.statusCode;
    this.details = details;
    this.name = 'AppError';
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      statusCode: this.statusCode
    };
  }
}

export function createErrorResponse(error: AppError | Error, statusCode = 500) {
  if (error instanceof AppError) {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details
      },
      statusCode: error.statusCode
    };
  }

  return {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: error.message || 'An unexpected error occurred'
    },
    statusCode
  };
}

// Graph validation functions
export function validateGraph(nodes: any[], edges: any[]): void {
  if (!nodes || nodes.length === 0) {
    throw new AppError(ERROR_CODES.INVALID_GRAPH, { reason: 'No nodes provided' });
  }

  // Check for entry nodes
  const entryNodes = nodes.filter(node => 
    !edges.some(edge => edge.target === node.id)
  );

  if (entryNodes.length === 0) {
    throw new AppError(ERROR_CODES.MISSING_ENTRY_NODES);
  }

  // Check for cyclic dependencies
  if (hasCycle(nodes, edges)) {
    throw new AppError(ERROR_CODES.CYCLIC_DEPENDENCY);
  }

  // Check for disconnected nodes
  const connectedNodes = new Set<string>();
  const queue = [...entryNodes.map(n => n.id)];
  
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (connectedNodes.has(nodeId)) continue;
    
    connectedNodes.add(nodeId);
    const outgoingEdges = edges.filter(e => e.source === nodeId);
    queue.push(...outgoingEdges.map(e => e.target));
  }

  const disconnectedNodes = nodes.filter(n => !connectedNodes.has(n.id));
  if (disconnectedNodes.length > 0) {
    throw new AppError(ERROR_CODES.DISCONNECTED_NODES, { 
      nodes: disconnectedNodes.map(n => n.id) 
    });
  }
}

function hasCycle(nodes: any[], edges: any[]): boolean {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(nodeId: string): boolean {
    if (recursionStack.has(nodeId)) return true;
    if (visited.has(nodeId)) return false;

    visited.add(nodeId);
    recursionStack.add(nodeId);

    const outgoingEdges = edges.filter(e => e.source === nodeId);
    for (const edge of outgoingEdges) {
      if (dfs(edge.target)) return true;
    }

    recursionStack.delete(nodeId);
    return false;
  }

  for (const node of nodes) {
    if (!visited.has(node.id) && dfs(node.id)) {
      return true;
    }
  }

  return false;
}

// Node validation functions
export function validateNodeConfig(nodeType: string, config: any): void {
  switch (nodeType) {
    case 'prompt-template':
      if (!config.template) {
        throw new AppError(ERROR_CODES.MISSING_REQUIRED_FIELDS, { 
          field: 'template', nodeType 
        });
      }
      if (!config.variables || !Array.isArray(config.variables)) {
        throw new AppError(ERROR_CODES.MISSING_REQUIRED_FIELDS, { 
          field: 'variables', nodeType 
        });
      }
      break;
      
    case 'rag-retriever':
      if (!config.integration) {
        throw new AppError(ERROR_CODES.MISSING_REQUIRED_FIELDS, { 
          field: 'integration', nodeType 
        });
      }
      break;
      
    case 'output-parser':
      if (!config.parserType) {
        throw new AppError(ERROR_CODES.MISSING_REQUIRED_FIELDS, { 
          field: 'parserType', nodeType 
        });
      }
      break;
  }
}