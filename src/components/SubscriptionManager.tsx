import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  CreditCard, 
  Crown, 
  Star, 
  Zap, 
  Check, 
  ExternalLink,
  TrendingUp,
  DollarSign,
  Calendar,
  AlertTriangle
} from 'lucide-react';

interface UsageData {
  usage: Record<string, { quantity: number; cost_cents: number }>;
  totalCostUSD: number;
  period: {
    start: string;
    end: string;
  };
}

const SUBSCRIPTION_TIERS = {
  free: {
    name: 'Free',
    price: 0,
    features: [
      '5 blueprints',
      '100 API calls/month',
      'Basic templates',
      'Community support'
    ],
    limits: {
      blueprints: 5,
      api_calls: 100,
      storage_mb: 100
    },
    icon: Star,
    color: 'bg-gray-100 text-gray-800'
  },
  pro: {
    name: 'Pro',
    price: 29,
    features: [
      'Unlimited blueprints',
      '10,000 API calls/month',
      'Advanced templates',
      'Team collaboration',
      'Priority support',
      'Advanced analytics'
    ],
    limits: {
      blueprints: -1, // unlimited
      api_calls: 10000,
      storage_mb: 10000
    },
    icon: Zap,
    color: 'bg-blue-100 text-blue-800'
  },
  enterprise: {
    name: 'Enterprise',
    price: 99,
    features: [
      'Everything in Pro',
      'Unlimited API calls',
      'Custom integrations',
      'Dedicated support',
      'SLA guarantee',
      'Advanced security',
      'Custom deployment'
    ],
    limits: {
      blueprints: -1,
      api_calls: -1,
      storage_mb: -1
    },
    icon: Crown,
    color: 'bg-purple-100 text-purple-800'
  }
};

export default function SubscriptionManager() {
  const { subscription, currentTeam, refreshSubscription } = useAuth();
  const { toast } = useToast();
  
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUsageData();
  }, [currentTeam]);

  const fetchUsageData = async () => {
    try {
      const { data } = await supabase.functions.invoke('subscription-management', {
        body: {
          action: 'usage-report',
          teamId: currentTeam?.id
        }
      });

      if (data) {
        setUsage(data);
      }
    } catch (error: any) {
      console.error('Error fetching usage data:', error);
    }
  };

  const handleUpgrade = async (tier: 'pro' | 'enterprise') => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('subscription-management', {
        body: {
          action: 'create-checkout',
          tier,
          teamId: currentTeam?.id
        }
      });

      if (error) throw error;

      // Open Stripe checkout in new tab
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManageBilling = async () => {
    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('subscription-management', {
        body: {
          action: 'create-portal',
          teamId: currentTeam?.id
        }
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription?')) return;

    setLoading(true);
    
    try {
      const { error } = await supabase.functions.invoke('subscription-management', {
        body: {
          action: 'cancel',
          teamId: currentTeam?.id
        }
      });

      if (error) throw error;

      toast({
        title: "Subscription cancelled",
        description: "Your subscription will remain active until the end of the current period"
      });

      await refreshSubscription();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const currentTier = subscription?.tier || 'free';
  const currentPlan = SUBSCRIPTION_TIERS[currentTier];

  const getUsagePercentage = (resourceType: string, used: number) => {
    const limit = currentPlan.limits[resourceType as keyof typeof currentPlan.limits];
    if (limit === -1) return 0; // unlimited
    return Math.min((used / limit) * 100, 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Subscription & Billing</h1>
          <p className="text-muted-foreground">
            Manage your subscription and monitor usage
          </p>
        </div>
        
        {subscription && subscription.status === 'active' && (
          <Button variant="outline" onClick={handleManageBilling} disabled={loading}>
            <ExternalLink className="w-4 h-4 mr-2" />
            Manage Billing
          </Button>
        )}
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Current Plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center">
                <currentPlan.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">{currentPlan.name}</h3>
                <p className="text-muted-foreground">
                  ${currentPlan.price}/month
                  {subscription?.cancel_at_period_end && (
                    <span className="ml-2 text-orange-600">
                      (Cancels {subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString() : 'soon'})
                    </span>
                  )}
                </p>
              </div>
            </div>
            
            <Badge className={currentPlan.color}>
              {currentPlan.name}
            </Badge>
          </div>

          {subscription && subscription.status === 'active' && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between text-sm">
                <span>Current period:</span>
                <span>
                  {subscription.current_period_end ? 
                    `Renews ${new Date(subscription.current_period_end).toLocaleDateString()}` : 
                    'Active'
                  }
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage Overview */}
      {usage && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Usage This Month
            </CardTitle>
            <CardDescription>
              {new Date(usage.period.start).toLocaleDateString()} - {new Date(usage.period.end).toLocaleDateString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* API Calls */}
            {usage.usage.api_call && (
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>API Calls</span>
                  <span>
                    {usage.usage.api_call.quantity} / {currentPlan.limits.api_calls === -1 ? '∞' : currentPlan.limits.api_calls}
                  </span>
                </div>
                <Progress value={getUsagePercentage('api_calls', usage.usage.api_call.quantity)} />
              </div>
            )}

            {/* Storage */}
            {usage.usage.storage && (
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Storage</span>
                  <span>
                    {Math.round(usage.usage.storage.quantity / 1024 / 1024)}MB / {currentPlan.limits.storage_mb === -1 ? '∞' : currentPlan.limits.storage_mb}MB
                  </span>
                </div>
                <Progress value={getUsagePercentage('storage_mb', usage.usage.storage.quantity / 1024 / 1024)} />
              </div>
            )}

            {/* Total Cost */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                <span className="font-medium">Total Usage Cost</span>
              </div>
              <span className="text-lg font-semibold">
                ${usage.totalCostUSD.toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upgrade Plans */}
      {currentTier !== 'enterprise' && (
        <div className="grid md:grid-cols-2 gap-6">
          {Object.entries(SUBSCRIPTION_TIERS)
            .filter(([tier]) => tier !== currentTier)
            .map(([tier, plan]) => (
              <Card key={tier} className={tier === 'enterprise' ? 'border-primary' : ''}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <plan.icon className="w-5 h-5" />
                    {plan.name}
                    {tier === 'enterprise' && (
                      <Badge variant="secondary">Most Popular</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    <span className="text-2xl font-bold">${plan.price}</span>/month
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-4">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-600" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  
                  <Button 
                    className="w-full" 
                    onClick={() => handleUpgrade(tier as 'pro' | 'enterprise')}
                    disabled={loading}
                  >
                    {loading ? 'Processing...' : `Upgrade to ${plan.name}`}
                  </Button>
                </CardContent>
              </Card>
            ))}
        </div>
      )}

      {/* Cancel Subscription */}
      {subscription && subscription.status === 'active' && !subscription.cancel_at_period_end && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Cancel Subscription
            </CardTitle>
            <CardDescription>
              Cancel your subscription. You'll retain access until the end of your current billing period.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="destructive" 
              onClick={handleCancelSubscription}
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Cancel Subscription'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}