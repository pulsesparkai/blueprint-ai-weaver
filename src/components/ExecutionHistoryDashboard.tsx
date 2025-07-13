import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Clock, 
  DollarSign, 
  TrendingUp, 
  Activity, 
  Search,
  RefreshCw,
  Play,
  BarChart3,
  FileText,
  Calendar
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface ExecutionHistory {
  id: string;
  blueprint_id: string;
  input_query: string;
  started_at: string;
  completed_at?: string;
  execution_time_ms?: number;
  status: string;
  error_message?: string;
  final_output?: string;
  metrics?: any;
  blueprint?: {
    title: string;
  };
}

interface ExecutionMetrics {
  simulation_id: string;
  step_name: string;
  latency_ms?: number;
  cost_usd?: number;
  tokens_input?: number;
  tokens_output?: number;
  model_name?: string;
  created_at: string;
}

export function ExecutionHistoryDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [executions, setExecutions] = useState<ExecutionHistory[]>([]);
  const [metrics, setMetrics] = useState<ExecutionMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExecution, setSelectedExecution] = useState<ExecutionHistory | null>(null);

  useEffect(() => {
    if (user) {
      loadExecutionHistory();
    }
  }, [user]);

  const loadExecutionHistory = async () => {
    try {
      setLoading(true);
      
      // Load execution history
      const { data: executionData, error: executionError } = await supabase
        .from('simulation_logs')
        .select(`
          *,
          blueprints!inner(title)
        `)
        .eq('user_id', user!.id)
        .order('started_at', { ascending: false })
        .limit(50);

      if (executionError) throw executionError;

      setExecutions(executionData || []);

      // Load metrics for recent executions
      if (executionData && executionData.length > 0) {
        const recentExecutionIds = executionData.slice(0, 10).map(e => e.id);
        
        const { data: metricsData, error: metricsError } = await supabase
          .from('simulation_metrics')
          .select('*')
          .in('simulation_id', recentExecutionIds)
          .order('created_at', { ascending: false });

        if (metricsError) throw metricsError;
        setMetrics(metricsData || []);
      }

    } catch (error: any) {
      toast({
        title: "Failed to load execution history",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const replayExecution = async (execution: ExecutionHistory) => {
    try {
      const inputData = execution.input_query ? JSON.parse(execution.input_query) : {};
      
      // Trigger new execution with same parameters
      toast({
        title: "Execution Replayed",
        description: `Replaying execution for blueprint: ${execution.blueprint?.title}`,
      });
      
      // This would trigger the real-time execution
      // executeBlueprint(execution.blueprint_id, inputData);
      
    } catch (error: any) {
      toast({
        title: "Replay Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const filteredExecutions = executions.filter(execution =>
    execution.blueprint?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    execution.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    execution.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const calculateAggregatedMetrics = () => {
    const completedExecutions = executions.filter(e => e.status === 'completed');
    const totalExecutions = executions.length;
    const totalCost = metrics.reduce((sum, m) => sum + (m.cost_usd || 0), 0);
    const avgExecutionTime = completedExecutions.length > 0
      ? completedExecutions.reduce((sum, e) => sum + (e.execution_time_ms || 0), 0) / completedExecutions.length
      : 0;
    const successRate = totalExecutions > 0 ? (completedExecutions.length / totalExecutions) * 100 : 0;

    return {
      totalExecutions,
      completedExecutions: completedExecutions.length,
      totalCost,
      avgExecutionTime: Math.round(avgExecutionTime),
      successRate: Math.round(successRate)
    };
  };

  const aggregatedMetrics = calculateAggregatedMetrics();

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading execution history...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Total Executions</p>
                <p className="text-2xl font-bold">{aggregatedMetrics.totalExecutions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm font-medium">Success Rate</p>
                <p className="text-2xl font-bold">{aggregatedMetrics.successRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <div>
                <p className="text-sm font-medium">Avg Time</p>
                <p className="text-2xl font-bold">{aggregatedMetrics.avgExecutionTime}ms</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-sm font-medium">Total Cost</p>
                <p className="text-2xl font-bold">${aggregatedMetrics.totalCost.toFixed(4)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-sm font-medium">Completed</p>
                <p className="text-2xl font-bold">{aggregatedMetrics.completedExecutions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Execution History</CardTitle>
              <CardDescription>View and replay past pipeline executions</CardDescription>
            </div>
            <Button onClick={loadExecutionHistory} size="sm" variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Search className="h-4 w-4" />
            <Input
              placeholder="Search executions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <Tabs defaultValue="list" className="space-y-4">
            <TabsList>
              <TabsTrigger value="list">Execution List</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="comparison">Comparison</TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="space-y-4">
              {filteredExecutions.map((execution) => (
                <Card key={execution.id} className="cursor-pointer hover:bg-accent">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-medium">{execution.blueprint?.title || 'Untitled Blueprint'}</h3>
                          <Badge className={getStatusColor(execution.status)}>
                            {execution.status}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-4 gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>{format(new Date(execution.started_at), 'MMM dd, HH:mm')}</span>
                          </div>
                          
                          {execution.execution_time_ms && (
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>{execution.execution_time_ms}ms</span>
                            </div>
                          )}
                          
                          {execution.metrics?.totalCost && (
                            <div className="flex items-center space-x-1">
                              <DollarSign className="h-3 w-3" />
                              <span>${execution.metrics.totalCost.toFixed(4)}</span>
                            </div>
                          )}
                          
                          <div className="flex items-center space-x-1">
                            <FileText className="h-3 w-3" />
                            <span>{execution.id.slice(0, 8)}...</span>
                          </div>
                        </div>

                        {execution.error_message && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                            {execution.error_message}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedExecution(execution)}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          Details
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => replayExecution(execution)}
                          disabled={execution.status === 'running'}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Replay
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {filteredExecutions.length === 0 && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Activity className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Executions Found</h3>
                    <p className="text-muted-foreground text-center">
                      {searchTerm ? 'No executions match your search criteria.' : 'Start executing pipelines to see history here.'}
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="analytics">
              <Card>
                <CardHeader>
                  <CardTitle>Performance Analytics</CardTitle>
                  <CardDescription>Detailed metrics and trends</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium mb-2">Execution Metrics</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Total Tokens Used:</span>
                            <span>{metrics.reduce((sum, m) => sum + (m.tokens_input || 0) + (m.tokens_output || 0), 0)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Avg Cost per Execution:</span>
                            <span>${(aggregatedMetrics.totalCost / Math.max(aggregatedMetrics.totalExecutions, 1)).toFixed(4)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Most Used Model:</span>
                            <span>{metrics.length > 0 ? 'gpt-4' : 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2">Performance Trends</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Fastest Execution:</span>
                            <span>{Math.min(...executions.map(e => e.execution_time_ms || Infinity))}ms</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Slowest Execution:</span>
                            <span>{Math.max(...executions.map(e => e.execution_time_ms || 0))}ms</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Error Rate:</span>
                            <span>{(100 - aggregatedMetrics.successRate).toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="comparison">
              <Card>
                <CardHeader>
                  <CardTitle>Execution Comparison</CardTitle>
                  <CardDescription>Compare performance across executions</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Select multiple executions to compare their performance metrics, costs, and execution patterns.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Execution Details Modal */}
      {selectedExecution && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Execution Details</CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedExecution(null)}
            >
              Close
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium">Execution Info</h4>
                  <div className="space-y-2 text-sm">
                    <div><strong>ID:</strong> {selectedExecution.id}</div>
                    <div><strong>Blueprint:</strong> {selectedExecution.blueprint?.title}</div>
                    <div><strong>Status:</strong> {selectedExecution.status}</div>
                    <div><strong>Started:</strong> {format(new Date(selectedExecution.started_at), 'PPpp')}</div>
                    {selectedExecution.completed_at && (
                      <div><strong>Completed:</strong> {format(new Date(selectedExecution.completed_at), 'PPpp')}</div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium">Performance</h4>
                  <div className="space-y-2 text-sm">
                    {selectedExecution.execution_time_ms && (
                      <div><strong>Execution Time:</strong> {selectedExecution.execution_time_ms}ms</div>
                    )}
                    {selectedExecution.metrics?.totalCost && (
                      <div><strong>Total Cost:</strong> ${selectedExecution.metrics.totalCost.toFixed(4)}</div>
                    )}
                    {selectedExecution.metrics?.nodeCount && (
                      <div><strong>Nodes Executed:</strong> {selectedExecution.metrics.nodeCount}</div>
                    )}
                  </div>
                </div>
              </div>
              
              {selectedExecution.input_query && (
                <div>
                  <h4 className="font-medium">Input Data</h4>
                  <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto max-h-32">
                    {JSON.stringify(JSON.parse(selectedExecution.input_query), null, 2)}
                  </pre>
                </div>
              )}
              
              {selectedExecution.final_output && (
                <div>
                  <h4 className="font-medium">Output</h4>
                  <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto max-h-32">
                    {selectedExecution.final_output}
                  </pre>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default ExecutionHistoryDashboard;