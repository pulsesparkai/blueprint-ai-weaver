import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { format, subDays, startOfDay } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Play, 
  Crown, 
  LogOut, 
  Settings,
  BarChart3,
  Clock,
  Zap,
  TrendingUp,
  Activity,
  Layers,
  Code2,
  MessageSquare,
  FileText,
  Search,
  Bot,
  Calendar,
  Target,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Home,
  Blocks,
  Key,
  Database
} from 'lucide-react';

interface Blueprint {
  id: string;
  title: string;
  description: string;
  nodes: any;
  edges: any;
  thumbnail: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
  is_public: boolean;
}

interface ExecutionLog {
  id: string;
  blueprint_id: string;
  executed_at: string;
  execution_results: any;
  input_data: any;
  session_id: string;
}

interface DashboardStats {
  totalBlueprints: number;
  executionsToday: number;
  tokensUsed: number;
  totalCost: number;
  avgExecutionTime: number;
  successRate: number;
}

const FEATURED_TEMPLATES = [
  {
    id: 'customer-support-bot',
    name: 'Customer Support Bot',
    description: 'AI-powered customer support with context-aware responses',
    icon: MessageSquare,
    category: 'Customer Service',
    difficulty: 'Beginner',
    estimatedTime: '15 min'
  },
  {
    id: 'document-qa-system',
    name: 'Document QA System',
    description: 'Question-answering system for large documents',
    icon: FileText,
    category: 'Document Processing',
    difficulty: 'Intermediate',
    estimatedTime: '25 min'
  },
  {
    id: 'code-assistant',
    name: 'Code Assistant',
    description: 'AI coding assistant with documentation context',
    icon: Code2,
    category: 'Development',
    difficulty: 'Advanced',
    estimatedTime: '30 min'
  },
  {
    id: 'research-assistant',
    name: 'Research Assistant',
    description: 'Search, summarize, and synthesize information',
    icon: Search,
    category: 'Research',
    difficulty: 'Intermediate',
    estimatedTime: '20 min'
  }
];

