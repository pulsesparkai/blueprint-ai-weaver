import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, createMockBlueprint } from '@/test/utils/testUtils';
import { screen, fireEvent } from '@testing-library/dom';
import { SimulatorPane } from '@/components/SimulatorPane';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis()
    })),
    removeChannel: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve({ data: [], error: null }))
          }))
        }))
      }))
    })),
    functions: {
      invoke: vi.fn()
    }
  }
}));

describe('SimulatorPane', () => {
  const defaultProps = {
    isCollapsed: false,
    onToggle: vi.fn(),
    blueprintId: 'test-blueprint-1'
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render with correct title', () => {
    render(<SimulatorPane {...defaultProps} />);
    expect(screen.getByText('Pipeline Simulator')).toBeInTheDocument();
  });

  it('should show collapsed state when isCollapsed is true', () => {
    render(<SimulatorPane {...defaultProps} isCollapsed={true} />);
    expect(screen.queryByText('Test your context pipeline in real-time')).not.toBeInTheDocument();
  });
});