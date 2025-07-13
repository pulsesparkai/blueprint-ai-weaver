import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, AlertCircle, XCircle, Clock, Activity, Database, Zap, Globe } from "lucide-react";

interface ServiceStatus {
  name: string;
  status: 'operational' | 'degraded' | 'outage' | 'maintenance';
  uptime: number;
  responseTime: number;
  icon: any;
}

interface Incident {
  id: string;
  title: string;
  status: 'investigating' | 'identified' | 'monitoring' | 'resolved';
  severity: 'low' | 'medium' | 'high' | 'critical';
  startTime: Date;
  lastUpdate: Date;
  description: string;
}

const StatusPage = () => {
  const [services, setServices] = useState<ServiceStatus[]>([
    {
      name: 'API Services',
      status: 'operational',
      uptime: 99.98,
      responseTime: 145,
      icon: Zap
    },
    {
      name: 'Database',
      status: 'operational',
      uptime: 99.99,
      responseTime: 12,
      icon: Database
    },
    {
      name: 'Pipeline Execution',
      status: 'operational',
      uptime: 99.95,
      responseTime: 2340,
      icon: Activity
    },
    {
      name: 'Web Application',
      status: 'operational',
      uptime: 99.97,
      responseTime: 89,
      icon: Globe
    }
  ]);

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [overallStatus, setOverallStatus] = useState<'operational' | 'degraded' | 'outage' | 'maintenance'>('operational');

  useEffect(() => {
    // Simulate real-time updates
    const interval = setInterval(() => {
      setServices(prev => prev.map(service => ({
        ...service,
        responseTime: service.responseTime + (Math.random() - 0.5) * 20,
        uptime: Math.max(99.5, service.uptime + (Math.random() - 0.5) * 0.01)
      })));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational': return 'bg-green-500';
      case 'degraded': return 'bg-yellow-500';
      case 'outage': return 'bg-red-500';
      case 'maintenance': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'operational': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'degraded': return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'outage': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'maintenance': return <Clock className="h-5 w-5 text-blue-500" />;
      default: return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'operational': return 'All Systems Operational';
      case 'degraded': return 'Degraded Performance';
      case 'outage': return 'Service Outage';
      case 'maintenance': return 'Scheduled Maintenance';
      default: return 'Unknown Status';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Overall Status */}
      <Card className="mb-8">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {getStatusIcon(overallStatus)}
          </div>
          <CardTitle className="text-3xl font-bold">
            {getStatusText(overallStatus)}
          </CardTitle>
          <p className="text-muted-foreground">
            Current system status and performance metrics
          </p>
        </CardHeader>
      </Card>

      {/* Current Incidents */}
      {incidents.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Current Incidents</CardTitle>
          </CardHeader>
          <CardContent>
            {incidents.map((incident) => (
              <Alert key={incident.id} className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{incident.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {incident.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Started: {incident.startTime.toLocaleString()} | 
                        Last update: {incident.lastUpdate.toLocaleString()}
                      </p>
                    </div>
                    <Badge variant={incident.severity === 'critical' ? 'destructive' : 'secondary'}>
                      {incident.status}
                    </Badge>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Service Status */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Service Status</CardTitle>
          <p className="text-muted-foreground">
            Real-time status of all platform components
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {services.map((service, index) => (
              <div key={index} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <service.icon className="h-5 w-5 text-muted-foreground" />
                    <h3 className="font-medium">{service.name}</h3>
                    {getStatusIcon(service.status)}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {service.uptime.toFixed(2)}% uptime
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {Math.round(service.responseTime)}ms avg response
                    </div>
                  </div>
                </div>
                <Progress value={service.uptime} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">System Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">API Requests/min</span>
                <span className="font-medium">2,847</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Active Users</span>
                <span className="font-medium">1,234</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Pipeline Executions</span>
                <span className="font-medium">156/min</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Error Rate</span>
                <span className="font-medium text-green-600">0.02%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Infrastructure</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Server Regions</span>
                <span className="font-medium">4 Active</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">CDN Status</span>
                <span className="font-medium text-green-600">Optimal</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Database Connections</span>
                <span className="font-medium">45/100</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Storage Used</span>
                <span className="font-medium">67%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Incidents History */}
      <Card>
        <CardHeader>
          <CardTitle>Incident History</CardTitle>
          <p className="text-muted-foreground">
            Past 30 days incident summary
          </p>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <p className="text-lg font-medium">No incidents in the past 30 days</p>
            <p className="text-sm">Our systems have been running smoothly</p>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center mt-8 text-sm text-muted-foreground">
        <p>
          Status page updates automatically every 30 seconds. 
          Last updated: {new Date().toLocaleString()}
        </p>
        <p className="mt-2">
          Questions? Contact support at status@yourcompany.com
        </p>
      </div>
    </div>
  );
};

export default StatusPage;