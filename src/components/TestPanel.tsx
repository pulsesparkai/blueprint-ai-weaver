import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, PlayCircle, Save, Download, Plus, Trash2, Copy, BarChart3, Clock, DollarSign, Target, TrendingUp, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface TestCase {
  id: string;
  name: string;
  input: string;
  expectedOutput?: string;
  actualOutput?: string;
  executionTime?: number;
  cost?: number;
  status?: 'pending' | 'running' | 'passed' | 'failed' | 'error';
  createdAt: Date;
}

interface TestSuite {
  id: string;
  name: string;
  description: string;
  testCases: TestCase[];
  lastRun?: Date;
  passRate?: number;
}

interface PipelineVersion {
  id: string;
  name: string;
  nodes: any[];
  edges: any[];
  createdAt: Date;
  performance?: {
    avgExecutionTime: number;
    avgCost: number;
    successRate: number;
  };
}

interface ABTestConfig {
  id: string;
  name: string;
  description: string;
  variants: {
    id: string;
    name: string;
    configuration: Record<string, any>;
  }[];
  trafficSplit: number[];
  metrics: string[];
}

interface TestPanelProps {
  blueprintId: string;
  currentNodes: any[];
  currentEdges: any[];
  onRunTest: (input: string) => Promise<{ output: string; executionTime: number; cost: number }>;
}

