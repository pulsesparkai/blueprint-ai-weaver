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
        data: { label: 'Test Input' },
        position: { x: 0, y: 0 }
      }
    ],
    edges: []
  };

  it('should export pipeline as Python code', async () => {
    const config: ExportConfig = {
      format: 'python',
      includeDockerfile: true,
      includeReadme: true,
      includeTests: true,
      includeDocs: true,
      includeMonitoring: false,
      pythonVersion: '3.11',
      nodeVersion: '20',
      packageManager: 'pip',
      deployment: {
        platform: 'local',
        environment: 'development',
        autoScale: false,
        monitoring: false
      },
      optimization: {
        caching: true,
        batching: true,
        streaming: false,
        fallbacks: true
      }
    };

    const result = await exportPipeline(mockPipeline, config);
    
    expect(result).toBeInstanceOf(Blob);
    expect(result.type).toBe('application/zip');
  });

  it('should export pipeline as TypeScript', async () => {
    const config: ExportConfig = {
      format: 'typescript',
      includeDockerfile: true,
      includeReadme: true,
      includeTests: true,
      includeDocs: true,
      includeMonitoring: false,
      pythonVersion: '3.11',
      nodeVersion: '20',
      packageManager: 'npm',
      deployment: {
        platform: 'local',
        environment: 'development',
        autoScale: false,
        monitoring: false
      },
      optimization: {
        caching: true,
        batching: true,
        streaming: false,
        fallbacks: true
      }
    };

    const result = await exportPipeline(mockPipeline, config);
    
    expect(result).toBeInstanceOf(Blob);
    expect(result.type).toBe('application/zip');
  });

  it('should generate Docker Compose configuration', async () => {
    const config: ExportConfig = {
      format: 'docker-compose',
      includeDockerfile: true,
      includeReadme: true,
      includeTests: true,
      includeDocs: true,
      includeMonitoring: true,
      pythonVersion: '3.11',
      nodeVersion: '20',
      packageManager: 'pip',
      deployment: {
        platform: 'local',
        environment: 'production',
        autoScale: false,
        monitoring: true
      },
      optimization: {
        caching: true,
        batching: true,
        streaming: false,
        fallbacks: true
      }
    };

    const result = await exportPipeline(mockPipeline, config);
    
    expect(result).toBeInstanceOf(Blob);
    expect(result.type).toBe('application/zip');
  });

  it('should handle empty pipeline gracefully', async () => {
    const emptyPipeline = {
      id: 'empty-pipeline',
      title: 'Empty Pipeline',
      nodes: [],
      edges: []
    };

    const config: ExportConfig = {
      format: 'python',
      includeDockerfile: false,
      includeReadme: true,
      includeTests: false,
      includeDocs: false,
      includeMonitoring: false,
      pythonVersion: '3.11',
      nodeVersion: '20',
      packageManager: 'pip',
      deployment: {
        platform: 'local',
        environment: 'development',
        autoScale: false,
        monitoring: false
      },
      optimization: {
        caching: false,
        batching: false,
        streaming: false,
        fallbacks: false
      }
    };

    const result = await exportPipeline(emptyPipeline, config);
    
    expect(result).toBeInstanceOf(Blob);
    expect(result.type).toBe('application/zip');
    expect(result.size).toBeGreaterThan(0);
  });
});