export default function Dashboard() {
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [recentExecutions, setRecentExecutions] = useState<ExecutionLog[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalBlueprints: 0,
    executionsToday: 0,
    tokensUsed: 0,
    totalCost: 0,
    avgExecutionTime: 0,
    successRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadDashboardData();
  }, [user, navigate]);

  const loadDashboardData = async () => {
    try {
      await Promise.all([
        fetchBlueprints(),
        fetchExecutionLogs(),
        fetchStats()
      ]);
    } catch (error: any) {
      toast({
        title: "Error loading dashboard",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchBlueprints = async () => {
    const { data, error } = await supabase
      .from('blueprints')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(6);

    if (error) throw error;
    setBlueprints(data || []);
  };

  const fetchExecutionLogs = async () => {
    const { data, error } = await supabase
      .from('execution_logs')
      .select('*')
      .order('executed_at', { ascending: false })
      .limit(5);

    if (error) throw error;
    setRecentExecutions(data || []);
  };

  const fetchStats = async () => {
    // Mock stats - in real implementation, calculate from actual data
    const mockStats: DashboardStats = {
      totalBlueprints: blueprints.length,
      executionsToday: 24,
      tokensUsed: 145690,
      totalCost: 2.34,
      avgExecutionTime: 1847,
      successRate: 96.8
    };
    setStats(mockStats);
  };

  const createBlueprint = async () => {
    const freeLimit = 5;
    const isPaidUser = profile?.subscription_tier !== 'free';
    
    if (!isPaidUser && blueprints.length >= freeLimit) {
      toast({
        title: "Upgrade Required",
        description: `Free tier is limited to ${freeLimit} blueprints. Upgrade to create unlimited blueprints.`,
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('blueprints')
        .insert({
          user_id: user?.id,
          title: `Blueprint ${blueprints.length + 1}`,
          description: 'A new context engineering blueprint',
          nodes: [],
          edges: []
        })
        .select()
        .single();

      if (error) throw error;
      
      toast({
        title: "Blueprint created",
        description: "Your new blueprint is ready to edit."
      });
      
      navigate(`/editor/${data.id}`);
    } catch (error: any) {
      toast({
        title: "Error creating blueprint",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const deleteBlueprint = async (id: string) => {
    try {
      const { error } = await supabase
        .from('blueprints')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setBlueprints(blueprints.filter(bp => bp.id !== id));
      toast({
        title: "Blueprint deleted",
        description: "The blueprint has been removed."
      });
    } catch (error: any) {
      toast({
        title: "Error deleting blueprint",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const freeLimit = 5;
  const isPaidUser = profile?.subscription_tier !== 'free';
  const remainingBlueprints = isPaidUser ? 'Unlimited' : Math.max(0, freeLimit - blueprints.length);

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <Link to="/dashboard" className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">ContextForge</h1>
                  <p className="text-xs text-muted-foreground">Dashboard</p>
                </div>
              </Link>

              {/* Navigation Links */}
              <nav className="hidden md:flex items-center gap-6">
                <Link 
                  to="/dashboard" 
                  className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
                >
                  <Home className="w-4 h-4" />
                  Dashboard
                </Link>
                <Link 
                  to="/templates" 
                  className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                >
                  <Blocks className="w-4 h-4" />
                  Templates
                </Link>
                <Link 
                  to="/api-keys" 
                  className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                >
                  <Key className="w-4 h-4" />
                  API Keys
                </Link>
                <Link 
                  to="/integrations" 
                  className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                >
                  <Database className="w-4 h-4" />
                  Integrations
                </Link>
                <Link 
                  to="/test-integrations" 
                  className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                >
                  <Zap className="w-4 h-4" />
                  Test APIs
                </Link>
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-accent text-accent-foreground text-sm">
                <Crown className="w-4 h-4" />
                <span className="font-medium">{profile?.subscription_tier || 'Free'} Plan</span>
              </div>
              
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8 animate-fade-in">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Welcome back, {profile?.full_name || user?.email?.split('@')[0]}
          </h2>
          <p className="text-muted-foreground">
            Monitor your pipelines, track performance, and build amazing AI solutions
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 animate-fade-in">
          <Card className="border border-border/50 bg-card/50 backdrop-blur-sm hover-scale">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Total Pipelines
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.totalBlueprints}</div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <TrendingUp className="w-3 h-3" />
                <span>+2 this week</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/50 bg-card/50 backdrop-blur-sm hover-scale">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Executions Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.executionsToday}</div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <TrendingUp className="w-3 h-3" />
                <span>+12% vs yesterday</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/50 bg-card/50 backdrop-blur-sm hover-scale">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Tokens Used
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.tokensUsed.toLocaleString()}</div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <DollarSign className="w-3 h-3" />
                <span>${stats.totalCost.toFixed(2)} cost</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border/50 bg-card/50 backdrop-blur-sm hover-scale">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Target className="w-4 h-4" />
                Success Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stats.successRate}%</div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <CheckCircle className="w-3 h-3" />
                <span>{stats.avgExecutionTime}ms avg</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="animate-fade-in">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="pipelines">Recent Pipelines</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Create New Pipeline CTA */}
            <Card className="border border-primary/20 bg-gradient-to-r from-primary/10 to-purple-500/10 hover-scale">
              <CardContent className="p-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center">
                      <Plus className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-foreground mb-1">
                        Create New Pipeline
                      </h3>
                      <p className="text-muted-foreground">
                        Start building your next AI context engineering solution
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => navigate('/templates')}>
                      Browse Templates
                    </Button>
                    <Button 
                      onClick={createBlueprint} 
                      disabled={!isPaidUser && blueprints.length >= freeLimit}
                      className="bg-gradient-primary hover:bg-gradient-primary/90"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create from Scratch
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Templates */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">Popular Templates</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {FEATURED_TEMPLATES.map((template) => {
                  const IconComponent = template.icon;
                  return (
                    <Card 
                      key={template.id} 
                      className="border border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-elegant transition-all duration-200 cursor-pointer hover-scale"
                      onClick={() => navigate('/templates')}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-8 h-8 rounded-lg bg-gradient-accent flex items-center justify-center">
                            <IconComponent className="w-4 h-4 text-accent-foreground" />
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {template.difficulty}
                          </Badge>
                        </div>
                        <CardTitle className="text-sm font-medium">{template.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xs text-muted-foreground mb-3">{template.description}</p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{template.category}</span>
                          <span>{template.estimatedTime}</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="pipelines" className="space-y-6 mt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Recent Pipelines</h3>
              <Button variant="outline" onClick={() => navigate('/editor')}>
                <Plus className="w-4 h-4 mr-2" />
                New Pipeline
              </Button>
            </div>

            {blueprints.length === 0 ? (
              <Card className="border border-dashed border-border/50 bg-card/20">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Bot className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-2">No pipelines yet</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Create your first context engineering pipeline to get started
                  </p>
                  <Button onClick={createBlueprint}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Pipeline
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {blueprints.map((blueprint) => (
                  <Card 
                    key={blueprint.id} 
                    className="border border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-elegant transition-all duration-200 group hover-scale"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base font-medium text-foreground truncate">
                            {blueprint.title}
                          </CardTitle>
                          <CardDescription className="text-sm text-muted-foreground line-clamp-2">
                            {blueprint.description || 'No description'}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Pipeline Preview */}
                        <div className="h-20 bg-gradient-to-br from-muted to-muted/50 rounded-lg flex items-center justify-center border border-border/30">
                          <div className="text-center text-muted-foreground">
                            <Layers className="w-6 h-6 mx-auto mb-1" />
                            <p className="text-xs">Pipeline Flow</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{Array.isArray(blueprint.nodes) ? blueprint.nodes.length : 0} nodes</span>
                          <span>•</span>
                          <span>{Array.isArray(blueprint.edges) ? blueprint.edges.length : 0} connections</span>
                          <span>•</span>
                          <span>{format(new Date(blueprint.updated_at), 'MMM dd')}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button 
                            size="sm" 
                            className="flex-1"
                            onClick={() => navigate(`/editor/${blueprint.id}`)}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => navigate(`/editor/${blueprint.id}?mode=test`)}
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => deleteBlueprint(blueprint.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="templates" className="space-y-6 mt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Pipeline Templates</h3>
              <Button onClick={() => navigate('/templates')}>
                View All Templates
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {FEATURED_TEMPLATES.map((template) => {
                const IconComponent = template.icon;
                return (
                  <Card 
                    key={template.id} 
                    className="border border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-elegant transition-all duration-200 cursor-pointer hover-scale"
                    onClick={() => navigate('/templates')}
                  >
                    <CardHeader>
                      <div className="flex items-center gap-4 mb-3">
                        <div className="w-12 h-12 rounded-lg bg-gradient-accent flex items-center justify-center">
                          <IconComponent className="w-6 h-6 text-accent-foreground" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              {template.category}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {template.difficulty}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <CardDescription>{template.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{template.estimatedTime} setup</span>
                        <Button size="sm">
                          Use Template
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="activity" className="space-y-6 mt-6">
            <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
            
            <div className="space-y-4">
              {recentExecutions.length === 0 ? (
                <Card className="border border-dashed border-border/50 bg-card/20">
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <Clock className="w-12 h-12 text-muted-foreground mb-3" />
                    <h3 className="text-base font-medium text-foreground mb-1">No recent activity</h3>
                    <p className="text-sm text-muted-foreground">
                      Your pipeline executions will appear here
                    </p>
                  </CardContent>
                </Card>
              ) : (
                recentExecutions.map((execution) => {
                  const blueprint = blueprints.find(bp => bp.id === execution.blueprint_id);
                  return (
                    <Card key={execution.id} className="border border-border/50 bg-card/50">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-accent flex items-center justify-center">
                              <Play className="w-4 h-4 text-accent-foreground" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">
                                {blueprint?.title || 'Unknown Pipeline'}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Executed {format(new Date(execution.executed_at), 'PPp')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Success
                            </Badge>
                            <span className="text-xs text-muted-foreground">1.2s</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Upgrade prompt for free users */}
        {!isPaidUser && blueprints.length >= freeLimit && (
          <Card className="mt-8 border border-primary/20 bg-gradient-to-r from-primary/10 to-purple-500/10 animate-fade-in">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Crown className="w-8 h-8 text-primary" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground mb-1">Upgrade to Pro</h3>
                  <p className="text-muted-foreground">
                    You've reached the free tier limit. Upgrade to create unlimited pipelines and access advanced features.
                  </p>
                </div>
                <Button className="bg-gradient-primary hover:bg-gradient-primary/90">
                  Upgrade Now
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}