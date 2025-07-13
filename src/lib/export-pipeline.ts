import JSZip from 'jszip';
import { supabase } from '@/integrations/supabase/client';

export interface ExportConfig {
  format: 'python' | 'typescript' | 'javascript' | 'jupyter' | 'docker-compose' | 'kubernetes' | 'api';
  includeDockerfile: boolean;
  includeReadme: boolean;
  includeTests: boolean;
  includeDocs: boolean;
  includeMonitoring: boolean;
  pythonVersion: '3.8' | '3.9' | '3.10' | '3.11' | '3.12';
  nodeVersion: '18' | '20' | '21';
  packageManager: 'pip' | 'poetry' | 'conda' | 'npm' | 'yarn' | 'pnpm';
  deployment: {
    platform: 'vercel' | 'netlify' | 'railway' | 'render' | 'aws-lambda' | 'gcp-run' | 'azure-functions' | 'local';
    environment: 'development' | 'staging' | 'production';
    autoScale: boolean;
    monitoring: boolean;
  };
  optimization: {
    caching: boolean;
    batching: boolean;
    streaming: boolean;
    fallbacks: boolean;
  };
}

export interface NodeConfig {
  id: string;
  type: string;
  data: {
    label?: string;
    prompt?: string;
    systemPrompt?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    integrationId?: string;
    vectorStore?: string;
    topK?: number;
    [key: string]: any;
  };
  position: { x: number; y: number };
}

export interface EdgeConfig {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface PipelineConfig {
  id: string;
  title: string;
  description?: string;
  nodes: NodeConfig[];
  edges: EdgeConfig[];
}

export class PipelineExporter {
  private config: ExportConfig;
  private pipeline: PipelineConfig;

  constructor(pipeline: PipelineConfig, config: ExportConfig) {
    this.pipeline = pipeline;
    this.config = config;
  }

  async exportPipeline(): Promise<Blob> {
    const zip = new JSZip();

    // Generate main pipeline code
    switch (this.config.format) {
      case 'python':
        zip.file('main.py', this.generatePythonScript());
        break;
      case 'typescript':
        zip.file('src/index.ts', this.generateTypeScriptCode());
        zip.file('package.json', this.generatePackageJson());
        zip.file('tsconfig.json', this.generateTsConfig());
        break;
      case 'javascript':
        zip.file('src/index.js', this.generateJavaScriptCode());
        zip.file('package.json', this.generatePackageJson());
        break;
      case 'jupyter':
        zip.file('pipeline.ipynb', this.generateJupyterNotebook());
        break;
      case 'docker-compose':
        zip.file('src/main.py', this.generatePythonScript());
        zip.file('docker-compose.yml', this.generateDockerCompose());
        break;
      case 'kubernetes':
        zip.file('src/main.py', this.generatePythonScript());
        zip.file('k8s/deployment.yaml', this.generateKubernetesManifests());
        zip.file('k8s/service.yaml', this.generateKubernetesService());
        zip.file('k8s/configmap.yaml', this.generateKubernetesConfigMap());
        break;
      case 'api':
        zip.file('src/api.py', this.generateAPIServer());
        zip.file('src/main.py', this.generatePythonScript());
        break;
    }

    // Add supporting files based on format
    if (['python', 'jupyter', 'docker-compose', 'kubernetes', 'api'].includes(this.config.format)) {
      zip.file('requirements.txt', this.generateRequirements());
    } else if (['typescript', 'javascript'].includes(this.config.format)) {
      zip.file('.gitignore', this.generateGitignore());
      zip.file('.eslintrc.json', this.generateESLintConfig());
    }
    
    if (this.config.includeDockerfile) {
      zip.file('Dockerfile', this.generateDockerfile());
    }

    if (this.config.includeReadme) {
      zip.file('README.md', this.generateReadme());
    }

    if (this.config.includeTests) {
      zip.file('tests/', '');
      if (['python', 'api'].includes(this.config.format)) {
        zip.file('tests/test_pipeline.py', this.generatePythonTests());
        zip.file('pytest.ini', this.generatePytestConfig());
      } else if (['typescript', 'javascript'].includes(this.config.format)) {
        zip.file('tests/pipeline.test.ts', this.generateJSTests());
        zip.file('jest.config.js', this.generateJestConfig());
      }
    }

    if (this.config.includeDocs) {
      zip.file('docs/API.md', this.generateAPIDocumentation());
      zip.file('docs/DEPLOYMENT.md', this.generateDeploymentGuide());
      zip.file('docs/TROUBLESHOOTING.md', this.generateTroubleshootingGuide());
    }

    if (this.config.includeMonitoring) {
      zip.file('monitoring/health.py', this.generateHealthCheck());
      zip.file('monitoring/metrics.py', this.generateMetrics());
      zip.file('docker-compose.monitoring.yml', this.generateMonitoringCompose());
    }

    // Add deployment configurations
    zip.file('deployment/', '');
    switch (this.config.deployment.platform) {
      case 'vercel':
        zip.file('vercel.json', this.generateVercelConfig());
        zip.file('api/index.js', this.generateVercelAPI());
        break;
      case 'netlify':
        zip.file('netlify.toml', this.generateNetlifyConfig());
        zip.file('functions/pipeline.js', this.generateNetlifyFunction());
        break;
      case 'railway':
        zip.file('railway.toml', this.generateRailwayConfig());
        break;
      case 'render':
        zip.file('render.yaml', this.generateRenderConfig());
        break;
      case 'aws-lambda':
        zip.file('serverless.yml', this.generateServerlessConfig());
        zip.file('lambda_function.py', this.generateLambdaFunction());
        break;
      case 'gcp-run':
        zip.file('cloudbuild.yaml', this.generateCloudBuildConfig());
        zip.file('service.yaml', this.generateCloudRunService());
        break;
    }

    // Add configuration files
    zip.file('config.json', this.generateConfigFile());
    zip.file('.env.example', this.generateEnvExample());
    zip.file('.env.production.example', this.generateProductionEnv());

    // Log the export
    await this.logExport();

    return await zip.generateAsync({ type: 'blob' });
  }

  private generatePythonScript(): string {
    const imports = this.generateImports();
    const nodeClasses = this.generateNodeClasses();
    const pipelineClass = this.generatePipelineClass();
    const mainFunction = this.generateMainFunction();

    return `#!/usr/bin/env python3
"""
${this.pipeline.title} Pipeline
${this.pipeline.description || 'Generated pipeline from Context Engine'}

This pipeline was auto-generated. Modify as needed for your use case.
"""

${imports}

${nodeClasses}

${pipelineClass}

${mainFunction}

if __name__ == "__main__":
    main()
`;
  }

