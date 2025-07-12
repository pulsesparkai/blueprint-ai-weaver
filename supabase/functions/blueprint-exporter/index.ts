import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Handlebars from "https://esm.sh/handlebars@4.7.8";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExportRequest {
  blueprintId: string;
  format: 'python' | 'docker' | 'javascript' | 'typescript';
  includeConfig?: boolean;
  includeRequirements?: boolean;
}

// Template for JavaScript/TypeScript generation
const jsTemplateSource = `{{#if isTypeScript}}// Generated TypeScript LangChain pipeline from ContextForge blueprint
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { LLMChain } from "langchain/chains";
import { ConversationBufferMemory } from "langchain/memory";
import { CheerioWebBaseLoader } from "langchain/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import * as dotenv from "dotenv";

dotenv.config();

interface PipelineResult {
  response: string;
  inputQuery: string;
  timestamp: string;
  retrievedDocs?: string[];
  parsedOutput?: any;
  error?: string;
}

interface PipelineConfig {
  apiKey?: string;
  temperature?: number;
  model?: string;
}
{{else}}// Generated JavaScript LangChain pipeline from ContextForge blueprint
const { ChatOpenAI } = require("@langchain/openai");
const { PromptTemplate } = require("@langchain/core/prompts");
const { LLMChain } = require("langchain/chains");
const { ConversationBufferMemory } = require("langchain/memory");
const { CheerioWebBaseLoader } = require("langchain/document_loaders/web/cheerio");
const { RecursiveCharacterTextSplitter } = require("langchain/text_splitter");
const { OpenAIEmbeddings } = require("@langchain/openai");
const { MemoryVectorStore } = require("langchain/vectorstores/memory");
const dotenv = require("dotenv");

dotenv.config();
{{/if}}

/**
 * {{title}} Pipeline
 * Generated from ContextForge blueprint
 * Created: {{createdAt}}
 */
class {{className}}Pipeline {
  constructor(config{{#if isTypeScript}}: PipelineConfig{{/if}} = {}) {
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    this.temperature = config.temperature || 0.7;
    this.model = config.model || "gpt-3.5-turbo";
    
    if (!this.apiKey) {
      throw new Error("OpenAI API key is required");
    }
    
    this.llm = new ChatOpenAI({
      apiKey: this.apiKey,
      temperature: this.temperature,
      model: this.model,
    });
    
    {{#if hasMemory}}
    this.memory = new ConversationBufferMemory({
      maxTokenLimit: {{memoryMaxTokens}},
      returnMessages: true,
      memoryKey: "chat_history",
    });
    {{/if}}
    
    {{#if hasRAG}}
    this.retriever = null;
    {{/if}}
    
    this.setupComplete = false;
  }

  async setupPipeline() {
    try {
      {{#each promptTemplates}}
      // Prompt Template: {{this.label}}
      this.{{this.varName}} = new PromptTemplate({
        inputVariables: [{{#each this.variables}}"{{this}}"{{#unless @last}}, {{/unless}}{{/each}}],
        template: '{{this.escapedTemplate}}',
      });
      {{/each}}

      {{#if hasRAG}}
      // RAG Retriever setup
      try {
        const loader = new CheerioWebBaseLoader("{{ragDataSource}}");
        const docs = await loader.load();
        
        const textSplitter = new RecursiveCharacterTextSplitter({
          chunkSize: {{ragChunkSize}},
          chunkOverlap: 200,
        });
        
        const splitDocs = await textSplitter.splitDocuments(docs);
        
        const embeddings = new OpenAIEmbeddings({
          apiKey: this.apiKey,
        });
        
        this.vectorStore = await MemoryVectorStore.fromDocuments(
          splitDocs,
          embeddings
        );
        
        this.retriever = this.vectorStore.asRetriever({
          k: {{ragMaxResults}},
        });
        
        console.log("RAG retriever setup completed");
      } catch (error) {
        console.warn("Could not setup RAG retriever:", error.message);
        this.retriever = null;
      }
      {{/if}}

      {{#if promptTemplates.length}}
      // Create main processing chain
      this.mainChain = new LLMChain({
        llm: this.llm,
        prompt: this.{{promptTemplates.0.varName}},
        {{#if hasMemory}}memory: this.memory,{{/if}}
        verbose: true,
      });
      {{/if}}

      this.setupComplete = true;
      console.log("Pipeline setup completed successfully");
    } catch (error) {
      console.error("Failed to setup pipeline:", error);
      throw error;
    }
  }

  async execute(query{{#if isTypeScript}}: string{{/if}}, context{{#if isTypeScript}}: Record<string, any>{{/if}} = {}){{#if isTypeScript}}: Promise<PipelineResult>{{/if}} {
    if (!this.setupComplete) {
      await this.setupPipeline();
    }

    const executionContext = {
      query,
      timestamp: new Date().toISOString(),
      ...context,
    };

    try {
      {{#if hasRAG}}
      // Retrieve relevant documents
      if (this.retriever) {
        const docs = await this.retriever.getRelevantDocuments(query);
        executionContext.retrievedDocs = docs.map(doc => doc.pageContent);
        executionContext.documents = executionContext.retrievedDocs.join("\\n");
      } else {
        executionContext.documents = "";
      }
      {{/if}}

      {{#if promptTemplates.length}}
      // Execute main chain
      const response = await this.mainChain.predict(executionContext);
      
      const result = {
        response,
        inputQuery: query,
        timestamp: executionContext.timestamp,
        {{#if hasRAG}}retrievedDocs: executionContext.retrievedDocs || [],{{/if}}
      };
      {{else}}
      const result = {
        response: "No processing chains configured",
        inputQuery: query,
        timestamp: executionContext.timestamp,
      };
      {{/if}}

      {{#if hasOutputParser}}
      // Apply output parsing
      {{#if (eq outputParserType "json")}}
      try {
        const jsonMatch = response.match(/{[^}]*}/);
        if (jsonMatch) {
          result.parsedOutput = JSON.parse(jsonMatch[0]);
        } else {
          result.parsedOutput = { content: response };
        }
      } catch (error) {
        result.parsedOutput = { content: response };
      }
      {{else}}
      result.parsedOutput = response; // {{outputParserType}} parsing
      {{/if}}
      {{/if}}

      return result;
    } catch (error) {
      return {
        error: error.message,
        inputQuery: query,
        timestamp: executionContext.timestamp,
      };
    }
  }
}

// Example usage
async function main() {
  try {
    const pipeline = new {{className}}Pipeline();
    await pipeline.setupPipeline();
    
    const testQuery = "What is the main topic discussed in the documents?";
    const result = await pipeline.execute(testQuery);
    
    console.log("Pipeline Result:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Error:", error);
  }
}

{{#if isTypeScript}}
export { {{className}}Pipeline };
export type { PipelineResult, PipelineConfig };
{{else}}
module.exports = { {{className}}Pipeline };
{{/if}}

// Run if called directly
if (require.main === module) {
  main();
}`;

