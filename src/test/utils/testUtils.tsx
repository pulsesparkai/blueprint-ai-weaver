import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { GraphProvider } from '@/contexts/GraphContext';
import { AuthProvider } from '@/contexts/AuthContext';

// Mock auth context - will use real AuthProvider with mocked supabase

// Custom render function that includes providers
function customRender(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <AuthProvider>
        <GraphProvider>
          <ReactFlowProvider>
            {children}
          </ReactFlowProvider>
        </GraphProvider>
      </AuthProvider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...options });
}

// Mock data generators
export const createMockNode = (overrides = {}) => ({
  id: 'test-node-1',
  type: 'prompt-template',
  position: { x: 0, y: 0 },
  data: {
    label: 'Test Node',
    template: 'Test template: {input}',
    variables: ['input'],
    ...overrides
  }
});

export const createMockEdge = (overrides = {}) => ({
  id: 'test-edge-1',
  source: 'node-1',
  target: 'node-2',
  ...overrides
});

export const createMockBlueprint = (overrides = {}) => ({
  id: 'test-blueprint-1',
  title: 'Test Blueprint',
  description: 'A test blueprint for unit testing',
  nodes: [createMockNode()],
  edges: [createMockEdge()],
  user_id: 'test-user-id',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides
});

export const createMockSimulation = (overrides = {}) => ({
  id: 'test-simulation-1',
  blueprint_id: 'test-blueprint-1',
  user_id: 'test-user-id',
  session_id: 'test-session-1',
  input_query: 'Test query',
  llm_provider: 'gpt-4o-mini',
  status: 'completed',
  final_output: 'Test output',
  execution_time_ms: 1500,
  started_at: new Date().toISOString(),
  completed_at: new Date().toISOString(),
  ...overrides
});

// Re-export everything
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
export { customRender as render };