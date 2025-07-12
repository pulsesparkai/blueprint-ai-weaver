import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { cn } from '@/lib/utils';

interface BaseNodeProps {
  id: string;
  data: {
    label: string;
    type: string;
    icon: React.ReactNode;
    variant?: 'rag' | 'memory' | 'prompt' | 'state' | 'parser';
  };
  selected?: boolean;
  children?: React.ReactNode;
  showTargetHandle?: boolean;
  showSourceHandle?: boolean;
}

const variantStyles = {
  rag: 'border-info/30 bg-gradient-to-br from-info/10 to-info/5',
  memory: 'border-warning/30 bg-gradient-to-br from-warning/10 to-warning/5',
  prompt: 'border-success/30 bg-gradient-to-br from-success/10 to-success/5',
  state: 'border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5',
  parser: 'border-accent/30 bg-gradient-to-br from-accent/10 to-accent/5',
};

export function BaseNode({
  data,
  selected,
  children,
  showTargetHandle = true,
  showSourceHandle = true
}: BaseNodeProps) {
  const variant = data.variant || 'rag';
  
  return (
    <div
      className={cn(
        'relative min-w-[200px] rounded-lg border-2 bg-card shadow-node transition-all duration-300',
        variantStyles[variant],
        selected && 'ring-2 ring-primary/50 shadow-glow scale-105'
      )}
    >
      {showTargetHandle && (
        <Handle
          type="target"
          position={Position.Left}
          className="w-3 h-3 bg-primary border-2 border-background"
        />
      )}
      
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-md bg-gradient-primary text-primary-foreground">
            {data.icon}
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{data.label}</h3>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              {data.type}
            </p>
          </div>
        </div>
        
        {children}
      </div>
      
      {showSourceHandle && (
        <Handle
          type="source"
          position={Position.Right}
          className="w-3 h-3 bg-primary border-2 border-background"
        />
      )}
    </div>
  );
}