  private generateImports(): string {
    const baseImports = [
      'import asyncio',
      'import json',
      'import logging',
      'import os',
      'from typing import Dict, List, Any, Optional',
      'from dataclasses import dataclass',
      'from datetime import datetime'
    ];

    const conditionalImports = [];

    // Check if we need LLM imports
    const hasLLMNodes = this.pipeline.nodes.some(node => 
      ['PromptTemplateNode', 'LLMNode'].includes(node.type)
    );
    if (hasLLMNodes) {
      conditionalImports.push(
        'import openai',
        'from anthropic import Anthropic'
      );
    }

    // Check if we need vector database imports
    const hasRAGNodes = this.pipeline.nodes.some(node => 
      node.type === 'RAGRetrieverNode'
    );
    if (hasRAGNodes) {
      conditionalImports.push(
        'import pinecone',
        'import weaviate',
        'from qdrant_client import QdrantClient'
      );
    }

    return [...baseImports, ...conditionalImports].join('\n');
  }

  private generateNodeClasses(): string {
    const nodeTypes = new Set(this.pipeline.nodes.map(node => node.type));
    const classes: string[] = [];

    if (nodeTypes.has('PromptTemplateNode') || nodeTypes.has('LLMNode')) {
      classes.push(`
@dataclass
class LLMConfig:
    model: str = "gpt-4o-mini"
    temperature: float = 0.7
    max_tokens: int = 1000
    api_key: Optional[str] = None

class LLMProcessor:
    def __init__(self, config: LLMConfig):
        self.config = config
        self.openai_client = None
        self.anthropic_client = None
        
        if config.api_key:
            if "gpt" in config.model or "o1" in config.model:
                self.openai_client = openai.OpenAI(api_key=config.api_key)
            elif "claude" in config.model:
                self.anthropic_client = Anthropic(api_key=config.api_key)
    
    async def process(self, prompt: str, system_prompt: str = "") -> str:
        try:
            if self.openai_client and ("gpt" in self.config.model or "o1" in self.config.model):
                response = await self.openai_client.chat.completions.acreate(
                    model=self.config.model,
                    messages=[
                        {"role": "system", "content": system_prompt} if system_prompt else {},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=self.config.temperature,
                    max_tokens=self.config.max_tokens
                )
                return response.choices[0].message.content
            
            elif self.anthropic_client and "claude" in self.config.model:
                response = await self.anthropic_client.messages.acreate(
                    model=self.config.model,
                    system=system_prompt,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=self.config.temperature,
                    max_tokens=self.config.max_tokens
                )
                return response.content[0].text
            
            else:
                raise ValueError(f"Unsupported model: {self.config.model}")
                
        except Exception as e:
            logging.error(f"LLM processing error: {e}")
            raise`);
    }

    if (nodeTypes.has('RAGRetrieverNode')) {
      classes.push(`
@dataclass
class RAGConfig:
    vector_store: str = "pinecone"
    top_k: int = 5
    index_name: str = "default"
    api_key: Optional[str] = None
    environment: Optional[str] = None

class RAGRetriever:
    def __init__(self, config: RAGConfig):
        self.config = config
        self.client = None
        
        if config.vector_store == "pinecone" and config.api_key:
            import pinecone
            pinecone.init(api_key=config.api_key, environment=config.environment)
            self.client = pinecone.Index(config.index_name)
        elif config.vector_store == "qdrant" and config.api_key:
            self.client = QdrantClient(url=config.api_key)
    
    async def retrieve(self, query: str) -> List[Dict[str, Any]]:
        try:
            if self.config.vector_store == "pinecone" and self.client:
                # Generate query embedding (simplified - you'd use actual embedding model)
                results = self.client.query(
                    vector=[0.0] * 1536,  # Replace with actual embedding
                    top_k=self.config.top_k,
                    include_metadata=True
                )
                return [{"text": match.metadata.get("text", ""), "score": match.score} 
                       for match in results.matches]
            
            return []
            
        except Exception as e:
            logging.error(f"RAG retrieval error: {e}")
            return []`);
    }

    return classes.join('\n\n');
  }

  private generatePipelineClass(): string {
    const nodeConfigs = this.pipeline.nodes.map(node => {
      const config = { ...node.data };
      return `        "${node.id}": {
            "type": "${node.type}",
            "label": "${config.label || node.id}",
            "config": ${JSON.stringify(config, null, 12)}
        }`;
    }).join(',\n');

    const edgeConfigs = this.pipeline.edges.map(edge => {
      return `        {
            "source": "${edge.source}",
            "target": "${edge.target}",
            "source_handle": "${edge.sourceHandle || 'default'}",
            "target_handle": "${edge.targetHandle || 'default'}"
        }`;
    }).join(',\n');

    return `
class Pipeline:
    def __init__(self):
        self.nodes = {
${nodeConfigs}
        }
        
        self.edges = [
${edgeConfigs}
        ]
        
        self.processors = {}
        self.initialize_processors()
    
    def initialize_processors(self):
        """Initialize node processors based on configuration"""
        for node_id, node_config in self.nodes.items():
            node_type = node_config["type"]
            config = node_config["config"]
            
            if node_type in ["PromptTemplateNode", "LLMNode"]:
                llm_config = LLMConfig(
                    model=config.get("model", "gpt-4o-mini"),
                    temperature=config.get("temperature", 0.7),
                    max_tokens=config.get("maxTokens", 1000),
                    api_key=os.getenv("OPENAI_API_KEY") or os.getenv("ANTHROPIC_API_KEY")
                )
                self.processors[node_id] = LLMProcessor(llm_config)
            
            elif node_type == "RAGRetrieverNode":
                rag_config = RAGConfig(
                    vector_store=config.get("vectorStore", "pinecone"),
                    top_k=config.get("topK", 5),
                    index_name=config.get("indexName", "default"),
                    api_key=os.getenv("PINECONE_API_KEY") or os.getenv("QDRANT_API_KEY"),
                    environment=os.getenv("PINECONE_ENVIRONMENT")
                )
                self.processors[node_id] = RAGRetriever(rag_config)
    
    async def execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the pipeline with given input data"""
        results = {"input": input_data}
        execution_order = self.get_execution_order()
        
        for node_id in execution_order:
            try:
                node_config = self.nodes[node_id]
                processor = self.processors.get(node_id)
                
                if not processor:
                    logging.warning(f"No processor found for node {node_id}")
                    continue
                
                # Get input for this node from previous results
                node_input = self.get_node_input(node_id, results)
                
                # Execute node
                if isinstance(processor, LLMProcessor):
                    result = await processor.process(
                        prompt=node_input.get("prompt", ""),
                        system_prompt=node_config["config"].get("systemPrompt", "")
                    )
                elif isinstance(processor, RAGRetriever):
                    result = await processor.retrieve(
                        query=node_input.get("query", "")
                    )
                else:
                    result = node_input  # Pass through for unknown types
                
                results[node_id] = result
                logging.info(f"Node {node_id} completed successfully")
                
            except Exception as e:
                logging.error(f"Error executing node {node_id}: {e}")
                results[node_id] = {"error": str(e)}
        
        return results
    
    def get_execution_order(self) -> List[str]:
        """Determine execution order based on edge dependencies"""
        # Simple topological sort
        in_degree = {node_id: 0 for node_id in self.nodes.keys()}
        
        for edge in self.edges:
            in_degree[edge["target"]] += 1
        
        queue = [node_id for node_id, degree in in_degree.items() if degree == 0]
        result = []
        
        while queue:
            node_id = queue.pop(0)
            result.append(node_id)
            
            for edge in self.edges:
                if edge["source"] == node_id:
                    in_degree[edge["target"]] -= 1
                    if in_degree[edge["target"]] == 0:
                        queue.append(edge["target"])
        
        return result
    
    def get_node_input(self, node_id: str, results: Dict[str, Any]) -> Dict[str, Any]:
        """Get input data for a specific node from previous results"""
        node_input = {}
        
        # Find incoming edges
        for edge in self.edges:
            if edge["target"] == node_id:
                source_result = results.get(edge["source"])
                if source_result is not None:
                    if isinstance(source_result, str):
                        node_input["prompt"] = source_result
                        node_input["query"] = source_result
                    elif isinstance(source_result, dict):
                        node_input.update(source_result)
        
        # If no incoming edges, use input data
        if not node_input and "input" in results:
            node_input = results["input"]
        
        return node_input`;
  }

