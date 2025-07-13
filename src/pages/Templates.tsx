import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  ArrowLeft, 
  Import, 
  MessageSquare, 
  FileText, 
  Code, 
  Search, 
  Eye,
  Bot,
  Plus,
  Filter,
  Sparkles
} from 'lucide-react';

interface TemplateConfig {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  nodes: any[];
  edges: any[];
  preview: string;
  instructions: string;
  parameters: {
    name: string;
    type: 'text' | 'number' | 'select';
    label: string;
    defaultValue: any;
    options?: string[];
    description: string;
  }[];
  useCases: string[];
  estimatedTime: string;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<TemplateConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateConfig | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importParams, setImportParams] = useState<Record<string, any>>({});
  const [importing, setImporting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('blueprint_templates')
        .select('*')
        .order('usage_count', { ascending: false });

      if (error) throw error;
      
      // Transform database records to match TemplateConfig interface
      const transformedTemplates = data.map(template => ({
        id: template.id,
        name: template.name,
        description: template.description,
        category: template.category,
        difficulty: template.difficulty as 'Beginner' | 'Intermediate' | 'Advanced',
        nodes: Array.isArray(template.nodes) ? template.nodes : [],
        edges: Array.isArray(template.edges) ? template.edges : [],
        preview: template.thumbnail || '/api/placeholder/400/200',
        instructions: template.instructions || '',
        parameters: Array.isArray(template.parameters) ? template.parameters as any[] : [],
        useCases: Array.isArray(template.use_cases) ? template.use_cases : [],
        estimatedTime: template.estimated_time || '15 min'
      }));
      
      setTemplates(transformedTemplates);
    } catch (error: any) {
      toast({
        title: "Error loading templates",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFromTemplate = async (template: TemplateConfig) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to create blueprints",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('blueprints')
        .insert({
          user_id: user.id,
          title: `${template.name} - Copy`,
          description: template.description,
          nodes: template.nodes,
          edges: template.edges
        })
        .select()
        .single();

      if (error) throw error;

      // Update usage count
      await supabase
        .from('blueprint_templates')
        .update({ usage_count: (template as any).usage_count + 1 })
        .eq('id', template.id);

      toast({
        title: "Blueprint created",
        description: `Created blueprint from ${template.name} template`
      });

      navigate(`/editor/${data.id}`);
    } catch (error: any) {
      toast({
        title: "Error creating blueprint",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleImport = async () => {
    if (!selectedTemplate || !user) return;

    setImporting(true);
    try {
      // Apply parameters to the template
      const configuredNodes = selectedTemplate.nodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          ...Object.entries(importParams).reduce((acc, [key, value]) => {
            // Apply parameter values to relevant node properties
            if (key === 'supportModel' || key === 'qaModel' || key === 'codeModel' || key === 'researchModel') {
              if (node.type === 'PromptTemplateNode') {
                acc.model = value;
              }
            }
            if (key === 'temperature' && node.type === 'PromptTemplateNode') {
              acc.temperature = value;
            }
            if (key === 'maxTokens' && node.type === 'PromptTemplateNode') {
              acc.maxTokens = value;
            }
            if (key === 'vectorStore' && node.type === 'RAGRetrieverNode') {
              acc.vectorStore = value;
            }
            return acc;
          }, {} as any)
        }
      }));

      // Create blueprint from template
      const { data, error } = await supabase
        .from('blueprints')
        .insert({
          user_id: user.id,
          title: selectedTemplate.name,
          description: selectedTemplate.description,
          nodes: configuredNodes,
          edges: selectedTemplate.edges
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Template imported successfully",
        description: `${selectedTemplate.name} has been added to your blueprints.`
      });

      navigate(`/editor/${data.id}`);
    } catch (error: any) {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setImporting(false);
      setShowImportDialog(false);
    }
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category.toLowerCase() === selectedCategory;
    const matchesDifficulty = selectedDifficulty === 'all' || template.difficulty.toLowerCase() === selectedDifficulty;
    
    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  const categories = ['all', ...Array.from(new Set(templates.map(t => t.category.toLowerCase())))];
  const difficulties = ['all', 'beginner', 'intermediate', 'advanced'];

  const categoryIcons = {
    'customer service': MessageSquare,
    'document processing': FileText,
    'development': Code,
    'research': Search,
    'rag': FileText
  };

  const difficultyColors = {
    'Beginner': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    'Intermediate': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    'Advanced': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
  };

  const openImportDialog = () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to import templates.",
        variant: "destructive"
      });
      navigate('/auth');
      return;
    }
    setShowImportDialog(true);
  };

  const handlePreview = (template: TemplateConfig) => {
    setSelectedTemplate(template);
    setImportParams(
      template.parameters.reduce((acc, param) => ({
        ...acc,
        [param.name]: param.defaultValue
      }), {})
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading templates...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">Pipeline Templates</h1>
              <p className="text-xs text-muted-foreground">Pre-built solutions for common use cases</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {templates.length} Templates Available
            </Badge>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Introduction */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary-foreground" />
            </div>
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Start with a Template
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Jumpstart your context engineering projects with our curated collection of 
            pre-built pipeline templates. Each template is production-ready and fully customizable.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <Input
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1"
          />
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(category => (
                <SelectItem key={category} value={category} className="capitalize">
                  {category === 'all' ? 'All Categories' : category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All Difficulties" />
            </SelectTrigger>
            <SelectContent>
              {difficulties.map(difficulty => (
                <SelectItem key={difficulty} value={difficulty} className="capitalize">
                  {difficulty === 'all' ? 'All Difficulties' : difficulty}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Template Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => {
            const CategoryIcon = categoryIcons[template.category.toLowerCase() as keyof typeof categoryIcons] || Bot;
            
            return (
              <Card key={template.id} className="border border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-elegant transition-all duration-200">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-accent flex items-center justify-center">
                        <CategoryIcon className="w-5 h-5 text-accent-foreground" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-semibold">{template.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs capitalize">
                            {template.category}
                          </Badge>
                          <Badge 
                            className={`text-xs ${difficultyColors[template.difficulty]}`}
                          >
                            {template.difficulty}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                  <CardDescription className="text-sm leading-relaxed">
                    {template.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Preview Image Placeholder */}
                  <div className="w-full h-32 bg-gradient-to-br from-muted to-muted/50 rounded-lg flex items-center justify-center border border-border/30">
                    <div className="text-center text-muted-foreground">
                      <Bot className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-xs">Pipeline Preview</p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{template.nodes.length} nodes</span>
                    <span>{template.edges.length} connections</span>
                    <span>{template.estimatedTime}</span>
                  </div>

                  {/* Use Cases */}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Use Cases:</p>
                    <div className="flex flex-wrap gap-1">
                      {template.useCases.slice(0, 2).map((useCase, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {useCase}
                        </Badge>
                      ))}
                      {template.useCases.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{template.useCases.length - 2} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => handlePreview(template)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Preview
                    </Button>
                    <Button 
                      size="sm" 
                      className="flex-1"
                      onClick={() => {
                        handlePreview(template);
                        openImportDialog();
                      }}
                    >
                      <Import className="w-4 h-4 mr-2" />
                      Import
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-12">
            <Bot className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium text-foreground mb-2">No templates found</h3>
            <p className="text-muted-foreground">Try adjusting your search criteria or browse all templates.</p>
          </div>
        )}

        {/* Feature Callout */}
        <Card className="mt-12 border border-primary/20 bg-gradient-to-r from-primary/10 to-purple-500/10">
          <CardContent className="p-8 text-center">
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Need a Custom Template?
            </h3>
            <p className="text-muted-foreground mb-6">
              Can't find what you're looking for? Create your own template from scratch 
              or request a custom template from our team.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="outline" onClick={() => navigate('/editor')}>
                <Plus className="w-4 h-4 mr-2" />
                Create from Scratch
              </Button>
              <Button>
                <MessageSquare className="w-4 h-4 mr-2" />
                Request Template
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Template Preview Dialog */}
      <Dialog open={!!selectedTemplate && !showImportDialog} onOpenChange={() => setSelectedTemplate(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedTemplate && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  {React.createElement(categoryIcons[selectedTemplate.category.toLowerCase() as keyof typeof categoryIcons] || Bot, {
                    className: "w-6 h-6"
                  })}
                  {selectedTemplate.name}
                </DialogTitle>
                <DialogDescription>
                  {selectedTemplate.description}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Instructions */}
                <div>
                  <h4 className="font-medium text-foreground mb-2">How it works</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">
                    {selectedTemplate.instructions}
                  </p>
                </div>

                {/* Parameters */}
                {selectedTemplate.parameters.length > 0 && (
                  <div>
                    <h4 className="font-medium text-foreground mb-2">Configuration Parameters</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedTemplate.parameters.map((param) => (
                        <div key={param.name} className="space-y-2">
                          <Label className="text-sm font-medium">{param.label}</Label>
                          <p className="text-xs text-muted-foreground">{param.description}</p>
                          <div className="px-3 py-2 bg-muted rounded-md text-sm">
                            Default: {String(param.defaultValue)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Use Cases */}
                <div>
                  <h4 className="font-medium text-foreground mb-2">Use Cases</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {selectedTemplate.useCases.map((useCase, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs justify-center">
                        {useCase}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={openImportDialog} className="flex-1">
                    <Import className="w-4 h-4 mr-2" />
                    Import Template
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedTemplate(null)}>
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Import Configuration Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-md">
          {selectedTemplate && (
            <>
              <DialogHeader>
                <DialogTitle>Configure Template</DialogTitle>
                <DialogDescription>
                  Customize the parameters for {selectedTemplate.name} before importing.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {selectedTemplate.parameters.map((param) => (
                  <div key={param.name} className="space-y-2">
                    <Label htmlFor={param.name}>{param.label}</Label>
                    {param.type === 'text' && (
                      <Input
                        id={param.name}
                        value={importParams[param.name] || ''}
                        onChange={(e) => setImportParams(prev => ({
                          ...prev,
                          [param.name]: e.target.value
                        }))}
                        placeholder={param.description}
                      />
                    )}
                    {param.type === 'number' && (
                      <Input
                        id={param.name}
                        type="number"
                        value={importParams[param.name] || ''}
                        onChange={(e) => setImportParams(prev => ({
                          ...prev,
                          [param.name]: parseFloat(e.target.value) || 0
                        }))}
                        placeholder={param.description}
                      />
                    )}
                    {param.type === 'select' && param.options && (
                      <Select
                        value={importParams[param.name] || ''}
                        onValueChange={(value) => setImportParams(prev => ({
                          ...prev,
                          [param.name]: value
                        }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select an option" />
                        </SelectTrigger>
                        <SelectContent>
                          {param.options.map(option => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    <p className="text-xs text-muted-foreground">{param.description}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleImport} disabled={importing} className="flex-1">
                  {importing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-primary-foreground/20 border-t-primary-foreground rounded-full animate-spin mr-2" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Import className="w-4 h-4 mr-2" />
                      Import Template
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={() => setShowImportDialog(false)}>
                  Cancel
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}