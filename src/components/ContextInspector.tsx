import React, { useState } from 'react';
import { Copy, Download, Edit3, Eye, FileCode, RotateCcw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

interface ContextData {
  nodeId: string;
  nodeName: string;
  prompt: string;
  systemPrompt?: string;
  userInput?: string;
  context?: string;
  output?: string;
  tokenCount: number;
  model?: string;
}

interface ContextInspectorProps {
  isOpen: boolean;
  onClose: () => void;
  contextData: ContextData | null;
  onContextUpdate?: (nodeId: string, updatedContext: Partial<ContextData>) => void;
}

export function ContextInspector({
  isOpen,
  onClose,
  contextData,
  onContextUpdate,
}: ContextInspectorProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editedPrompt, setEditedPrompt] = useState('');
  const [editedSystemPrompt, setEditedSystemPrompt] = useState('');
  const [editedContext, setEditedContext] = useState('');

  React.useEffect(() => {
    if (contextData) {
      setEditedPrompt(contextData.prompt || '');
      setEditedSystemPrompt(contextData.systemPrompt || '');
      setEditedContext(contextData.context || '');
    }
  }, [contextData]);

  const estimateTokens = (text: string): number => {
    // Rough token estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  };

  const generatePythonCode = (): string => {
    if (!contextData) return '';

    return `import openai
from openai import OpenAI

client = OpenAI(api_key="your-api-key-here")

# Context data for node: ${contextData.nodeName}
system_prompt = """${contextData.systemPrompt || ''}"""

user_prompt = """${contextData.prompt || ''}"""

context = """${contextData.context || ''}"""

# Combine context and user input
full_prompt = f"{context}\\n\\n{user_prompt}" if context else user_prompt

response = client.chat.completions.create(
    model="${contextData.model || 'gpt-4o-mini'}",
    messages=[
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": full_prompt}
    ],
    temperature=0.7,
    max_tokens=1000
)

print(response.choices[0].message.content)
`;
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: `${type} copied successfully`,
    });
  };

  const handleSaveEdit = () => {
    if (contextData && onContextUpdate) {
      onContextUpdate(contextData.nodeId, {
        prompt: editedPrompt,
        systemPrompt: editedSystemPrompt,
        context: editedContext,
      });
    }
    setIsEditing(false);
    toast({
      title: "Context updated",
      description: "Changes saved successfully",
    });
  };

  const handleResetEdit = () => {
    if (contextData) {
      setEditedPrompt(contextData.prompt || '');
      setEditedSystemPrompt(contextData.systemPrompt || '');
      setEditedContext(contextData.context || '');
    }
    setIsEditing(false);
  };

  if (!contextData) return null;

  const totalTokens = estimateTokens(
    (editedSystemPrompt || '') + (editedPrompt || '') + (editedContext || '')
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl h-[80vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle>Context Inspector</DialogTitle>
              <Badge variant="secondary">{contextData.nodeName}</Badge>
              <Badge variant="outline">
                {totalTokens} tokens (~${((totalTokens / 1000) * 0.002).toFixed(4)})
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(generatePythonCode(), "Python code")}
              >
                <FileCode className="h-4 w-4 mr-1" />
                Copy as Code
              </Button>
              {isEditing ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetEdit}
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Reset
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleSaveEdit}
                  >
                    Save Changes
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit3 className="h-4 w-4 mr-1" />
                  Edit Context
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0">
          <Tabs defaultValue="context" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="context">Context & Input</TabsTrigger>
              <TabsTrigger value="comparison">Input vs Output</TabsTrigger>
              <TabsTrigger value="code">Python Code</TabsTrigger>
            </TabsList>

            <TabsContent value="context" className="flex-1 min-h-0">
              <div className="grid grid-cols-1 gap-4 h-full">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium">System Prompt</label>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {estimateTokens(editedSystemPrompt)} tokens
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(editedSystemPrompt, "System prompt")}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <Textarea
                      value={editedSystemPrompt}
                      onChange={(e) => setEditedSystemPrompt(e.target.value)}
                      readOnly={!isEditing}
                      className="min-h-[100px] font-mono text-sm"
                      placeholder="No system prompt defined"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium">Context Data</label>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {estimateTokens(editedContext)} tokens
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(editedContext, "Context")}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <Textarea
                      value={editedContext}
                      onChange={(e) => setEditedContext(e.target.value)}
                      readOnly={!isEditing}
                      className="min-h-[120px] font-mono text-sm"
                      placeholder="No context data available"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium">User Prompt</label>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {estimateTokens(editedPrompt)} tokens
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(editedPrompt, "Prompt")}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <Textarea
                      value={editedPrompt}
                      onChange={(e) => setEditedPrompt(e.target.value)}
                      readOnly={!isEditing}
                      className="min-h-[120px] font-mono text-sm"
                      placeholder="No prompt defined"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="comparison" className="flex-1 min-h-0">
              <div className="grid grid-cols-2 gap-4 h-full">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">Input Context</h3>
                    <Badge variant="outline" className="text-xs">
                      {totalTokens} tokens
                    </Badge>
                  </div>
                  <div className="border rounded-md p-3 h-full overflow-auto">
                    <div className="space-y-4 text-sm font-mono">
                      {editedSystemPrompt && (
                        <div>
                          <div className="text-xs font-medium text-muted-foreground mb-1">
                            SYSTEM:
                          </div>
                          <div className="whitespace-pre-wrap">{editedSystemPrompt}</div>
                        </div>
                      )}
                      {editedContext && (
                        <div>
                          <div className="text-xs font-medium text-muted-foreground mb-1">
                            CONTEXT:
                          </div>
                          <div className="whitespace-pre-wrap">{editedContext}</div>
                        </div>
                      )}
                      {editedPrompt && (
                        <div>
                          <div className="text-xs font-medium text-muted-foreground mb-1">
                            USER:
                          </div>
                          <div className="whitespace-pre-wrap">{editedPrompt}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">LLM Output</h3>
                    <Badge variant="outline" className="text-xs">
                      {contextData.output ? estimateTokens(contextData.output) : 0} tokens
                    </Badge>
                  </div>
                  <div className="border rounded-md p-3 h-full overflow-auto">
                    <div className="text-sm font-mono whitespace-pre-wrap">
                      {contextData.output || (
                        <span className="text-muted-foreground italic">
                          No output available - run the pipeline to see results
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="code" className="flex-1 min-h-0">
              <div className="space-y-2 h-full">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Python Equivalent</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(generatePythonCode(), "Python code")}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copy Code
                  </Button>
                </div>
                <div className="border rounded-md p-3 h-full overflow-auto">
                  <pre className="text-sm font-mono whitespace-pre-wrap">
                    {generatePythonCode()}
                  </pre>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}