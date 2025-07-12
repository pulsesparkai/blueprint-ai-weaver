import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Crown, 
  Clock, 
  Zap, 
  TrendingUp, 
  Calendar, 
  CreditCard, 
  Settings,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Download
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface UsageStats {
  simulations: number;
  optimizations: number;
  exports: number;
  totalTokens: number;
  costSaved: number;
}

interface SubscriptionInfo {
  tier: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'trial' | 'expired' | 'cancelled';
  trialEndDate?: Date;
  nextBillingDate?: Date;
  monthlyUsage: UsageStats;
  yearlyUsage: UsageStats;
}

export default function Billing() {
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo>({
    tier: 'free',
    status: 'trial',
    trialEndDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
    nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    monthlyUsage: {
      simulations: 45,
      optimizations: 12,
      exports: 6,
      totalTokens: 125000,
      costSaved: 23.45,
    },
    yearlyUsage: {
      simulations: 450,
      optimizations: 120,
      exports: 60,
      totalTokens: 1250000,
      costSaved: 234.50,
    },
  });

  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const trialDaysLeft = subscriptionInfo.trialEndDate 
    ? Math.ceil((subscriptionInfo.trialEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  const handleUpgrade = async (planType: 'pro' | 'enterprise') => {
    setIsLoading(true);
    try {
      // Create Stripe checkout session
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { planType }
      });

      if (error) throw error;

      // Open Stripe checkout in new tab
      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      toast({
        title: 'Error',
        description: 'Unable to start checkout process. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) throw error;
      
      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      toast({
        title: 'Error',
        description: 'Unable to open subscription management. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const PricingCard = ({ 
    title, 
    price, 
    period, 
    features, 
    current, 
    recommended, 
    onUpgrade 
  }: {
    title: string;
    price: string;
    period: string;
    features: string[];
    current?: boolean;
    recommended?: boolean;
    onUpgrade?: () => void;
  }) => (
    <Card className={`relative ${recommended ? 'border-primary shadow-lg' : ''} ${current ? 'bg-primary/5' : ''}`}>
      {recommended && (
        <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-primary">
          Recommended
        </Badge>
      )}
      {current && (
        <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-green-500">
          Current Plan
        </Badge>
      )}
      
      <CardHeader className="text-center pb-2">
        <CardTitle className="flex items-center justify-center gap-2">
          {title === 'Enterprise' && <Crown className="w-5 h-5 text-amber-500" />}
          {title === 'Pro' && <Zap className="w-5 h-5 text-blue-500" />}
          {title}
        </CardTitle>
        <div className="text-3xl font-bold">
          {price}
          <span className="text-sm font-normal text-muted-foreground">/{period}</span>
        </div>
      </CardHeader>
      
      <CardContent className="pt-4">
        <ul className="space-y-2 mb-6">
          {features.map((feature, index) => (
            <li key={index} className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
              {feature}
            </li>
          ))}
        </ul>
        
        {!current && onUpgrade && (
          <Button 
            className="w-full" 
            onClick={onUpgrade}
            disabled={isLoading}
            variant={recommended ? 'default' : 'outline'}
          >
            {recommended && <Crown className="w-4 h-4 mr-2" />}
            {title === 'Pro' ? 'Start Free Trial' : 'Start Enterprise'}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
        
        {current && (
          <Button variant="outline" className="w-full" onClick={handleManageSubscription}>
            <Settings className="w-4 h-4 mr-2" />
            Manage Subscription
          </Button>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Billing & Subscription</h1>
        <p className="text-muted-foreground">
          Manage your subscription and track your usage
        </p>
      </div>

      {/* Trial Status Banner */}
      {subscriptionInfo.status === 'trial' && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="flex items-center gap-4 p-4">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <div className="flex-1">
              <p className="font-medium text-amber-800 dark:text-amber-200">
                Free Trial Active - {trialDaysLeft} days remaining
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-300">
                Your trial ends on {subscriptionInfo.trialEndDate?.toLocaleDateString()}. 
                Upgrade to Pro to continue unlimited access.
              </p>
            </div>
            <Button 
              onClick={() => handleUpgrade('pro')}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Upgrade Now
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="usage">Usage Stats</TabsTrigger>
          <TabsTrigger value="plans">Plans & Pricing</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Current Subscription */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Current Subscription
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium capitalize">{subscriptionInfo.tier} Plan</p>
                  <p className="text-sm text-muted-foreground">
                    {subscriptionInfo.status === 'trial' ? 'Free Trial' : 'Active Subscription'}
                  </p>
                </div>
                <Badge variant={subscriptionInfo.tier === 'free' ? 'secondary' : 'default'}>
                  {subscriptionInfo.tier === 'free' ? 'Free' : subscriptionInfo.tier === 'pro' ? '$19/month' : '$99/month'}
                </Badge>
              </div>
              
              {subscriptionInfo.nextBillingDate && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  Next billing: {subscriptionInfo.nextBillingDate.toLocaleDateString()}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium">Simulations</span>
                </div>
                <p className="text-2xl font-bold mt-1">{subscriptionInfo.monthlyUsage.simulations}</p>
                <p className="text-xs text-muted-foreground">This month</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium">Optimizations</span>
                </div>
                <p className="text-2xl font-bold mt-1">{subscriptionInfo.monthlyUsage.optimizations}</p>
                <p className="text-xs text-muted-foreground">This month</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium">Exports</span>
                </div>
                <p className="text-2xl font-bold mt-1">{subscriptionInfo.monthlyUsage.exports}</p>
                <p className="text-xs text-muted-foreground">This month</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-medium">Cost Saved</span>
                </div>
                <p className="text-2xl font-bold mt-1">${subscriptionInfo.monthlyUsage.costSaved}</p>
                <p className="text-xs text-muted-foreground">This month</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="usage" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Usage Statistics</CardTitle>
              <CardDescription>
                Detailed breakdown of your platform usage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Monthly Usage */}
                <div className="space-y-4">
                  <h3 className="font-medium">This Month</h3>
                  
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Simulations</span>
                        <span>{subscriptionInfo.monthlyUsage.simulations}/100</span>
                      </div>
                      <Progress value={(subscriptionInfo.monthlyUsage.simulations / 100) * 100} />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Optimizations</span>
                        <span>{subscriptionInfo.monthlyUsage.optimizations}/25</span>
                      </div>
                      <Progress value={(subscriptionInfo.monthlyUsage.optimizations / 25) * 100} />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Exports</span>
                        <span>{subscriptionInfo.monthlyUsage.exports}/10</span>
                      </div>
                      <Progress value={(subscriptionInfo.monthlyUsage.exports / 10) * 100} />
                    </div>
                  </div>
                </div>

                {/* Yearly Usage */}
                <div className="space-y-4">
                  <h3 className="font-medium">This Year</h3>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Total Simulations</span>
                      <span className="font-medium">{subscriptionInfo.yearlyUsage.simulations.toLocaleString()}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm">Total Optimizations</span>
                      <span className="font-medium">{subscriptionInfo.yearlyUsage.optimizations.toLocaleString()}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-sm">Total Exports</span>
                      <span className="font-medium">{subscriptionInfo.yearlyUsage.exports.toLocaleString()}</span>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex justify-between">
                      <span className="text-sm">Total Cost Saved</span>
                      <span className="font-medium text-green-600">${subscriptionInfo.yearlyUsage.costSaved}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <PricingCard
              title="Free Trial"
              price="$0"
              period="3 days"
              current={subscriptionInfo.tier === 'free' && subscriptionInfo.status === 'trial'}
              features={[
                'Full access to all features',
                'Unlimited simulations',
                'Advanced optimization',
                'All export formats',
                'Template gallery access',
                'Email support'
              ]}
            />
            
            <PricingCard
              title="Pro"
              price="$19"
              period="month"
              recommended={true}
              current={subscriptionInfo.tier === 'pro'}
              features={[
                'Everything in Free Trial',
                'Unlimited blueprints',
                'Advanced nodes',
                'Docker export',
                'Collaboration features',
                'Version control',
                'Priority support',
                'Usage analytics'
              ]}
              onUpgrade={() => handleUpgrade('pro')}
            />
            
            <PricingCard
              title="Enterprise"
              price="$99"
              period="month"
              current={subscriptionInfo.tier === 'enterprise'}
              features={[
                'Everything in Pro',
                'Team management',
                'Custom nodes',
                'On-premise deployment',
                'SLA guarantee',
                'Dedicated support',
                'Custom integrations',
                'Advanced security'
              ]}
              onUpgrade={() => handleUpgrade('enterprise')}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}