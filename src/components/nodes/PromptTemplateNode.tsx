import React from 'react';
import { BaseNode } from './BaseNode';
import { FileText, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useGraph } from '@/contexts/GraphContext';

export function PromptTemplateNode({ id, data, selected }: any) {
  const { dispatch } = useGraph();

  const handleConfigure = () => {
    dispatch({ type: 'SELECT_NODE', payload: { id, data, type: 'prompt-template', position: { x: 0, y: 0 } } });
  };

  return (
    <BaseNode 
      id={id}
      data={{
        ...data,
        icon: <FileText className="w-4 h-4" />,
        type: 'Prompt Template',
        variant: 'prompt'
      }}
      selected={selected}
    >
      <div className="space-y-3">
        <div className="text-xs text-muted-foreground">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Template Preview</span>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={handleConfigure}
              className="h-6 w-6 p-0"
            >
              <Settings className="w-3 h-3" />
            </Button>
          </div>
          <div className="p-2 bg-muted/50 rounded text-xs font-mono max-h-16 overflow-hidden">
            {data.template?.substring(0, 60) || 'No template configured'}
            {data.template?.length > 60 && '...'}
          </div>
        </div>
        
        {data.variables && data.variables.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {data.variables.slice(0, 3).map((variable: string, index: number) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {`{${variable}}`}
              </Badge>
            ))}
            {data.variables.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{data.variables.length - 3}
              </Badge>
            )}
          </div>
        )}
      </div>
    </BaseNode>
  );
}