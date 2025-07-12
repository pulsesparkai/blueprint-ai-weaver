import React, { memo } from 'react';
import { Code2, Settings } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface OutputParserNodeProps {
  id: string;
  data: {
    label: string;
    parserType?: string;
    schema?: any;
  };
  selected?: boolean;
}

export const OutputParserNode = memo(({ id, data, selected }: OutputParserNodeProps) => {
  return (
    <BaseNode
      id={id}
      data={{
        label: data.label,
        type: 'Output Parser',
        icon: <Code2 className="w-4 h-4" />,
        variant: 'parser'
      }}
      selected={selected}
    >
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Parser Type
          </label>
          <Select defaultValue={data.parserType || 'json'}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="json">JSON Schema</SelectItem>
              <SelectItem value="pydantic">Pydantic Model</SelectItem>
              <SelectItem value="regex">Regex Pattern</SelectItem>
              <SelectItem value="structured">Structured Output</SelectItem>
              <SelectItem value="custom">Custom Parser</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Expected Fields
          </label>
          <div className="space-y-1">
            {['answer', 'confidence', 'sources', 'metadata'].map((field, index) => (
              <div key={index} className="flex items-center justify-between text-xs">
                <span className="text-foreground">{field}</span>
                <span className="text-muted-foreground">string</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="p-2 bg-muted/30 rounded text-xs">
          <div className="font-mono text-foreground mb-1">Preview:</div>
          <div className="text-muted-foreground font-mono">
            {`{
  "answer": "...",
  "confidence": 0.95,
  "sources": [...]
}`}
          </div>
        </div>
        
        <Button variant="outline" size="sm" className="w-full h-8 text-xs">
          <Settings className="w-3 h-3 mr-1" />
          Edit Schema
        </Button>
      </div>
    </BaseNode>
  );
});

OutputParserNode.displayName = 'OutputParserNode';