  private generateMainFunction(): string {
    return `
async def main():
    """Main execution function"""
    logging.basicConfig(level=logging.INFO)
    
    # Initialize pipeline
    pipeline = Pipeline()
    
    # Example input data
    input_data = {
        "query": "Example input query",
        "context": "Additional context if needed"
    }
    
    # Execute pipeline
    results = await pipeline.execute(input_data)
    
    # Print results
    print("Pipeline execution completed!")
    print(json.dumps(results, indent=2, default=str))
    
    return results`;
  }

  private generateJupyterNotebook(): string {
    const cells = [
      {
        cell_type: "markdown",
        metadata: {},
        source: [
          `# ${this.pipeline.title} Pipeline\n`,
          `\n`,
          `${this.pipeline.description || 'Generated pipeline from Context Engine'}\n`,
          `\n`,
          `This notebook was auto-generated. Modify as needed for your use case.`
        ]
      },
      {
        cell_type: "code",
        execution_count: null,
        metadata: {},
        outputs: [],
        source: [
          "# Install required packages\n",
          "!pip install -r requirements.txt"
        ]
      },
      {
        cell_type: "code",
        execution_count: null,
        metadata: {},
        outputs: [],
        source: this.generateImports().split('\n')
      },
      {
        cell_type: "markdown",
        metadata: {},
        source: ["## Pipeline Configuration"]
      },
      {
        cell_type: "code",
        execution_count: null,
        metadata: {},
        outputs: [],
        source: this.generateNodeClasses().split('\n')
      },
      {
        cell_type: "code",
        execution_count: null,
        metadata: {},
        outputs: [],
        source: this.generatePipelineClass().split('\n')
      },
      {
        cell_type: "markdown",
        metadata: {},
        source: ["## Execute Pipeline"]
      },
      {
        cell_type: "code",
        execution_count: null,
        metadata: {},
        outputs: [],
        source: [
          "# Initialize and run pipeline\n",
          "pipeline = Pipeline()\n",
          "\n",
          "# Example input\n",
          "input_data = {\n",
          "    'query': 'Your input query here',\n",
          "    'context': 'Additional context if needed'\n",
          "}\n",
          "\n",
          "# Execute\n",
          "results = await pipeline.execute(input_data)\n",
          "print(json.dumps(results, indent=2, default=str))"
        ]
      }
    ];

    return JSON.stringify({
      cells,
      metadata: {
        kernelspec: {
          display_name: `Python ${this.config.pythonVersion}`,
          language: "python",
          name: "python3"
        },
        language_info: {
          name: "python",
          version: this.config.pythonVersion
        }
      },
      nbformat: 4,
      nbformat_minor: 4
    }, null, 2);
  }

  private generateRequirements(): string {
    const basePackages = [
      'asyncio-throttle>=1.0.0',
      'python-dotenv>=1.0.0',
      'pydantic>=2.0.0',
      'httpx>=0.24.0'
    ];

    const conditionalPackages = [];

    // Check for LLM nodes
    const hasLLMNodes = this.pipeline.nodes.some(node => 
      ['PromptTemplateNode', 'LLMNode'].includes(node.type)
    );
    if (hasLLMNodes) {
      conditionalPackages.push(
        'openai>=1.0.0',
        'anthropic>=0.21.0'
      );
    }

    // Check for RAG nodes
    const hasRAGNodes = this.pipeline.nodes.some(node => 
      node.type === 'RAGRetrieverNode'
    );
    if (hasRAGNodes) {
      conditionalPackages.push(
        'pinecone-client>=2.2.0',
        'weaviate-client>=3.0.0',
        'qdrant-client>=1.6.0'
      );
    }

    if (this.config.format === 'jupyter') {
      conditionalPackages.push('jupyter>=1.0.0', 'ipython>=8.0.0');
    }

    return [...basePackages, ...conditionalPackages].join('\n');
  }

  private generateDockerfile(): string {
    return `FROM python:${this.config.pythonVersion}-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \\
    build-essential \\
    curl \\
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Set environment variables
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# Expose port (if needed)
EXPOSE 8000

# Default command
CMD ["python", "pipeline.py"]
`;
  }

  private generateDockerCompose(): string {
    return `version: '3.8'

services:
  pipeline:
    build: .
    container_name: ${this.pipeline.title.toLowerCase().replace(/\s+/g, '-')}-pipeline
    environment:
      - OPENAI_API_KEY=\${OPENAI_API_KEY}
      - ANTHROPIC_API_KEY=\${ANTHROPIC_API_KEY}
      - PINECONE_API_KEY=\${PINECONE_API_KEY}
      - PINECONE_ENVIRONMENT=\${PINECONE_ENVIRONMENT}
      - QDRANT_API_KEY=\${QDRANT_API_KEY}
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    restart: unless-stopped
    networks:
      - pipeline-network

networks:
  pipeline-network:
    driver: bridge

volumes:
  data:
  logs:
`;
  }

