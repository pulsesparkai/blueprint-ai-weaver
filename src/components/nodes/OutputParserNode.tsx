import React from 'react';
import { BaseNode } from './BaseNode';
import { Code2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useGraph } from '@/contexts/GraphContext';

export function OutputParserNode({ id, data, selected }: any) {
  const { dispatch } = useGraph();

  const handleConfigure = () => {
    dispatch({ type: 'SELECT_NODE', payload: { id, data, type: 'output-parser' } });
  };

  return (
    <BaseNode 
      id={id}
      data={{
        ...data,
        icon: <Code2 className="w-4 h-4" />,
        type: 'Output Parser',
        variant: 'parser'
      }}
      selected={selected}
      showSourceHandle={false}
    >
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Type: {data.parserType || 'Not configured'}</span>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={handleConfigure}
              className="h-6 w-6 p-0"
            >
              <Settings className="w-3 h-3" />
            </Button>
          </div>
          {data.schema && Object.keys(data.schema).length > 0 && (
            <div>Schema: Configured</div>
          )}
        </div>
      </div>
    </BaseNode>
  );
}