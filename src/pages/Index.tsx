import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ArrowRight, Zap, Shield, Layers, Code2, Crown, Star } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: <Layers className="w-6 h-6" />,
      title: "Visual Node Editor",
      description: "Drag-and-drop interface for building complex AI context pipelines"
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Real-time Testing",
      description: "Test your blueprints instantly with integrated simulator"
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "LLM Agnostic",
      description: "Works with any LLM provider using your own API keys"
    },
    {
      icon: <Code2 className="w-6 h-6" />,
      title: "Export to Code",
      description: "Generate Python scripts and Dockerfiles from your blueprints"
    }
  ];

  const pricingPlans = [
    {
      name: "Free",
      price: "$0",
      description: "Perfect for getting started",
      features: [
        "Up to 5 blueprints",
        "Basic node types",
        "Community support",
        "Export to Python"
      ],
      cta: "Get Started Free",
      popular: false
    },
    {
      name: "Pro",
      price: "$19",
      description: "For serious context engineers",
      features: [
        "Unlimited blueprints",
        "Advanced node types",
        "Priority support",
        "Export to Docker",
        "Collaboration features",
        "Version control"
      ],
      cta: "Start Pro Trial",
      popular: true
    },
    {
      name: "Enterprise",
      price: "$99",
      description: "For teams and organizations",
      features: [
        "Everything in Pro",
        "Team management",
        "Custom nodes",
        "On-premise deployment",
        "SLA guarantee",
        "Dedicated support"
      ],
      cta: "Contact Sales",
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
      {/* Hero Section */}
      <section className="container mx-auto px-6 py-16 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow">
              <Sparkles className="w-8 h-8 text-primary-foreground" />
            </div>
            <div className="text-left">
              <h1 className="text-4xl font-bold text-foreground">ContextForge</h1>
              <p className="text-lg text-muted-foreground">Visual Context Engineering Platform</p>
            </div>
          </div>

          <h2 className="text-5xl font-bold text-foreground leading-tight">
            Build AI Context Pipelines
            <span className="block text-transparent bg-gradient-primary bg-clip-text">
              Visually
            </span>
          </h2>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Design, test, and deploy complex AI context engineering workflows using our intuitive 
            drag-and-drop interface. No coding required.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button size="lg" onClick={() => navigate('/auth')} className="bg-gradient-primary hover:bg-gradient-primary/90">
              Start Building Free
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/auth')}>
              View Demo
            </Button>
          </div>

          <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
              <span>Free tier available</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span>Your API keys, your data</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h3 className="text-3xl font-bold text-foreground mb-4">
            Everything you need to engineer AI context
          </h3>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From RAG retrievers to memory stores, build sophisticated AI pipelines with ease
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="border border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-elegant transition-all duration-200">
              <CardHeader className="text-center">
                <div className="w-12 h-12 rounded-lg bg-gradient-accent flex items-center justify-center mx-auto mb-4">
                  {feature.icon}
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section className="container mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h3 className="text-3xl font-bold text-foreground mb-4">
            Choose your plan
          </h3>
          <p className="text-lg text-muted-foreground">
            Start free, upgrade when you need more power
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {pricingPlans.map((plan, index) => (
            <Card key={index} className={`relative border ${plan.popular ? 'border-primary shadow-glow' : 'border-border/50'} bg-card/50 backdrop-blur-sm`}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-gradient-primary text-primary-foreground px-4 py-1">
                    <Crown className="w-3 h-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-8">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                <ul className="space-y-3">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-gradient-primary"></div>
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  className={`w-full ${plan.popular ? 'bg-gradient-primary hover:bg-gradient-primary/90' : ''}`}
                  variant={plan.popular ? "default" : "outline"}
                  onClick={() => navigate('/auth')}
                >
                  {plan.cta}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-16 text-center">
        <Card className="border border-primary/20 bg-gradient-to-r from-primary/10 to-purple-500/10 backdrop-blur-sm">
          <CardContent className="p-12">
            <h3 className="text-3xl font-bold text-foreground mb-4">
              Ready to start building?
            </h3>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of developers and researchers who are already using ContextForge 
              to build better AI applications.
            </p>
            <Button size="lg" onClick={() => navigate('/auth')} className="bg-gradient-primary hover:bg-gradient-primary/90">
              Get Started Free
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default Index;
