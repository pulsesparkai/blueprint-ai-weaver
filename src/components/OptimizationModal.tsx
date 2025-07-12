import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  DollarSign, 
  Zap, 
  AlertTriangle,
  CheckCircle,
  Info,
  Copy,
  Download,
  Play,
  Target,
  Database,
  Gauge,
  Upload,
  FileText,
  Wand2,
  Brain,
  Settings
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { OptimizationReport, OptimizationSuggestion, PipelineOptimizer, NodeConfig, EdgeConfig } from '@/lib/optimizer';

interface OptimizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: NodeConfig[];
  edges: EdgeConfig[];
  blueprintId: string;
  onApplySuggestion?: (suggestion: OptimizationSuggestion) => void;
  onApplyRAGConfig?: (config: any) => void;
}

interface RAGAnalysis {
  documentStats: {
    totalDocuments: number;
    averageLength: number;
    maxLength: number;
    minLength: number;
    vocabulary: string[];
    documentTypes: string[];
  };
  textCharacteristics: {
    averageSentenceLength: number;
    complexity: 'simple' | 'medium' | 'complex';
    domain: 'general' | 'technical' | 'academic' | 'code';
    language: string;
  };
  optimalChunkingStrategy: {
    chunkSize: number;
    overlap: number;
    splitterType: 'recursive' | 'semantic' | 'markdown' | 'code';
  };
  embeddingRecommendation: {
    model: string;
    dimensions: number;
    reason: string;
  };
  retrievalConfig: {
    topK: number;
    searchType: 'similarity' | 'mmr' | 'hybrid';
    rerankThreshold: number;
  };
}

interface OptimalRAGConfig {
  chunking: {
    strategy: string;
    chunkSize: number;
    overlap: number;
    preserveStructure: boolean;
  };
  embedding: {
    model: string;
    dimensions: number;
    normalization: boolean;
  };
  retrieval: {
    topK: number;
    searchType: string;
    mmrLambda?: number;
    rerankModel?: string;
  };
  generation: {
    contextWindow: number;
    maxTokens: number;
    temperature: number;
  };
}