// Package.json template
const packageJsonTemplate = `{
  "name": "{{packageName}}",
  "version": "1.0.0",
  "description": "Generated LangChain pipeline from ContextForge blueprint: {{title}}",
  "main": "{{#if isTypeScript}}dist/index.js{{else}}index.js{{/if}}",
  {{#if isTypeScript}}
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node index.ts",
    "test": "jest"
  },
  {{else}}
  "scripts": {
    "start": "node index.js",
    "test": "jest"
  },
  {{/if}}
  "dependencies": {
    "@langchain/openai": "^0.1.0",
    "@langchain/core": "^0.2.0",
    "langchain": "^0.2.0",
    "dotenv": "^16.0.0"{{#if hasRAG}},
    "cheerio": "^1.0.0-rc.12"{{/if}}
  },
  {{#if isTypeScript}}
  "devDependencies": {
    "typescript": "^5.0.0",
    "ts-node": "^10.9.0",
    "@types/node": "^20.0.0",
    "jest": "^29.0.0",
    "@types/jest": "^29.0.0"
  },
  {{/if}}
  "keywords": ["langchain", "ai", "pipeline", "contextforge"],
  "author": "ContextForge Generated",
  "license": "MIT"
}`;

// Dockerfile template for Node.js
const dockerfileNodeTemplate = `# Generated Dockerfile for {{title}}
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

{{#if isTypeScript}}
# Build TypeScript
RUN npm run build
{{/if}}

# Create data directory for documents
{{#if hasRAG}}
RUN mkdir -p /app/data
{{/if}}

# Set environment variables
ENV NODE_ENV=production
ENV OPENAI_API_KEY=""

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \\
    CMD node -e "console.log('Health check passed')" || exit 1

# Run the application
{{#if isTypeScript}}
CMD ["node", "dist/index.js"]
{{else}}
CMD ["node", "index.js"]
{{/if}}
`;

