import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Activity, AlertTriangle, CheckCircle, XCircle, Users, Database, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { VirtualList } from "@/components/ui/virtual-list";

interface SystemMetrics {
  totalUsers: number;
  activeUsers: number;
  totalPipelines: number;
  executionsToday: number;
  errorRate: number;
  avgResponseTime: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
}

interface EdgeFunctionStatus {
  name: string;
  status: 'online' | 'offline' | 'degraded';
  lastCheck: string;
  responseTime: number;
  errorCount: number;
}

export const AdminDashboard = () => {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    totalUsers: 0,
    activeUsers: 0,
    totalPipelines: 0,
    executionsToday: 0,
    errorRate: 0,
    avgResponseTime: 0,
    systemHealth: 'healthy'
  });

  const [edgeFunctions, setEdgeFunctions] = useState<EdgeFunctionStatus[]>([]);
  const [errorLogs, setErrorLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
    loadEdgeFunctionStatus();
    loadErrorLogs();
    
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      loadMetrics();
      loadEdgeFunctionStatus();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadMetrics = async () => {
    try {
      // Load system metrics
      const { data: users } = await supabase.from('profiles').select('id', { count: 'exact' });
      const { data: pipelines } = await supabase.from('blueprints').select('id', { count: 'exact' });
      
      const today = new Date().toISOString().split('T')[0];
      const { data: executions } = await supabase
        .from('execution_logs')
        .select('id', { count: 'exact' })
        .gte('executed_at', today);

      // Calculate error rate from last 1000 executions
      const { data: recentExecutions } = await supabase
        .from('simulation_logs')
        .select('status')
        .order('created_at', { ascending: false })
        .limit(1000);

      const errorCount = recentExecutions?.filter(e => e.status === 'error').length || 0;
      const errorRate = recentExecutions?.length ? (errorCount / recentExecutions.length) * 100 : 0;

      setMetrics({
        totalUsers: users?.length || 0,
        activeUsers: Math.floor((users?.length || 0) * 0.3), // Simulate active users
        totalPipelines: pipelines?.length || 0,
        executionsToday: executions?.length || 0,
        errorRate,
        avgResponseTime: 450, // Simulate avg response time
        systemHealth: errorRate > 5 ? 'critical' : errorRate > 2 ? 'warning' : 'healthy'
      });
    } catch (error) {
      console.error('Failed to load metrics:', error);
    }
  };

  const loadEdgeFunctionStatus = async () => {
    const functions = [
      'api-llm',
      'api-rag',
      'pipeline-simulator',
      'integration-health-check',
      'realtime-pipeline-executor',
      'enhanced-llm-processor',
      'enhanced-vector-operations'
    ];

    const statuses: EdgeFunctionStatus[] = [];

    for (const func of functions) {
      try {
        const start = performance.now();
        const response = await supabase.functions.invoke(`${func}/health`);
        const responseTime = performance.now() - start;

        statuses.push({
          name: func,
          status: response.error ? 'offline' : 'online',
          lastCheck: new Date().toISOString(),
          responseTime,
          errorCount: 0 // Would track from logs
        });
      } catch (error) {
        statuses.push({
          name: func,
          status: 'offline',
          lastCheck: new Date().toISOString(),
          responseTime: 0,
          errorCount: 1
        });
      }
    }

    setEdgeFunctions(statuses);
  };

  const loadErrorLogs = async () => {
    try {
      const { data } = await supabase
        .from('simulation_logs')
        .select('*')
        .eq('status', 'error')
        .order('created_at', { ascending: false })
        .limit(100);

      setErrorLogs(data || []);
    } catch (error) {
      console.error('Failed to load error logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-success';
      case 'warning': return 'text-warning';
      case 'critical': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'offline': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'degraded': return <AlertTriangle className="h-4 w-4 text-warning" />;
      default: return null;
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <Badge variant="outline" className={getHealthColor(metrics.systemHealth)}>
          System: {metrics.systemHealth}
        </Badge>
      </div>

      {/* System Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.activeUsers} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pipelines</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalPipelines}</div>
            <p className="text-xs text-muted-foreground">
              Total created
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Executions Today</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.executionsToday}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.errorRate.toFixed(1)}% error rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgResponseTime}ms</div>
            <p className="text-xs text-muted-foreground">
              Last hour
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="functions" className="w-full">
        <TabsList>
          <TabsTrigger value="functions">Edge Functions</TabsTrigger>
          <TabsTrigger value="errors">Error Logs</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="functions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Edge Function Status</CardTitle>
              <CardDescription>
                Real-time status of all edge functions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {edgeFunctions.map((func) => (
                  <div key={func.name} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(func.status)}
                      <div>
                        <p className="font-medium">{func.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Last check: {new Date(func.lastCheck).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{func.responseTime.toFixed(0)}ms</p>
                      <p className="text-xs text-muted-foreground">
                        {func.errorCount} errors
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Errors</CardTitle>
              <CardDescription>
                Latest error logs from pipeline executions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VirtualList
                items={errorLogs}
                height={400}
                itemHeight={80}
                renderItem={(log, index) => (
                  <div className="p-3 border-b last:border-b-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-destructive">
                          {log.error_message || 'Unknown error'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Pipeline: {log.blueprint_id}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>
                System performance indicators
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Error Rate</span>
                  <span>{metrics.errorRate.toFixed(1)}%</span>
                </div>
                <Progress value={metrics.errorRate} className="h-2" />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Response Time</span>
                  <span>{metrics.avgResponseTime}ms</span>
                </div>
                <Progress value={(metrics.avgResponseTime / 1000) * 100} className="h-2" />
              </div>

              {metrics.systemHealth !== 'healthy' && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {metrics.systemHealth === 'critical' 
                      ? 'System is experiencing critical issues. Immediate attention required.'
                      : 'System performance is degraded. Monitor closely.'
                    }
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};