import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DatasetAnalysis {
  documentStats: {
    totalDocuments: number;
    averageLength: number;
    maxLength: number;
    minLength: number;
    vocabulary: Set<string>;
    documentTypes: string[];
  };
  textCharacteristics: {
    averageSentenceLength: number;
    complexity: 'simple' | 'medium' | 'complex';
    domain: 'general' | 'technical' | 'academic' | 'code';
    language: string;
  };
  optimalChunkingStrategy: {
    chunkSize: number;
    overlap: number;
    splitterType: 'recursive' | 'semantic' | 'markdown' | 'code';
  };
  embeddingRecommendation: {
    model: string;
    dimensions: number;
    reason: string;
  };
  retrievalConfig: {
    topK: number;
    searchType: 'similarity' | 'mmr' | 'hybrid';
    rerankThreshold: number;
  };
}

interface OptimalRAGConfig {
  chunking: {
    strategy: string;
    chunkSize: number;
    overlap: number;
    preserveStructure: boolean;
  };
  embedding: {
    model: string;
    dimensions: number;
    normalization: boolean;
  };
  retrieval: {
    topK: number;
    searchType: string;
    mmrLambda?: number;
    rerankModel?: string;
  };
  generation: {
    contextWindow: number;
    maxTokens: number;
    temperature: number;
  };
}

// Lightweight text analysis utilities
class TextAnalyzer {
  static analyzeComplexity(text: string): 'simple' | 'medium' | 'complex' {
    const avgWordsPerSentence = this.getAverageWordsPerSentence(text);
    const avgSyllablesPerWord = this.getAverageSyllablesPerWord(text);
    
    // Simple complexity scoring
    const complexityScore = (avgWordsPerSentence * 0.4) + (avgSyllablesPerWord * 0.6);
    
    if (complexityScore < 8) return 'simple';
    if (complexityScore < 14) return 'medium';
    return 'complex';
  }

  static detectDomain(text: string): 'general' | 'technical' | 'academic' | 'code' {
    const technicalKeywords = ['algorithm', 'function', 'class', 'variable', 'method', 'api', 'database', 'server'];
    const academicKeywords = ['hypothesis', 'methodology', 'analysis', 'research', 'study', 'findings', 'conclusion'];
    const codePatterns = [/function\s+\w+\s*\(/, /class\s+\w+/, /import\s+.*from/, /const\s+\w+\s*=/, /def\s+\w+\(/];
    
    const lowerText = text.toLowerCase();
    
    // Check for code patterns first
    if (codePatterns.some(pattern => pattern.test(text))) return 'code';
    
    const technicalScore = technicalKeywords.filter(word => lowerText.includes(word)).length;
    const academicScore = academicKeywords.filter(word => lowerText.includes(word)).length;
    
    if (technicalScore > academicScore && technicalScore > 2) return 'technical';
    if (academicScore > 2) return 'academic';
    return 'general';
  }

  static getAverageWordsPerSentence(text: string): number {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const totalWords = text.split(/\s+/).length;
    return sentences.length > 0 ? totalWords / sentences.length : 0;
  }

  static getAverageSyllablesPerWord(text: string): number {
    const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    const totalSyllables = words.reduce((sum, word) => sum + this.countSyllables(word), 0);
    return words.length > 0 ? totalSyllables / words.length : 0;
  }

  static countSyllables(word: string): number {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;
    
    // Simple syllable counting heuristic
    const vowels = 'aeiouy';
    let count = 0;
    let previousWasVowel = false;
    
    for (let i = 0; i < word.length; i++) {
      const currentIsVowel = vowels.includes(word[i]);
      if (currentIsVowel && !previousWasVowel) count++;
      previousWasVowel = currentIsVowel;
    }
    
    // Adjust for silent 'e'
    if (word.endsWith('e')) count--;
    
    return Math.max(1, count);
  }

  static extractVocabulary(text: string): Set<string> {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);
    return new Set(words);
  }
}

class RAGOptimizer {
  static analyzeDataset(content: string): DatasetAnalysis {
    const documents = content.split(/\n\s*\n/).filter(doc => doc.trim().length > 0);
    const documentLengths = documents.map(doc => doc.length);
    const vocabulary = TextAnalyzer.extractVocabulary(content);
    
    const documentStats = {
      totalDocuments: documents.length,
      averageLength: documentLengths.reduce((a, b) => a + b, 0) / documentLengths.length,
      maxLength: Math.max(...documentLengths),
      minLength: Math.min(...documentLengths),
      vocabulary,
      documentTypes: this.detectDocumentTypes(documents)
    };

    const textCharacteristics = {
      averageSentenceLength: TextAnalyzer.getAverageWordsPerSentence(content),
      complexity: TextAnalyzer.analyzeComplexity(content),
      domain: TextAnalyzer.detectDomain(content),
      language: 'en' // Simple detection, defaulting to English
    };

    const optimalChunkingStrategy = this.recommendChunkingStrategy(documentStats, textCharacteristics);
    const embeddingRecommendation = this.recommendEmbeddingModel(textCharacteristics, documentStats);
    const retrievalConfig = this.recommendRetrievalConfig(documentStats, textCharacteristics);

    return {
      documentStats,
      textCharacteristics,
      optimalChunkingStrategy,
      embeddingRecommendation,
      retrievalConfig
    };
  }

