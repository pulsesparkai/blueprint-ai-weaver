import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExportRequest {
  blueprintId: string;
  format: 'python' | 'docker';
  includeConfig?: boolean;
  includeRequirements?: boolean;
}

// Python template generation
function generatePythonScript(blueprint: any, config: any): string {
  const { nodes, edges } = blueprint;
  
  const imports = [
    "from langchain.llms import OpenAI",
    "from langchain.chat_models import ChatOpenAI", 
    "from langchain.prompts import PromptTemplate",
    "from langchain.chains import LLMChain",
    "from langchain.memory import ConversationBufferMemory",
    "from langchain.vectorstores import Chroma",
    "from langchain.embeddings import OpenAIEmbeddings",
    "from langchain.text_splitter import CharacterTextSplitter",
    "from langchain.document_loaders import TextLoader",
    "from langchain.retrievers import ContextualCompressionRetriever",
    "from langchain.output_parsers import PydanticOutputParser",
    "import os",
    "import json",
    "from typing import Dict, List, Any",
    "from datetime import datetime"
  ];

  let classDefinitions = "";
  let initMethod = "    def __init__(self, api_key: str = None):\n";
  initMethod += "        self.api_key = api_key or os.getenv('OPENAI_API_KEY')\n";
  initMethod += "        if not self.api_key:\n";
  initMethod += "            raise ValueError('OpenAI API key is required')\n\n";
  
  let setupMethod = "    def setup_pipeline(self):\n";
  setupMethod += "        \"\"\"Initialize the LangChain pipeline based on blueprint configuration\"\"\"\n";
  
  let executeMethod = "    def execute(self, query: str, **kwargs) -> Dict[str, Any]:\n";
  executeMethod += "        \"\"\"Execute the pipeline with given input\"\"\"\n";
  executeMethod += "        context = {'query': query, 'timestamp': datetime.now().isoformat()}\n";
  executeMethod += "        context.update(kwargs)\n\n";

  // Process nodes to generate code
  const nodeVariables: { [key: string]: string } = {};
  const promptNodes = nodes.filter((n: any) => n.type === 'prompt-template');
  const memoryNodes = nodes.filter((n: any) => n.type === 'memory-store');
  const ragNodes = nodes.filter((n: any) => n.type === 'rag-retriever');
  const outputNodes = nodes.filter((n: any) => n.type === 'output-parser');

  // Generate LLM setup
  initMethod += "        self.llm = ChatOpenAI(\n";
  initMethod += "            api_key=self.api_key,\n";
  initMethod += "            temperature=0.7,\n";
  initMethod += "            model_name='gpt-3.5-turbo'\n";
  initMethod += "        )\n\n";

  // Generate memory setup
  if (memoryNodes.length > 0) {
    const memoryNode = memoryNodes[0];
    const maxTokens = memoryNode.data?.maxTokens || 2000;
    
    initMethod += "        # Memory configuration\n";
    initMethod += `        self.memory = ConversationBufferMemory(\n`;
    initMethod += `            max_token_limit=${maxTokens},\n`;
    initMethod += "            return_messages=True,\n";
    initMethod += "            memory_key='chat_history'\n";
    initMethod += "        )\n\n";
    
    nodeVariables[memoryNode.id] = "self.memory";
  }

  // Generate RAG retriever setup
  if (ragNodes.length > 0) {
    const ragNode = ragNodes[0];
    const dataSource = ragNode.data?.dataSource || "your_documents.txt";
    
    setupMethod += "        # RAG Retriever setup\n";
    setupMethod += "        try:\n";
    setupMethod += `            loader = TextLoader('${dataSource}')\n`;
    setupMethod += "            documents = loader.load()\n";
    setupMethod += "            text_splitter = CharacterTextSplitter(chunk_size=1000, chunk_overlap=200)\n";
    setupMethod += "            texts = text_splitter.split_documents(documents)\n";
    setupMethod += "            \n";
    setupMethod += "            embeddings = OpenAIEmbeddings(openai_api_key=self.api_key)\n";
    setupMethod += "            self.vectorstore = Chroma.from_documents(texts, embeddings)\n";
    setupMethod += "            self.retriever = self.vectorstore.as_retriever(\n";
    setupMethod += `                search_kwargs={"k": ${ragNode.data?.maxResults || 3}}\n`;
    setupMethod += "            )\n";
    setupMethod += "        except Exception as e:\n";
    setupMethod += "            print(f'Warning: Could not load RAG documents: {e}')\n";
    setupMethod += "            self.retriever = None\n\n";
    
    nodeVariables[ragNode.id] = "self.retriever";
  }

  // Generate prompt templates
  promptNodes.forEach((node: any, index: number) => {
    const template = node.data?.template || "Process this input: {input}";
    const variables = node.data?.variables || ['input'];
    const varName = `prompt_template_${index}`;
    
    setupMethod += `        # Prompt Template: ${node.data?.label || 'Unnamed'}\n`;
    setupMethod += `        self.${varName} = PromptTemplate(\n`;
    setupMethod += `            input_variables=${JSON.stringify(variables)},\n`;
    setupMethod += `            template="""${template}"""\n`;
    setupMethod += "        )\n\n";
    
    nodeVariables[node.id] = `self.${varName}`;
  });

  // Generate chains based on connections
  setupMethod += "        # Create processing chains\n";
  if (promptNodes.length > 0) {
    setupMethod += "        self.main_chain = LLMChain(\n";
    setupMethod += "            llm=self.llm,\n";
    setupMethod += `            prompt=self.${Object.keys(nodeVariables).find(k => nodes.find((n: any) => n.id === k)?.type === 'prompt-template') ? 'prompt_template_0' : 'prompt_template_0'},\n`;
    if (memoryNodes.length > 0) {
      setupMethod += "            memory=self.memory,\n";
    }
    setupMethod += "            verbose=True\n";
    setupMethod += "        )\n\n";
  }

  // Generate execution logic
  executeMethod += "        try:\n";
  
  if (ragNodes.length > 0) {
    executeMethod += "            # Retrieve relevant documents\n";
    executeMethod += "            if hasattr(self, 'retriever') and self.retriever:\n";
    executeMethod += "                docs = self.retriever.get_relevant_documents(query)\n";
    executeMethod += "                context['retrieved_docs'] = [doc.page_content for doc in docs]\n";
    executeMethod += "                context['documents'] = '\\n'.join(context['retrieved_docs'])\n";
    executeMethod += "            else:\n";
    executeMethod += "                context['documents'] = ''\n\n";
  }

  if (promptNodes.length > 0) {
    executeMethod += "            # Execute main chain\n";
    executeMethod += "            response = self.main_chain.predict(**context)\n";
    executeMethod += "            \n";
    executeMethod += "            result = {\n";
    executeMethod += "                'response': response,\n";
    executeMethod += "                'input_query': query,\n";
    executeMethod += "                'timestamp': context['timestamp'],\n";
    if (ragNodes.length > 0) {
      executeMethod += "                'retrieved_docs': context.get('retrieved_docs', []),\n";
    }
    executeMethod += "            }\n\n";
  } else {
    executeMethod += "            result = {\n";
    executeMethod += "                'response': 'No processing chains configured',\n";
    executeMethod += "                'input_query': query,\n";
    executeMethod += "                'timestamp': context['timestamp']\n";
    executeMethod += "            }\n\n";
  }

  // Handle output parsing
  if (outputNodes.length > 0) {
    const outputNode = outputNodes[0];
    const parserType = outputNode.data?.parserType || 'text';
    
    executeMethod += "            # Apply output parsing\n";
    if (parserType === 'json') {
      executeMethod += "            try:\n";
      executeMethod += "                import re\n";
      executeMethod += "                json_match = re.search(r'\\{[^}]*\\}', response)\n";
      executeMethod += "                if json_match:\n";
      executeMethod += "                    result['parsed_output'] = json.loads(json_match.group())\n";
      executeMethod += "                else:\n";
      executeMethod += "                    result['parsed_output'] = {'content': response}\n";
      executeMethod += "            except json.JSONDecodeError:\n";
      executeMethod += "                result['parsed_output'] = {'content': response}\n";
    } else {
      executeMethod += `            result['parsed_output'] = response  # ${parserType} parsing\n`;
    }
    executeMethod += "\n";
  }

  executeMethod += "            return result\n\n";
  executeMethod += "        except Exception as e:\n";
  executeMethod += "            return {\n";
  executeMethod += "                'error': str(e),\n";
  executeMethod += "                'input_query': query,\n";
  executeMethod += "                'timestamp': context['timestamp']\n";
  executeMethod += "            }\n\n";

  // Main class assembly
  classDefinitions += `class ${blueprint.title.replace(/[^a-zA-Z0-9]/g, '')}Pipeline:\n`;
  classDefinitions += '    """Generated LangChain pipeline from ContextForge blueprint"""\n\n';
  classDefinitions += initMethod;
  classDefinitions += setupMethod;
  classDefinitions += executeMethod;

  // Main execution
  const mainFunction = `
def main():
    """Example usage of the generated pipeline"""
    # Initialize the pipeline
    pipeline = ${blueprint.title.replace(/[^a-zA-Z0-9]/g, '')}Pipeline()
    pipeline.setup_pipeline()
    
    # Example query
    test_query = "What is the main topic discussed in the documents?"
    result = pipeline.execute(test_query)
    
    print("Pipeline Result:")
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()
`;

  return imports.join('\n') + '\n\n' + classDefinitions + mainFunction;
}

