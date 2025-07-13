import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { OptimizationModal } from '@/components/OptimizationModal';
import { Brain, FileText, Database, Settings, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Mock dataset for testing
const mockDatasets = {
  technical: {
    name: "Technical Documentation",
    description: "API documentation and technical guides",
    content: `
# API Authentication Guide

## Overview
This document describes the authentication mechanisms available in our REST API. The API supports OAuth 2.0, JWT tokens, and API key authentication methods.

## OAuth 2.0 Implementation
OAuth 2.0 is the recommended authentication method for production applications. It provides secure, token-based authentication with proper scope management.

### Authorization Code Flow
The authorization code flow is suitable for server-side applications where the client secret can be securely stored.

1. Redirect user to authorization endpoint
2. User grants permission
3. Authorization server returns authorization code
4. Exchange code for access token
5. Use access token for API requests

### Client Credentials Flow
For machine-to-machine authentication, use the client credentials flow:

\`\`\`javascript
const response = await fetch('https://api.example.com/oauth/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: 'your_client_id',
    client_secret: 'your_client_secret'
  })
});
\`\`\`

## JWT Token Authentication
JSON Web Tokens provide a stateless authentication mechanism. Tokens are signed and can contain user information and permissions.

### Token Structure
JWT tokens consist of three parts separated by dots:
- Header: Contains token type and signing algorithm
- Payload: Contains claims (user data, permissions, expiration)
- Signature: Ensures token integrity

### Implementation Example
\`\`\`python
import jwt
import datetime

def generate_token(user_id, permissions):
    payload = {
        'user_id': user_id,
        'permissions': permissions,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm='HS256')
\`\`\`

## API Key Authentication
API keys provide simple authentication for server-to-server communication. Include the API key in the Authorization header.

### Usage
\`\`\`bash
curl -H "Authorization: Bearer YOUR_API_KEY" https://api.example.com/data
\`\`\`

### Security Considerations
- Rotate API keys regularly
- Use environment variables to store keys
- Implement rate limiting
- Monitor API key usage

## Rate Limiting
All authentication methods are subject to rate limiting:
- OAuth: 1000 requests per hour
- JWT: 5000 requests per hour  
- API Key: 10000 requests per hour

## Error Handling
The API returns standard HTTP status codes:
- 401: Unauthorized (invalid credentials)
- 403: Forbidden (insufficient permissions)
- 429: Too Many Requests (rate limit exceeded)

## Best Practices
1. Always use HTTPS in production
2. Implement proper token refresh logic
3. Store secrets securely
4. Log authentication events
5. Implement proper session management
`,
    expectedConfig: {
      domain: "technical",
      complexity: "medium",
      chunkSize: 1000,
      embedding: "text-embedding-3-small"
    }
  },
  
  academic: {
    name: "Research Paper",
    description: "Academic research on machine learning",
    content: `
# Deep Learning Approaches to Natural Language Understanding

## Abstract
This research investigates the effectiveness of transformer-based architectures in natural language understanding tasks. We propose a novel attention mechanism that improves performance on complex reasoning tasks while maintaining computational efficiency. Our experiments demonstrate significant improvements over baseline models across multiple benchmarks.

## 1. Introduction
Natural language understanding (NLU) remains one of the most challenging problems in artificial intelligence. Recent advances in transformer architectures have shown remarkable progress, but limitations persist in handling complex reasoning and maintaining contextual coherence across long documents.

The primary contributions of this work include:
1. A novel multi-head attention mechanism with dynamic weighting
2. Comprehensive evaluation on reasoning benchmarks
3. Analysis of computational efficiency trade-offs
4. Open-source implementation for reproducibility

## 2. Related Work
### 2.1 Transformer Architectures
The transformer model introduced by Vaswani et al. (2017) revolutionized natural language processing through the self-attention mechanism. Subsequent work has explored various modifications including BERT (Devlin et al., 2018), GPT (Radford et al., 2018), and T5 (Raffel et al., 2019).

### 2.2 Attention Mechanisms
Attention mechanisms allow models to focus on relevant parts of the input sequence. Bahdanau et al. (2014) introduced additive attention, while Luong et al. (2015) proposed multiplicative attention. The scaled dot-product attention in transformers has become the standard approach.

### 2.3 Reasoning in Neural Networks
Neural reasoning capabilities have been explored through various approaches including memory networks (Weston et al., 2014), neural module networks (Andreas et al., 2016), and graph neural networks (Scarselli et al., 2008).

## 3. Methodology
### 3.1 Model Architecture
Our proposed architecture extends the standard transformer with a dynamic attention weighting mechanism. The core innovation lies in the adaptive computation of attention weights based on query complexity.

Given input sequence X = {x₁, x₂, ..., xₙ}, we compute attention weights as:

α_ij = softmax(Q_i · K_j / √d_k · w_ij)

where w_ij represents the dynamic weighting factor computed by a small neural network that takes into account the semantic similarity between queries and keys.

### 3.2 Training Procedure
We employ a multi-stage training procedure:
1. Pre-training on large-scale text corpus
2. Fine-tuning on reasoning tasks
3. Reinforcement learning optimization

The loss function combines standard cross-entropy with a reasoning consistency term:

L = L_ce + λL_reasoning

### 3.3 Datasets
We evaluate our approach on multiple benchmarks:
- GLUE (General Language Understanding Evaluation)
- SuperGLUE (More challenging language understanding tasks)
- CommonsenseQA (Commonsense reasoning)
- Mathematical reasoning datasets

## 4. Experimental Results
### 4.1 Performance Comparison
Our model achieves state-of-the-art results on several benchmarks:

| Dataset | Baseline | Our Model | Improvement |
|---------|----------|-----------|-------------|
| GLUE | 85.2 | 87.8 | +2.6 |
| SuperGLUE | 76.4 | 79.1 | +2.7 |
| CommonsenseQA | 68.9 | 72.3 | +3.4 |

### 4.2 Ablation Studies
We conduct comprehensive ablation studies to understand the contribution of each component:
1. Dynamic attention weighting: +1.8% improvement
2. Multi-stage training: +1.2% improvement
3. Reasoning consistency loss: +0.9% improvement

### 4.3 Computational Efficiency
Despite the additional complexity, our model maintains reasonable computational requirements:
- Training time: 15% increase over baseline
- Inference time: 8% increase over baseline
- Memory usage: 12% increase over baseline

## 5. Analysis and Discussion
### 5.1 Attention Visualization
Analysis of attention patterns reveals that our dynamic weighting mechanism successfully identifies relevant information for reasoning tasks. The model learns to attend more strongly to logical connectors and causal relationships.

### 5.2 Error Analysis
Common failure modes include:
1. Complex multi-hop reasoning
2. Handling of negation
3. Temporal reasoning

### 5.3 Limitations
While our approach shows promising results, several limitations remain:
- Computational overhead for dynamic attention
- Limited evaluation on domain-specific tasks
- Dependence on pre-training data quality

## 6. Conclusion
We have presented a novel approach to natural language understanding that incorporates dynamic attention weighting. Our experiments demonstrate consistent improvements across multiple benchmarks while maintaining computational efficiency.

Future work will focus on:
1. Scaling to larger models and datasets
2. Integration with multimodal learning
3. Application to specialized domains

## References
[1] Vaswani, A., et al. (2017). Attention is all you need. NIPS.
[2] Devlin, J., et al. (2018). BERT: Pre-training of deep bidirectional transformers. NAACL.
[3] Radford, A., et al. (2018). Improving language understanding by generative pre-training.
`,
    expectedConfig: {
      domain: "academic",
      complexity: "complex",
      chunkSize: 1200,
      embedding: "text-embedding-3-large"
    }
  },

  general: {
    name: "Customer Support FAQ",
    description: "General customer support questions and answers",
    content: `
# Frequently Asked Questions

## Account Management

### How do I create an account?
Creating an account is simple and free. Visit our signup page and provide your email address, choose a secure password, and verify your email. You'll be ready to start using our service immediately.

### How do I reset my password?
If you've forgotten your password, click the "Forgot Password" link on the login page. Enter your email address and we'll send you a reset link. The link expires after 24 hours for security.

### Can I change my email address?
Yes, you can update your email address in your account settings. For security reasons, you'll need to verify the new email address before the change takes effect.

### How do I delete my account?
To delete your account, go to Settings > Account > Delete Account. Please note that this action is irreversible and will permanently remove all your data.

## Billing and Payments

### What payment methods do you accept?
We accept all major credit cards (Visa, MasterCard, American Express), PayPal, and bank transfers for enterprise customers.

### When will I be charged?
For monthly subscriptions, you're charged on the same day each month. For annual subscriptions, you're charged once per year on your signup anniversary.

### Can I get a refund?
We offer a 30-day money-back guarantee for all new subscriptions. If you're not satisfied, contact our support team for a full refund.

### How do I update my payment information?
Go to Settings > Billing and click "Update Payment Method." Your new payment method will be used for future charges.

## Technical Support

### Why is the service running slowly?
Slow performance can be caused by several factors:
- High server load during peak hours
- Your internet connection speed
- Browser cache issues
- Too many open browser tabs

Try refreshing the page or clearing your browser cache. If problems persist, contact support.

### I'm getting error messages. What should I do?
First, try refreshing the page and clearing your browser cache. If the error continues:
1. Take a screenshot of the error message
2. Note what you were doing when the error occurred
3. Contact our support team with these details

### Is my data secure?
Yes, we take security seriously. We use:
- 256-bit SSL encryption for all data transmission
- Regular security audits and penetration testing
- SOC 2 Type II compliance
- Encrypted data storage

### Can I export my data?
Yes, you can export your data at any time. Go to Settings > Data Export and choose your preferred format (CSV, JSON, or PDF).

## Features and Usage

### How do I invite team members?
Go to Settings > Team and click "Invite Member." Enter their email address and select their role. They'll receive an invitation email with setup instructions.

### What's the difference between plans?
Our Basic plan includes core features for individuals. Pro adds advanced analytics and team collaboration. Enterprise includes priority support and custom integrations.

### Can I upgrade or downgrade my plan?
Yes, you can change your plan at any time. Upgrades take effect immediately. Downgrades take effect at your next billing cycle.

### Do you offer discounts?
We offer:
- 20% discount for annual subscriptions
- Educational discounts for students and teachers
- Non-profit organization discounts
- Volume discounts for large teams

### How do I contact support?
You can reach our support team:
- Email: support@example.com
- Live chat: Available 24/7 on our website
- Phone: 1-800-SUPPORT (business hours)
- Help center: Comprehensive documentation and tutorials

## Privacy and Security

### What information do you collect?
We collect only the information necessary to provide our service:
- Account information (email, name)
- Usage data (features used, session duration)
- Technical data (IP address, browser type)

### Do you share my data with third parties?
We never sell your personal data. We only share data with service providers who help us operate our platform, and only as necessary to provide the service.

### How can I control my privacy settings?
Go to Settings > Privacy to control:
- Data sharing preferences
- Email notification settings
- Public profile visibility
- Analytics opt-out options

### What happens if there's a data breach?
In the unlikely event of a data breach, we will:
- Notify affected users within 72 hours
- Provide clear information about what data was affected
- Take immediate steps to secure the breach
- Cooperate with authorities as required by law
`,
    expectedConfig: {
      domain: "general",
      complexity: "simple",
      chunkSize: 800,
      embedding: "text-embedding-ada-002"
    }
  }
};

export function RAGAutoConfigDemo() {
  const [selectedDataset, setSelectedDataset] = useState<keyof typeof mockDatasets | null>(null);
  const [optimizationModalOpen, setOptimizationModalOpen] = useState(false);
  const [appliedConfig, setAppliedConfig] = useState<any>(null);
  const { toast } = useToast();

  const [ragAnalyses, setRagAnalyses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    loadRagAnalyses();
  }, []);

  const loadRagAnalyses = async () => {
    try {
      const { data, error } = await supabase
        .from('rag_analyses')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setRagAnalyses(data || []);
    } catch (error: any) {
      console.error('Error loading RAG analyses:', error);
    }
  };

  const createMockFile = (datasetKey: keyof typeof mockDatasets) => {
    const dataset = mockDatasets[datasetKey];
    const blob = new Blob([dataset.content], { type: 'text/plain' });
    return new File([blob], `${dataset.name.toLowerCase().replace(/\s+/g, '-')}.txt`, { type: 'text/plain' });
  };

  const downloadMockDataset = (datasetKey: keyof typeof mockDatasets) => {
    const file = createMockFile(datasetKey);
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Dataset Downloaded",
      description: `${mockDatasets[datasetKey].name} saved to your downloads folder`
    });
  };

  const handleFileUpload = async (file: File) => {
    setUploadedFile(file);
    setAnalyzing(true);

    try {
      // Upload file to Supabase Storage
      const fileName = `${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('rag-datasets')
        .upload(`${selectedDataset}/${fileName}`, file);

      if (uploadError) throw uploadError;

      // Call RAG auto-config edge function
      const { data, error } = await supabase.functions.invoke('rag-auto-config', {
        body: {
          filename: fileName,
          fileSize: file.size,
          filePath: uploadData.path
        }
      });

      if (error) throw error;

      if (data.success) {
        setAppliedConfig(data.optimalConfig);
        toast({
          title: "Analysis Complete",
          description: "RAG configuration has been optimized for your dataset"
        });
        
        // Refresh analyses list
        await loadRagAnalyses();
      } else {
        throw new Error(data.error || 'Analysis failed');
      }
    } catch (error: any) {
      toast({
        title: "Analysis Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const openOptimizer = (datasetKey: keyof typeof mockDatasets) => {
    setSelectedDataset(datasetKey);
    setOptimizationModalOpen(true);
  };

  const handleRAGConfigApplied = (config: any) => {
    setAppliedConfig(config);
    toast({
      title: "RAG Configuration Applied",
      description: "Optimal configuration has been applied to your pipeline"
    });
  };

  // Mock nodes and edges for the optimization modal
  const mockNodes = [
    { id: '1', type: 'input', data: { label: 'Input' }, position: { x: 0, y: 0 } },
    { id: '2', type: 'ragRetriever', data: { label: 'RAG Retriever' }, position: { x: 200, y: 0 } },
    { id: '3', type: 'llm', data: { label: 'LLM' }, position: { x: 400, y: 0 } },
    { id: '4', type: 'output', data: { label: 'Output' }, position: { x: 600, y: 0 } }
  ];

  const mockEdges = [
    { id: 'e1-2', source: '1', target: '2' },
    { id: 'e2-3', source: '2', target: '3' },
    { id: 'e3-4', source: '3', target: '4' }
  ];

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <Brain className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">RAG Auto-Configuration Demo</h1>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Test the auto-configure RAG feature with sample datasets. Upload a dataset sample to get optimal RAG configuration recommendations based on content analysis.
        </p>
      </div>

      {/* Mock Datasets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.entries(mockDatasets).map(([key, dataset]) => (
          <Card key={key} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {dataset.name}
              </CardTitle>
              <CardDescription>{dataset.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expected Domain:</span>
                  <Badge variant="outline" className="capitalize">
                    {dataset.expectedConfig.domain}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expected Complexity:</span>
                  <Badge variant="outline" className="capitalize">
                    {dataset.expectedConfig.complexity}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expected Chunk Size:</span>
                  <span className="font-medium">{dataset.expectedConfig.chunkSize}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expected Embedding:</span>
                  <span className="font-medium text-xs">{dataset.expectedConfig.embedding}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Button 
                  onClick={() => downloadMockDataset(key as keyof typeof mockDatasets)}
                  variant="outline" 
                  className="w-full"
                  size="sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Sample
                </Button>
                <Button 
                  onClick={() => openOptimizer(key as keyof typeof mockDatasets)}
                  className="w-full"
                  size="sm"
                >
                  <Brain className="w-4 h-4 mr-2" />
                  Test Auto-Config
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Applied Configuration Display */}
      {appliedConfig && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Applied RAG Configuration
            </CardTitle>
            <CardDescription>
              Configuration applied from auto-analysis of {selectedDataset && mockDatasets[selectedDataset]?.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="font-medium">Chunking Strategy</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Strategy:</span>
                    <span className="font-medium capitalize">{appliedConfig.chunking?.strategy}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Chunk Size:</span>
                    <span className="font-medium">{appliedConfig.chunking?.chunkSize} tokens</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Overlap:</span>
                    <span className="font-medium">{appliedConfig.chunking?.overlap} tokens</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium">Embedding Configuration</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Model:</span>
                    <span className="font-medium">{appliedConfig.embedding?.model}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dimensions:</span>
                    <span className="font-medium">{appliedConfig.embedding?.dimensions}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium">Retrieval Configuration</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Top K:</span>
                    <span className="font-medium">{appliedConfig.retrieval?.topK}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Search Type:</span>
                    <span className="font-medium capitalize">{appliedConfig.retrieval?.searchType}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="font-medium">Generation Configuration</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Context Window:</span>
                    <span className="font-medium">{appliedConfig.generation?.contextWindow} tokens</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Temperature:</span>
                    <span className="font-medium">{appliedConfig.generation?.temperature}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-medium">1</span>
            <span>Download a sample dataset using the "Download Sample" button</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-medium">2</span>
            <span>Click "Test Auto-Config" to open the optimization modal</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-medium">3</span>
            <span>Navigate to the "RAG Auto-Config" tab</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-medium">4</span>
            <span>Upload the downloaded dataset file</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-medium">5</span>
            <span>Click "Auto-Configure RAG" to analyze the dataset and get optimal settings</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-medium">6</span>
            <span>Review the recommended configuration and click "Apply Optimal RAG Configuration"</span>
          </div>
        </CardContent>
      </Card>

      {/* Optimization Modal */}
      <OptimizationModal
        isOpen={optimizationModalOpen}
        onClose={() => setOptimizationModalOpen(false)}
        nodes={mockNodes}
        edges={mockEdges}
        blueprintId="demo-blueprint"
        onApplyRAGConfig={handleRAGConfigApplied}
      />
    </div>
  );
}