  static detectDocumentTypes(documents: string[]): string[] {
    const types = new Set<string>();
    
    documents.forEach(doc => {
      if (doc.includes('```') || /function\s+\w+/.test(doc)) types.add('code');
      if (doc.includes('# ') || doc.includes('## ')) types.add('markdown');
      if (doc.includes('Abstract:') || doc.includes('References:')) types.add('academic');
      if (doc.includes('<!DOCTYPE') || doc.includes('<html>')) types.add('html');
      if (!types.size) types.add('text');
    });

    return Array.from(types);
  }

  static recommendChunkingStrategy(documentStats: any, textCharacteristics: any): any {
    const { domain, complexity } = textCharacteristics;
    const { averageLength } = documentStats;

    let chunkSize = 1000; // default
    let overlap = 200;
    let splitterType = 'recursive';

    // Adjust based on domain
    switch (domain) {
      case 'code':
        chunkSize = 800;
        overlap = 100;
        splitterType = 'code';
        break;
      case 'academic':
        chunkSize = 1200;
        overlap = 300;
        splitterType = 'recursive';
        break;
      case 'technical':
        chunkSize = 1000;
        overlap = 250;
        splitterType = 'recursive';
        break;
      default:
        chunkSize = 800;
        overlap = 200;
        splitterType = 'recursive';
    }

    // Adjust based on complexity
    if (complexity === 'complex') {
      chunkSize = Math.min(chunkSize + 200, 1500);
      overlap = Math.min(overlap + 50, 400);
    } else if (complexity === 'simple') {
      chunkSize = Math.max(chunkSize - 200, 500);
      overlap = Math.max(overlap - 50, 100);
    }

    // Adjust based on average document length
    if (averageLength < 500) {
      chunkSize = Math.min(chunkSize, averageLength * 0.8);
      overlap = Math.min(overlap, chunkSize * 0.2);
    }

    return {
      chunkSize: Math.round(chunkSize),
      overlap: Math.round(overlap),
      splitterType
    };
  }

  static recommendEmbeddingModel(textCharacteristics: any, documentStats: any): any {
    const { domain, complexity } = textCharacteristics;
    const { vocabularySize } = documentStats;

    // Recommend models based on domain and complexity
    if (domain === 'code') {
      return {
        model: 'text-embedding-3-small',
        dimensions: 1536,
        reason: 'Optimized for code understanding and semantic similarity'
      };
    }

    if (domain === 'academic' || complexity === 'complex') {
      return {
        model: 'text-embedding-3-large',
        dimensions: 3072,
        reason: 'High-dimensional embeddings for complex academic content'
      };
    }

    if (domain === 'technical') {
      return {
        model: 'text-embedding-3-small',
        dimensions: 1536,
        reason: 'Good balance of performance and cost for technical content'
      };
    }

    return {
      model: 'text-embedding-ada-002',
      dimensions: 1536,
      reason: 'Cost-effective general-purpose embedding model'
    };
  }

