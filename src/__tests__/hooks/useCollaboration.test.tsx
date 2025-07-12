import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, renderHook, act } from '@testing-library/react';
import { useState } from 'react';
import { useCollaboration } from '../useCollaboration';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase
const mockChannel = {
  on: vi.fn().mockReturnThis(),
  off: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockReturnThis(),
  unsubscribe: vi.fn().mockReturnThis(),
  track: vi.fn().mockReturnThis(),
  untrack: vi.fn().mockReturnThis(),
  send: vi.fn().mockReturnThis(),
};

const mockSupabase = {
  channel: vi.fn(() => mockChannel),
  from: vi.fn(() => ({
    upsert: vi.fn(() => ({ error: null })),
    delete: vi.fn(() => ({ eq: vi.fn(() => ({ error: null })) }))
  })),
  rpc: vi.fn(() => ({ error: null }))
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase
}));

describe('useCollaboration', () => {
  const blueprintId = 'test-blueprint-id';
  const userId = 'test-user-id';
  const userEmail = 'test@example.com';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes collaboration session', () => {
    const { result } = renderHook(() => 
      useCollaboration(blueprintId, userId, userEmail)
    );

    expect(mockSupabase.channel).toHaveBeenCalledWith(`blueprint:${blueprintId}`);
    expect(result.current.activeUsers).toEqual([]);
    expect(result.current.isConnected).toBe(false);
  });

  it('tracks user presence when connected', async () => {
    const { result } = renderHook(() => 
      useCollaboration(blueprintId, userId, userEmail)
    );

    // Simulate connection
    act(() => {
      result.current.connect();
    });

    expect(mockChannel.track).toHaveBeenCalledWith({
      userId,
      userEmail,
      userName: userEmail,
      status: 'active',
      lastSeen: expect.any(String)
    });
  });

  it('broadcasts node changes to other users', async () => {
    const { result } = renderHook(() => 
      useCollaboration(blueprintId, userId, userEmail)
    );

    const nodeChange = {
      id: 'node-1',
      type: 'position',
      position: { x: 100, y: 200 }
    };

    act(() => {
      result.current.broadcastNodeChange(nodeChange);
    });

    expect(mockChannel.send).toHaveBeenCalledWith({
      type: 'broadcast',
      event: 'node_change',
      payload: nodeChange
    });
  });

  it('updates cursor position', async () => {
    const { result } = renderHook(() => 
      useCollaboration(blueprintId, userId, userEmail)
    );

    const cursorPosition = { x: 150, y: 250 };

    act(() => {
      result.current.updateCursor(cursorPosition);
    });

    expect(mockSupabase.rpc).toHaveBeenCalledWith('update_collaboration_session', {
      p_blueprint_id: blueprintId,
      p_cursor_position: cursorPosition
    });
  });

  it('handles user join events', () => {
    const onUserJoin = vi.fn();
    const { result } = renderHook(() => 
      useCollaboration(blueprintId, userId, userEmail, { onUserJoin })
    );

    // Simulate user join event
    const joinCallback = mockChannel.on.mock.calls.find(
      call => call[1].event === 'join'
    )?.[2];

    act(() => {
      joinCallback?.({
        key: 'user-2',
        newPresences: [{
          userId: 'user-2',
          userEmail: 'user2@example.com',
          status: 'active'
        }]
      });
    });

    expect(onUserJoin).toHaveBeenCalledWith('user-2');
  });

  it('handles user leave events', () => {
    const onUserLeave = vi.fn();
    const { result } = renderHook(() => 
      useCollaboration(blueprintId, userId, userEmail, { onUserLeave })
    );

    // Simulate user leave event
    const leaveCallback = mockChannel.on.mock.calls.find(
      call => call[1].event === 'leave'
    )?.[2];

    act(() => {
      leaveCallback?.({
        key: 'user-2',
        leftPresences: [{
          userId: 'user-2',
          userEmail: 'user2@example.com'
        }]
      });
    });

    expect(onUserLeave).toHaveBeenCalledWith('user-2');
  });

  it('cleans up on unmount', () => {
    const { unmount } = renderHook(() => 
      useCollaboration(blueprintId, userId, userEmail)
    );

    unmount();

    expect(mockChannel.unsubscribe).toHaveBeenCalled();
  });

  it('handles connection errors gracefully', () => {
    mockChannel.subscribe.mockImplementationOnce(() => {
      throw new Error('Connection failed');
    });

    const { result } = renderHook(() => 
      useCollaboration(blueprintId, userId, userEmail)
    );

    expect(result.current.isConnected).toBe(false);
    expect(result.current.connectionError).toBe('Connection failed');
  });
});