import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('RAG Retriever function called');

    const { query, database = 'vector-db', topK = 5 } = await req.json();

    if (!query) {
      throw new Error('Query is required');
    }

    console.log(`Searching ${database} for: "${query}" (top ${topK} results)`);

    // Simulate RAG retrieval processing
    await new Promise(resolve => setTimeout(resolve, 800));

    // Generate mock results based on the query
    const mockResults = Array.from({ length: topK }, (_, i) => {
      const docId = `doc_${Date.now()}_${i + 1}`;
      const score = 0.95 - (i * 0.1) - (Math.random() * 0.05);
      
      return {
        id: docId,
        content: `Retrieved document ${i + 1} related to "${query}". This is simulated content that would normally come from a vector database search. The content contains relevant information about the query topic and provides contextual information for further processing.`,
        score: Math.max(0.1, score),
        metadata: {
          source: `${database}_document_${i + 1}.txt`,
          section: `Section ${i + 1}`,
          timestamp: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)).toISOString(),
          wordCount: 45 + Math.floor(Math.random() * 20),
          database: database
        }
      };
    });

    // Sort by score (highest first)
    mockResults.sort((a, b) => b.score - a.score);

    const metadata = {
      totalResults: topK,
      database: database,
      query: query,
      processingTime: 800,
      searchStrategy: 'semantic_similarity',
      timestamp: new Date().toISOString()
    };

    console.log(`RAG retrieval completed: ${mockResults.length} results found`);

    return new Response(JSON.stringify({
      results: mockResults,
      metadata: metadata
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in RAG retriever:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Unknown error occurred',
      results: [],
      metadata: null
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});