// Docker template generation
function generateDockerSetup(blueprint: any, config: any): { dockerfile: string, dockerCompose: string, requirements: string } {
  const { nodes } = blueprint;
  
  const hasRAG = nodes.some((n: any) => n.type === 'rag-retriever');
  const hasMemory = nodes.some((n: any) => n.type === 'memory-store');
  
  const requirements = [
    "langchain>=0.1.0",
    "openai>=1.0.0",
    "python-dotenv>=1.0.0",
    "fastapi>=0.100.0",
    "uvicorn>=0.23.0",
    hasRAG ? "chromadb>=0.4.0" : null,
    hasRAG ? "sentence-transformers>=2.2.0" : null,
    hasMemory ? "redis>=4.5.0" : null,
    "pydantic>=2.0.0",
    "tiktoken>=0.5.0"
  ].filter(Boolean).join('\n');

  const dockerfile = `# Generated Dockerfile for ${blueprint.title}
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \\
    gcc \\
    g++ \\
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create data directory for RAG documents
${hasRAG ? 'RUN mkdir -p /app/data' : '# No RAG setup needed'}

# Set environment variables
ENV PYTHONPATH=/app
ENV OPENAI_API_KEY=""

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \\
    CMD python -c "import requests; requests.get('http://localhost:8000/health')" || exit 1

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
`;

  const dockerCompose = `# Generated Docker Compose for ${blueprint.title}
version: '3.8'

services:
  ${blueprint.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}:
    build: .
    ports:
      - "8000:8000"
    environment:
      - OPENAI_API_KEY=\${OPENAI_API_KEY}
      ${hasMemory ? '- REDIS_URL=redis://redis:6379' : ''}
    volumes:
      - ./data:/app/data:ro
    depends_on:
      ${hasMemory ? `
      - redis` : ''}
    restart: unless-stopped
    networks:
      - app-network

${hasMemory ? `
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped
    networks:
      - app-network
` : ''}

${hasMemory ? `volumes:
  redis_data:
` : ''}

networks:
  app-network:
    driver: bridge
`;

  return { dockerfile, dockerCompose, requirements };
}

