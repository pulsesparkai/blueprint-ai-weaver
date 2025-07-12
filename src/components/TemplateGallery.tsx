import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Sparkles, MessageSquare, Users, FileText, Search, Brain, Star, Crown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Template {
  id: string;
  title: string;
  description: string;
  category: string;
  nodes: any[];
  edges: any[];
  isPremium: boolean;
  tags: string[];
  popularity: number;
}

const sampleTemplates: Template[] = [
  {
    id: 'hr-qa-agent',
    title: 'HR Q&A Agent',
    description: 'Employee support chatbot with RAG for company policies and memory for context',
    category: 'HR & Support',
    nodes: [
      { id: 'input', type: 'input', position: { x: 50, y: 100 }, data: { label: 'Employee Question' } },
      { id: 'memory', type: 'memoryStore', position: { x: 250, y: 50 }, data: { label: 'Employee Context' } },
      { id: 'rag', type: 'ragRetriever', position: { x: 250, y: 150 }, data: { label: 'HR Knowledge Base' } },
      { id: 'prompt', type: 'promptTemplate', position: { x: 450, y: 100 }, data: { label: 'HR Assistant Prompt' } },
      { id: 'output', type: 'output', position: { x: 650, y: 100 }, data: { label: 'HR Response' } },
    ],
    edges: [
      { id: 'e1', source: 'input', target: 'memory' },
      { id: 'e2', source: 'input', target: 'rag' },
      { id: 'e3', source: 'memory', target: 'prompt' },
      { id: 'e4', source: 'rag', target: 'prompt' },
      { id: 'e5', source: 'prompt', target: 'output' },
    ],
    isPremium: false,
    tags: ['HR', 'Support', 'RAG', 'Memory'],
    popularity: 95,
  },
  {
    id: 'sales-chatbot',
    title: 'Sales Chatbot',
    description: 'Lead qualification bot with product knowledge and conversation tracking',
    category: 'Sales & Marketing',
    nodes: [
      { id: 'input', type: 'input', position: { x: 50, y: 100 }, data: { label: 'Customer Inquiry' } },
      { id: 'memory', type: 'memoryStore', position: { x: 250, y: 50 }, data: { label: 'Conversation History' } },
      { id: 'rag', type: 'ragRetriever', position: { x: 250, y: 150 }, data: { label: 'Product Catalog' } },
      { id: 'prompt', type: 'promptTemplate', position: { x: 450, y: 100 }, data: { label: 'Sales Assistant' } },
      { id: 'output', type: 'output', position: { x: 650, y: 100 }, data: { label: 'Sales Response' } },
    ],
    edges: [
      { id: 'e1', source: 'input', target: 'memory' },
      { id: 'e2', source: 'input', target: 'rag' },
      { id: 'e3', source: 'memory', target: 'prompt' },
      { id: 'e4', source: 'rag', target: 'prompt' },
      { id: 'e5', source: 'prompt', target: 'output' },
    ],
    isPremium: false,
    tags: ['Sales', 'Lead Gen', 'Product', 'CRM'],
    popularity: 88,
  },
  {
    id: 'document-assistant',
    title: 'Document Assistant',
    description: 'Advanced document analysis with multi-source RAG and citation tracking',
    category: 'Document Processing',
    nodes: [
      { id: 'input', type: 'input', position: { x: 50, y: 100 }, data: { label: 'Document Query' } },
      { id: 'rag1', type: 'ragRetriever', position: { x: 250, y: 50 }, data: { label: 'Document Store' } },
      { id: 'rag2', type: 'ragRetriever', position: { x: 250, y: 150 }, data: { label: 'Reference Library' } },
      { id: 'prompt', type: 'promptTemplate', position: { x: 450, y: 100 }, data: { label: 'Analysis Prompt' } },
      { id: 'parser', type: 'outputParser', position: { x: 550, y: 100 }, data: { label: 'Citation Parser' } },
      { id: 'output', type: 'output', position: { x: 650, y: 100 }, data: { label: 'Analysis Result' } },
    ],
    edges: [
      { id: 'e1', source: 'input', target: 'rag1' },
      { id: 'e2', source: 'input', target: 'rag2' },
      { id: 'e3', source: 'rag1', target: 'prompt' },
      { id: 'e4', source: 'rag2', target: 'prompt' },
      { id: 'e5', source: 'prompt', target: 'parser' },
      { id: 'e6', source: 'parser', target: 'output' },
    ],
    isPremium: true,
    tags: ['Documents', 'Analysis', 'Citations', 'Research'],
    popularity: 76,
  },
];

interface TemplateGalleryProps {
  onSelectTemplate: (template: Template) => void;
  userTier?: string;
}

export function TemplateGallery({ onSelectTemplate, userTier = 'free' }: TemplateGalleryProps) {
  const [templates, setTemplates] = useState<Template[]>(sampleTemplates);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const categories = ['all', ...Array.from(new Set(templates.map(t => t.category)))];

  const filteredTemplates = templates.filter(template => 
    selectedCategory === 'all' || template.category === selectedCategory
  );

  const handleSelectTemplate = (template: Template) => {
    if (template.isPremium && userTier === 'free') {
      toast({
        title: 'Premium Template',
        description: 'Upgrade to Pro to access premium templates with advanced features.',
        variant: 'default',
      });
      return;
    }

    onSelectTemplate(template);
    setIsOpen(false);
    toast({
      title: 'Template Applied',
      description: `${template.title} has been loaded to your canvas.`,
    });
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="template-gallery-trigger relative"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Templates
          <Badge variant="secondary" className="ml-2 px-1.5 py-0.5 text-xs">
            {templates.length}
          </Badge>
        </Button>
      </SheetTrigger>
      
      <SheetContent side="left" className="w-80">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Template Gallery
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className="text-xs"
              >
                {category === 'all' ? 'All' : category}
              </Button>
            ))}
          </div>

          {/* Templates List */}
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="space-y-3">
              {filteredTemplates
                .sort((a, b) => b.popularity - a.popularity)
                .map((template) => (
                <Card 
                  key={template.id} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleSelectTemplate(template)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        {template.title}
                        {template.isPremium && (
                          <Crown className="w-3 h-3 text-amber-500" />
                        )}
                      </CardTitle>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Star className="w-3 h-3 fill-current" />
                        {template.popularity}
                      </div>
                    </div>
                    <CardDescription className="text-xs">
                      {template.description}
                    </CardDescription>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="flex flex-wrap gap-1 mb-2">
                      {template.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs px-2 py-0.5">
                          {tag}
                        </Badge>
                      ))}
                      {template.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs px-2 py-0.5">
                          +{template.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{template.nodes.length} nodes</span>
                      {template.isPremium && userTier === 'free' && (
                        <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">
                          Pro
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}