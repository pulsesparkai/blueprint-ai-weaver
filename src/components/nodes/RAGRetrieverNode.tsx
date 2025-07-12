import React from 'react';
import { BaseNode } from './BaseNode';
import { Database, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGraph } from '@/contexts/GraphContext';

export function RAGRetrieverNode({ id, data, selected }: any) {
  const { dispatch } = useGraph();

  const handleConfigure = () => {
    dispatch({ type: 'SELECT_NODE', payload: { id, data, type: 'rag-retriever', position: { x: 0, y: 0 } } });
  };

  return (
    <BaseNode 
      id={id}
      data={{
        ...data,
        icon: <Database className="w-4 h-4" />,
        type: 'RAG Retriever',
        variant: 'rag'
      }}
      selected={selected}
      showTargetHandle={false}
    >
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Database: {data.vectorDB || 'Not configured'}</span>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={handleConfigure}
              className="h-6 w-6 p-0"
            >
              <Settings className="w-3 h-3" />
            </Button>
          </div>
          <div>Top K: {data.topK || 5}</div>
          <div>Threshold: {data.similarityThreshold || 0.7}</div>
        </div>
      </div>
    </BaseNode>
  );
}