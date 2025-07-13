import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Cloud, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Activity, 
  Zap, 
  Database,
  Globe,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';

interface DeploymentInfo {
  id: string;
  platform: string;
  environment: string;
  status: 'deploying' | 'healthy' | 'unhealthy' | 'error';
  url?: string;
  version: string;
  deployedAt: string;
  metrics: {
    uptime: number;
    requests: number;
    errors: number;
    latency: number;
    cost: number;
  };
  health: {
    api: boolean;
    database: boolean;
    external: boolean;
  };
}

export function DeploymentStatusMonitor() {
  const [deployments, setDeployments] = useState<DeploymentInfo[]>([
    {
      id: '1',
      platform: 'Vercel',
      environment: 'production',
      status: 'healthy',
      url: 'https://my-pipeline.vercel.app',
      version: 'v1.2.3',
      deployedAt: '2024-01-15T10:30:00Z',
      metrics: {
        uptime: 99.9,
        requests: 15420,
        errors: 12,
        latency: 245,
        cost: 12.45
      },
      health: {
        api: true,
        database: true,
        external: true
      }
    },
    {
      id: '2',
      platform: 'Railway',
      environment: 'staging',
      status: 'deploying',
      url: 'https://staging-pipeline.railway.app',
      version: 'v1.3.0-rc1',
      deployedAt: '2024-01-15T14:20:00Z',
      metrics: {
        uptime: 98.5,
        requests: 892,
        errors: 3,
        latency: 180,
        cost: 3.21
      },
      health: {
        api: true,
        database: true,
        external: false
      }
    }
  ]);

  const [refreshing, setRefreshing] = useState(false);

  const refreshStatus = async () => {
    setRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const getStatusIcon = (status: DeploymentInfo['status']) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'unhealthy':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'deploying':
        return <Clock className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusColor = (status: DeploymentInfo['status']) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'unhealthy':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'deploying':
        return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const formatMetric = (value: number, type: 'percentage' | 'number' | 'ms' | 'currency') => {
    switch (type) {
      case 'percentage':
        return `${value}%`;
      case 'number':
        return value.toLocaleString();
      case 'ms':
        return `${value}ms`;
      case 'currency':
        return `$${value.toFixed(2)}`;
      default:
        return value.toString();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Deployment Status</h2>
          <p className="text-muted-foreground">
            Monitor your deployed pipelines across platforms
          </p>
        </div>
        <Button
          onClick={refreshStatus}
          disabled={refreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-6">
        {deployments.map((deployment) => (
          <Card key={deployment.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Cloud className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <CardTitle className="text-lg">{deployment.platform}</CardTitle>
                    <CardDescription>
                      {deployment.environment} • {deployment.version}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getStatusColor(deployment.status)}>
                    {getStatusIcon(deployment.status)}
                    <span className="ml-1 capitalize">{deployment.status}</span>
                  </Badge>
                  {deployment.url && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={deployment.url} target="_blank" rel="noopener noreferrer">
                        <Globe className="mr-1 h-3 w-3" />
                        View
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {deployment.status === 'deploying' && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Deployment Progress</span>
                    <span>75%</span>
                  </div>
                  <Progress value={75} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    Building and deploying to {deployment.platform}...
                  </p>
                </div>
              )}

              {/* Health Status */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm">System Health</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${deployment.health.api ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-sm">API</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${deployment.health.database ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-sm">Database</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${deployment.health.external ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-sm">External APIs</span>
                  </div>
                </div>
              </div>

              {/* Metrics */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Performance Metrics</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <Activity className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Uptime</span>
                    </div>
                    <p className="text-lg font-semibold">
                      {formatMetric(deployment.metrics.uptime, 'percentage')}
                    </p>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <Zap className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Requests</span>
                    </div>
                    <p className="text-lg font-semibold">
                      {formatMetric(deployment.metrics.requests, 'number')}
                    </p>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <XCircle className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Errors</span>
                    </div>
                    <p className="text-lg font-semibold">
                      {formatMetric(deployment.metrics.errors, 'number')}
                    </p>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Latency</span>
                    </div>
                    <p className="text-lg font-semibold">
                      {formatMetric(deployment.metrics.latency, 'ms')}
                    </p>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <Database className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Cost</span>
                    </div>
                    <p className="text-lg font-semibold">
                      {formatMetric(deployment.metrics.cost, 'currency')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Alerts */}
              {deployment.status === 'unhealthy' && (
                <Alert className="border-yellow-200 bg-yellow-50">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800">
                    External API connections are experiencing issues. Some features may be limited.
                  </AlertDescription>
                </Alert>
              )}

              {deployment.status === 'error' && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    Deployment failed. Check logs for more details.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm">
                  View Logs
                </Button>
                <Button variant="outline" size="sm">
                  Metrics
                </Button>
                <Button variant="outline" size="sm">
                  Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {deployments.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Cloud className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">No Deployments Found</h3>
            <p className="text-muted-foreground mb-4">
              Deploy your first pipeline to start monitoring
            </p>
            <Button>Deploy Pipeline</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}