  static recommendRetrievalConfig(documentStats: any, textCharacteristics: any): any {
    const { totalDocuments, averageLength } = documentStats;
    const { complexity, domain } = textCharacteristics;

    let topK = 5;
    let searchType = 'similarity';
    let rerankThreshold = 0.7;

    // Adjust topK based on dataset size
    if (totalDocuments > 10000) {
      topK = 10;
      searchType = 'mmr'; // Use MMR for diversity in large datasets
    } else if (totalDocuments > 1000) {
      topK = 7;
      searchType = 'hybrid';
    }

    // Adjust based on complexity
    if (complexity === 'complex') {
      topK = Math.min(topK + 2, 15);
      rerankThreshold = 0.75;
    }

    // Adjust based on domain
    if (domain === 'academic') {
      topK = Math.min(topK + 3, 15);
      searchType = 'mmr';
      rerankThreshold = 0.8;
    }

    return {
      topK,
      searchType,
      rerankThreshold
    };
  }

  static generateOptimalConfig(analysis: DatasetAnalysis): OptimalRAGConfig {
    return {
      chunking: {
        strategy: analysis.optimalChunkingStrategy.splitterType,
        chunkSize: analysis.optimalChunkingStrategy.chunkSize,
        overlap: analysis.optimalChunkingStrategy.overlap,
        preserveStructure: analysis.textCharacteristics.domain === 'code'
      },
      embedding: {
        model: analysis.embeddingRecommendation.model,
        dimensions: analysis.embeddingRecommendation.dimensions,
        normalization: true
      },
      retrieval: {
        topK: analysis.retrievalConfig.topK,
        searchType: analysis.retrievalConfig.searchType,
        mmrLambda: analysis.retrievalConfig.searchType === 'mmr' ? 0.7 : undefined,
        rerankModel: analysis.textCharacteristics.complexity === 'complex' ? 'ms-marco-MiniLM-L-6-v2' : undefined
      },
      generation: {
        contextWindow: analysis.optimalChunkingStrategy.chunkSize * analysis.retrievalConfig.topK + 1000,
        maxTokens: Math.min(4000, analysis.optimalChunkingStrategy.chunkSize * 2),
        temperature: analysis.textCharacteristics.domain === 'technical' ? 0.1 : 0.3
      }
    };
  }

  static async extractTextFromFile(fileData: Blob, filePath: string): Promise<string> {
    const fileName = filePath.toLowerCase();
    
    try {
      if (fileName.endsWith('.txt') || fileName.endsWith('.md')) {
        return await fileData.text();
      }
      
      if (fileName.endsWith('.csv')) {
        const csvText = await fileData.text();
        // Simple CSV to text conversion
        return csvText.split('\n').map(line => {
          const values = line.split(',').map(v => v.trim().replace(/^"(.*)"$/, '$1'));
          return values.join(' ');
        }).join('\n');
      }
      
      if (fileName.endsWith('.json')) {
        const jsonText = await fileData.text();
        const jsonData = JSON.parse(jsonText);
        
        // Extract text content from JSON
        return RAGOptimizer.extractTextFromJson(jsonData);
      }
      
      if (fileName.endsWith('.pdf')) {
        // For PDF files, we'd need a PDF parser library
        // For now, throw an error suggesting text extraction
        throw new Error('PDF files require text extraction. Please convert to .txt first.');
      }
      
      if (fileName.endsWith('.docx')) {
        // For DOCX files, we'd need a DOCX parser library
        // For now, throw an error suggesting text extraction
        throw new Error('DOCX files require text extraction. Please convert to .txt first.');
      }
      
      // Default to treating as text
      return await fileData.text();
      
    } catch (error) {
      throw new Error(`Failed to extract text from ${fileName}: ${error.message}`);
    }
  }