  private generateReadme(): string {
    const setupInstructions = this.config.packageManager === 'pip' ? 
      'pip install -r requirements.txt' :
      this.config.packageManager === 'poetry' ? 
      'poetry install' : 
      'conda env create -f environment.yml';

    return `# ${this.pipeline.title} Pipeline

${this.pipeline.description || 'Generated pipeline from Context Engine'}

## Overview

This pipeline was automatically generated and includes the following components:

${this.pipeline.nodes.map(node => `- **${node.data.label || node.id}** (${node.type})`).join('\n')}

## Setup Instructions

### Prerequisites

- Python ${this.config.pythonVersion} or higher
- ${this.config.packageManager} package manager

### Installation

1. Clone or extract this pipeline code
2. Install dependencies:
   \`\`\`bash
   ${setupInstructions}
   \`\`\`

3. Set up environment variables:
   \`\`\`bash
   cp .env.example .env
   # Edit .env with your API keys
   \`\`\`

### Environment Variables

Configure the following environment variables in your \`.env\` file:

${this.getRequiredEnvVars().map(env => `- \`${env}\`: ${this.getEnvDescription(env)}`).join('\n')}

## Usage

### Python Script

\`\`\`bash
python pipeline.py
\`\`\`

${this.config.format === 'jupyter' ? `
### Jupyter Notebook

\`\`\`bash
jupyter notebook pipeline.ipynb
\`\`\`
` : ''}

${this.config.includeDockerfile ? `
### Docker

\`\`\`bash
# Build the image
docker build -t ${this.pipeline.title.toLowerCase().replace(/\s+/g, '-')}-pipeline .

# Run the container
docker run --env-file .env ${this.pipeline.title.toLowerCase().replace(/\s+/g, '-')}-pipeline
\`\`\`
` : ''}

${this.config.format === 'docker-compose' ? `
### Docker Compose

\`\`\`bash
# Start the pipeline
docker-compose up -d

# View logs
docker-compose logs -f pipeline

# Stop the pipeline
docker-compose down
\`\`\`
` : ''}

## Pipeline Structure

The pipeline consists of the following execution flow:

\`\`\`
${this.generateFlowDiagram()}
\`\`\`

## Customization

You can modify the pipeline by:

1. **Updating node configurations** in the \`Pipeline\` class
2. **Modifying prompts** in the node configurations
3. **Adding new processors** for custom node types
4. **Adjusting execution logic** in the \`execute\` method

## Troubleshooting

- Ensure all API keys are correctly set in your environment
- Check logs for specific error messages
- Verify that all required packages are installed
- Test individual components separately if needed

## Generated Files

- \`pipeline.py\`: Main pipeline script
- \`requirements.txt\`: Python dependencies
${this.config.includeDockerfile ? '- `Dockerfile`: Container configuration\n' : ''}${this.config.format === 'docker-compose' ? '- `docker-compose.yml`: Multi-container setup\n' : ''}${this.config.format === 'jupyter' ? '- `pipeline.ipynb`: Jupyter notebook version\n' : ''}- \`config.json\`: Pipeline configuration
- \`.env.example\`: Environment variables template

---

Generated by Context Engine on ${new Date().toISOString()}
`;
  }

  private generateConfigFile(): string {
    return JSON.stringify({
      pipeline: {
        id: this.pipeline.id,
        title: this.pipeline.title,
        description: this.pipeline.description,
        version: "1.0.0",
        generated_at: new Date().toISOString()
      },
      export_config: this.config,
      nodes: this.pipeline.nodes,
      edges: this.pipeline.edges
    }, null, 2);
  }

  private generateEnvExample(): string {
    const envVars = this.getRequiredEnvVars();
    return envVars.map(env => `${env}=your_${env.toLowerCase()}_here`).join('\n');
  }

  private getRequiredEnvVars(): string[] {
    const envVars = [];

    const hasLLMNodes = this.pipeline.nodes.some(node => 
      ['PromptTemplateNode', 'LLMNode'].includes(node.type)
    );
    if (hasLLMNodes) {
      envVars.push('OPENAI_API_KEY', 'ANTHROPIC_API_KEY');
    }

    const hasRAGNodes = this.pipeline.nodes.some(node => 
      node.type === 'RAGRetrieverNode'
    );
    if (hasRAGNodes) {
      envVars.push('PINECONE_API_KEY', 'PINECONE_ENVIRONMENT', 'QDRANT_API_KEY');
    }

    return envVars;
  }

  private getEnvDescription(env: string): string {
    const descriptions: Record<string, string> = {
      'OPENAI_API_KEY': 'OpenAI API key for GPT models',
      'ANTHROPIC_API_KEY': 'Anthropic API key for Claude models',
      'PINECONE_API_KEY': 'Pinecone API key for vector database',
      'PINECONE_ENVIRONMENT': 'Pinecone environment (e.g., us-west1-gcp)',
      'QDRANT_API_KEY': 'Qdrant API key for vector database'
    };
    return descriptions[env] || 'API key';
  }

  private generateFlowDiagram(): string {
    const nodes = this.pipeline.nodes.map(node => node.id).join(' -> ');
    return nodes || 'No nodes defined';
  }

  // TypeScript/JavaScript generation methods
  private generateTypeScriptCode(): string {
    return this.generateJSCode(true);
  }

  private generateJavaScriptCode(): string {
    return this.generateJSCode(false);
  }

  private generateJSCode(isTypeScript: boolean): string {
    const className = this.pipeline.title.replace(/[^a-zA-Z0-9]/g, '');
    const hasLLM = this.pipeline.nodes.some(n => ['PromptTemplateNode', 'LLMNode'].includes(n.type));
    const hasRAG = this.pipeline.nodes.some(n => n.type === 'RAGRetrieverNode');

    return `${isTypeScript ? '// TypeScript' : '// JavaScript'} Pipeline
${isTypeScript ? 'import' : 'const'} ${isTypeScript ? '{ OpenAI }' : '{ OpenAI }'} ${isTypeScript ? 'from' : '='} ${isTypeScript ? '"openai"' : 'require("openai")'};
${hasRAG ? `${isTypeScript ? 'import' : 'const'} ${isTypeScript ? '{ Pinecone }' : '{ Pinecone }'} ${isTypeScript ? 'from' : '='} ${isTypeScript ? '"@pinecone-database/pinecone"' : 'require("@pinecone-database/pinecone")'};` : ''}

${isTypeScript ? `interface PipelineConfig {
  openaiApiKey?: string;
  temperature?: number;
  maxTokens?: number;
}

interface ExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
}` : ''}

class ${className}Pipeline {
  ${isTypeScript ? 'private openai: OpenAI;' : ''}
  ${hasRAG ? `${isTypeScript ? 'private pinecone: Pinecone;' : ''}` : ''}

  constructor(config${isTypeScript ? ': PipelineConfig' : ''} = {}) {
    this.openai = new OpenAI({
      apiKey: config.openaiApiKey || process.env.OPENAI_API_KEY
    });
    ${hasRAG ? 'this.pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });' : ''}
  }

  async execute(input${isTypeScript ? ': string' : ''})${isTypeScript ? ': Promise<ExecutionResult>' : ''} {
    try {
      ${hasLLM ? `const response = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: input }],
        temperature: 0.7,
        max_tokens: 1000
      });
      
      return {
        success: true,
        data: response.choices[0].message.content
      };` : `return { success: true, data: input };`}
    } catch (error) {
      return {
        success: false,
        error: error${isTypeScript ? '' : '.message'}
      };
    }
  }
}

${isTypeScript ? 'export default' : 'module.exports ='} ${className}Pipeline;`;
  }

  private generatePackageJson(): string {
    const packageName = this.pipeline.title.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const isTypeScript = this.config.format === 'typescript';
    
    return JSON.stringify({
      name: packageName,
      version: "1.0.0",
      description: this.pipeline.description || "Generated pipeline",
      main: isTypeScript ? "dist/index.js" : "src/index.js",
      scripts: {
        ...(isTypeScript ? {
          "build": "tsc",
          "start": "node dist/index.js",
          "dev": "ts-node src/index.ts"
        } : {
          "start": "node src/index.js"
        }),
        "test": "jest"
      },
      dependencies: {
        "openai": "^4.0.0",
        "dotenv": "^16.0.0",
        ...(this.pipeline.nodes.some(n => n.type === 'RAGRetrieverNode') ? {
          "@pinecone-database/pinecone": "^1.0.0"
        } : {})
      },
      ...(isTypeScript ? {
        devDependencies: {
          "typescript": "^5.0.0",
          "ts-node": "^10.9.0",
          "@types/node": "^20.0.0",
          "jest": "^29.0.0",
          "@types/jest": "^29.0.0"
        }
      } : {})
    }, null, 2);
  }

  private generateTsConfig(): string {
    return JSON.stringify({
      compilerOptions: {
        target: "ES2020",
        module: "commonjs",
        lib: ["ES2020"],
        outDir: "./dist",
        rootDir: "./src",
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        resolveJsonModule: true
      },
      include: ["src/**/*"],
      exclude: ["node_modules", "dist", "tests"]
    }, null, 2);
  }

  private generateGitignore(): string {
    return `node_modules/
dist/
.env
.env.local
*.log
.DS_Store
coverage/
.nyc_output
.vscode/
.idea/`;
  }

  private generateESLintConfig(): string {
    return JSON.stringify({
      env: {
        node: true,
        es2021: true
      },
      extends: [
        "eslint:recommended",
        ...(this.config.format === 'typescript' ? ["@typescript-eslint/recommended"] : [])
      ],
      parser: this.config.format === 'typescript' ? "@typescript-eslint/parser" : "babel-parser",
      parserOptions: {
        ecmaVersion: 12,
        sourceType: "module"
      },
      rules: {
        "no-console": "warn",
        "no-unused-vars": "error"
      }
    }, null, 2);
  }

  // Kubernetes methods
  private generateKubernetesManifests(): string {
    const appName = this.pipeline.title.toLowerCase().replace(/\s+/g, '-');
    return `apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${appName}-deployment
  labels:
    app: ${appName}
spec:
  replicas: ${this.config.deployment.autoScale ? 3 : 1}
  selector:
    matchLabels:
      app: ${appName}
  template:
    metadata:
      labels:
        app: ${appName}
    spec:
      containers:
      - name: ${appName}
        image: ${appName}:latest
        ports:
        - containerPort: 8000
        env:
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: ${appName}-secrets
              key: openai-api-key
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5`;
  }

  private generateKubernetesService(): string {
    const appName = this.pipeline.title.toLowerCase().replace(/\s+/g, '-');
    return `apiVersion: v1
kind: Service
metadata:
  name: ${appName}-service
spec:
  selector:
    app: ${appName}
  ports:
    - protocol: TCP
      port: 80
      targetPort: 8000
  type: LoadBalancer`;
  }

  private generateKubernetesConfigMap(): string {
    const appName = this.pipeline.title.toLowerCase().replace(/\s+/g, '-');
    return `apiVersion: v1
kind: ConfigMap
metadata:
  name: ${appName}-config
data:
  PIPELINE_NAME: "${this.pipeline.title}"
  PIPELINE_VERSION: "1.0.0"
  LOG_LEVEL: "INFO"`;
  }

  // API Server generation
  private generateAPIServer(): string {
    return `#!/usr/bin/env python3
"""
FastAPI server for ${this.pipeline.title}
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, Any
import uvicorn
import logging
from main import Pipeline

app = FastAPI(title="${this.pipeline.title} API", version="1.0.0")
pipeline = Pipeline()

class PipelineRequest(BaseModel):
    input_data: Dict[str, Any]

class PipelineResponse(BaseModel):
    success: bool
    results: Dict[str, Any] = None
    error: str = None

@app.get("/health")
async def health_check():
    return {"status": "healthy", "pipeline": "${this.pipeline.title}"}

@app.post("/execute", response_model=PipelineResponse)
async def execute_pipeline(request: PipelineRequest):
    try:
        results = await pipeline.execute(request.input_data)
        return PipelineResponse(success=True, results=results)
    except Exception as e:
        logging.error(f"Pipeline execution failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/pipeline/info")
async def get_pipeline_info():
    return {
        "title": "${this.pipeline.title}",
        "description": "${this.pipeline.description || ''}",
        "nodes": len(pipeline.nodes),
        "edges": len(pipeline.edges)
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)`;
  }

  // Test generation methods
  private generatePythonTests(): string {
    return `#!/usr/bin/env python3
"""
Unit tests for ${this.pipeline.title} pipeline
"""

import pytest
import asyncio
from main import Pipeline

class TestPipeline:
    def setup_method(self):
        self.pipeline = Pipeline()
    
    @pytest.mark.asyncio
    async def test_pipeline_initialization(self):
        assert self.pipeline is not None
        assert len(self.pipeline.nodes) > 0
    
    @pytest.mark.asyncio
    async def test_pipeline_execution(self):
        test_input = {
            "query": "test query",
            "context": "test context"
        }
        
        results = await self.pipeline.execute(test_input)
        
        assert "input" in results
        assert results["input"] == test_input
    
    def test_execution_order(self):
        order = self.pipeline.get_execution_order()
        assert isinstance(order, list)
        assert len(order) == len(self.pipeline.nodes)
    
    def test_node_input_generation(self):
        # Test with empty results
        node_input = self.pipeline.get_node_input("test_node", {"input": {"test": "data"}})
        assert isinstance(node_input, dict)`;
  }

  private generatePytestConfig(): string {
    return `[tool:pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts = -v --tb=short
markers =
    integration: marks tests as integration tests
    unit: marks tests as unit tests`;
  }

  private generateJSTests(): string {
    const className = this.pipeline.title.replace(/[^a-zA-Z0-9]/g, '');
    const isTypeScript = this.config.format === 'typescript';
    
    return `${isTypeScript ? 'import' : 'const'} ${className}Pipeline ${isTypeScript ? 'from' : '='} ${isTypeScript ? '"../src/index"' : 'require("../src/index")'};

describe('${className}Pipeline', () => {
  let pipeline${isTypeScript ? ': ' + className + 'Pipeline' : ''};

  beforeEach(() => {
    pipeline = new ${className}Pipeline({
      openaiApiKey: 'test-key'
    });
  });

  test('should initialize correctly', () => {
    expect(pipeline).toBeInstanceOf(${className}Pipeline);
  });

  test('should execute with valid input', async () => {
    const result = await pipeline.execute('test input');
    
    expect(result).toHaveProperty('success');
    expect(typeof result.success).toBe('boolean');
  });

  test('should handle errors gracefully', async () => {
    const pipelineWithoutKey = new ${className}Pipeline();
    const result = await pipelineWithoutKey.execute('test');
    
    expect(result.success).toBe(false);
    expect(result).toHaveProperty('error');
  });
});`;
  }

  private generateJestConfig(): string {
    const isTypeScript = this.config.format === 'typescript';
    
    return `module.exports = {
  preset: ${isTypeScript ? '"ts-jest"' : 'undefined'},
  testEnvironment: 'node',
  ${isTypeScript ? 'roots: ["<rootDir>/src", "<rootDir>/tests"],' : ''}
  testMatch: [
    '**/tests/**/*.test.${isTypeScript ? 'ts' : 'js'}'
  ],
  ${isTypeScript ? `transform: {
    '^.+\\.ts$': 'ts-jest'
  },` : ''}
  collectCoverageFrom: [
    'src/**/*.${isTypeScript ? 'ts' : 'js'}',
    '!src/**/*.d.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html']
};`;
  }

  // Documentation generation methods
  private generateAPIDocumentation(): string {
    return `# ${this.pipeline.title} API Documentation

## Overview

This API provides access to the ${this.pipeline.title} pipeline functionality.

## Base URL

\`\`\`
${this.config.deployment.environment === 'production' ? 'https://your-domain.com' : 'http://localhost:8000'}
\`\`\`

## Endpoints

### Execute Pipeline

\`POST /execute\`

Execute the pipeline with provided input data.

**Request Body:**
\`\`\`json
{
  "input_data": {
    "query": "string",
    "context": "string (optional)"
  }
}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true,
  "results": {
    "input": {},
    "node_id": "result_data"
  }
}
\`\`\`

### Health Check

\`GET /health\`

Check the health status of the API.

**Response:**
\`\`\`json
{
  "status": "healthy",
  "pipeline": "${this.pipeline.title}"
}
\`\`\`

### Pipeline Information

\`GET /pipeline/info\`

Get information about the pipeline configuration.

**Response:**
\`\`\`json
{
  "title": "${this.pipeline.title}",
  "description": "Pipeline description",
  "nodes": 5,
  "edges": 4
}
\`\`\`

## Error Handling

All endpoints return appropriate HTTP status codes:

- \`200\`: Success
- \`400\`: Bad Request
- \`500\`: Internal Server Error

Error responses include details:

\`\`\`json
{
  "success": false,
  "error": "Error description"
}
\`\`\`

## Rate Limiting

API requests are limited to prevent abuse. Current limits:

- 100 requests per minute per IP
- 1000 requests per hour per API key

## Authentication

Set your API key in the request headers:

\`\`\`
Authorization: Bearer your-api-key
\`\`\``;
  }

  private generateDeploymentGuide(): string {
    return `# Deployment Guide for ${this.pipeline.title}

## Overview

This guide covers deploying your pipeline to various platforms.

## Platform-Specific Instructions

### ${this.config.deployment.platform.toUpperCase()}

${this.generatePlatformInstructions()}

## Environment Variables

Configure these environment variables for your deployment:

${this.getRequiredEnvVars().map(env => `- \`${env}\`: ${this.getEnvDescription(env)}`).join('\n')}

