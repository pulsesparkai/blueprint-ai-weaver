import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CollaborationEvent {
  type: 'join' | 'leave' | 'cursor_move' | 'node_select' | 'comment_add' | 'comment_resolve';
  userId: string;
  userEmail: string;
  userName?: string;
  blueprintId: string;
  data?: any;
  timestamp: string;
}

interface CollaborationState {
  activeUsers: Map<string, UserSession>;
  recentEvents: CollaborationEvent[];
  comments: Map<string, Comment[]>;
}

interface UserSession {
  userId: string;
  userEmail: string;
  userName?: string;
  lastSeen: string;
  cursorPosition?: { x: number; y: number };
  selectedNode?: string;
  status: 'active' | 'idle' | 'away';
}

interface Comment {
  id: string;
  nodeId: string;
  userId: string;
  userEmail: string;
  userName?: string;
  text: string;
  resolved: boolean;
  createdAt: string;
  position?: { x: number; y: number };
}

class CollaborationManager {
  private supabase: any;
  private blueprintStates: Map<string, CollaborationState> = new Map();

  constructor(supabaseUrl: string, supabaseServiceKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
  }

  async handleEvent(event: CollaborationEvent): Promise<void> {
    const { blueprintId } = event;
    
    if (!this.blueprintStates.has(blueprintId)) {
      this.blueprintStates.set(blueprintId, {
        activeUsers: new Map(),
        recentEvents: [],
        comments: new Map()
      });
    }

    const state = this.blueprintStates.get(blueprintId)!;

    switch (event.type) {
      case 'join':
        await this.handleUserJoin(state, event);
        break;
      case 'leave':
        await this.handleUserLeave(state, event);
        break;
      case 'cursor_move':
        await this.handleCursorMove(state, event);
        break;
      case 'node_select':
        await this.handleNodeSelect(state, event);
        break;
      case 'comment_add':
        await this.handleCommentAdd(state, event);
        break;
      case 'comment_resolve':
        await this.handleCommentResolve(state, event);
        break;
    }

    // Add to recent events
    state.recentEvents.push(event);
    if (state.recentEvents.length > 100) {
      state.recentEvents.shift();
    }

    // Update database
    await this.updateCollaborationSession(event);
    
    // Broadcast to other users
    await this.broadcastEvent(event);
  }

  private async handleUserJoin(state: CollaborationState, event: CollaborationEvent) {
    const session: UserSession = {
      userId: event.userId,
      userEmail: event.userEmail,
      userName: event.userName,
      lastSeen: event.timestamp,
      status: 'active'
    };

    state.activeUsers.set(event.userId, session);
    console.log(`User ${event.userEmail} joined blueprint ${event.blueprintId}`);
  }

  private async handleUserLeave(state: CollaborationState, event: CollaborationEvent) {
    state.activeUsers.delete(event.userId);
    console.log(`User ${event.userEmail} left blueprint ${event.blueprintId}`);
  }

  private async handleCursorMove(state: CollaborationState, event: CollaborationEvent) {
    const session = state.activeUsers.get(event.userId);
    if (session) {
      session.cursorPosition = event.data?.position;
      session.lastSeen = event.timestamp;
      session.status = 'active';
    }
  }

  private async handleNodeSelect(state: CollaborationState, event: CollaborationEvent) {
    const session = state.activeUsers.get(event.userId);
    if (session) {
      session.selectedNode = event.data?.nodeId;
      session.lastSeen = event.timestamp;
      session.status = 'active';
    }
  }

  private async handleCommentAdd(state: CollaborationState, event: CollaborationEvent) {
    const { nodeId, text, position } = event.data;
    
    const comment: Comment = {
      id: crypto.randomUUID(),
      nodeId,
      userId: event.userId,
      userEmail: event.userEmail,
      userName: event.userName,
      text,
      resolved: false,
      createdAt: event.timestamp,
      position
    };

    if (!state.comments.has(nodeId)) {
      state.comments.set(nodeId, []);
    }
    state.comments.get(nodeId)!.push(comment);

    // Save to database
    await this.supabase
      .from('node_comments')
      .insert({
        blueprint_id: event.blueprintId,
        node_id: nodeId,
        user_id: event.userId,
        user_email: event.userEmail,
        user_name: event.userName,
        comment_text: text,
        x_position: position?.x,
        y_position: position?.y
      });

    console.log(`Comment added to node ${nodeId} by ${event.userEmail}`);
  }