// Generate JavaScript/TypeScript code using templates
function generateJSCode(blueprint: any, isTypeScript: boolean = false): { code: string, packageJson: string, dockerfile: string } {
  console.log(`Generating ${isTypeScript ? 'TypeScript' : 'JavaScript'} code for blueprint:`, blueprint.title);
  
  const { nodes, edges } = blueprint;
  
  // Process nodes
  const promptNodes = nodes.filter((n: any) => n.type === 'prompt-template');
  const memoryNodes = nodes.filter((n: any) => n.type === 'memory-store');
  const ragNodes = nodes.filter((n: any) => n.type === 'rag-retriever');
  const outputNodes = nodes.filter((n: any) => n.type === 'output-parser');
  
  console.log(`Found ${promptNodes.length} prompt nodes, ${memoryNodes.length} memory nodes, ${ragNodes.length} RAG nodes`);
  
  const className = blueprint.title.replace(/[^a-zA-Z0-9]/g, '');
  const packageName = blueprint.title.toLowerCase().replace(/[^a-z0-9]/g, '-');
  
  // Prepare template data
  const templateData = {
    isTypeScript,
    title: blueprint.title,
    className,
    packageName,
    createdAt: new Date().toISOString(),
    hasMemory: memoryNodes.length > 0,
    hasRAG: ragNodes.length > 0,
    hasOutputParser: outputNodes.length > 0,
    memoryMaxTokens: memoryNodes[0]?.data?.maxTokens || 2000,
    ragDataSource: ragNodes[0]?.data?.dataSource || "https://example.com/your-content",
    ragChunkSize: ragNodes[0]?.data?.chunkSize || 1000,
    ragMaxResults: ragNodes[0]?.data?.maxResults || 3,
    outputParserType: outputNodes[0]?.data?.parserType || 'text',
    promptTemplates: promptNodes.map((node: any, index: number) => ({
      label: node.data?.label || 'Unnamed',
      varName: `promptTemplate${index}`,
      template: node.data?.template || "Process this input: {input}",
      escapedTemplate: (node.data?.template || "Process this input: {input}").replace(/'/g, "\\'").replace(/"/g, '\\"'),
      variables: node.data?.variables || ['input']
    }))
  };
  
  console.log('Template data prepared, compiling templates...');
  
  try {
    // Compile templates
    const jsTemplate = Handlebars.compile(jsTemplateSource);
    const packageTemplate = Handlebars.compile(packageJsonTemplate);
    const dockerTemplate = Handlebars.compile(dockerfileNodeTemplate);
    
    const result = {
      code: jsTemplate(templateData),
      packageJson: packageTemplate(templateData),
      dockerfile: dockerTemplate(templateData)
    };
    
    console.log('Templates compiled successfully');
    return result;
  } catch (error) {
    console.error('Error compiling templates:', error);
    throw error;
  }
}

