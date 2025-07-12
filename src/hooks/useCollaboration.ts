import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CollaborationUser {
  userId: string;
  userEmail: string;
  userName?: string;
  status: 'active' | 'idle' | 'offline';
  cursorPosition?: { x: number; y: number };
  lastSeen: string;
}

interface CollaborationOptions {
  onUserJoin?: (userId: string) => void;
  onUserLeave?: (userId: string) => void;
  onNodeChange?: (change: any) => void;
  onCursorUpdate?: (userId: string, position: { x: number; y: number }) => void;
}

export function useCollaboration(
  blueprintId: string,
  userId: string,
  userEmail: string,
  options: CollaborationOptions = {}
) {
  const [activeUsers, setActiveUsers] = useState<CollaborationUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const channel = supabase.channel(`blueprint:${blueprintId}`);

  const connect = useCallback(() => {
    try {
      channel
        .on('presence', { event: 'sync' }, () => {
          const presenceState = channel.presenceState();
          const users = Object.values(presenceState).flat() as CollaborationUser[];
          setActiveUsers(users);
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          const newUser = newPresences[0] as CollaborationUser;
          setActiveUsers(prev => [...prev, newUser]);
          options.onUserJoin?.(key);
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          setActiveUsers(prev => prev.filter(user => user.userId !== key));
          options.onUserLeave?.(key);
        })
        .on('broadcast', { event: 'node_change' }, ({ payload }) => {
          options.onNodeChange?.(payload);
        })
        .on('broadcast', { event: 'cursor_update' }, ({ payload }) => {
          options.onCursorUpdate?.(payload.userId, payload.position);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
            setConnectionError(null);
            
            // Track user presence
            await channel.track({
              userId,
              userEmail,
              userName: userEmail,
              status: 'active',
              lastSeen: new Date().toISOString()
            });
          }
        });
    } catch (error) {
      setConnectionError(error instanceof Error ? error.message : 'Connection failed');
      setIsConnected(false);
    }
  }, [blueprintId, userId, userEmail, options]);

  const disconnect = useCallback(() => {
    channel.unsubscribe();
    setIsConnected(false);
    setActiveUsers([]);
  }, [channel]);

  const broadcastNodeChange = useCallback((change: any) => {
    if (isConnected) {
      channel.send({
        type: 'broadcast',
        event: 'node_change',
        payload: change
      });
    }
  }, [channel, isConnected]);

  const updateCursor = useCallback(async (position: { x: number; y: number }) => {
    if (isConnected) {
      // Update database for persistence
      await supabase.rpc('update_collaboration_session', {
        p_blueprint_id: blueprintId,
        p_cursor_position: position
      });

      // Broadcast to other users
      channel.send({
        type: 'broadcast',
        event: 'cursor_update',
        payload: { userId, position }
      });
    }
  }, [channel, isConnected, blueprintId, userId]);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    activeUsers,
    isConnected,
    connectionError,
    connect,
    disconnect,
    broadcastNodeChange,
    updateCursor
  };
}