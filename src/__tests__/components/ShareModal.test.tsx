import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ShareModal } from '../ShareModal';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Mock dependencies
vi.mock('@/integrations/supabase/client');
vi.mock('@/hooks/use-toast');

const mockToast = vi.fn();
vi.mocked(useToast).mockReturnValue({ toast: mockToast });

const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn(() => ({
          data: [],
          error: null
        }))
      }))
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => ({
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
      eq: vi.fn(() => ({
        error: null
      }))
    }))
  }),
  auth: {
    getUser: vi.fn(() => ({
      data: { user: { id: 'test-user-id' } }
    }))
  }
};

vi.mocked(supabase).mockReturnValue(mockSupabase as any);

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
  });

  it('renders share modal with correct title', () => {
    render(<ShareModal {...defaultProps} />);
    expect(screen.getByText('Share "Test Blueprint"')).toBeInTheDocument();
  });

  it('displays tier limitations for free users', () => {
    render(<ShareModal {...defaultProps} userTier="free" />);
    expect(screen.getByText('Free Tier Limitations')).toBeInTheDocument();
  });

  it('creates share link successfully', async () => {
    render(<ShareModal {...defaultProps} />);
    
    const createButton = screen.getByText('Create Share Link');
    fireEvent.click(createButton);
    
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Share Link Created',
        description: 'Your blueprint share link has been generated.'
      });
    });
  });
});