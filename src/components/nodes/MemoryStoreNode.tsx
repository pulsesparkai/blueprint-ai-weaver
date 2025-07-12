import React, { memo } from 'react';
import { Brain, Settings } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface MemoryStoreNodeProps {
  id: string;
  data: {
    label: string;
    storeType?: string;
    maxTokens?: number;
    ttl?: number;
  };
  selected?: boolean;
}

export const MemoryStoreNode = memo(({ id, data, selected }: MemoryStoreNodeProps) => {
  return (
    <BaseNode
      id={id}
      data={{
        label: data.label,
        type: 'Memory Store',
        icon: <Brain className="w-4 h-4" />,
        variant: 'memory'
      }}
      selected={selected}
    >
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Store Type
          </label>
          <Select defaultValue={data.storeType || 'redis'}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="redis">Redis</SelectItem>
              <SelectItem value="memory">In-Memory</SelectItem>
              <SelectItem value="postgres">PostgreSQL</SelectItem>
              <SelectItem value="mongodb">MongoDB</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Max Tokens
            </label>
            <input
              type="number"
              defaultValue={data.maxTokens || 2000}
              className="w-full h-8 px-2 text-xs rounded border border-border bg-background"
              min="100"
              max="10000"
              step="100"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              TTL (mins)
            </label>
            <input
              type="number"
              defaultValue={data.ttl || 60}
              className="w-full h-8 px-2 text-xs rounded border border-border bg-background"
              min="1"
              max="1440"
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

MemoryStoreNode.displayName = 'MemoryStoreNode';