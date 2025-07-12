import { Node, Edge } from '@xyflow/react';
import { supabase } from '@/integrations/supabase/client';

export interface SavePipelineOptions {
  id?: string;
  title: string;
  description?: string;
  nodes: Node[];
  edges: Edge[];
  metadata?: any;
  isPublic?: boolean;
}

export interface SavePipelineResult {
  success: boolean;
  blueprint?: {
    id: string;
    title: string;
    description?: string;
    nodes: Node[];
    edges: Edge[];
    is_public: boolean;
    created_at: string;
    updated_at: string;
  };
  operation?: 'create' | 'update';
  error?: string;
}

export async function savePipeline(options: SavePipelineOptions): Promise<SavePipelineResult> {
  try {
    const { data, error } = await supabase.functions.invoke('api-save-pipeline', {
      body: {
        id: options.id,
        title: options.title,
        description: options.description,
        nodes: options.nodes,
        edges: options.edges,
        metadata: options.metadata,
        is_public: options.isPublic || false
      }
    });

    if (error) {
      throw new Error(`Failed to save pipeline: ${error.message}`);
    }

    return {
      success: data.success,
      blueprint: data.blueprint,
      operation: data.operation
    };

  } catch (error) {
    console.error('Error saving pipeline:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function loadPipeline(blueprintId: string): Promise<SavePipelineResult> {
  try {
    const { data: blueprint, error } = await supabase
      .from('blueprints')
      .select('*')
      .eq('id', blueprintId)
      .single();

    if (error) {
      throw new Error(`Failed to load pipeline: ${error.message}`);
    }

    if (!blueprint) {
      throw new Error('Pipeline not found');
    }

    return {
      success: true,
      blueprint: {
        id: blueprint.id,
        title: blueprint.title,
        description: blueprint.description,
        nodes: (blueprint.nodes as unknown as Node[]) || [],
        edges: (blueprint.edges as unknown as Edge[]) || [],
        is_public: blueprint.is_public || false,
        created_at: blueprint.created_at,
        updated_at: blueprint.updated_at
      }
    };

  } catch (error) {
    console.error('Error loading pipeline:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

export async function listPipelines(): Promise<{
  success: boolean;
  blueprints?: Array<{
    id: string;
    title: string;
    description?: string;
    is_public: boolean;
    created_at: string;
    updated_at: string;
    nodeCount: number;
    edgeCount: number;
  }>;
  error?: string;
}> {
  try {
    const { data: blueprints, error } = await supabase
      .from('blueprints')
      .select('id, title, description, is_public, created_at, updated_at, nodes, edges')
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to load pipelines: ${error.message}`);
    }

    const processedBlueprints = blueprints?.map(blueprint => ({
      id: blueprint.id,
      title: blueprint.title,
      description: blueprint.description,
      is_public: blueprint.is_public || false,
      created_at: blueprint.created_at,
      updated_at: blueprint.updated_at,
      nodeCount: Array.isArray(blueprint.nodes) ? blueprint.nodes.length : 0,
      edgeCount: Array.isArray(blueprint.edges) ? blueprint.edges.length : 0
    })) || [];

    return {
      success: true,
      blueprints: processedBlueprints
    };

  } catch (error) {
    console.error('Error listing pipelines:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}