import React, { memo } from 'react';
import { FileText, Settings } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface PromptTemplateNodeProps {
  id: string;
  data: {
    label: string;
    template?: string;
    variables?: string[];
  };
  selected?: boolean;
}

export const PromptTemplateNode = memo(({ id, data, selected }: PromptTemplateNodeProps) => {
  return (
    <BaseNode
      id={id}
      data={{
        label: data.label,
        type: 'Prompt Template',
        icon: <FileText className="w-4 h-4" />,
        variant: 'prompt'
      }}
      selected={selected}
    >
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Template
          </label>
          <Textarea
            defaultValue={data.template || 'You are a helpful assistant. {context}\n\nUser: {question}\nAssistant:'}
            className="min-h-[80px] text-xs resize-none"
            placeholder="Enter your prompt template with {variables}..."
          />
        </div>
        
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Variables
          </label>
          <div className="flex flex-wrap gap-1">
            {(data.variables || ['context', 'question']).map((variable, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 rounded text-xs bg-success/10 text-success border border-success/20"
              >
                {variable}
              </span>
            ))}
          </div>
        </div>
        
        <Button variant="outline" size="sm" className="w-full h-8 text-xs">
          <Settings className="w-3 h-3 mr-1" />
          Edit Template
        </Button>
      </div>
    </BaseNode>
  );
});

PromptTemplateNode.displayName = 'PromptTemplateNode';