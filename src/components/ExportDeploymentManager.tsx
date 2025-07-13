import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Cloud, Container, Code, FileText, Zap, Monitor, Settings } from 'lucide-react';
import { ExportConfig, PipelineConfig, exportPipeline, downloadBlob } from '@/lib/export-pipeline';
import { useToast } from '@/hooks/use-toast';

interface ExportDeploymentManagerProps {
  pipeline: PipelineConfig;
}

export function ExportDeploymentManager({ pipeline }: ExportDeploymentManagerProps) {
  const [config, setConfig] = useState<ExportConfig>({
    format: 'python',
    includeDockerfile: true,
    includeReadme: true,
    includeTests: true,
    includeDocs: true,
    includeMonitoring: false,
    pythonVersion: '3.11',
    nodeVersion: '20',
    packageManager: 'pip',
    deployment: {
      platform: 'local',
      environment: 'development',
      autoScale: false,
      monitoring: false
    },
    optimization: {
      caching: true,
      batching: true,
      streaming: false,
      fallbacks: true
    }
  });

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [deploymentStatus, setDeploymentStatus] = useState<'idle' | 'deploying' | 'success' | 'error'>('idle');
  const { toast } = useToast();

  const exportFormats = [
    { value: 'python', label: 'Python', icon: Code, description: 'Production-ready Python with async support' },
    { value: 'typescript', label: 'TypeScript', icon: Code, description: 'Type-safe Node.js implementation' },
    { value: 'javascript', label: 'JavaScript', icon: Code, description: 'Node.js implementation' },
    { value: 'jupyter', label: 'Jupyter Notebook', icon: FileText, description: 'Interactive notebook format' },
    { value: 'api', label: 'REST API', icon: Zap, description: 'FastAPI server with endpoints' },
    { value: 'docker-compose', label: 'Docker Compose', icon: Container, description: 'Containerized deployment' },
    { value: 'kubernetes', label: 'Kubernetes', icon: Container, description: 'K8s manifests and configs' }
  ];

  const deploymentPlatforms = [
    { value: 'local', label: 'Local Development', icon: Settings },
    { value: 'vercel', label: 'Vercel', icon: Cloud },
    { value: 'netlify', label: 'Netlify', icon: Cloud },
    { value: 'railway', label: 'Railway', icon: Cloud },
    { value: 'render', label: 'Render', icon: Cloud },
    { value: 'aws-lambda', label: 'AWS Lambda', icon: Cloud },
    { value: 'gcp-run', label: 'Google Cloud Run', icon: Cloud }
  ];

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setExportProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      const blob = await exportPipeline(pipeline, config);
      clearInterval(progressInterval);
      setExportProgress(100);

      const filename = `${pipeline.title.replace(/\s+/g, '_')}_${config.format}_${Date.now()}.zip`;
      downloadBlob(blob, filename);

      toast({
        title: "Export Complete",
        description: `Successfully exported ${pipeline.title} as ${config.format}`,
      });

    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "An error occurred during export",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
      setTimeout(() => setExportProgress(0), 2000);
    }
  };

  const handleDeploy = async () => {
    setDeploymentStatus('deploying');
    
    try {
      // This would integrate with actual deployment APIs
      await new Promise(resolve => setTimeout(resolve, 3000)); // Simulate deployment
      
      setDeploymentStatus('success');
      toast({
        title: "Deployment Successful",
        description: `Pipeline deployed to ${config.deployment.platform}`,
      });
    } catch (error) {
      setDeploymentStatus('error');
      toast({
        title: "Deployment Failed",
        description: "Failed to deploy pipeline",
        variant: "destructive"
      });
    }
  };

  const updateConfig = (key: keyof ExportConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const updateDeploymentConfig = (key: keyof ExportConfig['deployment'], value: any) => {
    setConfig(prev => ({
      ...prev,
      deployment: { ...prev.deployment, [key]: value }
    }));
  };

  const updateOptimizationConfig = (key: keyof ExportConfig['optimization'], value: any) => {
    setConfig(prev => ({
      ...prev,
      optimization: { ...prev.optimization, [key]: value }
    }));
  };

  const selectedFormat = exportFormats.find(f => f.value === config.format);
  const selectedPlatform = deploymentPlatforms.find(p => p.value === config.deployment.platform);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Export & Deploy</h2>
          <p className="text-muted-foreground">
            Export your pipeline and deploy to production platforms
          </p>
        </div>
        <Badge variant="outline" className="bg-primary/5">
          {pipeline.nodes.length} nodes, {pipeline.edges.length} connections
        </Badge>
      </div>

      <Tabs defaultValue="export" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="export" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Code
          </TabsTrigger>
          <TabsTrigger value="deploy" className="flex items-center gap-2">
            <Cloud className="h-4 w-4" />
            Deploy
          </TabsTrigger>
          <TabsTrigger value="monitor" className="flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            Monitor
          </TabsTrigger>
        </TabsList>

        <TabsContent value="export" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Export Format</CardTitle>
                <CardDescription>
                  Choose the output format for your pipeline
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select
                  value={config.format}
                  onValueChange={(value) => updateConfig('format', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {exportFormats.map((format) => (
                      <SelectItem key={format.value} value={format.value}>
                        <div className="flex items-center gap-2">
                          <format.icon className="h-4 w-4" />
                          <div>
                            <div className="font-medium">{format.label}</div>
                            <div className="text-xs text-muted-foreground">
                              {format.description}
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedFormat && (
                  <Alert>
                    <selectedFormat.icon className="h-4 w-4" />
                    <AlertDescription>
                      {selectedFormat.description}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Runtime Configuration</CardTitle>
                <CardDescription>
                  Configure runtime and package manager
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {['python', 'api', 'jupyter'].includes(config.format) && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Python Version</label>
                    <Select
                      value={config.pythonVersion}
                      onValueChange={(value) => updateConfig('pythonVersion', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="3.8">Python 3.8</SelectItem>
                        <SelectItem value="3.9">Python 3.9</SelectItem>
                        <SelectItem value="3.10">Python 3.10</SelectItem>
                        <SelectItem value="3.11">Python 3.11</SelectItem>
                        <SelectItem value="3.12">Python 3.12</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {['typescript', 'javascript'].includes(config.format) && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Node.js Version</label>
                    <Select
                      value={config.nodeVersion}
                      onValueChange={(value) => updateConfig('nodeVersion', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="18">Node.js 18 LTS</SelectItem>
                        <SelectItem value="20">Node.js 20 LTS</SelectItem>
                        <SelectItem value="21">Node.js 21</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-medium">Package Manager</label>
                  <Select
                    value={config.packageManager}
                    onValueChange={(value) => updateConfig('packageManager', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['python', 'api', 'jupyter'].includes(config.format) ? (
                        <>
                          <SelectItem value="pip">pip</SelectItem>
                          <SelectItem value="poetry">Poetry</SelectItem>
                          <SelectItem value="conda">Conda</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="npm">npm</SelectItem>
                          <SelectItem value="yarn">Yarn</SelectItem>
                          <SelectItem value="pnpm">pnpm</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Include Options</CardTitle>
                <CardDescription>
                  Additional files to include in export
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Dockerfile</label>
                  <Switch
                    checked={config.includeDockerfile}
                    onCheckedChange={(checked) => updateConfig('includeDockerfile', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">README & Documentation</label>
                  <Switch
                    checked={config.includeReadme}
                    onCheckedChange={(checked) => updateConfig('includeReadme', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Unit Tests</label>
                  <Switch
                    checked={config.includeTests}
                    onCheckedChange={(checked) => updateConfig('includeTests', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">API Documentation</label>
                  <Switch
                    checked={config.includeDocs}
                    onCheckedChange={(checked) => updateConfig('includeDocs', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Monitoring Setup</label>
                  <Switch
                    checked={config.includeMonitoring}
                    onCheckedChange={(checked) => updateConfig('includeMonitoring', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Optimizations</CardTitle>
                <CardDescription>
                  Enable performance features
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Response Caching</label>
                  <Switch
                    checked={config.optimization.caching}
                    onCheckedChange={(checked) => updateOptimizationConfig('caching', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Request Batching</label>
                  <Switch
                    checked={config.optimization.batching}
                    onCheckedChange={(checked) => updateOptimizationConfig('batching', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Token Streaming</label>
                  <Switch
                    checked={config.optimization.streaming}
                    onCheckedChange={(checked) => updateOptimizationConfig('streaming', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Fallback Strategies</label>
                  <Switch
                    checked={config.optimization.fallbacks}
                    onCheckedChange={(checked) => updateOptimizationConfig('fallbacks', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            {isExporting && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Exporting pipeline...</span>
                  <span>{exportProgress}%</span>
                </div>
                <Progress value={exportProgress} />
              </div>
            )}

            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full"
              size="lg"
            >
              <Download className="mr-2 h-4 w-4" />
              {isExporting ? 'Exporting...' : `Export as ${selectedFormat?.label}`}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="deploy" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Deployment Platform</CardTitle>
                <CardDescription>
                  Choose where to deploy your pipeline
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select
                  value={config.deployment.platform}
                  onValueChange={(value) => updateDeploymentConfig('platform', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {deploymentPlatforms.map((platform) => (
                      <SelectItem key={platform.value} value={platform.value}>
                        <div className="flex items-center gap-2">
                          <platform.icon className="h-4 w-4" />
                          {platform.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedPlatform && (
                  <Alert>
                    <selectedPlatform.icon className="h-4 w-4" />
                    <AlertDescription>
                      Deploying to {selectedPlatform.label}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Deployment Settings</CardTitle>
                <CardDescription>
                  Configure deployment options
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Environment</label>
                  <Select
                    value={config.deployment.environment}
                    onValueChange={(value) => updateDeploymentConfig('environment', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="development">Development</SelectItem>
                      <SelectItem value="staging">Staging</SelectItem>
                      <SelectItem value="production">Production</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Auto Scaling</label>
                  <Switch
                    checked={config.deployment.autoScale}
                    onCheckedChange={(checked) => updateDeploymentConfig('autoScale', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Monitoring</label>
                  <Switch
                    checked={config.deployment.monitoring}
                    onCheckedChange={(checked) => updateDeploymentConfig('monitoring', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            {deploymentStatus === 'deploying' && (
              <Alert>
                <Cloud className="h-4 w-4" />
                <AlertDescription>
                  Deploying to {selectedPlatform?.label}...
                </AlertDescription>
              </Alert>
            )}

            {deploymentStatus === 'success' && (
              <Alert className="border-green-200 bg-green-50">
                <Cloud className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Successfully deployed to {selectedPlatform?.label}
                </AlertDescription>
              </Alert>
            )}

            {deploymentStatus === 'error' && (
              <Alert variant="destructive">
                <Cloud className="h-4 w-4" />
                <AlertDescription>
                  Deployment failed. Please check your configuration.
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleDeploy}
              disabled={deploymentStatus === 'deploying' || config.deployment.platform === 'local'}
              className="w-full"
              size="lg"
            >
              <Cloud className="mr-2 h-4 w-4" />
              {deploymentStatus === 'deploying' 
                ? 'Deploying...' 
                : `Deploy to ${selectedPlatform?.label}`
              }
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="monitor" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Monitoring & Analytics</CardTitle>
              <CardDescription>
                Monitor your deployed pipeline performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Monitor className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Monitoring dashboard will be available after deployment</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}