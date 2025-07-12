import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Search, Crown, Star, Brain, Zap, ArrowRight, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface RAGTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tier: 'free' | 'pro' | 'enterprise';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  nodes: any[];
  edges: any[];
  tags: string[];
  usage_count: number;
  created_at: string;
}

interface TemplateGalleryProps {
  onSelectTemplate: (template: { 
    id: string; 
    title: string; 
    description: string; 
    nodes: any[]; 
    edges: any[]; 
    category: string; 
    isPremium: boolean; 
    tags: string[]; 
    popularity: number; 
  }) => void;
  userTier?: 'free' | 'pro' | 'enterprise';
}

export function TemplateGallery({ onSelectTemplate, userTier = 'free' }: TemplateGalleryProps) {
  const [templates, setTemplates] = useState<RAGTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<RAGTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  // Fetch templates from Supabase
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const { data, error } = await supabase
          .from('blueprint_templates')
          .select('*')
          .order('usage_count', { ascending: false });

        if (error) {
          console.error('Error fetching templates:', error);
          toast({
            title: 'Error',
            description: 'Failed to load RAG templates. Using default templates.',
            variant: 'destructive',
          });
          return;
        }

        setTemplates((data || []) as RAGTemplate[]);
      } catch (error) {
        console.error('Error fetching templates:', error);
        toast({
          title: 'Error',
          description: 'Failed to load RAG templates.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen, toast]);

  // Filter templates based on search and filters
  useEffect(() => {
    let filtered = templates;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query) ||
        template.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Tier filter
    if (selectedTier !== 'all') {
      filtered = filtered.filter(template => template.tier === selectedTier);
    }

    // Difficulty filter
    if (selectedDifficulty !== 'all') {
      filtered = filtered.filter(template => template.difficulty === selectedDifficulty);
    }

    setFilteredTemplates(filtered);
  }, [templates, searchQuery, selectedTier, selectedDifficulty]);

  const handleSelectTemplate = async (template: RAGTemplate) => {
    // Check tier access
    const tierHierarchy = { free: 0, pro: 1, enterprise: 2 };
    const userTierLevel = tierHierarchy[userTier];
    const templateTierLevel = tierHierarchy[template.tier];

    if (templateTierLevel > userTierLevel) {
      toast({
        title: 'Premium Template',
        description: `Upgrade to ${template.tier.charAt(0).toUpperCase() + template.tier.slice(1)} to access this advanced RAG template.`,
        variant: 'default',
      });
      return;
    }

    // Update usage count
    try {
      await supabase
        .from('blueprint_templates')
        .update({ usage_count: template.usage_count + 1 })
        .eq('id', template.id);
    } catch (error) {
      console.error('Error updating usage count:', error);
    }

    // Convert template to expected format
    const convertedTemplate = {
      id: template.id,
      title: template.name,
      description: template.description,
      nodes: template.nodes,
      edges: template.edges,
      category: template.category,
      isPremium: template.tier !== 'free',
      tags: template.tags,
      popularity: template.usage_count,
    };

    onSelectTemplate(convertedTemplate);
    setIsOpen(false);
    toast({
      title: 'Template Loaded',
      description: `${template.name} has been loaded to your canvas.`,
    });
  };

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return <Star className="w-3 h-3 text-green-500" />;
      case 'intermediate': return <Zap className="w-3 h-3 text-yellow-500" />;
      case 'advanced': return <Brain className="w-3 h-3 text-red-500" />;
      default: return <Star className="w-3 h-3" />;
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'pro': return <Crown className="w-3 h-3 text-blue-500" />;
      case 'enterprise': return <Crown className="w-3 h-3 text-purple-500" />;
      default: return null;
    }
  };

  const canAccessTemplate = (template: RAGTemplate) => {
    const tierHierarchy = { free: 0, pro: 1, enterprise: 2 };
    return tierHierarchy[userTier] >= tierHierarchy[template.tier];
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="template-gallery-trigger relative group"
        >
          <Sparkles className="w-4 h-4 mr-2 group-hover:text-primary transition-colors" />
          RAG Templates
          <Badge variant="secondary" className="ml-2 px-1.5 py-0.5 text-xs">
            20
          </Badge>
        </Button>
      </SheetTrigger>
      
      <SheetContent side="left" className="w-96 overflow-hidden">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            RAG Template Gallery
          </SheetTitle>
          <p className="text-sm text-muted-foreground">
            Choose from 20 pre-built RAG variants for different use cases
          </p>
        </SheetHeader>

        <div className="mt-6 space-y-4 h-full overflow-hidden flex flex-col">
          {/* Search and Filters */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex gap-2">
              <Select value={selectedTier} onValueChange={setSelectedTier}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tiers</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Templates List */}
          <ScrollArea className="flex-1">
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="space-y-3 pb-4">
                {filteredTemplates.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No templates found matching your criteria</p>
                  </div>
                ) : (
                  filteredTemplates.map((template) => {
                    const accessible = canAccessTemplate(template);
                    return (
                      <Card 
                        key={template.id} 
                        className={`cursor-pointer transition-all duration-200 ${
                          accessible 
                            ? 'hover:shadow-md hover:border-primary/50' 
                            : 'opacity-60 hover:opacity-70'
                        }`}
                        onClick={() => handleSelectTemplate(template)}
                      >
                        <CardHeader className="pb-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <span className="line-clamp-1">{template.name}</span>
                                {getTierIcon(template.tier)}
                                {!accessible && <Lock className="w-3 h-3 text-muted-foreground" />}
                              </CardTitle>
                              <div className="flex items-center gap-2 mt-1">
                                {getDifficultyIcon(template.difficulty)}
                                <span className="text-xs text-muted-foreground capitalize">
                                  {template.difficulty}
                                </span>
                                <span className="text-xs text-muted-foreground">•</span>
                                <span className="text-xs text-muted-foreground">
                                  {template.usage_count} uses
                                </span>
                              </div>
                            </div>
                          </div>
                          <CardDescription className="text-xs line-clamp-2">
                            {template.description}
                          </CardDescription>
                        </CardHeader>
                        
                        <CardContent className="pt-0">
                          <div className="flex flex-wrap gap-1 mb-3">
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
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{template.nodes.length} nodes</span>
                              <span>•</span>
                              <span className={`capitalize font-medium ${
                                template.tier === 'free' ? 'text-green-600' :
                                template.tier === 'pro' ? 'text-blue-600' : 'text-purple-600'
                              }`}>
                                {template.tier}
                              </span>
                            </div>
                            
                            {accessible ? (
                              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            ) : (
                              <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">
                                {template.tier.charAt(0).toUpperCase() + template.tier.slice(1)}
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}