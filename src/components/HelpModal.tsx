import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  HelpCircle, 
  Play, 
  MousePointer, 
  Zap, 
  Share, 
  Download,
  Users,
  Settings,
  Lightbulb,
  ArrowRight,
  CheckCircle
} from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  userTier?: string;
}

const tutorials = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'Learn the basics of building AI pipelines',
    steps: [
      {
        title: 'Create Your First Node',
        content: 'Drag a Prompt Template node from the sidebar to the canvas. This will be the foundation of your AI pipeline.',
        icon: <MousePointer className="w-5 h-5" />
      },
      {
        title: 'Configure the Node',
        content: 'Double-click the node to open configuration. Add your prompt template with variables like {input}.',
        icon: <Settings className="w-5 h-5" />
      },
      {
        title: 'Test Your Pipeline',
        content: 'Use the simulator on the right to test your pipeline with sample inputs.',
        icon: <Play className="w-5 h-5" />
      }
    ]
  },
  {
    id: 'advanced-features',
    title: 'Advanced Features',
    description: 'Unlock powerful capabilities',
    steps: [
      {
        title: 'Add RAG Retrieval',
        content: 'Connect a RAG Retriever node to search through your knowledge base and provide context.',
        icon: <Zap className="w-5 h-5" />
      },
      {
        title: 'Memory & State',
        content: 'Use Memory Store nodes to maintain conversation history and context across interactions.',
        icon: <Users className="w-5 h-5" />
      },
      {
        title: 'Optimize Performance',
        content: 'Use the Optimize button to automatically improve your pipeline efficiency and reduce costs.',
        icon: <Lightbulb className="w-5 h-5" />
      }
    ]
  },
  {
    id: 'collaboration',
    title: 'Team Collaboration',
    description: 'Work together on AI pipelines',
    premium: true,
    steps: [
      {
        title: 'Share Your Blueprint',
        content: 'Generate share links with different access levels - view, edit, or admin permissions.',
        icon: <Share className="w-5 h-5" />
      },
      {
        title: 'Real-time Editing',
        content: 'See other team members cursors and changes in real-time as you work together.',
        icon: <Users className="w-5 h-5" />
      },
      {
        title: 'Export & Deploy',
        content: 'Export your pipeline as JavaScript, TypeScript, or Docker containers for deployment.',
        icon: <Download className="w-5 h-5" />
      }
    ]
  }
];

const quickTips = [
  {
    title: 'Keyboard Shortcuts',
    content: 'Press Ctrl+S to save, Space to drag the canvas, Delete to remove selected nodes.'
  },
  {
    title: 'Template Gallery',
    content: 'Start with pre-built templates for common use cases like HR Q&A or Sales chatbots.'
  },
  {
    title: 'Version History',
    content: 'All changes are automatically saved. View version history to revert to previous states.'
  },
  {
    title: 'Performance Monitoring',
    content: 'Track token usage, costs, and optimization metrics in the analytics dashboard.'
  }
];

export function HelpModal({ isOpen, onClose, userTier = 'free' }: HelpModalProps) {
  const [activeTab, setActiveTab] = useState('tutorials');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5" />
            Help & Tutorials
          </DialogTitle>
          <DialogDescription>
            Learn how to build powerful AI pipelines with Context Engine
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tutorials">Tutorials</TabsTrigger>
            <TabsTrigger value="tips">Quick Tips</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
          </TabsList>

          <TabsContent value="tutorials" className="mt-6">
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-6">
                {tutorials.map((tutorial) => (
                  <Card key={tutorial.id} className={tutorial.premium && userTier === 'free' ? 'opacity-60' : ''}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {tutorial.title}
                          {tutorial.premium && (
                            <Badge variant="secondary" className="text-xs">
                              Pro
                            </Badge>
                          )}
                        </CardTitle>
                        {tutorial.premium && userTier === 'free' && (
                          <Button size="sm" variant="outline">
                            Upgrade to Access
                          </Button>
                        )}
                      </div>
                      <CardDescription>{tutorial.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {tutorial.steps.map((step, index) => (
                          <div key={index} className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                              {step.icon}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-sm">{step.title}</h4>
                              <p className="text-sm text-muted-foreground mt-1">
                                {step.content}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="tips" className="mt-6">
            <ScrollArea className="h-[500px] pr-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {quickTips.map((tip, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-sm">{tip.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {tip.content}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="features" className="mt-6">
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Free Trial - 3 Days</CardTitle>
                    <CardDescription>Full access to all features</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Unlimited simulations and optimizations
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        All node types and templates
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Export in all formats
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Real-time collaboration
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Pro - $19/month</CardTitle>
                    <CardDescription>For individual power users</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Everything in Free Trial
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Unlimited blueprints and sharing
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
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Enterprise - $99/month</CardTitle>
                    <CardDescription>For teams and organizations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Everything in Pro
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Team management and roles
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Custom integrations
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        SLA and dedicated support
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            Need more help? Check our{' '}
            <Button variant="link" className="p-0 h-auto text-sm" onClick={() => window.open('/docs', '_blank')}>
              documentation
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            {userTier === 'free' && (
              <Button onClick={() => window.open('/billing', '_blank')}>
                Upgrade Now
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}