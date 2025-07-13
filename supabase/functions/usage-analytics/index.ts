import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalyticsEvent {
  eventType: string;
  userId: string;
  blueprintId?: string;
  data?: any;
  timestamp: string;
  userAgent?: string;
  ipAddress?: string;
}

interface UsageMetrics {
  totalBlueprints: number;
  totalExecutions: number;
  totalTokensUsed: number;
  totalCost: number;
  executionsToday: number;
  avgExecutionTime: number;
  successRate: number;
  popularNodeTypes: Array<{ type: string; count: number; percentage: number }>;
  timeOfDayDistribution: Array<{ hour: number; count: number }>;
  recentActivity: Array<{
    id: string;
    type: string;
    blueprintTitle: string;
    timestamp: string;
    status: string;
    executionTime?: number;
  }>;
}

interface DashboardStats {
  blueprints: {
    total: number;
    created_this_week: number;
    created_this_month: number;
  };
  executions: {
    total: number;
    today: number;
    this_week: number;
    this_month: number;
    success_rate: number;
  };
  usage: {
    total_tokens: number;
    total_cost: number;
    avg_execution_time: number;
    tokens_this_month: number;
    cost_this_month: number;
  };
}

class UsageAnalytics {
  private supabase: any;
  private eventQueue: AnalyticsEvent[] = [];

  constructor(supabaseUrl: string, supabaseServiceKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Process queued events every 10 seconds
    setInterval(() => {
      this.processEventQueue();
    }, 10000);
  }

  async trackEvent(event: AnalyticsEvent): Promise<void> {
    // Add to queue for batch processing
    this.eventQueue.push(event);
    
    // If queue is full, process immediately
    if (this.eventQueue.length >= 50) {
      await this.processEventQueue();
    }
  }

