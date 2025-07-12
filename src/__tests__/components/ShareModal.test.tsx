import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ShareModal } from '@/components/ShareModal';
import { useToast } from '@/hooks/use-toast';

// Mock dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({
            data: [],
            error: null
          }))
        }))
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: {
              id: 'test-id',
              share_type: 'private',
              access_level: 'view',
              share_token: 'test-token',
              created_at: '2023-01-01T00:00:00Z',
              expires_at: null
            },
            error: null
          }))
        }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({
          error: null
        }))
      }))
    })),
    auth: {
      getUser: vi.fn(() => Promise.resolve({
        data: { user: { id: 'test-user-id' } },
        error: null
      }))
    }
  }
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn()
}));

const mockToast = vi.fn();
const mockDismiss = vi.fn();
vi.mocked(useToast).mockReturnValue({ 
  toast: mockToast,
  dismiss: mockDismiss,
  toasts: []
});

describe('ShareModal', () => {
  const defaultProps = {
    blueprintId: 'test-blueprint-id',
    blueprintTitle: 'Test Blueprint',
    isOpen: true,
    onClose: vi.fn(),
    userTier: 'free' as const
  };

  beforeEach(() => {
    vi.clearAllMocks();
    console.log('Test setup: clearing all mocks');
  });

  it('renders share modal with correct title', () => {
    console.log('Testing ShareModal rendering with title');
    render(<ShareModal {...defaultProps} />);
    expect(screen.getByText('Share "Test Blueprint"')).toBeInTheDocument();
  });

  it('displays tier limitations for free users', () => {
    console.log('Testing tier limitations display for free users');
    render(<ShareModal {...defaultProps} userTier="free" />);
    expect(screen.getByText('Free Tier Limitations')).toBeInTheDocument();
  });

  it('creates share link successfully', async () => {
    console.log('Testing share link creation');
    render(<ShareModal {...defaultProps} />);
    
    const createButton = screen.getByText('Create Share Link');
    fireEvent.click(createButton);
    
    await waitFor(() => {
      console.log('Checking if toast was called with success message');
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Share Link Created',
        description: 'Your blueprint share link has been generated.'
      });
    });
  });
});