  private async handleCommentResolve(state: CollaborationState, event: CollaborationEvent) {
    const { commentId } = event.data;
    
    // Find and resolve comment
    for (const [nodeId, comments] of state.comments) {
      const comment = comments.find(c => c.id === commentId);
      if (comment) {
        comment.resolved = true;
        
        // Update in database
        await this.supabase
          .from('node_comments')
          .update({ resolved: true })
          .eq('id', commentId);
        
        console.log(`Comment ${commentId} resolved by ${event.userEmail}`);
        break;
      }
    }
  }

  private async updateCollaborationSession(event: CollaborationEvent) {
    try {
      await this.supabase
        .from('collaboration_sessions')
        .upsert({
          blueprint_id: event.blueprintId,
          user_id: event.userId,
          user_email: event.userEmail,
          user_name: event.userName,
          cursor_position: event.data?.position || null,
          last_seen: event.timestamp,
          status: event.type === 'leave' ? 'inactive' : 'active'
        }, {
          onConflict: 'blueprint_id,user_id'
        });
    } catch (error) {
      console.error('Failed to update collaboration session:', error);
    }
  }

  private async broadcastEvent(event: CollaborationEvent) {
    // In a real implementation, this would use WebSockets or Server-Sent Events
    // For now, we'll use Supabase's real-time channels
    try {
      const channel = this.supabase.channel(`blueprint:${event.blueprintId}`);
      await channel.send({
        type: 'broadcast',
        event: 'collaboration_event',
        payload: event
      });
    } catch (error) {
      console.error('Failed to broadcast event:', error);
    }
  }

  getActiveUsers(blueprintId: string): UserSession[] {
    const state = this.blueprintStates.get(blueprintId);
    return state ? Array.from(state.activeUsers.values()) : [];
  }

  getRecentEvents(blueprintId: string, limit: number = 20): CollaborationEvent[] {
    const state = this.blueprintStates.get(blueprintId);
    return state ? state.recentEvents.slice(-limit) : [];
  }

  getComments(blueprintId: string, nodeId?: string): Comment[] {
    const state = this.blueprintStates.get(blueprintId);
    if (!state) return [];

    if (nodeId) {
      return state.comments.get(nodeId) || [];
    }

    // Return all comments
    const allComments: Comment[] = [];
    for (const comments of state.comments.values()) {
      allComments.push(...comments);
    }
    return allComments.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async cleanup() {
    // Clean up inactive sessions
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    for (const [blueprintId, state] of this.blueprintStates) {
      for (const [userId, session] of state.activeUsers) {
        const lastSeenTime = new Date(session.lastSeen);
        if (lastSeenTime < fiveMinutesAgo) {
          state.activeUsers.delete(userId);
          
          // Broadcast leave event
          await this.broadcastEvent({
            type: 'leave',
            userId,
            userEmail: session.userEmail,
            userName: session.userName,
            blueprintId,
            timestamp: now.toISOString()
          });
        }
      }

      // Remove empty states
      if (state.activeUsers.size === 0) {
        this.blueprintStates.delete(blueprintId);
      }
    }
  }
}

const collaborationManager = new CollaborationManager(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// Run cleanup every minute
setInterval(() => {
  collaborationManager.cleanup();
}, 60000);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Authenticate user
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Authorization required');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    if (req.method === 'POST') {
      const eventData = await req.json();
      
      const event: CollaborationEvent = {
        ...eventData,
        userId: user.id,
        userEmail: user.email!,
        timestamp: new Date().toISOString()
      };

      await collaborationManager.handleEvent(event);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (req.method === 'GET') {
      const blueprintId = url.searchParams.get('blueprintId');
      
      if (!blueprintId) {
        throw new Error('Blueprint ID is required');
      }

      // Verify access to blueprint
      const { data: blueprint, error: blueprintError } = await supabase
        .from('blueprints')
        .select('id')
        .eq('id', blueprintId)
        .eq('user_id', user.id)
        .single();

      if (blueprintError && blueprintError.code !== 'PGRST116') { // Not found is okay for shared blueprints
        throw new Error('Blueprint access denied');
      }

      switch (action) {
        case 'active_users':
          const activeUsers = collaborationManager.getActiveUsers(blueprintId);
          return new Response(JSON.stringify({ activeUsers }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });

        case 'recent_events':
          const limit = parseInt(url.searchParams.get('limit') || '20');
          const recentEvents = collaborationManager.getRecentEvents(blueprintId, limit);
          return new Response(JSON.stringify({ events: recentEvents }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });

        case 'comments':
          const nodeId = url.searchParams.get('nodeId');
          const comments = collaborationManager.getComments(blueprintId, nodeId || undefined);
          return new Response(JSON.stringify({ comments }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });

        default:
          throw new Error('Invalid action');
      }
    }

    throw new Error('Method not allowed');

  } catch (error: any) {
    console.error('Team collaboration error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});