export function TestPanel({ blueprintId, currentNodes, currentEdges, onRunTest }: TestPanelProps) {
  const [testSuites, setTestSuites] = useState<TestSuite[]>([]);
  const [selectedSuite, setSelectedSuite] = useState<string>('');
  const [newTestCase, setNewTestCase] = useState({ name: '', input: '', expectedOutput: '' });
  const [versions, setVersions] = useState<PipelineVersion[]>([]);
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [abTests, setABTests] = useState<ABTestConfig[]>([]);
  const [runningTests, setRunningTests] = useState<Set<string>>(new Set());
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [benchmarkDate, setBenchmarkDate] = useState<Date>();
  const [showReport, setShowReport] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadTestSuites();
    loadVersions();
    loadABTests();
  }, [blueprintId]);

  const loadTestSuites = async () => {
    // Mock data - in real implementation, load from Supabase
    const mockSuites: TestSuite[] = [
      {
        id: '1',
        name: 'Basic Functionality Tests',
        description: 'Core pipeline functionality validation',
        testCases: [
          {
            id: '1',
            name: 'Simple Query Test',
            input: 'What is machine learning?',
            expectedOutput: 'Machine learning is a subset of artificial intelligence...',
            createdAt: new Date()
          },
          {
            id: '2',
            name: 'Complex Query Test',
            input: 'Explain the differences between supervised and unsupervised learning with examples',
            expectedOutput: 'Supervised learning uses labeled data...',
            createdAt: new Date()
          }
        ],
        lastRun: new Date(Date.now() - 86400000),
        passRate: 85
      },
      {
        id: '2',
        name: 'Edge Cases',
        description: 'Testing unusual inputs and edge cases',
        testCases: [
          {
            id: '3',
            name: 'Empty Input',
            input: '',
            expectedOutput: 'Please provide a valid question.',
            createdAt: new Date()
          },
          {
            id: '4',
            name: 'Very Long Input',
            input: 'This is a very long input that exceeds normal length boundaries and tests how the system handles extensive text input that might cause issues with token limits or processing capabilities...',
            expectedOutput: 'The system should handle long inputs gracefully...',
            createdAt: new Date()
          }
        ],
        lastRun: new Date(Date.now() - 172800000),
        passRate: 60
      }
    ];
    setTestSuites(mockSuites);
    if (mockSuites.length > 0) {
      setSelectedSuite(mockSuites[0].id);
    }
  };

  const loadVersions = async () => {
    // Mock data - in real implementation, load pipeline versions
    const mockVersions: PipelineVersion[] = [
      {
        id: 'v1',
        name: 'Version 1.0 - Initial',
        nodes: currentNodes,
        edges: currentEdges,
        createdAt: new Date(Date.now() - 604800000),
        performance: {
          avgExecutionTime: 2500,
          avgCost: 0.008,
          successRate: 92
        }
      },
      {
        id: 'v2',
        name: 'Version 1.1 - Optimized',
        nodes: currentNodes,
        edges: currentEdges,
        createdAt: new Date(Date.now() - 259200000),
        performance: {
          avgExecutionTime: 1800,
          avgCost: 0.006,
          successRate: 95
        }
      },
      {
        id: 'current',
        name: 'Current Version',
        nodes: currentNodes,
        edges: currentEdges,
        createdAt: new Date(),
        performance: {
          avgExecutionTime: 1600,
          avgCost: 0.005,
          successRate: 97
        }
      }
    ];
    setVersions(mockVersions);
  };

  const loadABTests = async () => {
    // Mock A/B test configurations
    const mockABTests: ABTestConfig[] = [
      {
        id: '1',
        name: 'Temperature Comparison',
        description: 'Testing different temperature settings for creativity vs consistency',
        variants: [
          { id: 'a', name: 'Conservative (0.3)', configuration: { temperature: 0.3 } },
          { id: 'b', name: 'Balanced (0.7)', configuration: { temperature: 0.7 } },
          { id: 'c', name: 'Creative (0.9)', configuration: { temperature: 0.9 } }
        ],
        trafficSplit: [33, 33, 34],
        metrics: ['accuracy', 'creativity', 'consistency']
      },
      {
        id: '2',
        name: 'Model Comparison',
        description: 'Comparing different LLM models for performance',
        variants: [
          { id: 'a', name: 'GPT-4.1', configuration: { model: 'gpt-4.1-2025-04-14' } },
          { id: 'b', name: 'Claude-3.5', configuration: { model: 'claude-3.5-sonnet' } }
        ],
        trafficSplit: [50, 50],
        metrics: ['accuracy', 'speed', 'cost']
      }
    ];
    setABTests(mockABTests);
  };

  const createTestSuite = async () => {
    const newSuite: TestSuite = {
      id: Date.now().toString(),
      name: 'New Test Suite',
      description: 'Created test suite',
      testCases: [],
      passRate: 0
    };
    setTestSuites([...testSuites, newSuite]);
    setSelectedSuite(newSuite.id);
  };

  const addTestCase = () => {
    if (!newTestCase.name || !newTestCase.input) {
      toast({
        title: "Missing required fields",
        description: "Please provide test name and input",
        variant: "destructive"
      });
      return;
    }

    const testCase: TestCase = {
      id: Date.now().toString(),
      name: newTestCase.name,
      input: newTestCase.input,
      expectedOutput: newTestCase.expectedOutput,
      createdAt: new Date(),
      status: 'pending'
    };

    const updatedSuites = testSuites.map(suite => {
      if (suite.id === selectedSuite) {
        return {
          ...suite,
          testCases: [...suite.testCases, testCase]
        };
      }
      return suite;
    });

    setTestSuites(updatedSuites);
    setNewTestCase({ name: '', input: '', expectedOutput: '' });
    
    toast({
      title: "Test case added",
      description: `Added "${testCase.name}" to test suite`
    });
  };

  const runSingleTest = async (testCase: TestCase) => {
    setRunningTests(prev => new Set([...prev, testCase.id]));
    
    try {
      const result = await onRunTest(testCase.input);
      
      const updatedSuites = testSuites.map(suite => {
        if (suite.id === selectedSuite) {
          return {
            ...suite,
            testCases: suite.testCases.map(tc => {
              if (tc.id === testCase.id) {
                const status: TestCase['status'] = testCase.expectedOutput ? 
                  (result.output.includes(testCase.expectedOutput.substring(0, 50)) ? 'passed' : 'failed') :
                  'passed';
                return {
                  ...tc,
                  actualOutput: result.output,
                  executionTime: result.executionTime,
                  cost: result.cost,
                  status
                };
              }
              return tc;
            })
          };
        }
        return suite;
      });

      setTestSuites(updatedSuites);
      
      toast({
        title: "Test completed",
        description: `Test "${testCase.name}" finished`
      });
    } catch (error: any) {
      const updatedSuites = testSuites.map(suite => {
        if (suite.id === selectedSuite) {
          return {
            ...suite,
            testCases: suite.testCases.map(tc => {
              if (tc.id === testCase.id) {
                return {
                  ...tc,
                  status: 'error' as TestCase['status']
                };
              }
              return tc;
            })
          };
        }
        return suite;
      });
      setTestSuites(updatedSuites);
      
      toast({
        title: "Test failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setRunningTests(prev => {
        const newSet = new Set(prev);
        newSet.delete(testCase.id);
        return newSet;
      });
    }
  };

  const runBatchTests = async () => {
    const currentSuite = testSuites.find(s => s.id === selectedSuite);
    if (!currentSuite) return;

    toast({
      title: "Running batch tests",
      description: `Starting ${currentSuite.testCases.length} tests`
    });

    for (const testCase of currentSuite.testCases) {
      await runSingleTest(testCase);
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    toast({
      title: "Batch tests completed",
      description: "All tests have finished running"
    });
  };

  const generateReport = () => {
    const currentSuite = testSuites.find(s => s.id === selectedSuite);
    if (!currentSuite) return;

    const passedTests = currentSuite.testCases.filter(tc => tc.status === 'passed').length;
    const totalTests = currentSuite.testCases.length;
    const passRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

    const avgExecutionTime = currentSuite.testCases
      .filter(tc => tc.executionTime)
      .reduce((sum, tc) => sum + (tc.executionTime || 0), 0) / 
      currentSuite.testCases.filter(tc => tc.executionTime).length || 0;

    const totalCost = currentSuite.testCases
      .reduce((sum, tc) => sum + (tc.cost || 0), 0);

    setTestResults({
      passRate,
      avgExecutionTime,
      totalCost,
      recommendations: generateRecommendations(currentSuite, passRate, avgExecutionTime)
    });

    setShowReport(true);
  };

  const generateRecommendations = (suite: TestSuite, passRate: number, avgTime: number) => {
    const recommendations = [];

    if (passRate < 80) {
      recommendations.push({
        type: 'warning',
        title: 'Low Pass Rate',
        description: 'Consider reviewing failed test cases and adjusting pipeline configuration'
      });
    }

    if (avgTime > 3000) {
      recommendations.push({
        type: 'warning',
        title: 'High Execution Time',
        description: 'Consider optimizing node configurations or using faster models'
      });
    }

    if (passRate > 95) {
      recommendations.push({
        type: 'success',
        title: 'Excellent Performance',
        description: 'Pipeline is performing very well across test cases'
      });
    }

    return recommendations;
  };

  const currentSuite = testSuites.find(s => s.id === selectedSuite);

  return (
    <div className="w-full max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Testing Panel</h2>
          <p className="text-muted-foreground">Comprehensive testing and analysis tools</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={generateReport}>
            <BarChart3 className="w-4 h-4 mr-2" />
            Generate Report
          </Button>
          <Button onClick={createTestSuite}>
            <Plus className="w-4 h-4 mr-2" />
            New Test Suite
          </Button>
        </div>
      </div>

      <Tabs defaultValue="test-cases" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="test-cases">Test Cases</TabsTrigger>
          <TabsTrigger value="batch-testing">Batch Testing</TabsTrigger>
          <TabsTrigger value="version-comparison">Version Compare</TabsTrigger>
          <TabsTrigger value="ab-testing">A/B Testing</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="test-cases" className="space-y-4">
          <div className="flex items-center gap-4">
            <Select value={selectedSuite} onValueChange={setSelectedSuite}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select test suite" />
              </SelectTrigger>
              <SelectContent>
                {testSuites.map(suite => (
                  <SelectItem key={suite.id} value={suite.id}>
                    {suite.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {currentSuite && (
              <Badge variant="outline">
                {currentSuite.testCases.length} test cases
              </Badge>
            )}
          </div>

          {currentSuite && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Add New Test Case</CardTitle>
                  <CardDescription>Create a new test case for the selected suite</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="test-name">Test Name</Label>
                      <Input
                        id="test-name"
                        value={newTestCase.name}
                        onChange={(e) => setNewTestCase({...newTestCase, name: e.target.value})}
                        placeholder="Enter test name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="expected-output">Expected Output (Optional)</Label>
                      <Input
                        id="expected-output"
                        value={newTestCase.expectedOutput}
                        onChange={(e) => setNewTestCase({...newTestCase, expectedOutput: e.target.value})}
                        placeholder="Expected result"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="test-input">Test Input</Label>
                    <Textarea
                      id="test-input"
                      value={newTestCase.input}
                      onChange={(e) => setNewTestCase({...newTestCase, input: e.target.value})}
                      placeholder="Enter test input"
                      rows={3}
                    />
                  </div>
                  <Button onClick={addTestCase}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Test Case
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Test Cases</CardTitle>
                  <CardDescription>Manage and run individual test cases</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {currentSuite.testCases.map(testCase => (
                      <div key={testCase.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium">{testCase.name}</h4>
                              {testCase.status && (
                                <Badge 
                                  variant={testCase.status === 'passed' ? 'default' : 
                                          testCase.status === 'failed' ? 'destructive' : 'outline'}
                                >
                                  {testCase.status}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              Input: {testCase.input.substring(0, 100)}
                              {testCase.input.length > 100 && '...'}
                            </p>
                            {testCase.expectedOutput && (
                              <p className="text-sm text-muted-foreground mb-2">
                                Expected: {testCase.expectedOutput.substring(0, 100)}
                                {testCase.expectedOutput.length > 100 && '...'}
                              </p>
                            )}
                            {testCase.actualOutput && (
                              <p className="text-sm text-foreground">
                                Actual: {testCase.actualOutput.substring(0, 100)}
                                {testCase.actualOutput.length > 100 && '...'}
                              </p>
                            )}
                            {(testCase.executionTime || testCase.cost) && (
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                {testCase.executionTime && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {testCase.executionTime}ms
                                  </span>
                                )}
                                {testCase.cost && (
                                  <span className="flex items-center gap-1">
                                    <DollarSign className="w-3 h-3" />
                                    ${testCase.cost.toFixed(4)}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => runSingleTest(testCase)}
                              disabled={runningTests.has(testCase.id)}
                            >
                              {runningTests.has(testCase.id) ? (
                                <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                              ) : (
                                <PlayCircle className="w-4 h-4" />
                              )}
                            </Button>
                            <Button size="sm" variant="ghost">
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="batch-testing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Batch Test Configuration</CardTitle>
              <CardDescription>Run multiple test cases in sequence</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Test Suite</Label>
                  <Select value={selectedSuite} onValueChange={setSelectedSuite}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {testSuites.map(suite => (
                        <SelectItem key={suite.id} value={suite.id}>
                          {suite.name} ({suite.testCases.length} tests)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Delay Between Tests (ms)</Label>
                  <Input type="number" defaultValue="1000" />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button onClick={runBatchTests} disabled={!currentSuite || runningTests.size > 0}>
                  <PlayCircle className="w-4 h-4 mr-2" />
                  Run Batch Tests
                </Button>
                <Button variant="outline">
                  <Save className="w-4 h-4 mr-2" />
                  Save Configuration
                </Button>
              </div>

              {currentSuite && (
                <div className="mt-6">
                  <h4 className="font-medium mb-2">Test Progress</h4>
                  <Progress 
                    value={(currentSuite.testCases.filter(tc => tc.status && tc.status !== 'pending').length / currentSuite.testCases.length) * 100} 
                    className="w-full"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    {currentSuite.testCases.filter(tc => tc.status && tc.status !== 'pending').length} / {currentSuite.testCases.length} tests completed
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="version-comparison" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Version Comparison</CardTitle>
              <CardDescription>Compare performance across different pipeline versions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Select Versions to Compare</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                  {versions.map(version => (
                    <div key={version.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={version.id}
                        checked={selectedVersions.includes(version.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedVersions([...selectedVersions, version.id]);
                          } else {
                            setSelectedVersions(selectedVersions.filter(id => id !== version.id));
                          }
                        }}
                      />
                      <Label htmlFor={version.id} className="text-sm">
                        {version.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {selectedVersions.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-medium mb-4">Performance Comparison</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-border">
                      <thead>
                        <tr className="bg-muted">
                          <th className="border border-border p-2 text-left">Version</th>
                          <th className="border border-border p-2 text-center">Avg Time (ms)</th>
                          <th className="border border-border p-2 text-center">Avg Cost ($)</th>
                          <th className="border border-border p-2 text-center">Success Rate (%)</th>
                          <th className="border border-border p-2 text-center">Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedVersions.map(versionId => {
                          const version = versions.find(v => v.id === versionId);
                          if (!version) return null;
                          return (
                            <tr key={version.id}>
                              <td className="border border-border p-2 font-medium">{version.name}</td>
                              <td className="border border-border p-2 text-center">
                                {version.performance?.avgExecutionTime || 'N/A'}
                              </td>
                              <td className="border border-border p-2 text-center">
                                {version.performance?.avgCost?.toFixed(4) || 'N/A'}
                              </td>
                              <td className="border border-border p-2 text-center">
                                {version.performance?.successRate || 'N/A'}
                              </td>
                              <td className="border border-border p-2 text-center text-sm text-muted-foreground">
                                {format(version.createdAt, 'MMM dd, yyyy')}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ab-testing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>A/B Testing</CardTitle>
              <CardDescription>Test different configurations against each other</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {abTests.map(test => (
                <div key={test.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium">{test.name}</h4>
                      <p className="text-sm text-muted-foreground">{test.description}</p>
                    </div>
                    <Button size="sm">
                      <PlayCircle className="w-4 h-4 mr-2" />
                      Run Test
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {test.variants.map((variant, idx) => (
                      <div key={variant.id} className="border rounded p-3">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium text-sm">{variant.name}</h5>
                          <Badge variant="outline">{test.trafficSplit[idx]}%</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {Object.entries(variant.configuration).map(([key, value]) => (
                            <div key={key}>{key}: {String(value)}</div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-3">
                    <p className="text-sm text-muted-foreground">
                      Metrics: {test.metrics.join(', ')}
                    </p>
                  </div>
                </div>
              ))}
              
              <Button variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Create A/B Test
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg Execution Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-2xl font-bold">1.6s</span>
                  <Badge variant="outline" className="text-xs">-12%</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg Cost per Query</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <span className="text-2xl font-bold">$0.005</span>
                  <Badge variant="outline" className="text-xs">-8%</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-muted-foreground" />
                  <span className="text-2xl font-bold">97%</span>
                  <Badge variant="outline" className="text-xs">+2%</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Performance Benchmarks</CardTitle>
              <CardDescription>Track performance metrics over time</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label>Benchmark Date Range</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !benchmarkDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {benchmarkDate ? format(benchmarkDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={benchmarkDate}
                        onSelect={setBenchmarkDate}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <Button>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Run Benchmark
                </Button>
              </div>

              <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
                <p className="text-muted-foreground">Performance chart placeholder</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Test Report Dialog */}
      <Dialog open={showReport} onOpenChange={setShowReport}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Test Report</DialogTitle>
            <DialogDescription>
              Comprehensive analysis of test results and recommendations
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">
                  {testResults.passRate?.toFixed(1) || 0}%
                </div>
                <div className="text-sm text-muted-foreground">Pass Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">
                  {testResults.avgExecutionTime?.toFixed(0) || 0}ms
                </div>
                <div className="text-sm text-muted-foreground">Avg Time</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">
                  ${testResults.totalCost?.toFixed(4) || 0}
                </div>
                <div className="text-sm text-muted-foreground">Total Cost</div>
              </div>
            </div>

            {/* Recommendations */}
            {testResults.recommendations && testResults.recommendations.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">Recommendations</h4>
                <div className="space-y-2">
                  {testResults.recommendations.map((rec: any, idx: number) => (
                    <div key={idx} className={cn(
                      "flex items-start gap-3 p-3 rounded-lg",
                      rec.type === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/20' :
                      rec.type === 'success' ? 'bg-green-50 dark:bg-green-900/20' :
                      'bg-blue-50 dark:bg-blue-900/20'
                    )}>
                      {rec.type === 'warning' && <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />}
                      {rec.type === 'success' && <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />}
                      {rec.type === 'info' && <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5" />}
                      <div>
                        <h5 className="font-medium text-sm">{rec.title}</h5>
                        <p className="text-sm text-muted-foreground">{rec.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
              <Button variant="outline" onClick={() => setShowReport(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}