import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Settings,
  Copy,
  Download,
  Sparkles,
  Users,
  Database,
  Bot,
  Plus
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

const TEMPLATES: TemplateConfig[] = [
  {
    id: 'customer-support-bot',
    name: 'Customer Support Bot',
    description: 'AI-powered customer support system with context-aware responses',
    category: 'Customer Service',
    difficulty: 'Beginner',
    estimatedTime: '15 min setup',
    preview: '/api/placeholder/400/200',
    instructions: `This template creates a customer support bot that:
1. Takes user queries as input
2. Retrieves relevant support documentation using RAG
3. Builds context from previous conversations
4. Generates helpful, context-aware responses
5. Outputs formatted support responses

Perfect for automated customer service, FAQ systems, and support ticket automation.`,
    parameters: [
      {
        name: 'supportModel',
        type: 'select',
        label: 'LLM Model',
        defaultValue: 'gpt-4.1-2025-04-14',
        options: ['gpt-4.1-2025-04-14', 'gpt-4o', 'claude-3.5-sonnet'],
        description: 'Choose the LLM model for generating responses'
      },
      {
        name: 'temperature',
        type: 'number',
        label: 'Response Creativity',
        defaultValue: 0.3,
        description: 'Lower values for more consistent responses (0.0-1.0)'
      },
      {
        name: 'maxTokens',
        type: 'number',
        label: 'Max Response Length',
        defaultValue: 500,
        description: 'Maximum tokens in the response'
      },
      {
        name: 'vectorStore',
        type: 'select',
        label: 'Knowledge Base',
        defaultValue: 'pinecone',
        options: ['pinecone', 'weaviate', 'qdrant'],
        description: 'Vector database for storing support documentation'
      }
    ],
    useCases: [
      'Customer support automation',
      'FAQ chatbots',
      'Help desk systems',
      'Technical support',
      'Product inquiries'
    ],
    nodes: [
      {
        id: 'input-1',
        type: 'InputNode',
        position: { x: 100, y: 200 },
        data: { label: 'Customer Query', inputType: 'text' }
      },
      {
        id: 'rag-1',
        type: 'RAGRetrieverNode',
        position: { x: 300, y: 200 },
        data: { 
          label: 'Support Knowledge Base',
          vectorStore: 'pinecone',
          topK: 5,
          indexName: 'support-docs'
        }
      },
      {
        id: 'context-1',
        type: 'ContextBuilderNode',
        position: { x: 500, y: 200 },
        data: { 
          label: 'Context Builder',
          template: 'Support context: {rag_results}\n\nCustomer query: {user_input}'
        }
      },
      {
        id: 'llm-1',
        type: 'PromptTemplateNode',
        position: { x: 700, y: 200 },
        data: { 
          label: 'Support Assistant',
          model: 'gpt-4.1-2025-04-14',
          temperature: 0.3,
          maxTokens: 500,
          systemPrompt: 'You are a helpful customer support assistant. Provide clear, accurate, and friendly responses based on the knowledge base context.',
          prompt: '{context}'
        }
      },
      {
        id: 'output-1',
        type: 'OutputNode',
        position: { x: 900, y: 200 },
        data: { label: 'Support Response', format: 'text' }
      }
    ],
    edges: [
      { id: 'e1-2', source: 'input-1', target: 'rag-1', sourceHandle: 'output', targetHandle: 'input' },
      { id: 'e2-3', source: 'rag-1', target: 'context-1', sourceHandle: 'output', targetHandle: 'rag' },
      { id: 'e1-3', source: 'input-1', target: 'context-1', sourceHandle: 'output', targetHandle: 'input' },
      { id: 'e3-4', source: 'context-1', target: 'llm-1', sourceHandle: 'output', targetHandle: 'input' },
      { id: 'e4-5', source: 'llm-1', target: 'output-1', sourceHandle: 'output', targetHandle: 'input' }
    ]
  },
  {
    id: 'document-qa-system',
    name: 'Document QA System',
    description: 'Question-answering system that processes and queries large documents',
    category: 'Document Processing',
    difficulty: 'Intermediate',
    estimatedTime: '25 min setup',
    preview: '/api/placeholder/400/200',
    instructions: `This template creates a document QA system that:
1. Loads and processes documents (PDF, text, etc.)
2. Chunks documents into manageable pieces
3. Stores document chunks in a vector database
4. Retrieves relevant chunks based on user questions
5. Generates accurate answers with source citations

Ideal for research, legal document analysis, and knowledge management systems.`,
    parameters: [
      {
        name: 'chunkSize',
        type: 'number',
        label: 'Chunk Size',
        defaultValue: 1000,
        description: 'Number of characters per document chunk'
      },
      {
        name: 'chunkOverlap',
        type: 'number',
        label: 'Chunk Overlap',
        defaultValue: 200,
        description: 'Character overlap between chunks'
      },
      {
        name: 'qaModel',
        type: 'select',
        label: 'QA Model',
        defaultValue: 'gpt-4.1-2025-04-14',
        options: ['gpt-4.1-2025-04-14', 'gpt-4o', 'claude-3.5-sonnet'],
        description: 'Model for answering questions'
      },
      {
        name: 'includeSource',
        type: 'select',
        label: 'Include Sources',
        defaultValue: 'yes',
        options: ['yes', 'no'],
        description: 'Include source citations in answers'
      }
    ],
    useCases: [
      'Research paper analysis',
      'Legal document review',
      'Technical documentation QA',
      'Knowledge base queries',
      'Academic research'
    ],
    nodes: [
      {
        id: 'input-1',
        type: 'InputNode',
        position: { x: 50, y: 200 },
        data: { label: 'User Question', inputType: 'text' }
      },
      {
        id: 'loader-1',
        type: 'DocumentLoaderNode',
        position: { x: 250, y: 100 },
        data: { 
          label: 'Document Loader',
          fileTypes: ['pdf', 'txt', 'docx'],
          batchSize: 10
        }
      },
      {
        id: 'chunker-1',
        type: 'TextChunkerNode',
        position: { x: 450, y: 100 },
        data: { 
          label: 'Text Chunker',
          chunkSize: 1000,
          overlap: 200,
          strategy: 'recursive'
        }
      },
      {
        id: 'rag-1',
        type: 'RAGRetrieverNode',
        position: { x: 650, y: 200 },
        data: { 
          label: 'Document Search',
          vectorStore: 'pinecone',
          topK: 5,
          indexName: 'documents'
        }
      },
      {
        id: 'llm-1',
        type: 'PromptTemplateNode',
        position: { x: 850, y: 200 },
        data: { 
          label: 'QA Assistant',
          model: 'gpt-4.1-2025-04-14',
          temperature: 0.1,
          maxTokens: 800,
          systemPrompt: 'Answer questions based on the provided document context. Be accurate and cite sources when possible.',
          prompt: 'Context: {context}\n\nQuestion: {question}\n\nAnswer:'
        }
      },
      {
        id: 'output-1',
        type: 'OutputNode',
        position: { x: 1050, y: 200 },
        data: { label: 'QA Response', format: 'markdown' }
      }
    ],
    edges: [
      { id: 'e1-2', source: 'loader-1', target: 'chunker-1', sourceHandle: 'output', targetHandle: 'input' },
      { id: 'e2-3', source: 'chunker-1', target: 'rag-1', sourceHandle: 'output', targetHandle: 'documents' },
      { id: 'e3-4', source: 'input-1', target: 'rag-1', sourceHandle: 'output', targetHandle: 'query' },
      { id: 'e4-5', source: 'rag-1', target: 'llm-1', sourceHandle: 'output', targetHandle: 'context' },
      { id: 'e1-5', source: 'input-1', target: 'llm-1', sourceHandle: 'output', targetHandle: 'question' },
      { id: 'e5-6', source: 'llm-1', target: 'output-1', sourceHandle: 'output', targetHandle: 'input' }
    ]
  },
  {
    id: 'code-assistant',
    name: 'Code Assistant',
    description: 'AI coding assistant with context from documentation and existing code',
    category: 'Development',
    difficulty: 'Advanced',
    estimatedTime: '30 min setup',
    preview: '/api/placeholder/400/200',
    instructions: `This template creates a code assistant that:
1. Takes coding questions or requests as input
2. Gathers context from existing codebase
3. Retrieves relevant documentation from vector store
4. Generates code solutions with explanations
5. Formats output with proper syntax highlighting

Perfect for code review, debugging assistance, and learning new frameworks.`,
    parameters: [
      {
        name: 'language',
        type: 'select',
        label: 'Programming Language',
        defaultValue: 'python',
        options: ['python', 'javascript', 'typescript', 'java', 'go', 'rust'],
        description: 'Primary programming language'
      },
      {
        name: 'codeModel',
        type: 'select',
        label: 'Code Model',
        defaultValue: 'gpt-4.1-2025-04-14',
        options: ['gpt-4.1-2025-04-14', 'o4-mini-2025-04-16', 'claude-3.5-sonnet'],
        description: 'Model specialized for code generation'
      },
      {
        name: 'includeTests',
        type: 'select',
        label: 'Include Tests',
        defaultValue: 'yes',
        options: ['yes', 'no'],
        description: 'Generate unit tests with code'
      },
      {
        name: 'codeStyle',
        type: 'select',
        label: 'Code Style',
        defaultValue: 'clean',
        options: ['clean', 'functional', 'enterprise', 'minimal'],
        description: 'Preferred coding style'
      }
    ],
    useCases: [
      'Code generation',
      'Code review assistance',
      'Debugging help',
      'API documentation queries',
      'Best practices guidance'
    ],
    nodes: [
      {
        id: 'input-1',
        type: 'InputNode',
        position: { x: 50, y: 250 },
        data: { label: 'Coding Request', inputType: 'text' }
      },
      {
        id: 'context-1',
        type: 'CodeContextNode',
        position: { x: 250, y: 150 },
        data: { 
          label: 'Code Context',
          language: 'python',
          includeImports: true,
          maxLines: 100
        }
      },
      {
        id: 'rag-1',
        type: 'RAGRetrieverNode',
        position: { x: 250, y: 350 },
        data: { 
          label: 'Documentation RAG',
          vectorStore: 'pinecone',
          topK: 3,
          indexName: 'code-docs'
        }
      },
      {
        id: 'llm-1',
        type: 'PromptTemplateNode',
        position: { x: 500, y: 250 },
        data: { 
          label: 'Code Generator',
          model: 'gpt-4.1-2025-04-14',
          temperature: 0.2,
          maxTokens: 1500,
          systemPrompt: 'You are an expert programmer. Generate clean, well-documented code with explanations.',
          prompt: 'Code context: {code_context}\n\nDocumentation: {docs}\n\nRequest: {request}\n\nGenerate:'
        }
      },
      {
        id: 'formatter-1',
        type: 'CodeFormatterNode',
        position: { x: 700, y: 250 },
        data: { 
          label: 'Code Formatter',
          language: 'python',
          style: 'black',
          addComments: true
        }
      },
      {
        id: 'output-1',
        type: 'OutputNode',
        position: { x: 900, y: 250 },
        data: { label: 'Generated Code', format: 'code' }
      }
    ],
    edges: [
      { id: 'e1-2', source: 'input-1', target: 'context-1', sourceHandle: 'output', targetHandle: 'input' },
      { id: 'e1-3', source: 'input-1', target: 'rag-1', sourceHandle: 'output', targetHandle: 'query' },
      { id: 'e2-4', source: 'context-1', target: 'llm-1', sourceHandle: 'output', targetHandle: 'code_context' },
      { id: 'e3-4', source: 'rag-1', target: 'llm-1', sourceHandle: 'output', targetHandle: 'docs' },
      { id: 'e1-4', source: 'input-1', target: 'llm-1', sourceHandle: 'output', targetHandle: 'request' },
      { id: 'e4-5', source: 'llm-1', target: 'formatter-1', sourceHandle: 'output', targetHandle: 'input' },
      { id: 'e5-6', source: 'formatter-1', target: 'output-1', sourceHandle: 'output', targetHandle: 'input' }
    ]
  },
  {
    id: 'research-assistant',
    name: 'Research Assistant',
    description: 'AI research assistant that searches, summarizes, and synthesizes information',
    category: 'Research',
    difficulty: 'Intermediate',
    estimatedTime: '20 min setup',
    preview: '/api/placeholder/400/200',
    instructions: `This template creates a research assistant that:
1. Takes research queries as input
2. Searches web sources and academic papers
3. Retrieves relevant papers from vector database
4. Summarizes findings from multiple sources
5. Synthesizes comprehensive research reports

Ideal for academic research, market analysis, and literature reviews.`,
    parameters: [
      {
        name: 'searchSources',
        type: 'select',
        label: 'Search Sources',
        defaultValue: 'academic',
        options: ['academic', 'web', 'both'],
        description: 'Types of sources to search'
      },
      {
        name: 'summaryLength',
        type: 'select',
        label: 'Summary Length',
        defaultValue: 'medium',
        options: ['short', 'medium', 'long'],
        description: 'Length of generated summaries'
      },
      {
        name: 'researchModel',
        type: 'select',
        label: 'Research Model',
        defaultValue: 'gpt-4.1-2025-04-14',
        options: ['gpt-4.1-2025-04-14', 'o3-2025-04-16', 'claude-3.5-sonnet'],
        description: 'Model for research synthesis'
      },
      {
        name: 'citationStyle',
        type: 'select',
        label: 'Citation Style',
        defaultValue: 'apa',
        options: ['apa', 'mla', 'chicago', 'ieee'],
        description: 'Academic citation format'
      }
    ],
    useCases: [
      'Academic literature reviews',
      'Market research analysis',
      'Scientific paper summaries',
      'Competitive analysis',
      'Trend identification'
    ],
    nodes: [
      {
        id: 'input-1',
        type: 'InputNode',
        position: { x: 50, y: 300 },
        data: { label: 'Research Query', inputType: 'text' }
      },
      {
        id: 'search-1',
        type: 'WebSearchNode',
        position: { x: 250, y: 200 },
        data: { 
          label: 'Web Search',
          engine: 'google',
          maxResults: 10,
          filterType: 'academic'
        }
      },
      {
        id: 'rag-1',
        type: 'RAGRetrieverNode',
        position: { x: 250, y: 400 },
        data: { 
          label: 'Paper Database',
          vectorStore: 'pinecone',
          topK: 8,
          indexName: 'research-papers'
        }
      },
      {
        id: 'summarizer-1',
        type: 'SummarizerNode',
        position: { x: 500, y: 300 },
        data: { 
          label: 'Content Summarizer',
          strategy: 'extractive',
          maxLength: 200,
          includeKeywords: true
        }
      },
      {
        id: 'llm-1',
        type: 'PromptTemplateNode',
        position: { x: 750, y: 300 },
        data: { 
          label: 'Research Synthesizer',
          model: 'gpt-4.1-2025-04-14',
          temperature: 0.4,
          maxTokens: 2000,
          systemPrompt: 'You are a research assistant. Synthesize information from multiple sources into comprehensive reports with proper citations.',
          prompt: 'Research topic: {query}\n\nWeb sources: {web_results}\n\nAcademic papers: {papers}\n\nSummary: {summary}\n\nGenerate research report:'
        }
      },
      {
        id: 'output-1',
        type: 'OutputNode',
        position: { x: 1000, y: 300 },
        data: { label: 'Research Report', format: 'markdown' }
      }
    ],
    edges: [
      { id: 'e1-2', source: 'input-1', target: 'search-1', sourceHandle: 'output', targetHandle: 'query' },
      { id: 'e1-3', source: 'input-1', target: 'rag-1', sourceHandle: 'output', targetHandle: 'query' },
      { id: 'e2-4', source: 'search-1', target: 'summarizer-1', sourceHandle: 'output', targetHandle: 'web_content' },
      { id: 'e3-4', source: 'rag-1', target: 'summarizer-1', sourceHandle: 'output', targetHandle: 'papers' },
      { id: 'e4-5', source: 'summarizer-1', target: 'llm-1', sourceHandle: 'output', targetHandle: 'summary' },
      { id: 'e2-5', source: 'search-1', target: 'llm-1', sourceHandle: 'output', targetHandle: 'web_results' },
      { id: 'e3-5', source: 'rag-1', target: 'llm-1', sourceHandle: 'output', targetHandle: 'papers' },
      { id: 'e1-5', source: 'input-1', target: 'llm-1', sourceHandle: 'output', targetHandle: 'query' },
      { id: 'e5-6', source: 'llm-1', target: 'output-1', sourceHandle: 'output', targetHandle: 'input' }
    ]
  }
];

