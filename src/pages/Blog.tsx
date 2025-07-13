import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Sparkles, Search, Calendar, User, ArrowRight, TrendingUp,
  Brain, Code2, Zap, Users, Clock, BookOpen
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Blog = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = [
    { id: 'all', name: 'All Posts', count: 12 },
    { id: 'tutorials', name: 'Tutorials', count: 5 },
    { id: 'product', name: 'Product Updates', count: 3 },
    { id: 'ai', name: 'AI Insights', count: 4 }
  ];

  const posts = [
    {
      id: 'getting-started-visual-ai-pipelines',
      title: 'Getting Started with Visual AI Pipeline Building',
      excerpt: 'Learn how to build your first AI workflow using drag-and-drop components, from simple chatbots to complex reasoning chains.',
      category: 'tutorials',
      author: 'Sarah Kim',
      date: '2024-01-15',
      readTime: '8 min read',
      featured: true,
      tags: ['beginners', 'tutorial', 'visual-builder'],
      image: '/api/placeholder/600/300'
    },
    {
      id: 'gpt4-vs-claude-model-comparison',
      title: 'GPT-4 vs Claude: Choosing the Right Model for Your Pipeline',
      excerpt: 'A comprehensive comparison of leading AI models, their strengths, costs, and optimal use cases in production workflows.',
      category: 'ai',
      author: 'Dr. Emily Watson',
      date: '2024-01-12',
      readTime: '12 min read',
      featured: true,
      tags: ['ai-models', 'comparison', 'gpt-4', 'claude'],
      image: '/api/placeholder/600/300'
    },
    {
      id: 'token-optimization-strategies',
      title: '10 Ways to Optimize Token Usage in LLM Workflows',
      excerpt: 'Practical strategies to reduce costs and improve performance in your AI pipelines without sacrificing quality.',
      category: 'tutorials',
      author: 'Alex Chen',
      date: '2024-01-10',
      readTime: '10 min read',
      featured: false,
      tags: ['optimization', 'cost-reduction', 'performance'],
      image: '/api/placeholder/600/300'
    },
    {
      id: 'collaboration-features-announcement',
      title: 'Announcing PulseSpark.ai 2.0: Real-time Collaboration',
      excerpt: 'Introducing live cursors, team comments, and shared workspaces to make AI development truly collaborative.',
      category: 'product',
      author: 'Marcus Rodriguez',
      date: '2024-01-08',
      readTime: '6 min read',
      featured: false,
      tags: ['product-update', 'collaboration', 'teams'],
      image: '/api/placeholder/600/300'
    },
    {
      id: 'rag-implementation-guide',
      title: 'Building Production-Ready RAG Systems: A Complete Guide',
      excerpt: 'Step-by-step guide to implementing Retrieval-Augmented Generation systems that scale in production environments.',
      category: 'tutorials',
      author: 'Dr. Emily Watson',
      date: '2024-01-05',
      readTime: '15 min read',
      featured: false,
      tags: ['rag', 'advanced', 'production'],
      image: '/api/placeholder/600/300'
    },
    {
      id: 'ai-safety-best-practices',
      title: 'AI Safety Best Practices for Production Deployments',
      excerpt: 'Essential safety measures and monitoring strategies for deploying AI systems in production environments.',
      category: 'ai',
      author: 'Sarah Kim',
      date: '2024-01-03',
      readTime: '11 min read',
      featured: false,
      tags: ['ai-safety', 'production', 'monitoring'],
      image: '/api/placeholder/600/300'
    }
  ];

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.excerpt.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || post.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const featuredPosts = posts.filter(post => post.featured);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'tutorials': return <BookOpen className="w-4 h-4" />;
      case 'product': return <Zap className="w-4 h-4" />;
      case 'ai': return <Brain className="w-4 h-4" />;
      default: return <Sparkles className="w-4 h-4" />;
    }
  };

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
        <h1 className="text-5xl md:text-6xl font-bold mb-6">
          AI Development
          <span className="block text-transparent bg-gradient-to-r from-primary via-purple-500 to-primary bg-clip-text">
            Insights & Tutorials
          </span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Learn from our team and community about building better AI workflows, 
          optimization strategies, and the latest in AI development.
        </p>
      </section>

      {/* Search & Filters */}
      <section className="container mx-auto px-6 pb-12">
        <div className="flex flex-col md:flex-row gap-6 max-w-4xl mx-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search articles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
                className={selectedCategory === category.id ? 'bg-gradient-primary' : ''}
              >
                {getCategoryIcon(category.id)}
                <span className="ml-2">{category.name}</span>
                <Badge variant="secondary" className="ml-2">
                  {category.count}
                </Badge>
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Posts */}
      {selectedCategory === 'all' && (
        <section className="container mx-auto px-6 pb-20">
          <h2 className="text-3xl font-bold mb-8">Featured Articles</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {featuredPosts.map((post, index) => (
              <Card key={post.id} className="border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-elegant transition-all duration-300 cursor-pointer group">
                <div className="aspect-video bg-gradient-primary/10 rounded-t-lg flex items-center justify-center">
                  <BookOpen className="w-12 h-12 text-primary/50" />
                </div>
                <CardHeader>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="secondary" className="capitalize">
                      {getCategoryIcon(post.category)}
                      <span className="ml-1">{post.category}</span>
                    </Badge>
                    {post.featured && (
                      <Badge className="bg-primary/10 text-primary border-primary/20">
                        Featured
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-xl group-hover:text-primary transition-colors">
                    {post.title}
                  </CardTitle>
                  <CardDescription className="text-base leading-relaxed">
                    {post.excerpt}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      <span>{post.author}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(post.date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{post.readTime}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {post.tags.map((tag, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <Button variant="ghost" className="w-full group-hover:bg-primary/10">
                    Read Article
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* All Posts */}
      <section className="container mx-auto px-6 pb-20">
        <h2 className="text-3xl font-bold mb-8">
          {selectedCategory === 'all' ? 'Latest Articles' : `${categories.find(c => c.id === selectedCategory)?.name}`}
        </h2>
        
        {filteredPosts.length === 0 ? (
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm text-center p-16">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No articles found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search terms or category filter.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPosts.map((post) => (
              <Card key={post.id} className="border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-elegant transition-all duration-300 cursor-pointer group">
                <div className="aspect-video bg-gradient-primary/10 rounded-t-lg flex items-center justify-center">
                  <BookOpen className="w-8 h-8 text-primary/50" />
                </div>
                <CardHeader>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="secondary" className="capitalize">
                      {getCategoryIcon(post.category)}
                      <span className="ml-1">{post.category}</span>
                    </Badge>
                  </div>
                  <CardTitle className="text-lg group-hover:text-primary transition-colors line-clamp-2">
                    {post.title}
                  </CardTitle>
                  <CardDescription className="text-sm leading-relaxed line-clamp-3">
                    {post.excerpt}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
                    <span>{post.author}</span>
                    <span>•</span>
                    <span>{new Date(post.date).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>{post.readTime}</span>
                  </div>
                  <Button variant="ghost" size="sm" className="w-full group-hover:bg-primary/10">
                    Read More
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Newsletter CTA */}
      <section className="container mx-auto px-6 py-20">
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-purple-500/5 backdrop-blur-sm">
          <CardContent className="p-16 text-center">
            <h2 className="text-4xl font-bold mb-6">
              Stay updated with AI insights
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Get the latest tutorials, product updates, and AI development insights 
              delivered to your inbox.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center max-w-md mx-auto">
              <Input 
                placeholder="Enter your email" 
                className="flex-1"
                type="email"
              />
              <Button className="bg-gradient-primary px-8">
                Subscribe
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              No spam, unsubscribe at any time
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default Blog;