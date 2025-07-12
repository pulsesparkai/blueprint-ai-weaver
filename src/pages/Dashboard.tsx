import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Edit, Trash2, Play, Crown, User, LogOut, Settings } from 'lucide-react';

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

export default function Dashboard() {
  const [blueprints, setBlueprints] = useState<Blueprint[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchBlueprints();
  }, [user, navigate]);

  const fetchBlueprints = async () => {
    try {
      const { data, error } = await supabase
        .from('blueprints')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setBlueprints(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching blueprints",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
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
          <p className="text-muted-foreground">Loading your blueprints...</p>
        </div>
      </div>
    );
  }

  const freeLimit = 5;
  const isPaidUser = profile?.subscription_tier !== 'free';
  const remainingBlueprints = isPaidUser ? 'Unlimited' : Math.max(0, freeLimit - blueprints.length);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <div className="w-4 h-4 bg-primary-foreground rounded"></div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">ContextForge</h1>
              <p className="text-xs text-muted-foreground">Dashboard</p>
            </div>
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
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Welcome back, {profile?.full_name || user?.email}
          </h2>
          <p className="text-muted-foreground">
            Create and manage your context engineering blueprints
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Blueprints</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{blueprints.length}</div>
            </CardContent>
          </Card>

          <Card className="border border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Remaining</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{remainingBlueprints}</div>
            </CardContent>
          </Card>

          <Card className="border border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Subscription</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={isPaidUser ? "default" : "secondary"}>
                {profile?.subscription_tier || 'Free'}
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Blueprints Section */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-foreground">Your Blueprints</h3>
          <Button onClick={createBlueprint} disabled={!isPaidUser && blueprints.length >= freeLimit}>
            <Plus className="w-4 h-4 mr-2" />
            Create Blueprint
          </Button>
        </div>

        {/* Blueprint Grid */}
        {blueprints.length === 0 ? (
          <Card className="border border-dashed border-border/50 bg-card/20">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Plus className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">No blueprints yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create your first context engineering blueprint to get started
              </p>
              <Button onClick={createBlueprint}>
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Blueprint
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {blueprints.map((blueprint) => (
              <Card key={blueprint.id} className="border border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-elegant transition-all duration-200 group">
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
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{Array.isArray(blueprint.nodes) ? blueprint.nodes.length : 0} nodes</span>
                      <span>•</span>
                      <span>{Array.isArray(blueprint.edges) ? blueprint.edges.length : 0} connections</span>
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

        {/* Upgrade prompt for free users */}
        {!isPaidUser && blueprints.length >= freeLimit && (
          <Card className="mt-8 border border-primary/20 bg-gradient-to-r from-primary/10 to-purple-500/10">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Crown className="w-8 h-8 text-primary" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground mb-1">Upgrade to Pro</h3>
                  <p className="text-muted-foreground">
                    You've reached the free tier limit. Upgrade to create unlimited blueprints and access advanced features.
                  </p>
                </div>
                <Button>
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