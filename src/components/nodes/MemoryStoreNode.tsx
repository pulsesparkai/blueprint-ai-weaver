import React from 'react';
import { BaseNode } from './BaseNode';
import { Brain, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGraph } from '@/contexts/GraphContext';

export function MemoryStoreNode({ id, data, selected }: any) {
  const { dispatch } = useGraph();

  const handleConfigure = () => {
    dispatch({ type: 'SELECT_NODE', payload: { id, data, type: 'memory-store', position: { x: 0, y: 0 } } });
  };

  return (
    <BaseNode 
      id={id}
      data={{
        ...data,
        icon: <Brain className="w-4 h-4" />,
        type: 'Memory Store',
        variant: 'memory'
      }}
      selected={selected}
    >
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Store: {data.storeType || 'Not configured'}</span>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={handleConfigure}
              className="h-6 w-6 p-0"
            >
              <Settings className="w-3 h-3" />
            </Button>
          </div>
          <div>Max Tokens: {data.maxTokens || 2000}</div>
          <div>TTL: {data.ttl || 60}min</div>
        </div>
      </div>
    </BaseNode>
  );
}