export default function Templates() {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateConfig | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importParams, setImportParams] = useState<Record<string, any>>({});
  const [importing, setImporting] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const categoryIcons = {
    'Customer Service': MessageSquare,
    'Document Processing': FileText,
    'Development': Code,
    'Research': Search
  };

  const difficultyColors = {
    'Beginner': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    'Intermediate': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    'Advanced': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
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
              {TEMPLATES.length} Templates Available
            </Badge>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Introduction */}
        <div className="text-center mb-12">
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

        {/* Template Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {TEMPLATES.map((template) => {
            const CategoryIcon = categoryIcons[template.category as keyof typeof categoryIcons];
            
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
                          <Badge variant="secondary" className="text-xs">
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
                      {template.useCases.slice(0, 3).map((useCase, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {useCase}
                        </Badge>
                      ))}
                      {template.useCases.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{template.useCases.length - 3} more
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
                  {React.createElement(categoryIcons[selectedTemplate.category as keyof typeof categoryIcons], {
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
                      <select
                        id={param.name}
                        value={importParams[param.name] || ''}
                        onChange={(e) => setImportParams(prev => ({
                          ...prev,
                          [param.name]: e.target.value
                        }))}
                        className="w-full px-3 py-2 border border-input bg-background rounded-md text-sm"
                      >
                        {param.options.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
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