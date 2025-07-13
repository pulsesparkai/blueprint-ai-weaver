import { describe, it, expect } from 'vitest';
import { exportPipeline, ExportConfig } from "@/lib/export-pipeline";

describe('Pipeline Export', () => {
  const mockPipeline = {
    id: 'test-pipeline',
    title: 'Test Pipeline',
    description: 'A test pipeline',
    nodes: [
      {
        id: 'input-1',
        type: 'input',
        data: { name: 'Test Input' },
        position: { x: 0, y: 0 }
      }
    ],
    edges: []
  };

  it('should export pipeline as Python code', async () => {
    const config: ExportConfig = {
      format: 'python',
      includeTests: true,
      includeDocumentation: true,
      optimizations: {
        removeUnusedNodes: true,
        optimizePrompts: false,
        enableCaching: true
      }
    };

    const result = await exportPipeline(mockPipeline, config);
    
    expect(result.files['main.py']).toBeDefined();
    expect(result.files['requirements.txt']).toBeDefined();
    expect(result.files['README.md']).toBeDefined();
    expect(result.files['test_main.py']).toBeDefined();
  });

  it('should export pipeline as TypeScript', async () => {
    const config: ExportConfig = {
      format: 'typescript',
      includeTests: true,
      includeDocumentation: true
    };

    const result = await exportPipeline(mockPipeline, config);
    
    expect(result.files['index.ts']).toBeDefined();
    expect(result.files['package.json']).toBeDefined();
    expect(result.files['README.md']).toBeDefined();
    expect(result.files['index.test.ts']).toBeDefined();
  });

  it('should generate Docker configuration', async () => {
    const config: ExportConfig = {
      format: 'docker',
      containerConfig: {
        baseImage: 'node:18-alpine',
        port: 3000,
        healthCheck: true
      }
    };

    const result = await exportPipeline(mockPipeline, config);
    
    expect(result.files['Dockerfile']).toBeDefined();
    expect(result.files['docker-compose.yml']).toBeDefined();
    expect(result.files['.dockerignore']).toBeDefined();
  });

  it('should optimize pipeline before export', async () => {
    const pipelineWithUnusedNode = {
      ...mockPipeline,
      nodes: [
        ...mockPipeline.nodes,
        {
          id: 'unused-node',
          type: 'processor',
          data: { name: 'Unused' },
          position: { x: 100, y: 100 }
        }
      ]
    };

    const config: ExportConfig = {
      format: 'python',
      optimizations: {
        removeUnusedNodes: true,
        optimizePrompts: true,
        enableCaching: true
      }
    };

    const result = await exportPipeline(pipelineWithUnusedNode, config);
    
    // Should only contain connected nodes
    expect(result.optimizedPipeline.nodes).toHaveLength(1);
  });

  it('should handle export errors gracefully', async () => {
    const invalidPipeline = {
      id: '',
      title: '',
      nodes: [],
      edges: []
    };

    const config: ExportConfig = {
      format: 'python'
    };

    await expect(exportPipeline(invalidPipeline, config)).rejects.toThrow();
  });
});