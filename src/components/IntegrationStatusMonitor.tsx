import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, AlertCircle, RefreshCw, Activity, Clock, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Integration {
  id: string;
  name: string;
  type: string;
  status: string;
  last_validated: string;
  validation_error?: string;
}

interface IntegrationStatusMonitorProps {
  integration: Integration;
  onStatusUpdate?: (id: string, status: string) => void;
}

export function IntegrationStatusMonitor({ integration, onStatusUpdate }: IntegrationStatusMonitorProps) {
  const { toast } = useToast();
  const [isChecking, setIsChecking] = useState(false);
  const [healthData, setHealthData] = useState<any>(null);
  const [usageStats, setUsageStats] = useState<any>(null);

  useEffect(() => {
    loadUsageStats();
    const interval = setInterval(loadUsageStats, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [integration.id]);

  const loadUsageStats = async () => {
    try {
      const { data, error } = await supabase
        .from('integration_usage_logs')
        .select('*')
        .eq('integration_id', integration.id)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      const logs = data || [];
      const successCount = logs.filter(log => log.success).length;
      const errorCount = logs.filter(log => !log.success).length;
      const avgResponseTime = logs.length > 0 
        ? logs.reduce((sum, log) => sum + (log.response_time_ms || 0), 0) / logs.length 
        : 0;

      setUsageStats({
        total: logs.length,
        success: successCount,
        errors: errorCount,
        avgResponseTime: Math.round(avgResponseTime),
        lastUsed: logs[0]?.created_at
      });
    } catch (error) {
      console.error('Failed to load usage stats:', error);
    }
  };

  const runHealthCheck = async () => {
    setIsChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('integration-health-check', {
        body: {
          integrationId: integration.id,
          skipCache: true
        }
      });

      if (error) throw error;

      setHealthData(data);
      onStatusUpdate?.(integration.id, data.status);

      toast({
        title: data.success ? "Health Check Passed" : "Health Check Failed",
        description: data.error || `Integration is ${data.status}`,
        variant: data.success ? "default" : "destructive"
      });
    } catch (error: any) {
      toast({
        title: "Health Check Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsChecking(false);
    }
  };

  const getStatusIcon = () => {
    switch (integration.status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'inactive':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (integration.status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'inactive':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatLastChecked = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getStatusIcon()}
            <div>
              <CardTitle className="text-lg">{integration.name}</CardTitle>
              <CardDescription className="capitalize">{integration.type}</CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={getStatusColor()}>
              {integration.status}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={runHealthCheck}
              disabled={isChecking}
            >
              {isChecking ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Activity className="h-4 w-4" />
              )}
              Test
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Health Status */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center text-sm text-muted-foreground">
              <Clock className="h-3 w-3 mr-1" />
              Last Checked
            </div>
            <div className="text-sm font-medium">
              {integration.last_validated 
                ? formatLastChecked(integration.last_validated)
                : 'Never'
              }
            </div>
          </div>

          {healthData?.responseTime && (
            <div className="space-y-1">
              <div className="flex items-center text-sm text-muted-foreground">
                <Activity className="h-3 w-3 mr-1" />
                Response Time
              </div>
              <div className="text-sm font-medium">
                {healthData.responseTime}ms
              </div>
            </div>
          )}
        </div>

        {/* Usage Statistics (24h) */}
        {usageStats && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">24h Usage</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Requests</div>
                <div className="font-medium">{usageStats.total}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Success Rate</div>
                <div className="font-medium">
                  {usageStats.total > 0 
                    ? Math.round((usageStats.success / usageStats.total) * 100)
                    : 0}%
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Avg Response</div>
                <div className="font-medium">{usageStats.avgResponseTime}ms</div>
              </div>
            </div>
          </div>
        )}

        {/* Error Display */}
        {integration.validation_error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="text-sm text-red-700">
              <strong>Error:</strong> {integration.validation_error}
            </div>
          </div>
        )}

        {/* Health Metadata */}
        {healthData?.metadata && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Health Details</h4>
            <div className="text-xs space-y-1">
              {Object.entries(healthData.metadata).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-muted-foreground capitalize">
                    {key.replace(/([A-Z])/g, ' $1').toLowerCase()}:
                  </span>
                  <span className="font-mono">
                    {typeof value === 'boolean' ? (value ? '✓' : '✗') : String(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default IntegrationStatusMonitor;