  static extractTextFromJson(obj: any, maxDepth: number = 5): string {
    if (maxDepth <= 0) return '';
    
    if (typeof obj === 'string') {
      return obj;
    }
    
    if (typeof obj === 'number' || typeof obj === 'boolean') {
      return String(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => RAGOptimizer.extractTextFromJson(item, maxDepth - 1)).join(' ');
    }
    
    if (typeof obj === 'object' && obj !== null) {
      return Object.values(obj)
        .map(value => RAGOptimizer.extractTextFromJson(value, maxDepth - 1))
        .join(' ');
    }
    
    return '';
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify user authentication
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Authentication failed');
    }

    // Check user tier for feature access
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    if (profile?.subscription_tier === 'free') {
      return new Response(
        JSON.stringify({
          error: 'Auto-Configure RAG is available for Pro and Enterprise tiers only'
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { filePath, blueprintId } = await req.json();

    if (!filePath) {
      throw new Error('File path is required');
    }

    console.log(`Starting RAG analysis for file: ${filePath}`);

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('rag-datasets')
      .download(filePath);

    if (downloadError) {
      throw new Error(`Failed to download file: ${downloadError.message}`);
    }

    // Convert file to text based on file type
    const content = await RAGOptimizer.extractTextFromFile(fileData, filePath);
    
    if (content.length > 1000000) { // 1MB limit for analysis
      throw new Error('File too large for analysis (max 1MB)');
    }

    console.log(`Analyzing dataset: ${content.length} characters`);

    // Analyze the dataset
    const analysis = RAGOptimizer.analyzeDataset(content);
    const optimalConfig = RAGOptimizer.generateOptimalConfig(analysis);

    console.log('Analysis completed', {
      documents: analysis.documentStats.totalDocuments,
      domain: analysis.textCharacteristics.domain,
      complexity: analysis.textCharacteristics.complexity,
      chunkSize: analysis.optimalChunkingStrategy.chunkSize
    });

    // Save analysis results
    const { error: saveError } = await supabase
      .from('rag_analyses')
      .insert({
        user_id: user.id,
        blueprint_id: blueprintId,
        dataset_filename: filePath.split('/').pop(),
        dataset_size: content.length,
        analysis_results: {
          documentStats: {
            ...analysis.documentStats,
            vocabulary: Array.from(analysis.documentStats.vocabulary).slice(0, 100) // Limit for storage
          },
          textCharacteristics: analysis.textCharacteristics,
          optimalChunkingStrategy: analysis.optimalChunkingStrategy,
          embeddingRecommendation: analysis.embeddingRecommendation,
          retrievalConfig: analysis.retrievalConfig
        },
        optimal_config: optimalConfig
      });

    if (saveError) {
      console.error('Failed to save analysis:', saveError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis: {
          ...analysis,
          documentStats: {
            ...analysis.documentStats,
            vocabulary: Array.from(analysis.documentStats.vocabulary).slice(0, 100)
          }
        },
        optimalConfig,
        recommendations: {
          summary: `Analyzed ${analysis.documentStats.totalDocuments} documents with ${analysis.textCharacteristics.complexity} complexity in ${analysis.textCharacteristics.domain} domain`,
          chunkingStrategy: `Use ${analysis.optimalChunkingStrategy.splitterType} splitter with ${analysis.optimalChunkingStrategy.chunkSize} tokens and ${analysis.optimalChunkingStrategy.overlap} overlap`,
          embeddingModel: analysis.embeddingRecommendation.reason,
          retrievalConfig: `Retrieve top ${analysis.retrievalConfig.topK} chunks using ${analysis.retrievalConfig.searchType} search`
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('RAG auto-config error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to analyze dataset'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});