  private async processEventQueue(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      // Group events by type for efficient processing
      const groupedEvents = events.reduce((groups, event) => {
        const key = event.eventType;
        if (!groups[key]) groups[key] = [];
        groups[key].push(event);
        return groups;
      }, {} as Record<string, AnalyticsEvent[]>);

      for (const [eventType, eventGroup] of Object.entries(groupedEvents)) {
        await this.processEventGroup(eventType, eventGroup);
      }

      console.log(`Processed ${events.length} analytics events`);
    } catch (error) {
      console.error('Failed to process analytics events:', error);
      // Re-queue failed events (up to a limit)
      if (this.eventQueue.length < 200) {
        this.eventQueue.unshift(...events);
      }
    }
  }

  private async processEventGroup(eventType: string, events: AnalyticsEvent[]): Promise<void> {
    switch (eventType) {
      case 'blueprint_created':
      case 'blueprint_updated':
      case 'blueprint_deleted':
        await this.updateBlueprintMetrics(events);
        break;
      
      case 'pipeline_executed':
      case 'simulation_completed':
        await this.updateExecutionMetrics(events);
        break;
      
      case 'integration_used':
        await this.updateIntegrationMetrics(events);
        break;
      
      case 'user_action':
        await this.updateUserMetrics(events);
        break;
    }
  }

  private async updateBlueprintMetrics(events: AnalyticsEvent[]): Promise<void> {
    for (const event of events) {
      // Track blueprint lifecycle events
      console.log(`Blueprint ${event.eventType}: ${event.blueprintId} by user ${event.userId}`);
    }
  }

  private async updateExecutionMetrics(events: AnalyticsEvent[]): Promise<void> {
    const executionInserts = events.map(event => ({
      user_id: event.userId,
      blueprint_id: event.blueprintId,
      event_type: event.eventType,
      execution_time_ms: event.data?.executionTime || null,
      tokens_used: event.data?.tokens || 0,
      cost_usd: event.data?.cost || 0,
      status: event.data?.status || 'completed',
      provider: event.data?.provider || null,
      model: event.data?.model || null,
      created_at: event.timestamp
    }));

    // Batch insert execution metrics
    if (executionInserts.length > 0) {
      try {
        await this.supabase
          .from('execution_logs')
          .insert(executionInserts);
      } catch (error) {
        console.error('Failed to insert execution metrics:', error);
      }
    }
  }

  private async updateIntegrationMetrics(events: AnalyticsEvent[]): Promise<void> {
    for (const event of events) {
      try {
        await this.supabase
          .from('integration_usage_logs')
          .insert({
            user_id: event.userId,
            integration_id: event.data?.integrationId,
            blueprint_id: event.blueprintId,
            operation_type: event.data?.operation || 'unknown',
            success: event.data?.success !== false,
            response_time_ms: event.data?.responseTime || null,
            error_message: event.data?.error || null
          });
      } catch (error) {
        console.error('Failed to insert integration usage:', error);
      }
    }
  }

  private async updateUserMetrics(events: AnalyticsEvent[]): Promise<void> {
    // Track user engagement patterns
    const userActions = events.reduce((acc, event) => {
      const userId = event.userId;
      if (!acc[userId]) {
        acc[userId] = {
          actions: 0,
          lastActive: event.timestamp,
          blueprints: new Set()
        };
      }
      acc[userId].actions++;
      acc[userId].lastActive = event.timestamp;
      if (event.blueprintId) {
        acc[userId].blueprints.add(event.blueprintId);
      }
      return acc;
    }, {} as Record<string, any>);

    console.log(`Tracked user actions for ${Object.keys(userActions).length} users`);
  }

  async getDashboardStats(userId: string): Promise<DashboardStats> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    try {
      // Get blueprint stats
      const { data: blueprintStats } = await this.supabase
        .from('blueprints')
        .select('created_at')
        .eq('user_id', userId);

      const totalBlueprints = blueprintStats?.length || 0;
      const blueprintsThisWeek = blueprintStats?.filter(b => 
        new Date(b.created_at) >= thisWeek
      ).length || 0;
      const blueprintsThisMonth = blueprintStats?.filter(b => 
        new Date(b.created_at) >= thisMonth
      ).length || 0;

      // Get execution stats
      const { data: executionStats } = await this.supabase
        .from('simulation_logs')
        .select('started_at, execution_time_ms, status')
        .eq('user_id', userId);

      const totalExecutions = executionStats?.length || 0;
      const executionsToday = executionStats?.filter(e => 
        new Date(e.started_at) >= today
      ).length || 0;
      const executionsThisWeek = executionStats?.filter(e => 
        new Date(e.started_at) >= thisWeek
      ).length || 0;
      const executionsThisMonth = executionStats?.filter(e => 
        new Date(e.started_at) >= thisMonth
      ).length || 0;

      const successfulExecutions = executionStats?.filter(e => 
        e.status === 'completed'
      ).length || 0;
      const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;

      const avgExecutionTime = executionStats?.length > 0 
        ? executionStats.reduce((sum, e) => sum + (e.execution_time_ms || 0), 0) / executionStats.length
        : 0;

      // Get usage stats (simplified for now)
      const totalTokens = 0; // Would calculate from execution logs
      const totalCost = 0; // Would calculate from execution logs
      const tokensThisMonth = 0;
      const costThisMonth = 0;

      return {
        blueprints: {
          total: totalBlueprints,
          created_this_week: blueprintsThisWeek,
          created_this_month: blueprintsThisMonth
        },
        executions: {
          total: totalExecutions,
          today: executionsToday,
          this_week: executionsThisWeek,
          this_month: executionsThisMonth,
          success_rate: successRate
        },
        usage: {
          total_tokens: totalTokens,
          total_cost: totalCost,
          avg_execution_time: avgExecutionTime,
          tokens_this_month: tokensThisMonth,
          cost_this_month: costThisMonth
        }
      };

    } catch (error) {
      console.error('Failed to get dashboard stats:', error);
      throw error;
    }
  }

  async getUsageMetrics(userId: string): Promise<UsageMetrics> {
    try {
      // Get basic counts
      const { data: blueprints } = await this.supabase
        .from('blueprints')
        .select('id, nodes')
        .eq('user_id', userId);

      const { data: executions } = await this.supabase
        .from('simulation_logs')
        .select('*')
        .eq('user_id', userId)
        .order('started_at', { ascending: false });

      const totalBlueprints = blueprints?.length || 0;
      const totalExecutions = executions?.length || 0;

      // Calculate metrics
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const executionsToday = executions?.filter(e => 
        new Date(e.started_at) >= today
      ).length || 0;

      const successfulExecutions = executions?.filter(e => 
        e.status === 'completed'
      ).length || 0;
      const successRate = totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;

      const avgExecutionTime = executions?.length > 0 
        ? executions.reduce((sum, e) => sum + (e.execution_time_ms || 0), 0) / executions.length
        : 0;

      // Node type analysis
      const nodeTypeCounts: Record<string, number> = {};
      blueprints?.forEach(blueprint => {
        if (blueprint.nodes && Array.isArray(blueprint.nodes)) {
          blueprint.nodes.forEach((node: any) => {
            const type = node.type || 'unknown';
            nodeTypeCounts[type] = (nodeTypeCounts[type] || 0) + 1;
          });
        }
      });

      const totalNodes = Object.values(nodeTypeCounts).reduce((sum, count) => sum + count, 0);
      const popularNodeTypes = Object.entries(nodeTypeCounts)
        .map(([type, count]) => ({
          type,
          count,
          percentage: totalNodes > 0 ? (count / totalNodes) * 100 : 0
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Time distribution
      const timeOfDayDistribution = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        count: executions?.filter(e => 
          new Date(e.started_at).getHours() === hour
        ).length || 0
      }));

      // Recent activity
      const recentActivity = executions?.slice(0, 10).map(execution => ({
        id: execution.id,
        type: 'execution',
        blueprintTitle: 'Blueprint', // Would need to join with blueprints table
        timestamp: execution.started_at,
        status: execution.status,
        executionTime: execution.execution_time_ms
      })) || [];

      return {
        totalBlueprints,
        totalExecutions,
        totalTokensUsed: 0, // Would calculate from metrics
        totalCost: 0, // Would calculate from metrics
        executionsToday,
        avgExecutionTime,
        successRate,
        popularNodeTypes,
        timeOfDayDistribution,
        recentActivity
      };

    } catch (error) {
      console.error('Failed to get usage metrics:', error);
      throw error;
    }
  }
}

const analytics = new UsageAnalytics(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

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
      
      const event: AnalyticsEvent = {
        ...eventData,
        userId: user.id,
        timestamp: new Date().toISOString(),
        userAgent: req.headers.get('user-agent') || undefined,
        ipAddress: req.headers.get('x-forwarded-for') || undefined
      };

      await analytics.trackEvent(event);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (req.method === 'GET') {
      switch (action) {
        case 'dashboard_stats':
          const dashboardStats = await analytics.getDashboardStats(user.id);
          return new Response(JSON.stringify(dashboardStats), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });

        case 'usage_metrics':
          const usageMetrics = await analytics.getUsageMetrics(user.id);
          return new Response(JSON.stringify(usageMetrics), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });

        default:
          throw new Error('Invalid action');
      }
    }

    throw new Error('Method not allowed');

  } catch (error: any) {
    console.error('Usage analytics error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});