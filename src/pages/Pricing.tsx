import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { 
  Check, X, Sparkles, Crown, Building, ArrowRight, Star,
  Users, Zap, Shield, Headphones, Globe, Database
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Pricing = () => {
  const navigate = useNavigate();
  const [isYearly, setIsYearly] = useState(false);

  const plans = [
    {
      name: "Free",
      description: "Perfect for getting started",
      price: { monthly: 0, yearly: 0 },
      badge: null,
      icon: <Sparkles className="w-6 h-6" />,
      features: [
        { name: "3 pipelines", included: true },
        { name: "1,000 executions/month", included: true },
        { name: "Community support", included: true },
        { name: "Basic integrations", included: true },
        { name: "Public templates", included: true },
        { name: "Real-time collaboration", included: false },
        { name: "Priority support", included: false },
        { name: "Advanced analytics", included: false },
        { name: "Custom integrations", included: false },
        { name: "SOC 2 compliance", included: false }
      ],
      cta: "Get Started Free",
      popular: false
    },
    {
      name: "Pro",
      description: "For growing teams and businesses",
      price: { monthly: 49, yearly: 39 },
      badge: "Most Popular",
      icon: <Crown className="w-6 h-6" />,
      features: [
        { name: "Unlimited pipelines", included: true },
        { name: "50,000 executions/month", included: true },
        { name: "Priority support", included: true },
        { name: "All integrations", included: true },
        { name: "Real-time collaboration", included: true },
        { name: "Advanced analytics", included: true },
        { name: "Custom templates", included: true },
        { name: "Team management", included: true },
        { name: "Custom integrations", included: false },
        { name: "SOC 2 compliance", included: false }
      ],
      cta: "Start Pro Trial",
      popular: true
    },
    {
      name: "Enterprise",
      description: "For large organizations",
      price: { monthly: "Custom", yearly: "Custom" },
      badge: "Contact Sales",
      icon: <Building className="w-6 h-6" />,
      features: [
        { name: "Unlimited everything", included: true },
        { name: "SLA support", included: true },
        { name: "Private cloud deployment", included: true },
        { name: "Custom integrations", included: true },
        { name: "Security audit", included: true },
        { name: "SOC 2 compliance", included: true },
        { name: "Multi-region deployment", included: true },
        { name: "Dedicated support manager", included: true },
        { name: "Custom training", included: true },
        { name: "Volume discounts", included: true }
      ],
      cta: "Contact Sales",
      popular: false
    }
  ];

  const additionalFeatures = [
    {
      category: "AI Models",
      icon: <Zap className="w-5 h-5" />,
      items: ["GPT-4, Claude, Gemini", "Custom model endpoints", "Model comparison tools", "Cost optimization"]
    },
    {
      category: "Security",
      icon: <Shield className="w-5 h-5" />,
      items: ["SOC 2 Type II", "GDPR compliance", "Data encryption", "Audit logs"]
    },
    {
      category: "Support",
      icon: <Headphones className="w-5 h-5" />,
      items: ["24/7 chat support", "Video onboarding", "Custom training", "Dedicated success manager"]
    },
    {
      category: "Infrastructure",
      icon: <Globe className="w-5 h-5" />,
      items: ["99.9% uptime SLA", "Global CDN", "Auto-scaling", "Multi-region deployment"]
    }
  ];

  const faqs = [
    {
      question: "Can I change my plan anytime?",
      answer: "Yes, you can upgrade or downgrade your plan at any time. Changes are prorated and take effect immediately."
    },
    {
      question: "What happens if I exceed my execution limit?",
      answer: "We'll notify you when you're approaching your limit. You can upgrade your plan or purchase additional executions."
    },
    {
      question: "Do you offer refunds?",
      answer: "Yes, we offer a 30-day money-back guarantee for all paid plans. No questions asked."
    },
    {
      question: "Is there a free trial for Pro?",
      answer: "Yes, you get a 14-day free trial of Pro features. No credit card required to start."
    },
    {
      question: "What's included in Enterprise support?",
      answer: "Enterprise customers get dedicated support managers, priority response times, and custom training sessions."
    }
  ];

  const getPrice = (plan: any) => {
    if (typeof plan.price.monthly === 'string') return plan.price.monthly;
    return isYearly ? plan.price.yearly : plan.price.monthly;
  };

  const getSavings = (plan: any) => {
    if (typeof plan.price.monthly === 'string') return 0;
    return plan.price.monthly * 12 - plan.price.yearly * 12;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">PulseSpark.ai</span>
            </div>
            
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate('/')}>
                Back to Home
              </Button>
              <Button onClick={() => navigate('/auth')} className="bg-gradient-primary">
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold mb-6">
          Simple, transparent pricing
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-12">
          Choose the plan that fits your needs. Start free, upgrade when you're ready.
        </p>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-16">
          <span className={`text-sm ${!isYearly ? 'text-foreground' : 'text-muted-foreground'}`}>
            Monthly
          </span>
          <Switch checked={isYearly} onCheckedChange={setIsYearly} />
          <span className={`text-sm ${isYearly ? 'text-foreground' : 'text-muted-foreground'}`}>
            Yearly
          </span>
          <Badge className="bg-primary/10 text-primary border-primary/20">
            Save 20%
          </Badge>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="container mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <Card key={index} className={`relative ${plan.popular ? 'border-primary/50 shadow-elegant scale-105' : 'border-border/50'} bg-card/50 backdrop-blur-sm transition-all duration-300`}>
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">
                    {plan.badge}
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-8">
                <div className="w-12 h-12 rounded-lg bg-gradient-primary/10 flex items-center justify-center mx-auto mb-4">
                  {plan.icon}
                </div>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription className="text-base">{plan.description}</CardDescription>
                
                <div className="mt-6">
                  <div className="text-4xl font-bold">
                    {typeof getPrice(plan) === 'string' ? (
                      getPrice(plan)
                    ) : (
                      <>
                        ${getPrice(plan)}
                        <span className="text-lg text-muted-foreground font-normal">
                          /{isYearly ? 'year' : 'month'}
                        </span>
                      </>
                    )}
                  </div>
                  {isYearly && typeof plan.price.monthly === 'number' && plan.price.monthly > 0 && (
                    <div className="text-sm text-muted-foreground mt-1">
                      Save ${getSavings(plan)} per year
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                <Button 
                  className={`w-full mb-8 ${plan.popular ? 'bg-gradient-primary' : ''}`}
                  variant={plan.popular ? 'default' : 'outline'}
                  onClick={() => plan.name === 'Enterprise' ? navigate('/support') : navigate('/auth')}
                >
                  {plan.cta}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>

                <div className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-center gap-3">
                      {feature.included ? (
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      ) : (
                        <X className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      )}
                      <span className={`text-sm ${feature.included ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {feature.name}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Additional Features */}
      <section className="container mx-auto px-6 py-20 bg-muted/20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-6">Everything you need to succeed</h2>
          <p className="text-xl text-muted-foreground">
            All plans include our core features and integrations
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {additionalFeatures.map((feature, index) => (
            <Card key={index} className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-primary/10 flex items-center justify-center">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-lg">{feature.category}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {feature.items.map((item, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-6">Frequently asked questions</h2>
          <p className="text-xl text-muted-foreground">
            Can't find the answer you're looking for? Contact our support team.
          </p>
        </div>

        <div className="max-w-3xl mx-auto space-y-8">
          {faqs.map((faq, index) => (
            <Card key={index} className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg">{faq.question}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  {faq.answer}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <Button variant="outline" onClick={() => navigate('/support')}>
            Contact Support
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-20">
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-purple-500/5 backdrop-blur-sm">
          <CardContent className="p-16 text-center">
            <h2 className="text-4xl font-bold mb-6">
              Ready to get started?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join thousands of developers building AI workflows with PulseSpark.ai
            </p>
            <Button size="lg" onClick={() => navigate('/auth')} className="bg-gradient-primary">
              Start Building Free
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default Pricing;