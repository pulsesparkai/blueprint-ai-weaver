import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BookOpen, 
  Play, 
  Zap, 
  Share, 
  Users, 
  Code, 
  Database,
  ArrowRight,
  CheckCircle,
  Star,
  Clock,
  Shield
} from 'lucide-react';

const features = [
  {
    icon: <Code className="w-8 h-8" />,
    title: 'Visual Pipeline Builder',
    description: 'Drag-and-drop interface for building complex AI workflows without coding.',
    category: 'Core'
  },
  {
    icon: <Zap className="w-8 h-8" />,
    title: 'Smart Optimization',
    description: 'Automatically optimize your pipelines for better performance and lower costs.',
    category: 'AI'
  },
  {
    icon: <Database className="w-8 h-8" />,
    title: 'RAG Integration',
    description: 'Connect to vector databases like Pinecone, FAISS, and ChromaDB.',
    category: 'Data'
  },
  {
    icon: <Share className="w-8 h-8" />,
    title: 'Real-time Collaboration',
    description: 'Work together with your team in real-time with live cursors and comments.',
    category: 'Collaboration',
    tier: 'Pro'
  },
  {
    icon: <Users className="w-8 h-8" />,
    title: 'Team Management',
    description: 'Manage team members, roles, and permissions across your organization.',
    category: 'Enterprise',
    tier: 'Enterprise'
  },
  {
    icon: <Shield className="w-8 h-8" />,
    title: 'Security & Compliance',
    description: 'Enterprise-grade security with encrypted data and audit trails.',
    category: 'Security',
    tier: 'Enterprise'
  }
];

const useCases = [
  {
    title: 'Customer Support Automation',
    description: 'Build intelligent chatbots that can handle customer inquiries with context and memory.',
    tags: ['RAG', 'Memory', 'Templates']
  },
  {
    title: 'Content Generation',
    description: 'Create automated content pipelines for blogs, social media, and marketing materials.',
    tags: ['LLM', 'Templates', 'Optimization']
  },
  {
    title: 'Document Analysis',
    description: 'Process and analyze large document collections with AI-powered insights.',
    tags: ['RAG', 'Parsing', 'Analysis']
  },
  {
    title: 'Sales Automation',
    description: 'Automate lead qualification and follow-up with personalized AI responses.',
    tags: ['CRM', 'Memory', 'Templates']
  }
];

const tutorials = [
  {
    title: 'Getting Started Guide',
    description: 'Learn the basics of building your first AI pipeline',
    duration: '10 min',
    level: 'Beginner'
  },
  {
    title: 'Advanced RAG Setup',
    description: 'Connect external data sources and optimize retrieval',
    duration: '25 min',
    level: 'Intermediate'
  },
  {
    title: 'Team Collaboration',
    description: 'Set up real-time collaboration and sharing',
    duration: '15 min',
    level: 'Intermediate'
  },
  {
    title: 'Production Deployment',
    description: 'Export and deploy your pipelines to production',
    duration: '30 min',
    level: 'Advanced'
  }
];

export default function Docs() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-6 py-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold">Documentation</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to build powerful AI pipelines with Context Engine
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="tutorials">Tutorials</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Quick Start */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Play className="w-5 h-5" />
                    Quick Start
                  </CardTitle>
                  <CardDescription>
                    Get up and running in minutes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-xs text-primary-foreground font-bold">
                        1
                      </div>
                      <div>
                        <p className="font-medium">Create Your Account</p>
                        <p className="text-sm text-muted-foreground">
                          Sign up and start your 3-day free trial
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-xs text-primary-foreground font-bold">
                        2
                      </div>
                      <div>
                        <p className="font-medium">Choose a Template</p>
                        <p className="text-sm text-muted-foreground">
                          Start with a pre-built template or create from scratch
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-xs text-primary-foreground font-bold">
                        3
                      </div>
                      <div>
                        <p className="font-medium">Test & Deploy</p>
                        <p className="text-sm text-muted-foreground">
                          Simulate your pipeline and export for production
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button className="w-full">
                    Start Building
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>

              {/* Use Cases */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5" />
                    Popular Use Cases
                  </CardTitle>
                  <CardDescription>
                    See what others are building
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {useCases.map((useCase, index) => (
                      <div key={index} className="border-l-2 border-primary/20 pl-4">
                        <h4 className="font-medium">{useCase.title}</h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          {useCase.description}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {useCase.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="features" className="mt-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <Card key={index} className="relative">
                  {feature.tier && (
                    <Badge 
                      className="absolute -top-2 -right-2 z-10" 
                      variant={feature.tier === 'Enterprise' ? 'default' : 'secondary'}
                    >
                      {feature.tier}
                    </Badge>
                  )}
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        {feature.icon}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{feature.title}</CardTitle>
                        <Badge variant="outline" className="text-xs">
                          {feature.category}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="tutorials" className="mt-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {tutorials.map((tutorial, index) => (
                <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{tutorial.title}</CardTitle>
                        <CardDescription className="mt-2">
                          {tutorial.description}
                        </CardDescription>
                      </div>
                      <BookOpen className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {tutorial.duration}
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {tutorial.level}
                        </Badge>
                      </div>
                      <Button variant="ghost" size="sm">
                        Read Guide
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="pricing" className="mt-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Free Trial */}
              <Card>
                <CardHeader>
                  <CardTitle>Free Trial</CardTitle>
                  <CardDescription>3 days full access</CardDescription>
                  <div className="text-3xl font-bold">$0</div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      All features included
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Unlimited simulations
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Real-time collaboration
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      All export formats
                    </li>
                  </ul>
                  <Button className="w-full" onClick={() => window.open('/auth', '_blank')}>
                    Start Free Trial
                  </Button>
                </CardContent>
              </Card>

              {/* Pro */}
              <Card className="border-primary shadow-lg relative">
                <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                  Most Popular
                </Badge>
                <CardHeader>
                  <CardTitle>Pro</CardTitle>
                  <CardDescription>For power users</CardDescription>
                  <div className="text-3xl font-bold">
                    $19<span className="text-sm font-normal">/month</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Everything in Free Trial
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Unlimited blueprints
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Advanced analytics
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Priority support
                    </li>
                  </ul>
                  <Button className="w-full" onClick={() => window.open('/billing', '_blank')}>
                    Upgrade to Pro
                  </Button>
                </CardContent>
              </Card>

              {/* Enterprise */}
              <Card>
                <CardHeader>
                  <CardTitle>Enterprise</CardTitle>
                  <CardDescription>For teams & organizations</CardDescription>
                  <div className="text-3xl font-bold">
                    $99<span className="text-sm font-normal">/month</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Everything in Pro
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Team management
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Custom integrations
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      SLA & dedicated support
                    </li>
                  </ul>
                  <Button variant="outline" className="w-full" onClick={() => window.open('/billing', '_blank')}>
                    Contact Sales
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}