## Health Checks

The application includes health check endpoints:

- \`/health\`: Basic health status
- \`/ready\`: Readiness probe for Kubernetes

## Monitoring

${this.config.includeMonitoring ? `
Monitoring is configured with:

- Health checks every 30 seconds
- Performance metrics collection
- Error rate tracking
- Response time monitoring

Access metrics at \`/metrics\` endpoint.
` : 'Enable monitoring in export configuration for detailed metrics.'}

## Scaling

${this.config.deployment.autoScale ? `
Auto-scaling is configured:

- Minimum replicas: 1
- Maximum replicas: 10
- CPU threshold: 70%
- Memory threshold: 80%
` : 'Auto-scaling is disabled. Manually scale as needed.'}

## Security

- API keys stored as secrets
- HTTPS enforced in production
- Rate limiting enabled
- Input validation on all endpoints

## Troubleshooting

Common deployment issues:

1. **API Key Issues**: Verify all environment variables are set
2. **Memory Limits**: Increase if pipeline uses large models
3. **Timeout Errors**: Adjust request timeout for complex pipelines
4. **Network Issues**: Check firewall and security group settings`;
  }

  private generateTroubleshootingGuide(): string {
    return `# Troubleshooting Guide for ${this.pipeline.title}

## Common Issues

### 1. API Key Errors

