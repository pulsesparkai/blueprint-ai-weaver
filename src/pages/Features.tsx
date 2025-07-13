import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Workflow, Brain, Network, Users, Zap, TrendingUp, Shield, Clock,
  Code2, Database, Globe, BarChart3, Bot, Layers, CheckCircle,
  ArrowRight, Play, Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Features = () => {
  const navigate = useNavigate();

  const features = [
    {
      category: "Visual Building",
      icon: <Workflow className="w-8 h-8" />,
      title: "Drag & Drop Pipeline Builder",
      description: "Create complex AI workflows without writing a single line of code using our intuitive visual interface.",
      benefits: ["No coding required", "Real-time preview", "Template library", "Version control"],
      demo: "/demo/pipeline-builder"
    },
    {
      category: "AI Models",
      icon: <Brain className="w-8 h-8" />,
      title: "Multi-LLM Support",
      description: "Connect to any AI model including GPT-4, Claude, Gemini, and open-source alternatives.",
      benefits: ["20+ AI models", "Model comparison", "Cost optimization", "Fallback chains"],
      demo: "/demo/llm-comparison"
    },
    {
      category: "Integrations", 
      icon: <Network className="w-8 h-8" />,
      title: "40+ Pre-built Connectors",
      description: "Seamlessly integrate with databases, APIs, and business tools through our extensive connector library.",
      benefits: ["REST/GraphQL APIs", "Database connections", "Cloud storage", "Business apps"],
      demo: "/demo/integrations"
    },
    {
      category: "Collaboration",
      icon: <Users className="w-8 h-8" />,
      title: "Real-time Collaboration",
      description: "Work together with your team using live cursors, comments, and shared workspaces.",
      benefits: ["Live cursors", "Team comments", "Role permissions", "Activity history"],
      demo: "/demo/collaboration"
    },
    {
      category: "Deployment",
      icon: <Zap className="w-8 h-8" />,
      title: "One-Click Deploy",
      description: "Deploy your AI pipelines to any cloud platform or export as Python, Docker, or API endpoints.",
      benefits: ["Multiple export formats", "Cloud deployment", "Auto-scaling", "Monitoring"],
      demo: "/demo/deployment"
    },
    {
      category: "Optimization",
      icon: <TrendingUp className="w-8 h-8" />,
      title: "Smart Performance Optimization",
      description: "Automatically optimize token usage, reduce costs, and improve response times with AI-powered insights.",
      benefits: ["Token optimization", "Cost reduction", "Performance metrics", "Auto-tuning"],
      demo: "/demo/optimization"
    }
  ];

  const enterpriseFeatures = [
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Enterprise Security",
      description: "SOC 2 compliance, SSO, audit logs, and private cloud deployment"
    },
    {
      icon: <Database className="w-6 h-6" />,
      title: "Custom Data Sources",
      description: "Connect to proprietary databases and internal APIs with custom connectors"
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: "Multi-region Deployment",
      description: "Deploy across multiple regions for compliance and performance"
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "Advanced Analytics",
      description: "Detailed usage analytics, cost tracking, and performance monitoring"
    }
  ];

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
        <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-2 mb-8">
          <Sparkles className="w-4 h-4 mr-2" />
          Powerful Features for Modern AI Development
        </Badge>

        <h1 className="text-5xl md:text-6xl font-bold mb-6">
          Everything you need to build
          <span className="block text-transparent bg-gradient-to-r from-primary via-purple-500 to-primary bg-clip-text">
            production-ready AI workflows
          </span>
        </h1>

        <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-12">
          From simple chatbots to complex multi-step reasoning chains, PulseSpark.ai provides 
          all the tools you need to create, test, and deploy AI applications at scale.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button size="lg" onClick={() => navigate('/auth')} className="bg-gradient-primary">
            Start Building Free
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          <Button size="lg" variant="outline">
            <Play className="w-5 h-5 mr-2" />
            Watch Demo
          </Button>
        </div>
      </section>

      {/* Core Features */}
      <section className="container mx-auto px-6 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {features.map((feature, index) => (
            <Card key={index} className="border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-elegant transition-all duration-300">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-xl bg-gradient-primary/10 flex items-center justify-center flex-shrink-0">
                    {feature.icon}
                  </div>
                  <div className="flex-1">
                    <Badge variant="secondary" className="mb-3">{feature.category}</Badge>
                    <CardTitle className="text-2xl mb-3">{feature.title}</CardTitle>
                    <CardDescription className="text-base leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {feature.benefits.map((benefit, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">{benefit}</span>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full">
                  View Demo
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Enterprise Features */}
      <section className="container mx-auto px-6 py-20 bg-muted/20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-6">Enterprise-Grade Security & Scale</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Built for organizations that need advanced security, compliance, and scalability features.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {enterpriseFeatures.map((feature, index) => (
            <Card key={index} className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-primary/10 flex items-center justify-center">
                    {feature.icon}
                  </div>
                  <div>
                    <CardTitle className="mb-2">{feature.title}</CardTitle>
                    <CardDescription>{feature.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <Button size="lg" variant="outline">
            Contact Sales
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-20">
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-purple-500/5 backdrop-blur-sm">
          <CardContent className="p-16 text-center">
            <h2 className="text-4xl font-bold mb-6">
              Ready to transform your AI development?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join thousands of developers building the future with PulseSpark.ai
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

export default Features;