// Python template generation (existing function)
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
  setupMethod += '        """Initialize the LangChain pipeline based on blueprint configuration"""\n';
  
  let executeMethod = "    def execute(self, query: str, **kwargs) -> Dict[str, Any]:\n";
  executeMethod += '        """Execute the pipeline with given input"""\n';
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
    initMethod += "        self.memory = ConversationBufferMemory(\n";
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
    setupMethod += "            prompt=self.prompt_template_0,\n";
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
  console.log(`Blueprint exporter function called with method: ${req.method}`);
  
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

    console.log('Authenticating user...');
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Invalid authentication');
    }

    const requestBody: ExportRequest = await req.json();
    console.log('Export request:', requestBody);

    const { blueprintId, format, includeConfig, includeRequirements } = requestBody;

    // Get the blueprint
    console.log(`Fetching blueprint ${blueprintId}...`);
    const { data: blueprint, error: blueprintError } = await supabaseClient
      .from('blueprints')
      .select('*')
      .eq('id', blueprintId)
      .eq('user_id', user.id)
      .single();

    if (blueprintError) {
      console.error('Blueprint fetch error:', blueprintError);
      throw blueprintError;
    }

    console.log(`Blueprint found: ${blueprint.title} with ${blueprint.nodes.length} nodes`);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeTitle = blueprint.title.replace(/[^a-zA-Z0-9]/g, '_');
    
    let fileContent: string;
    let filename: string;
    let mimeType: string;

    console.log(`Generating ${format} export...`);

    if (format === 'python') {
      // Generate Python script
      fileContent = generatePythonScript(blueprint, { includeConfig, includeRequirements });
      filename = `${safeTitle}_pipeline_${timestamp}.py`;
      mimeType = 'text/x-python';
    } else if (format === 'javascript') {
      // Generate JavaScript package
      const jsFiles = generateJSCode(blueprint, false);
      
      fileContent = `# ${blueprint.title} JavaScript Export
# Generated on ${new Date().toISOString()}
# Extract each section to separate files

# =============================================================================
# FILE: package.json
# =============================================================================
${jsFiles.packageJson}

# =============================================================================
# FILE: index.js
# =============================================================================
${jsFiles.code}

# =============================================================================
# FILE: Dockerfile
# =============================================================================
${jsFiles.dockerfile}

# =============================================================================
# FILE: .env.example
# =============================================================================
OPENAI_API_KEY=your_openai_api_key_here

# =============================================================================
# FILE: README.md
# =============================================================================
# ${blueprint.title} JavaScript Pipeline

Generated LangChain.js pipeline from ContextForge blueprint.

## Quick Start

1. Extract each file section above to separate files
2. Install dependencies: \`npm install\`
3. Copy \`.env.example\` to \`.env\` and add your OpenAI API key
4. Run: \`npm start\`

## Docker Setup

\`\`\`bash
docker build -t ${blueprint.title.toLowerCase().replace(/[^a-z0-9]/g, '-')} .
docker run -e OPENAI_API_KEY="your-key" -p 3000:3000 ${blueprint.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}
\`\`\`
`;
      
      filename = `${safeTitle}_javascript_${timestamp}.txt`;
      mimeType = 'text/plain';
    } else if (format === 'typescript') {
      // Generate TypeScript package
      const tsFiles = generateJSCode(blueprint, true);
      
      fileContent = `# ${blueprint.title} TypeScript Export
# Generated on ${new Date().toISOString()}
# Extract each section to separate files

# =============================================================================
# FILE: package.json
# =============================================================================
${tsFiles.packageJson}

# =============================================================================
# FILE: index.ts
# =============================================================================
${tsFiles.code}

# =============================================================================
# FILE: Dockerfile
# =============================================================================
${tsFiles.dockerfile}

# =============================================================================
# FILE: tsconfig.json
# =============================================================================
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["*.ts"],
  "exclude": ["node_modules", "dist"]
}

# =============================================================================
# FILE: .env.example
# =============================================================================
OPENAI_API_KEY=your_openai_api_key_here
`;
      
      filename = `${safeTitle}_typescript_${timestamp}.txt`;
      mimeType = 'text/plain';
    } else if (format === 'docker') {
      // Generate Docker setup
      const pythonScript = generatePythonScript(blueprint, { includeConfig, includeRequirements });
      const dockerFiles = generateDockerSetup(blueprint, { includeConfig, includeRequirements });
      const fastApiApp = generateFastAPIApp(blueprint);
      
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
`;
      
      filename = `${safeTitle}_docker_setup_${timestamp}.txt`;
      mimeType = 'text/plain';
    } else {
      throw new Error(`Unsupported export format: ${format}`);
    }

    console.log(`Generated ${filename} (${fileContent.length} chars)`);

    // Upload to Supabase Storage
    console.log('Uploading to Supabase Storage...');
    const filePath = `exports/${user.id}/${filename}`;
    
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('exported-blueprints')
      .upload(filePath, fileContent, {
        contentType: mimeType,
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    console.log('File uploaded successfully:', uploadData.path);

    // Get download URL
    const { data: urlData } = supabaseClient.storage
      .from('exported-blueprints')
      .getPublicUrl(filePath);

    console.log('Download URL generated:', urlData.publicUrl);

    // Log the export
    const { error: logError } = await supabaseClient
      .from('export_logs')
      .insert({
        blueprint_id: blueprintId,
        user_id: user.id,
        export_format: format,
        filename,
        file_path: filePath,
        file_size: fileContent.length,
        download_url: urlData.publicUrl,
        export_config: {
          includeConfig,
          includeRequirements,
          timestamp
        }
      });

    if (logError) {
      console.error('Export logging error:', logError);
      // Don't throw here, just log the error
    }

    console.log('Export completed successfully');

    return new Response(JSON.stringify({
      success: true,
      filename,
      downloadUrl: urlData.publicUrl,
      fileSize: fileContent.length,
      format,
      timestamp
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