// Generate FastAPI application
function generateFastAPIApp(blueprint: any): string {
  const className = blueprint.title.replace(/[^a-zA-Z0-9]/g, '');
  
  return `# Generated FastAPI application for ${blueprint.title}
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional
import os
from contextlib import asynccontextmanager

# Import the generated pipeline
from pipeline import ${className}Pipeline

# Global pipeline instance
pipeline = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize pipeline on startup
    global pipeline
    try:
        pipeline = ${className}Pipeline()
        pipeline.setup_pipeline()
        print("Pipeline initialized successfully")
    except Exception as e:
        print(f"Failed to initialize pipeline: {e}")
        pipeline = None
    
    yield
    
    # Cleanup on shutdown
    print("Application shutting down")

app = FastAPI(
    title="${blueprint.title} API",
    description="Generated API from ContextForge blueprint",
    version="1.0.0",
    lifespan=lifespan
)

class QueryRequest(BaseModel):
    query: str
    context: Optional[Dict[str, Any]] = {}

class QueryResponse(BaseModel):
    response: str
    input_query: str
    timestamp: str
    retrieved_docs: Optional[list] = None
    parsed_output: Optional[Any] = None
    error: Optional[str] = None

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "pipeline_ready": pipeline is not None,
        "blueprint": "${blueprint.title}"
    }

@app.post("/query", response_model=QueryResponse)
async def process_query(request: QueryRequest):
    """Process a query through the pipeline"""
    if not pipeline:
        raise HTTPException(status_code=503, detail="Pipeline not initialized")
    
    try:
        result = pipeline.execute(request.query, **request.context)
        return QueryResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/blueprint")
async def get_blueprint_info():
    """Get information about the blueprint"""
    return {
        "title": "${blueprint.title}",
        "description": "${blueprint.description || 'No description'}",
        "node_count": ${blueprint.nodes.length},
        "edge_count": ${blueprint.edges.length},
        "created_at": "${new Date().toISOString()}"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization required');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    const { blueprintId, format, includeConfig, includeRequirements }: ExportRequest = await req.json();

    // Get the blueprint
    const { data: blueprint, error: blueprintError } = await supabaseClient
      .from('blueprints')
      .select('*')
      .eq('id', blueprintId)
      .eq('user_id', user.id)
      .single();

    if (blueprintError) throw blueprintError;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeTitle = blueprint.title.replace(/[^a-zA-Z0-9]/g, '_');
    
    let fileContent: string;
    let filename: string;
    let mimeType: string;

    if (format === 'python') {
      // Generate Python script
      fileContent = generatePythonScript(blueprint, { includeConfig, includeRequirements });
      filename = `${safeTitle}_pipeline_${timestamp}.py`;
      mimeType = 'text/x-python';
    } else if (format === 'docker') {
      // Generate Docker setup as a ZIP-like structure
      const pythonScript = generatePythonScript(blueprint, { includeConfig, includeRequirements });
      const dockerFiles = generateDockerSetup(blueprint, { includeConfig, includeRequirements });
      const fastApiApp = generateFastAPIApp(blueprint);
      
      // Create a multi-file structure as a text file with separators
      fileContent = `# ${blueprint.title} Docker Export
# Generated on ${new Date().toISOString()}
# Extract each section to separate files

# =============================================================================
# FILE: requirements.txt
# =============================================================================
${dockerFiles.requirements}

# =============================================================================
# FILE: Dockerfile
# =============================================================================
${dockerFiles.dockerfile}

# =============================================================================
# FILE: docker-compose.yml
# =============================================================================
${dockerFiles.dockerCompose}

# =============================================================================
# FILE: pipeline.py
# =============================================================================
${pythonScript}

# =============================================================================
# FILE: main.py
# =============================================================================
${fastApiApp}

# =============================================================================
# FILE: README.md
# =============================================================================
# ${blueprint.title} Docker Setup

This is a generated Docker setup for your ContextForge blueprint.

## Quick Start

1. Extract each file section above to separate files
2. Set your OpenAI API key: \`export OPENAI_API_KEY="your-key-here"\`
3. Build and run: \`docker-compose up --build\`
4. API will be available at: http://localhost:8000
5. API docs at: http://localhost:8000/docs

## Files Structure

- \`requirements.txt\` - Python dependencies
- \`Dockerfile\` - Container configuration  
- \`docker-compose.yml\` - Multi-service setup
- \`pipeline.py\` - Generated LangChain pipeline
- \`main.py\` - FastAPI application

## Usage

Send POST request to \`/query\` with:
\`\`\`json
{
  "query": "Your question here",
  "context": {}
}
\`\`\`

## Notes

- Place your documents in \`./data/\` directory for RAG
- Configure environment variables in docker-compose.yml
- Check health at \`/health\` endpoint
`;
      
      filename = `${safeTitle}_docker_setup_${timestamp}.txt`;
      mimeType = 'text/plain';
    } else {
      throw new Error(`Unsupported export format: ${format}`);
    }

    // Upload to Supabase Storage
    const filePath = `${user.id}/${filename}`;
    const fileBuffer = new TextEncoder().encode(fileContent);
    
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('exported-blueprints')
      .upload(filePath, fileBuffer, {
        contentType: mimeType,
        upsert: true
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabaseClient.storage
      .from('exported-blueprints')
      .getPublicUrl(filePath);

    // Log the export
    await supabaseClient
      .from('export_logs')
      .insert({
        blueprint_id: blueprintId,
        user_id: user.id,
        export_format: format,
        filename,
        file_path: filePath,
        file_size: fileBuffer.length,
        download_url: publicUrl,
        export_config: {
          includeConfig,
          includeRequirements,
          nodeCount: blueprint.nodes.length,
          edgeCount: blueprint.edges.length
        }
      });

    return new Response(JSON.stringify({
      success: true,
      filename,
      downloadUrl: publicUrl,
      fileSize: fileBuffer.length,
      format,
      exportedAt: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Blueprint export error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});