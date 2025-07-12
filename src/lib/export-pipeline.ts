import JSZip from 'jszip';
import { supabase } from '@/integrations/supabase/client';

export interface ExportConfig {
  format: 'python' | 'jupyter' | 'docker-compose';
  includeDockerfile: boolean;
  includeReadme: boolean;
  pythonVersion: '3.8' | '3.9' | '3.10' | '3.11';
  packageManager: 'pip' | 'poetry' | 'conda';
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
        zip.file('pipeline.py', this.generatePythonScript());
        break;
      case 'jupyter':
        zip.file('pipeline.ipynb', this.generateJupyterNotebook());
        break;
      case 'docker-compose':
        zip.file('pipeline.py', this.generatePythonScript());
        zip.file('docker-compose.yml', this.generateDockerCompose());
        break;
    }

    // Add supporting files
    zip.file('requirements.txt', this.generateRequirements());
    
    if (this.config.includeDockerfile) {
      zip.file('Dockerfile', this.generateDockerfile());
    }

    if (this.config.includeReadme) {
      zip.file('README.md', this.generateReadme());
    }

    // Add configuration files
    zip.file('config.json', this.generateConfigFile());
    zip.file('.env.example', this.generateEnvExample());

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