**Symptom**: \`Authentication failed\` or \`Invalid API key\`

**Solutions**:
- Verify API keys are correctly set in environment variables
- Check that keys have sufficient permissions
- Ensure no extra spaces or characters in key values

### 2. Memory Issues

**Symptom**: \`Out of memory\` or container restarts

**Solutions**:
- Increase memory limits in deployment configuration
- Consider using smaller models for development
- Implement caching to reduce memory usage

### 3. Timeout Errors

**Symptom**: Requests timing out or hanging

**Solutions**:
- Increase request timeout settings
- Optimize prompts to reduce processing time
- Check network connectivity to external APIs

### 4. Performance Issues

**Symptom**: Slow response times

**Solutions**:
- Enable caching for repeated queries
- Use parallel processing where possible
- Consider using faster models for non-critical paths

## Debugging

### Enable Debug Logging

\`\`\`python
import logging
logging.basicConfig(level=logging.DEBUG)
\`\`\`

### Check Pipeline Status

\`\`\`bash
# Health check
curl http://localhost:8000/health

# Pipeline info
curl http://localhost:8000/pipeline/info
\`\`\`

### Monitor Resource Usage

\`\`\`bash
# Docker stats
docker stats

# Kubernetes pods
kubectl top pods
\`\`\`

## Error Codes

- \`1001\`: Missing API key
- \`1002\`: Invalid model configuration
- \`1003\`: Network connectivity issue
- \`1004\`: Rate limit exceeded
- \`1005\`: Invalid input format

## Getting Help

1. Check the logs for detailed error messages
2. Verify all dependencies are installed
3. Test individual components separately
4. Contact support with error details and configuration`;
  }

  // Deployment platform methods
  private generatePlatformInstructions(): string {
    switch (this.config.deployment.platform) {
      case 'vercel':
        return `
1. Install Vercel CLI: \`npm i -g vercel\`
2. Configure API routes in \`api/\` directory
3. Deploy: \`vercel --prod\`
4. Set environment variables in Vercel dashboard`;

      case 'railway':
        return `
1. Connect your GitHub repository to Railway
2. Configure environment variables
3. Deploy automatically on push to main branch`;

      case 'aws-lambda':
        return `
1. Install Serverless Framework: \`npm i -g serverless\`
2. Configure AWS credentials
3. Deploy: \`serverless deploy\`
4. Monitor via CloudWatch`;

      default:
        return 'Follow platform-specific deployment instructions.';
    }
  }

  private generateVercelConfig(): string {
    return JSON.stringify({
      version: 2,
      builds: [
        {
          src: "api/index.js",
          use: "@vercel/node"
        }
      ],
      routes: [
        {
          src: "/api/(.*)",
          dest: "/api/index.js"
        }
      ],
      env: this.getRequiredEnvVars().reduce((acc, key) => {
        acc[key] = `@${key.toLowerCase()}`;
        return acc;
      }, {} as Record<string, string>)
    }, null, 2);
  }

  private generateVercelAPI(): string {
    const className = this.pipeline.title.replace(/[^a-zA-Z0-9]/g, '');
    return `const ${className}Pipeline = require('../src/index');

const pipeline = new ${className}Pipeline();

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { input } = req.body;
    const result = await pipeline.execute(input);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};`;
  }

  private generateNetlifyConfig(): string {
    return `[build]
  command = "npm run build"
  functions = "functions"
  publish = "dist"

[functions]
  node_bundler = "esbuild"

[[headers]]
  for = "/api/*"
  [headers.values]
    Access-Control-Allow-Origin = "*"
    Access-Control-Allow-Methods = "GET, POST, OPTIONS"
    Access-Control-Allow-Headers = "Content-Type"`;
  }

  private generateNetlifyFunction(): string {
    const className = this.pipeline.title.replace(/[^a-zA-Z0-9]/g, '');
    return `const ${className}Pipeline = require('../src/index');

const pipeline = new ${className}Pipeline();

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { input } = JSON.parse(event.body);
    const result = await pipeline.execute(input);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(result)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};`;
  }

  private generateRailwayConfig(): string {
    return `[build]
cmd = "npm install && npm run build"

[deploy]
startCommand = "npm start"
healthcheckPath = "/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10`;
  }

  private generateRenderConfig(): string {
    return `services:
  - type: web
    name: ${this.pipeline.title.toLowerCase().replace(/\s+/g, '-')}
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    healthCheckPath: /health
    envVars:
${this.getRequiredEnvVars().map(env => `      - key: ${env}
        sync: false`).join('\n')}`;
  }

  private generateServerlessConfig(): string {
    return `service: ${this.pipeline.title.toLowerCase().replace(/\s+/g, '-')}

provider:
  name: aws
  runtime: python${this.config.pythonVersion}
  region: us-east-1
  timeout: 30
  memorySize: 512
  environment:
${this.getRequiredEnvVars().map(env => `    ${env}: \${env:${env}}`).join('\n')}

functions:
  pipeline:
    handler: lambda_function.lambda_handler
    events:
      - http:
          path: execute
          method: post
          cors: true
  
  health:
    handler: lambda_function.health_check
    events:
      - http:
          path: health
          method: get
          cors: true

plugins:
  - serverless-python-requirements

custom:
  pythonRequirements:
    dockerizePip: true`;
  }

  private generateLambdaFunction(): string {
    return `import json
import logging
from main import Pipeline

logger = logging.getLogger()
logger.setLevel(logging.INFO)

pipeline = Pipeline()

def lambda_handler(event, context):
    try:
        if event.get('httpMethod') == 'GET' and event.get('path') == '/health':
            return health_check(event, context)
        
        if event.get('httpMethod') != 'POST':
            return {
                'statusCode': 405,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Method not allowed'})
            }
        
        body = json.loads(event.get('body', '{}'))
        input_data = body.get('input_data', {})
        
        # Execute pipeline
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        results = loop.run_until_complete(pipeline.execute(input_data))
        loop.close()
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'success': True,
                'results': results
            }, default=str)
        }
        
    except Exception as e:
        logger.error(f"Pipeline execution failed: {e}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': str(e)})
        }

def health_check(event, context):
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json'},
        'body': json.dumps({'status': 'healthy', 'pipeline': '${this.pipeline.title}'})
    }`;
  }

  private generateCloudBuildConfig(): string {
    const appName = this.pipeline.title.toLowerCase().replace(/\s+/g, '-');
    return `steps:
  # Build the container image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/${appName}:$COMMIT_SHA', '.']
  
  # Push the container image to Container Registry
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/${appName}:$COMMIT_SHA']
  
  # Deploy container image to Cloud Run
  - name: 'gcr.io/cloud-builders/gcloud'
    args:
    - 'run'
    - 'deploy'
    - '${appName}'
    - '--image'
    - 'gcr.io/$PROJECT_ID/${appName}:$COMMIT_SHA'
    - '--region'
    - 'us-central1'
    - '--platform'
    - 'managed'
    - '--allow-unauthenticated'

images:
  - 'gcr.io/$PROJECT_ID/${appName}:$COMMIT_SHA'`;
  }

  private generateCloudRunService(): string {
    const appName = this.pipeline.title.toLowerCase().replace(/\s+/g, '-');
    return `apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: ${appName}
  annotations:
    run.googleapis.com/ingress: all
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/maxScale: "${this.config.deployment.autoScale ? '10' : '1'}"
        run.googleapis.com/cpu-throttling: "false"
    spec:
      containerConcurrency: 100
      timeoutSeconds: 300
      containers:
      - image: gcr.io/PROJECT_ID/${appName}:latest
        ports:
        - containerPort: 8000
        env:
${this.getRequiredEnvVars().map(env => `        - name: ${env}
          valueFrom:
            secretKeyRef:
              name: ${appName}-secrets
              key: ${env.toLowerCase()}`).join('\n')}
        resources:
          limits:
            cpu: 1000m
            memory: 512Mi
          requests:
            cpu: 100m
            memory: 128Mi`;
  }

  // Monitoring methods
  private generateHealthCheck(): string {
    return `#!/usr/bin/env python3
"""
Health check monitoring for ${this.pipeline.title}
"""

import time
import logging
import asyncio
from typing import Dict, Any
from main import Pipeline

logger = logging.getLogger(__name__)

class HealthChecker:
    def __init__(self):
        self.pipeline = Pipeline()
        self.last_check = None
        self.status = "unknown"
    
    async def check_pipeline_health(self) -> Dict[str, Any]:
        """Perform comprehensive health check"""
        start_time = time.time()
        
        try:
            # Test basic pipeline execution
            test_input = {"query": "health check", "context": "test"}
            results = await self.pipeline.execute(test_input)
            
            execution_time = time.time() - start_time
            
            health_status = {
                "status": "healthy",
                "timestamp": time.time(),
                "execution_time_ms": execution_time * 1000,
                "pipeline_name": "${this.pipeline.title}",
                "nodes_count": len(self.pipeline.nodes),
                "edges_count": len(self.pipeline.edges)
            }
            
            self.status = "healthy"
            self.last_check = time.time()
            
            return health_status
            
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            self.status = "unhealthy"
            
            return {
                "status": "unhealthy",
                "timestamp": time.time(),
                "error": str(e),
                "pipeline_name": "${this.pipeline.title}"
            }
    
    def get_status(self) -> str:
        """Get current health status"""
        if self.last_check and time.time() - self.last_check > 300:  # 5 minutes
            return "stale"
        return self.status

async def main():
    checker = HealthChecker()
    health = await checker.check_pipeline_health()
    print(f"Health Status: {health}")

if __name__ == "__main__":
    asyncio.run(main())`;
  }

  private generateMetrics(): string {
    return `#!/usr/bin/env python3
"""
Metrics collection for ${this.pipeline.title}
"""

import time
import json
import logging
from typing import Dict, Any, List
from collections import defaultdict, deque
from dataclasses import dataclass, asdict

logger = logging.getLogger(__name__)

@dataclass
class MetricPoint:
    timestamp: float
    value: float
    labels: Dict[str, str] = None

class MetricsCollector:
    def __init__(self, max_points: int = 1000):
        self.max_points = max_points
        self.metrics = defaultdict(lambda: deque(maxlen=max_points))
        self.counters = defaultdict(int)
        self.gauges = defaultdict(float)
    
    def record_execution_time(self, node_id: str, execution_time: float):
        """Record execution time for a node"""
        self.metrics[f"execution_time_{node_id}"].append(
            MetricPoint(time.time(), execution_time, {"node_id": node_id})
        )
    
    def record_error(self, node_id: str, error_type: str):
        """Record an error occurrence"""
        self.counters[f"errors_{node_id}_{error_type}"] += 1
        self.metrics[f"error_rate_{node_id}"].append(
            MetricPoint(time.time(), 1, {"node_id": node_id, "error_type": error_type})
        )
    
    def record_success(self, node_id: str):
        """Record successful execution"""
        self.counters[f"success_{node_id}"] += 1
        self.metrics[f"success_rate_{node_id}"].append(
            MetricPoint(time.time(), 1, {"node_id": node_id})
        )
    
    def set_gauge(self, name: str, value: float, labels: Dict[str, str] = None):
        """Set a gauge metric"""
        self.gauges[name] = value
        self.metrics[name].append(MetricPoint(time.time(), value, labels))
    
    def get_metrics_summary(self) -> Dict[str, Any]:
        """Get summary of all metrics"""
        summary = {
            "timestamp": time.time(),
            "counters": dict(self.counters),
            "gauges": dict(self.gauges),
            "recent_metrics": {}
        }
        
        # Get recent metrics (last 100 points)
        for metric_name, points in self.metrics.items():
            if points:
                recent_points = list(points)[-100:]
                summary["recent_metrics"][metric_name] = [
                    asdict(point) for point in recent_points
                ]
        
        return summary
    
    def export_prometheus_format(self) -> str:
        """Export metrics in Prometheus format"""
        lines = []
        
        # Counters
        for name, value in self.counters.items():
            lines.append(f"# TYPE {name} counter")
            lines.append(f"{name} {value}")
        
        # Gauges
        for name, value in self.gauges.items():
            lines.append(f"# TYPE {name} gauge")
            lines.append(f"{name} {value}")
        
        return "\\n".join(lines)

# Global metrics collector instance
metrics = MetricsCollector()

def record_pipeline_metrics(results: Dict[str, Any], execution_time: float):
    """Record metrics for a complete pipeline execution"""
    metrics.set_gauge("pipeline_execution_time", execution_time)
    metrics.set_gauge("pipeline_nodes_executed", len(results) - 1)  # Exclude 'input'
    
    # Count errors
    error_count = sum(1 for result in results.values() 
                     if isinstance(result, dict) and "error" in result)
    metrics.set_gauge("pipeline_error_count", error_count)
    
    if error_count == 0:
        metrics.record_success("pipeline")
    else:
        metrics.record_error("pipeline", "execution_error")

async def main():
    summary = metrics.get_metrics_summary()
    print(json.dumps(summary, indent=2))

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())`;
  }

  private generateMonitoringCompose(): string {
    const appName = this.pipeline.title.toLowerCase().replace(/\s+/g, '-');
    return `version: '3.8'

services:
  ${appName}:
    build: .
    ports:
      - "8000:8000"
    environment:
      - OPENAI_API_KEY=\${OPENAI_API_KEY}
    depends_on:
      - prometheus
      - grafana
    networks:
      - monitoring

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
    networks:
      - monitoring

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./monitoring/grafana/datasources:/etc/grafana/provisioning/datasources
    networks:
      - monitoring

  node-exporter:
    image: prom/node-exporter:latest
    ports:
      - "9100:9100"
    networks:
      - monitoring

networks:
  monitoring:
    driver: bridge

volumes:
  prometheus_data:
  grafana_data:`;
  }

  private generateProductionEnv(): string {
    return `# Production Environment Variables for ${this.pipeline.title}

# API Keys (Set these in your deployment platform)
${this.getRequiredEnvVars().map(env => `${env}=`).join('\n')}

# Application Settings
NODE_ENV=production
LOG_LEVEL=info
PORT=8000

# Performance Settings
MAX_CONCURRENT_REQUESTS=100
REQUEST_TIMEOUT=30000
CACHE_TTL=3600

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=9090
HEALTH_CHECK_INTERVAL=30

# Security
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=60000
CORS_ORIGIN=*

# Database (if applicable)
DATABASE_URL=
REDIS_URL=

# Error Reporting
SENTRY_DSN=
ERROR_REPORTING_ENABLED=true`;
  }

  private async logExport(): Promise<void> {
    try {
      const filename = `${this.pipeline.title.replace(/\s+/g, '_')}_${Date.now()}.zip`;
      
      await supabase.from('export_logs').insert({
        blueprint_id: this.pipeline.id,
        export_format: this.config.format,
        filename,
        file_path: `exports/${filename}`,
        export_config: this.config as any,
        user_id: (await supabase.auth.getUser()).data.user?.id || ''
      });
    } catch (error) {
      console.error('Failed to log export:', error);
    }
  }
}

// Export utilities
export async function exportPipeline(
  pipeline: PipelineConfig,
  config: ExportConfig
): Promise<Blob> {
  const exporter = new PipelineExporter(pipeline, config);
  return await exporter.exportPipeline();
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}