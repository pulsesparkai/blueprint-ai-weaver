import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  DollarSign, 
  Clock, 
  Target,
  BarChart3,
  Activity,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface MetricsData {
  tokenSavings: Array<{ date: string; savings: number; cost: number }>;
  optimizationTrends: Array<{ date: string; performance: number; efficiency: number }>;
  usageStats: Array<{ category: string; count: number; color: string }>;
  recentActivity: Array<{ type: string; value: number; change: number }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export function MetricsOverview() {
  const [metricsData, setMetricsData] = useState<MetricsData>({
    tokenSavings: [
      { date: '2024-01-01', savings: 12, cost: 45 },
      { date: '2024-01-02', savings: 18, cost: 42 },
      { date: '2024-01-03', savings: 25, cost: 38 },
      { date: '2024-01-04', savings: 32, cost: 35 },
      { date: '2024-01-05', savings: 28, cost: 37 },
      { date: '2024-01-06', savings: 35, cost: 32 },
      { date: '2024-01-07', savings: 42, cost: 28 },
    ],
    optimizationTrends: [
      { date: '2024-01-01', performance: 65, efficiency: 58 },
      { date: '2024-01-02', performance: 68, efficiency: 62 },
      { date: '2024-01-03', performance: 72, efficiency: 68 },
      { date: '2024-01-04', performance: 75, efficiency: 72 },
      { date: '2024-01-05', performance: 78, efficiency: 75 },
      { date: '2024-01-06', performance: 82, efficiency: 78 },
      { date: '2024-01-07', performance: 85, efficiency: 82 },
    ],
    usageStats: [
      { category: 'Simulations', count: 42, color: COLORS[0] },
      { category: 'Optimizations', count: 18, color: COLORS[1] },
      { category: 'Exports', count: 8, color: COLORS[2] },
      { category: 'Templates', count: 12, color: COLORS[3] },
    ],
    recentActivity: [
      { type: 'Token Savings', value: 42, change: 12 },
      { type: 'Avg Response Time', value: 1.2, change: -8 },
      { type: 'Success Rate', value: 98.5, change: 3 },
      { type: 'Cost Per Request', value: 0.03, change: -15 },
    ],
  });

  const [isLoading, setIsLoading] = useState(false);

  const fetchMetrics = async () => {
    setIsLoading(true);
    try {
      // Fetch real metrics from Supabase
      const { data: simulations } = await supabase
        .from('simulation_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      const { data: optimizations } = await supabase
        .from('optimization_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      // Process and aggregate data
      // This would include real calculations based on the data
      console.log('Fetched metrics:', { simulations, optimizations });
      
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const formatCurrency = (value: number) => `$${value.toFixed(2)}`;
  const formatPercentage = (value: number) => `${value}%`;

  return (
    <div className="metrics-overview space-y-6">
      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricsData.recentActivity.map((metric, index) => (
          <Card key={metric.type}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.type}</CardTitle>
              {index === 0 && <Zap className="h-4 w-4 text-muted-foreground" />}
              {index === 1 && <Clock className="h-4 w-4 text-muted-foreground" />}
              {index === 2 && <Target className="h-4 w-4 text-muted-foreground" />}
              {index === 3 && <DollarSign className="h-4 w-4 text-muted-foreground" />}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {index === 1 ? `${metric.value}s` : 
                 index === 2 ? `${metric.value}%` :
                 index === 3 ? formatCurrency(metric.value) :
                 metric.value}
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {metric.change > 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
                <span className={metric.change > 0 ? 'text-green-500' : 'text-red-500'}>
                  {Math.abs(metric.change)}%
                </span>
                from last week
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <Tabs defaultValue="savings" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="savings">Token Savings</TabsTrigger>
          <TabsTrigger value="optimization">Optimization</TabsTrigger>
          <TabsTrigger value="usage">Usage Stats</TabsTrigger>
        </TabsList>

        <TabsContent value="savings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Token Savings & Cost Trends
              </CardTitle>
              <CardDescription>
                Track your token efficiency and cost reduction over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={metricsData.tokenSavings}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    formatter={(value: number, name: string) => [
                      name === 'cost' ? formatCurrency(value) : `${value}%`,
                      name === 'cost' ? 'Cost ($)' : 'Savings (%)'
                    ]}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="savings" 
                    stroke="#8884d8" 
                    name="Token Savings (%)"
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="cost" 
                    stroke="#82ca9d" 
                    name="Cost ($)"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="optimization" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Performance & Efficiency Trends
              </CardTitle>
              <CardDescription>
                Monitor optimization improvements across your pipelines
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={metricsData.optimizationTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    formatter={(value: number, name: string) => [`${value}%`, name]}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="performance"
                    stackId="1"
                    stroke="#8884d8"
                    fill="#8884d8"
                    name="Performance Score"
                  />
                  <Area
                    type="monotone"
                    dataKey="efficiency"
                    stackId="2"
                    stroke="#82ca9d"
                    fill="#82ca9d"
                    name="Efficiency Score"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Usage Distribution</CardTitle>
                <CardDescription>
                  Breakdown of your platform activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={metricsData.usageStats}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {metricsData.usageStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Activity Summary</CardTitle>
                <CardDescription>
                  Recent activity across all features
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {metricsData.usageStats.map((stat, index) => (
                    <div key={stat.category} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: stat.color }}
                        />
                        <span className="text-sm font-medium">{stat.category}</span>
                      </div>
                      <Badge variant="secondary">{stat.count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}