import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Sparkles, ArrowRight, Zap, Shield, Layers, Code2, Crown, Star,
  Play, CheckCircle, Users, Building, Database, Cpu, Globe,
  BarChart3, Clock, Workflow, Bot, Brain, Network, TrendingUp
} from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Animated particle network background
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
    }> = [];

    // Create particles
    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 1
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Update and draw particles
      particles.forEach((particle, i) => {
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Bounce off edges
        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;

        // Draw particle
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(59, 130, 246, 0.5)';
        ctx.fill();

        // Draw connections
        particles.slice(i + 1).forEach(otherParticle => {
          const dx = particle.x - otherParticle.x;
          const dy = particle.y - otherParticle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 100) {
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(otherParticle.x, otherParticle.y);
            ctx.strokeStyle = `rgba(59, 130, 246, ${0.3 * (1 - distance / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });

      requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const features = [
    {
      icon: <Workflow className="w-6 h-6" />,
      title: "Visual Pipeline Builder",
      description: "Drag-and-drop interface for building complex AI workflows without writing code"
    },
    {
      icon: <Brain className="w-6 h-6" />,
      title: "Multi-LLM Support",
      description: "Connect GPT-4, Claude, Gemini, and other leading AI models in one platform"
    },
    {
      icon: <Network className="w-6 h-6" />,
      title: "40+ Integrations",
      description: "Connect to databases, APIs, and business tools with pre-built connectors"
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Real-time Collaboration",
      description: "Work together with your team using live cursors and shared workspaces"
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "One-Click Deploy",
      description: "Export to Python, Docker, or deploy directly to cloud platforms"
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: "Smart Optimization",
      description: "Automatically optimize token usage and reduce costs with AI-powered insights"
    }
  ];

  const steps = [
    {
      step: "01",
      title: "Design",
      description: "Drag and drop nodes to build your AI workflow visually",
      icon: <Workflow className="w-8 h-8" />
    },
    {
      step: "02", 
      title: "Test",
      description: "Simulate with real data and optimize performance in real-time",
      icon: <Play className="w-8 h-8" />
    },
    {
      step: "03",
      title: "Deploy",
      description: "Export to any platform or use our hosted solution",
      icon: <Zap className="w-8 h-8" />
    }
  ];

  const useCases = [
    {
      icon: <Bot className="w-8 h-8" />,
      title: "Customer Support Automation",
      description: "Build intelligent chatbots that handle complex customer queries with context awareness",
      link: "/templates/customer-support"
    },
    {
      icon: <Code2 className="w-8 h-8" />,
      title: "Content Generation Pipelines",
      description: "Create automated content workflows for blogs, social media, and marketing materials",
      link: "/templates/content-generation"
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: "Data Analysis Workflows",
      description: "Transform raw data into insights using AI-powered analysis and reporting",
      link: "/templates/data-analysis"
    },
    {
      icon: <Cpu className="w-8 h-8" />,
      title: "Code Generation Tools",
      description: "Build custom coding assistants that understand your codebase and standards",
      link: "/templates/code-generation"
    }
  ];

  const integrationLogos = [
    "OpenAI", "Anthropic", "Google", "Pinecone", "Weaviate", "MongoDB", 
    "PostgreSQL", "Redis", "Stripe", "Slack", "Discord", "GitHub"
  ];

  const stats = [
    { number: "10,000+", label: "Pipelines Created" },
    { number: "1M+", label: "API Calls Processed" },
    { number: "500+", label: "Active Teams" },
    { number: "99.9%", label: "Uptime" }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Animated Background */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none opacity-20 z-0"
        style={{ background: 'transparent' }}
      />

      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/40">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">PulseSpark.ai</span>
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#integrations" className="text-muted-foreground hover:text-foreground transition-colors">Integrations</a>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
              <a href="/docs" className="text-muted-foreground hover:text-foreground transition-colors">Docs</a>
            </div>

            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate('/auth')}>
                Sign In
              </Button>
              <Button onClick={() => navigate('/auth')} className="bg-gradient-primary">
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 container mx-auto px-6 py-20 text-center">
        <div className="max-w-5xl mx-auto space-y-8">
          <Badge className="bg-primary/10 text-primary border-primary/20 px-4 py-2">
            <Sparkles className="w-4 h-4 mr-2" />
            Now with GPT-4 and Claude integration
          </Badge>

          <h1 className="text-6xl md:text-7xl font-bold leading-tight">
            Build Intelligent
            <span className="block text-transparent bg-gradient-to-r from-primary via-purple-500 to-primary bg-clip-text">
              AI Pipelines Visually
            </span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Design, test, and deploy production-ready LLM workflows without writing code. 
            Connect 40+ integrations, collaborate in real-time, and optimize for performance.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button size="lg" onClick={() => navigate('/auth')} className="bg-gradient-primary hover:opacity-90 text-lg px-8 py-6">
              Start Building Free
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-6">
              <Play className="w-5 h-5 mr-2" />
              Watch Demo
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Free tier • No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-blue-500" />
              <span>Your data stays secure</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-500" />
              <span>5-minute setup</span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative z-10 container mx-auto px-6 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">{stat.number}</div>
              <div className="text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Everything you need to build AI workflows
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            From simple chatbots to complex multi-step reasoning chains, PulseSpark.ai provides 
            all the tools you need to create production-ready AI applications.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-elegant transition-all duration-300 hover:scale-105">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-gradient-primary/10 flex items-center justify-center mb-4">
                  {feature.icon}
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="relative z-10 container mx-auto px-6 py-20 bg-muted/20">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            How it works
          </h2>
          <p className="text-xl text-muted-foreground">
            Build powerful AI workflows in three simple steps
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-5xl mx-auto">
          {steps.map((step, index) => (
            <div key={index} className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center mx-auto mb-6">
                {step.icon}
              </div>
              <div className="text-sm font-semibold text-primary mb-2">{step.step}</div>
              <h3 className="text-2xl font-bold mb-4">{step.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Integrations */}
      <section id="integrations" className="relative z-10 container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Connect everything
          </h2>
          <p className="text-xl text-muted-foreground">
            Integrate with your favorite AI models, databases, and business tools
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 mb-12">
          {integrationLogos.map((logo, index) => (
            <div key={index} className="flex items-center justify-center p-6 border border-border/50 rounded-lg bg-card/30 backdrop-blur-sm hover:bg-card/50 transition-colors">
              <span className="text-sm font-medium text-muted-foreground">{logo}</span>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Button variant="outline" size="lg">
            View all integrations
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </section>

      {/* Use Cases */}
      <section className="relative z-10 container mx-auto px-6 py-20 bg-muted/20">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            Built for every use case
          </h2>
          <p className="text-xl text-muted-foreground">
            Start with a template or build from scratch
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {useCases.map((useCase, index) => (
            <Card key={index} className="border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-elegant transition-all duration-300">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-gradient-primary/10 flex items-center justify-center flex-shrink-0">
                    {useCase.icon}
                  </div>
                  <div>
                    <CardTitle className="text-xl mb-2">{useCase.title}</CardTitle>
                    <CardDescription className="text-base">{useCase.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  View Template
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 container mx-auto px-6 py-20">
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-purple-500/5 backdrop-blur-sm">
          <CardContent className="p-16 text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to build smarter AI workflows?
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Join thousands of developers, researchers, and companies building the future with PulseSpark.ai
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-md mx-auto mb-8">
              <Input 
                placeholder="Enter your email" 
                className="flex-1"
                type="email"
              />
              <Button className="bg-gradient-primary px-8">
                Start Free Trial
              </Button>
            </div>
            
            <p className="text-sm text-muted-foreground">
              No credit card required • 7-day free trial • Cancel anytime
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/40 bg-muted/20">
        <div className="container mx-auto px-6 py-16">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold">PulseSpark.ai</span>
              </div>
              <p className="text-muted-foreground mb-6 max-w-md">
                The visual AI pipeline builder that makes complex workflows simple. 
                Build, test, and deploy without writing code.
              </p>
              <div className="flex gap-4">
                <Button variant="outline" size="sm">Twitter</Button>
                <Button variant="outline" size="sm">LinkedIn</Button>
                <Button variant="outline" size="sm">GitHub</Button>
                <Button variant="outline" size="sm">Discord</Button>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a></li>
                <li><a href="/templates" className="hover:text-foreground transition-colors">Templates</a></li>
                <li><a href="/integrations" className="hover:text-foreground transition-colors">Integrations</a></li>
                <li><a href="/changelog" className="hover:text-foreground transition-colors">Changelog</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Developers</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="/docs" className="hover:text-foreground transition-colors">Documentation</a></li>
                <li><a href="/api-docs" className="hover:text-foreground transition-colors">API Reference</a></li>
                <li><a href="/support" className="hover:text-foreground transition-colors">Support</a></li>
                <li><a href="/status" className="hover:text-foreground transition-colors">Status</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="/about" className="hover:text-foreground transition-colors">About</a></li>
                <li><a href="/terms" className="hover:text-foreground transition-colors">Terms</a></li>
                <li><a href="/privacy" className="hover:text-foreground transition-colors">Privacy</a></li>
                <li><a href="/cookies" className="hover:text-foreground transition-colors">Cookies</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border/40 mt-12 pt-8 text-center text-sm text-muted-foreground">
            <p>© 2024 PulseSpark.ai LLC. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;