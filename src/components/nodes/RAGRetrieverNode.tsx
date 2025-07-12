import React, { memo } from 'react';
import { Database, Settings } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface RAGRetrieverNodeProps {
  id: string;
  data: {
    label: string;
    vectorDB?: string;
    topK?: number;
    similarityThreshold?: number;
  };
  selected?: boolean;
}

export const RAGRetrieverNode = memo(({ id, data, selected }: RAGRetrieverNodeProps) => {
  return (
    <BaseNode
      id={id}
      data={{
        label: data.label,
        type: 'RAG Retriever',
        icon: <Database className="w-4 h-4" />,
        variant: 'rag'
      }}
      selected={selected}
    >
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Vector Database
          </label>
          <Select defaultValue={data.vectorDB || 'pinecone'}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pinecone">Pinecone</SelectItem>
              <SelectItem value="faiss">FAISS</SelectItem>
              <SelectItem value="chroma">ChromaDB</SelectItem>
              <SelectItem value="weaviate">Weaviate</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Top K
            </label>
            <input
              type="number"
              defaultValue={data.topK || 5}
              className="w-full h-8 px-2 text-xs rounded border border-border bg-background"
              min="1"
              max="20"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Threshold
            </label>
            <input
              type="number"
              defaultValue={data.similarityThreshold || 0.7}
              step="0.1"
              min="0"
              max="1"
              className="w-full h-8 px-2 text-xs rounded border border-border bg-background"
            />
          </div>
        </div>
        
        <Button variant="outline" size="sm" className="w-full h-8 text-xs">
          <Settings className="w-3 h-3 mr-1" />
          Configure
        </Button>
      </div>
    </BaseNode>
  );
});

RAGRetrieverNode.displayName = 'RAGRetrieverNode';