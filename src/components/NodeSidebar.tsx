import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Database, Brain, FileText, Activity, Code2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NodeType {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  category: string;
  variant: string;
}

const nodeTypes: NodeType[] = [
  {
    id: 'rag-retriever',
    label: 'RAG Retriever',
    icon: <Database className="w-4 h-4" />,
    description: 'Retrieve relevant context from vector databases',
    category: 'Retrieval',
    variant: 'rag'
  },
  {
    id: 'memory-store',
    label: 'Memory Store',
    icon: <Brain className="w-4 h-4" />,
    description: 'Store and manage conversation memory',
    category: 'Memory',
    variant: 'memory'
  },
  {
    id: 'prompt-template',
    label: 'Prompt Template',
    icon: <FileText className="w-4 h-4" />,
    description: 'Define structured prompts with variables',
    category: 'Prompts',
    variant: 'prompt'
  },
  {
    id: 'state-tracker',
    label: 'State Tracker',
    icon: <Activity className="w-4 h-4" />,
    description: 'Track conversation and user state',
    category: 'State',
    variant: 'state'
  },
  {
    id: 'output-parser',
    label: 'Output Parser',
    icon: <Code2 className="w-4 h-4" />,
    description: 'Parse and structure LLM outputs',
    category: 'Output',
    variant: 'parser'
  }
];

interface NodeSidebarProps {
  onAddNode: (nodeType: NodeType) => void;
}

export function NodeSidebar({ onAddNode }: NodeSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleDragStart = (event: React.DragEvent, nodeType: NodeType) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(nodeType));
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      className={cn(
        'relative bg-card border-r border-border transition-all duration-300 h-full',
        isCollapsed ? 'w-16' : 'w-80'
      )}
    >
      {/* Collapse Toggle */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-4 z-10 h-6 w-6 rounded-full border border-border bg-background shadow-md"
      >
        {isCollapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </Button>

      <div className="p-4">
        {!isCollapsed && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Context Modules
            </h2>
            <p className="text-sm text-muted-foreground">
              Drag and drop to build your context pipeline
            </p>
          </div>
        )}

        <div className="space-y-2">
          {nodeTypes.map((nodeType) => (
            <div
              key={nodeType.id}
              draggable
              onDragStart={(e) => handleDragStart(e, nodeType)}
              onClick={() => onAddNode(nodeType)}
              className={cn(
                'group relative rounded-lg border border-border/50 bg-gradient-node p-3 cursor-pointer transition-all duration-200 hover:border-primary/30 hover:shadow-node',
                isCollapsed && 'p-2'
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  'flex-shrink-0 p-2 rounded-md bg-gradient-primary text-primary-foreground',
                  isCollapsed && 'p-1.5'
                )}>
                  {nodeType.icon}
                </div>
                
                {!isCollapsed && (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-foreground text-sm truncate">
                        {nodeType.label}
                      </h3>
                      <span className="text-xs px-2 py-0.5 rounded bg-muted/50 text-muted-foreground">
                        {nodeType.category}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {nodeType.description}
                    </p>
                  </div>
                )}
              </div>

              {!isCollapsed && (
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Plus className="w-4 h-4 text-primary" />
                </div>
              )}

              {isCollapsed && (
                <div className="absolute left-full top-0 ml-2 p-3 bg-popover border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 min-w-[250px]">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-medium text-foreground text-sm">
                      {nodeType.label}
                    </h3>
                    <span className="text-xs px-2 py-0.5 rounded bg-muted/50 text-muted-foreground">
                      {nodeType.category}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {nodeType.description}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {!isCollapsed && (
          <div className="mt-6 p-3 rounded-lg bg-muted/30 border border-border/50">
            <h4 className="text-sm font-medium text-foreground mb-2">
              💡 Quick Tip
            </h4>
            <p className="text-xs text-muted-foreground">
              Connect nodes to create a data flow. Each connection represents how context flows through your pipeline.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}