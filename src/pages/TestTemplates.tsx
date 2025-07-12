import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TemplateGallery } from '@/components/TemplateGallery';
import { Brain, Play, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function TestTemplates() {
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [userTier, setUserTier] = useState<'free' | 'pro' | 'enterprise'>('free');
  const { toast } = useToast();

  const handleTemplateSelect = (template: any) => {
    setSelectedTemplate(template);
    console.log('Selected template:', template);
  };

  const handleTierChange = (tier: 'free' | 'pro' | 'enterprise') => {
    setUserTier(tier);
    toast({
      title: 'Tier Changed',
      description: `Switched to ${tier} tier. Templates will be filtered accordingly.`,
    });
  };

  const handleTestSpeculativeRAG = () => {
    // This simulates testing the Speculative RAG template
    toast({
      title: 'Testing Speculative RAG',
      description: 'Speculative RAG starter blueprint loaded successfully! Check the template gallery to load it.',
    });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Brain className="w-8 h-8 text-primary" />
            RAG Blueprint Templates
          </h1>
          <p className="text-muted-foreground mt-2">
            Test and explore 20 advanced RAG variants with tier-based access control
          </p>
        </div>

        {/* Controls */}
        <div className="flex gap-4 mb-6">
          <TemplateGallery 
            onSelectTemplate={handleTemplateSelect}
            userTier={userTier}
          />
          
          <div className="flex gap-2">
            <Button 
              variant={userTier === 'free' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleTierChange('free')}
            >
              Free
            </Button>
            <Button 
              variant={userTier === 'pro' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleTierChange('pro')}
            >
              Pro
            </Button>
            <Button 
              variant={userTier === 'enterprise' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleTierChange('enterprise')}
            >
              Enterprise
            </Button>
          </div>

          <Button onClick={handleTestSpeculativeRAG} className="ml-auto">
            <Play className="w-4 h-4 mr-2" />
            Test Speculative RAG
          </Button>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Canvas Area */}
          <div className="lg:col-span-2">
            <Card className="p-6 h-96">
              {selectedTemplate ? (
                <div>
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    {selectedTemplate.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {selectedTemplate.description}
                  </p>
                  <div className="text-sm space-y-2">
                    <p><strong>Nodes:</strong> {selectedTemplate.nodes.length}</p>
                    <p><strong>Edges:</strong> {selectedTemplate.edges.length}</p>
                    <p><strong>Category:</strong> {selectedTemplate.category}</p>
                    <p><strong>Tags:</strong> {selectedTemplate.tags.join(', ')}</p>
                  </div>
                  
                  <div className="mt-4 space-y-2">
                    <h4 className="font-medium">Template Structure:</h4>
                    <div className="text-xs space-y-1 max-h-48 overflow-y-auto">
                      {selectedTemplate.nodes.map((node: any, index: number) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded">
                          <span className="font-mono text-xs">{node.type}</span>
                          <span>→</span>
                          <span>{node.data?.label || node.id}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <Brain className="w-16 h-16 mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No Template Selected</h3>
                  <p className="text-sm text-center">
                    Choose a RAG template from the gallery to start building your pipeline
                  </p>
                </div>
              )}
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card className="p-4">
              <h3 className="font-semibold mb-3">Quick Stats</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Available Templates:</span>
                  <span className="font-mono">20</span>
                </div>
                <div className="flex justify-between">
                  <span>Current Tier:</span>
                  <span className={`font-medium capitalize ${
                    userTier === 'free' ? 'text-green-600' :
                    userTier === 'pro' ? 'text-blue-600' : 'text-purple-600'
                  }`}>
                    {userTier}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Accessible Templates:</span>
                  <span className="font-mono">
                    {userTier === 'free' ? '9' : userTier === 'pro' ? '18' : '20'}
                  </span>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold mb-3">Featured Templates</h3>
              <div className="space-y-3 text-sm">
                <div className="p-2 bg-muted rounded">
                  <div className="font-medium">Speculative RAG</div>
                  <div className="text-xs text-muted-foreground">
                    Parallel hypothesis generation with verification
                  </div>
                  <div className="text-xs text-blue-600 mt-1">Pro</div>
                </div>
                <div className="p-2 bg-muted rounded">
                  <div className="font-medium">Agentic RAG</div>
                  <div className="text-xs text-muted-foreground">
                    AI agent-driven with tool use and planning
                  </div>
                  <div className="text-xs text-purple-600 mt-1">Enterprise</div>
                </div>
                <div className="p-2 bg-muted rounded">
                  <div className="font-medium">Naive RAG</div>
                  <div className="text-xs text-muted-foreground">
                    Simple vector search and generation
                  </div>
                  <div className="text-xs text-green-600 mt-1">Free</div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}