export function OptimizationModal({ 
  isOpen, 
  onClose, 
  nodes, 
  edges, 
  blueprintId,
  onApplySuggestion,
  onApplyRAGConfig
}: OptimizationModalProps) {
  const [report, setReport] = useState<OptimizationReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<OptimizationSuggestion | null>(null);
  
  // RAG Auto-Config state
  const [ragAnalysisLoading, setRagAnalysisLoading] = useState(false);
  const [ragAnalysis, setRagAnalysis] = useState<RAGAnalysis | null>(null);
  const [ragConfig, setRagConfig] = useState<OptimalRAGConfig | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [userTier, setUserTier] = useState<string>('free');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Load user tier on component mount
  React.useEffect(() => {
    const loadUserTier = async () => {
      if (!user) return;
      
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_tier')
          .eq('id', user.id)
          .single();
        
        setUserTier(profile?.subscription_tier || 'free');
      } catch (error) {
        console.error('Failed to load user tier:', error);
      }
    };
    
    loadUserTier();
  }, [user]);

  const analyzeOptimizations = async () => {
    setLoading(true);
    try {
      const optimizer = new PipelineOptimizer(nodes, edges);
      const optimizationReport = await optimizer.analyze();
      setReport(optimizationReport);
      
      // Save report to database
      await optimizer.saveOptimizationReport(blueprintId, optimizationReport);
      
      toast({
        title: "Analysis complete",
        description: `Found ${optimizationReport.suggestions.length} optimization opportunities`
      });
    } catch (error: any) {
      toast({
        title: "Analysis failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 10MB",
        variant: "destructive"
      });
      return;
    }

    // Check file type
    const allowedTypes = ['text/plain', 'text/csv', 'application/json', 'text/markdown'];
    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.txt') && !file.name.endsWith('.md')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a text, CSV, JSON, or Markdown file",
        variant: "destructive"
      });
      return;
    }

    setUploadedFile(file);
  };

  const analyzeRAGDataset = async () => {
    if (!uploadedFile || !user) return;

    if (userTier === 'free') {
      toast({
        title: "Upgrade Required",
        description: "Auto-Configure RAG is available for Pro and Enterprise tiers only",
        variant: "destructive"
      });
      return;
    }

    setRagAnalysisLoading(true);
    
    try {
      // Upload file to Supabase Storage
      const fileName = `${user.id}/${Date.now()}-${uploadedFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('rag-datasets')
        .upload(fileName, uploadedFile);

      if (uploadError) throw uploadError;

      // Call the RAG analysis Edge Function
      const { data, error } = await supabase.functions.invoke('rag-auto-config', {
        body: {
          filePath: fileName,
          blueprintId
        }
      });

      if (error) throw error;

      setRagAnalysis(data.analysis);
      setRagConfig(data.optimalConfig);

      toast({
        title: "Analysis Complete",
        description: data.recommendations.summary
      });

      // Clean up uploaded file
      await supabase.storage.from('rag-datasets').remove([fileName]);

    } catch (error: any) {
      console.error('RAG analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze dataset",
        variant: "destructive"
      });
    } finally {
      setRagAnalysisLoading(false);
    }
  };

  const applyRAGConfig = () => {
    if (!ragConfig || !onApplyRAGConfig) return;
    
    onApplyRAGConfig(ragConfig);
    toast({
      title: "RAG Configuration Applied",
      description: "Your pipeline has been optimized with the recommended RAG settings"
    });
  };

  const applySuggestion = (suggestion: OptimizationSuggestion) => {
    if (onApplySuggestion) {
      onApplySuggestion(suggestion);
      toast({
        title: "Optimization applied",
        description: `Applied: ${suggestion.title}`
      });
    }
  };

  const exportReport = () => {
    if (!report) return;
    
    const reportData = {
      timestamp: new Date().toISOString(),
      blueprint_id: blueprintId,
      summary: report.summary,
      suggestions: report.suggestions,
      node_analysis: report.nodeAnalysis
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `optimization-report-${blueprintId}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Report exported",
      description: "Optimization report downloaded successfully"
    });
  };

  const getSeverityIcon = (severity: OptimizationSuggestion['severity']) => {
    switch (severity) {
      case 'high': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'medium': return <Info className="w-4 h-4 text-yellow-500" />;
      case 'low': return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
  };

  const getTypeIcon = (type: OptimizationSuggestion['type']) => {
    switch (type) {
      case 'token_reduction': return <TrendingDown className="w-4 h-4" />;
      case 'cost_savings': return <DollarSign className="w-4 h-4" />;
      case 'performance': return <Zap className="w-4 h-4" />;
      case 'redundancy': return <Copy className="w-4 h-4" />;
      case 'caching': return <Database className="w-4 h-4" />;
      case 'rag_optimization': return <Target className="w-4 h-4" />;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'hard': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Gauge className="w-5 h-5" />
                Pipeline Optimization
              </DialogTitle>
              <DialogDescription>
                Analyze and optimize your pipeline for better performance and cost efficiency
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              {report && (
                <Button variant="outline" size="sm" onClick={exportReport}>
                  <Download className="w-4 h-4 mr-2" />
                  Export Report
                </Button>
              )}
              <Button onClick={analyzeOptimizations} disabled={loading}>
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin mr-2" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Analyze Pipeline
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0">
          {!report ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Gauge className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">Ready to Optimize</h3>
                <p className="text-muted-foreground mb-4">
                  Click "Analyze Pipeline" to discover optimization opportunities
                </p>
                <div className="text-sm text-muted-foreground">
                  <p>• Token usage analysis</p>
                  <p>• Cost optimization suggestions</p>
                  <p>• Performance improvements</p>
                  <p>• RAG configuration optimization</p>
                </div>
              </div>
            </div>
          ) : (
            <Tabs defaultValue="overview" className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="suggestions">
                  Suggestions ({report.suggestions.length})
                </TabsTrigger>
                <TabsTrigger value="analysis">Node Analysis</TabsTrigger>
                <TabsTrigger value="rag-config">RAG Auto-Config</TabsTrigger>
                <TabsTrigger value="implementation">Implementation</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="flex-1 min-h-0 overflow-y-auto">
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <TrendingDown className="w-4 h-4" />
                          Token Reduction
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-foreground">
                          {report.summary.totalTokenReduction.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">tokens saved</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          Cost Savings
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-foreground">
                          ${report.summary.totalCostSavings.toFixed(4)}
                        </div>
                        <p className="text-xs text-muted-foreground">per execution</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Zap className="w-4 h-4" />
                          Performance Gain
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-foreground">
                          {report.summary.totalPerformanceGain.toFixed(1)}%
                        </div>
                        <p className="text-xs text-muted-foreground">improvement</p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Target className="w-4 h-4" />
                          Opportunities
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-foreground">
                          {report.summary.totalSuggestions}
                        </div>
                        <p className="text-xs text-muted-foreground">suggestions</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Top Suggestions */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Top Optimization Opportunities</CardTitle>
                      <CardDescription>
                        High-impact suggestions for immediate improvement
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {report.suggestions.slice(0, 3).map((suggestion) => (
                          <div key={suggestion.id} className="flex items-start gap-4 p-4 border rounded-lg">
                            <div className="flex items-center gap-2">
                              {getSeverityIcon(suggestion.severity)}
                              {getTypeIcon(suggestion.type)}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-foreground">{suggestion.title}</h4>
                              <p className="text-sm text-muted-foreground mb-2">{suggestion.description}</p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                {suggestion.impact.tokenReduction && (
                                  <span>-{suggestion.impact.tokenReduction} tokens</span>
                                )}
                                {suggestion.impact.costSavings && (
                                  <span>-${suggestion.impact.costSavings.toFixed(4)}</span>
                                )}
                                {suggestion.impact.performanceGain && (
                                  <span>+{suggestion.impact.performanceGain}% performance</span>
                                )}
                              </div>
                            </div>
                            <Button size="sm" onClick={() => applySuggestion(suggestion)}>
                              Apply
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="suggestions" className="flex-1 min-h-0 overflow-y-auto">
                <div className="space-y-4">
                  {report.suggestions.map((suggestion) => (
                    <Card key={suggestion.id} className="cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => setSelectedSuggestion(suggestion)}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            {getSeverityIcon(suggestion.severity)}
                            {getTypeIcon(suggestion.type)}
                            <div>
                              <CardTitle className="text-base">{suggestion.title}</CardTitle>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {suggestion.type.replace('_', ' ')}
                                </Badge>
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${getDifficultyColor(suggestion.implementation.difficulty)}`}
                                >
                                  {suggestion.implementation.difficulty}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <Button size="sm" onClick={(e) => { e.stopPropagation(); applySuggestion(suggestion); }}>
                            Apply
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-3">{suggestion.description}</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Before:</p>
                            <p className="text-sm bg-muted p-2 rounded text-foreground">{suggestion.before}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">After:</p>
                            <p className="text-sm bg-muted p-2 rounded text-foreground">{suggestion.after}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {suggestion.impact.tokenReduction && (
                            <span className="flex items-center gap-1">
                              <TrendingDown className="w-3 h-3" />
                              {suggestion.impact.tokenReduction} tokens
                            </span>
                          )}
                          {suggestion.impact.costSavings && (
                            <span className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              ${suggestion.impact.costSavings.toFixed(4)}
                            </span>
                          )}
                          {suggestion.impact.performanceGain && (
                            <span className="flex items-center gap-1">
                              <TrendingUp className="w-3 h-3" />
                              {suggestion.impact.performanceGain}%
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {suggestion.implementation.timeEstimate}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="analysis" className="flex-1 min-h-0 overflow-y-auto">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(report.nodeAnalysis).map(([nodeId, analysis]) => {
                      const node = nodes.find(n => n.id === nodeId);
                      if (!node) return null;

                      return (
                        <Card key={nodeId}>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm">{node.data.label || nodeId}</CardTitle>
                            <CardDescription className="text-xs">{node.type}</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="space-y-2">
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Tokens:</span>
                                <span className="font-medium">{analysis.currentTokens.toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">Cost:</span>
                                <span className="font-medium">${analysis.estimatedCost.toFixed(4)}</span>
                              </div>
                              <div className="space-y-1">
                                <div className="flex justify-between text-xs">
                                  <span className="text-muted-foreground">Optimization Potential:</span>
                                  <span className="font-medium">{analysis.optimizationPotential}%</span>
                                </div>
                                <Progress value={analysis.optimizationPotential} className="h-1" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="rag-config" className="flex-1 min-h-0 overflow-y-auto">
                <div className="space-y-6">
                  {/* RAG Auto-Config Header */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Brain className="w-5 h-5" />
                        Auto-Configure RAG Pipeline
                        {userTier === 'free' && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Pro/Enterprise Only
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        Upload a sample dataset to automatically optimize your RAG configuration based on content analysis
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* File Upload */}
                        <div>
                          <Label htmlFor="dataset-upload" className="text-sm font-medium">
                            Upload Dataset Sample
                          </Label>
                          <div className="mt-2">
                            <Input
                              ref={fileInputRef}
                              id="dataset-upload"
                              type="file"
                              accept=".txt,.csv,.json,.md"
                              onChange={handleFileUpload}
                              disabled={userTier === 'free'}
                              className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Supported formats: TXT, CSV, JSON, Markdown (max 10MB)
                            </p>
                          </div>
                        </div>

                        {/* Upload Status */}
                        {uploadedFile && (
                          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium">{uploadedFile.name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({(uploadedFile.size / 1024).toFixed(1)} KB)
                            </span>
                          </div>
                        )}

                        {/* Analyze Button */}
                        <Button 
                          onClick={analyzeRAGDataset}
                          disabled={!uploadedFile || ragAnalysisLoading || userTier === 'free'}
                          className="w-full"
                        >
                          {ragAnalysisLoading ? (
                            <>
                              <div className="w-4 h-4 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin mr-2" />
                              Analyzing Dataset...
                            </>
                          ) : (
                            <>
                              <Wand2 className="w-4 h-4 mr-2" />
                              Auto-Configure RAG
                            </>
                          )}
                        </Button>

                        {userTier === 'free' && (
                          <div className="p-4 bg-muted/50 border border-dashed rounded-lg text-center">
                            <p className="text-sm text-muted-foreground mb-2">
                              Auto-Configure RAG is available for Pro and Enterprise users
                            </p>
                            <Button variant="outline" size="sm">
                              Upgrade to Pro
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Analysis Results */}
                  {ragAnalysis && ragConfig && (
                    <div className="space-y-4">
                      {/* Dataset Analysis Summary */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Database className="w-4 h-4" />
                            Dataset Analysis
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-foreground">
                                {ragAnalysis.documentStats.totalDocuments}
                              </div>
                              <p className="text-xs text-muted-foreground">Documents</p>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-foreground">
                                {Math.round(ragAnalysis.documentStats.averageLength)}
                              </div>
                              <p className="text-xs text-muted-foreground">Avg Length</p>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-foreground capitalize">
                                {ragAnalysis.textCharacteristics.domain}
                              </div>
                              <p className="text-xs text-muted-foreground">Domain</p>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-foreground capitalize">
                                {ragAnalysis.textCharacteristics.complexity}
                              </div>
                              <p className="text-xs text-muted-foreground">Complexity</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Optimal Configuration */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Settings className="w-4 h-4" />
                            Recommended Configuration
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {/* Chunking Strategy */}
                            <div className="border rounded-lg p-4">
                              <h4 className="font-medium text-sm mb-2">Chunking Strategy</h4>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Strategy:</span>
                                  <span className="ml-2 font-medium capitalize">{ragConfig.chunking.strategy}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Chunk Size:</span>
                                  <span className="ml-2 font-medium">{ragConfig.chunking.chunkSize} tokens</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Overlap:</span>
                                  <span className="ml-2 font-medium">{ragConfig.chunking.overlap} tokens</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Preserve Structure:</span>
                                  <span className="ml-2 font-medium">{ragConfig.chunking.preserveStructure ? 'Yes' : 'No'}</span>
                                </div>
                              </div>
                            </div>

                            {/* Embedding Configuration */}
                            <div className="border rounded-lg p-4">
                              <h4 className="font-medium text-sm mb-2">Embedding Configuration</h4>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Model:</span>
                                  <span className="ml-2 font-medium">{ragConfig.embedding.model}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Dimensions:</span>
                                  <span className="ml-2 font-medium">{ragConfig.embedding.dimensions}</span>
                                </div>
                              </div>
                            </div>

                            {/* Retrieval Configuration */}
                            <div className="border rounded-lg p-4">
                              <h4 className="font-medium text-sm mb-2">Retrieval Configuration</h4>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Top K:</span>
                                  <span className="ml-2 font-medium">{ragConfig.retrieval.topK}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Search Type:</span>
                                  <span className="ml-2 font-medium capitalize">{ragConfig.retrieval.searchType}</span>
                                </div>
                                {ragConfig.retrieval.mmrLambda && (
                                  <div>
                                    <span className="text-muted-foreground">MMR Lambda:</span>
                                    <span className="ml-2 font-medium">{ragConfig.retrieval.mmrLambda}</span>
                                  </div>
                                )}
                                {ragConfig.retrieval.rerankModel && (
                                  <div>
                                    <span className="text-muted-foreground">Rerank Model:</span>
                                    <span className="ml-2 font-medium">{ragConfig.retrieval.rerankModel}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Generation Configuration */}
                            <div className="border rounded-lg p-4">
                              <h4 className="font-medium text-sm mb-2">Generation Configuration</h4>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Context Window:</span>
                                  <span className="ml-2 font-medium">{ragConfig.generation.contextWindow} tokens</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Max Tokens:</span>
                                  <span className="ml-2 font-medium">{ragConfig.generation.maxTokens}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Temperature:</span>
                                  <span className="ml-2 font-medium">{ragConfig.generation.temperature}</span>
                                </div>
                              </div>
                            </div>

                            {/* Apply Configuration */}
                            <Separator />
                            <Button onClick={applyRAGConfig} className="w-full" size="lg">
                              <Target className="w-4 h-4 mr-2" />
                              Apply Optimal RAG Configuration
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="implementation" className="flex-1 min-h-0 overflow-y-auto">
                {selectedSuggestion ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        {getTypeIcon(selectedSuggestion.type)}
                        {selectedSuggestion.title}
                      </CardTitle>
                      <CardDescription>{selectedSuggestion.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <h4 className="font-medium text-sm mb-2">Difficulty</h4>
                          <Badge className={getDifficultyColor(selectedSuggestion.implementation.difficulty)}>
                            {selectedSuggestion.implementation.difficulty}
                          </Badge>
                        </div>
                        <div>
                          <h4 className="font-medium text-sm mb-2">Time Estimate</h4>
                          <p className="text-sm text-muted-foreground">{selectedSuggestion.implementation.timeEstimate}</p>
                        </div>
                        <div>
                          <h4 className="font-medium text-sm mb-2">Impact</h4>
                          <div className="text-sm text-muted-foreground">
                            {selectedSuggestion.impact.tokenReduction && (
                              <p>-{selectedSuggestion.impact.tokenReduction} tokens</p>
                            )}
                            {selectedSuggestion.impact.costSavings && (
                              <p>-${selectedSuggestion.impact.costSavings.toFixed(4)}</p>
                            )}
                            {selectedSuggestion.impact.performanceGain && (
                              <p>+{selectedSuggestion.impact.performanceGain}% performance</p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-medium text-sm mb-2">Implementation Steps</h4>
                        <ol className="space-y-2">
                          {selectedSuggestion.implementation.steps.map((step, idx) => (
                            <li key={idx} className="flex items-start gap-3 text-sm">
                              <span className="flex-shrink-0 w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-medium">
                                {idx + 1}
                              </span>
                              <span className="text-muted-foreground">{step}</span>
                            </li>
                          ))}
                        </ol>
                      </div>

                      <Button onClick={() => applySuggestion(selectedSuggestion)} className="w-full">
                        Apply This Optimization
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <Target className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">Select a Suggestion</h3>
                      <p className="text-muted-foreground">
                        Click on a suggestion from the list to see implementation details
                      </p>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}