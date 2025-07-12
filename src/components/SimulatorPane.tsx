import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Play, Settings, Key, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface SimulatorPaneProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export function SimulatorPane({ isCollapsed, onToggle }: SimulatorPaneProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [selectedModel, setSelectedModel] = useState('grok-beta');
  const [apiKey, setApiKey] = useState('');

  const handleRunTest = async () => {
    if (!input.trim()) return;
    
    setIsRunning(true);
    // Simulate API call
    setTimeout(() => {
      setOutput(`Pipeline executed successfully!\n\nInput: "${input}"\nModel: ${selectedModel}\nProcessing time: 1.2s\n\nOutput: This is a simulated response from your context pipeline. The input was processed through your configured nodes and generated this response.`);
      setIsRunning(false);
    }, 1200);
  };

  return (
    <div
      className={cn(
        'border-t border-border bg-card transition-all duration-300',
        isCollapsed ? 'h-12' : 'h-80'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
          <h3 className="font-medium text-foreground">Pipeline Simulator</h3>
          {!isCollapsed && (
            <span className="text-xs text-muted-foreground">
              Test your context pipeline in real-time
            </span>
          )}
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="h-6 w-6 p-0"
        >
          {isCollapsed ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </Button>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="p-3 h-[calc(100%-49px)] flex flex-col">
          {/* Configuration Row */}
          <div className="flex gap-3 mb-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                LLM Model
              </label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="grok-beta">Grok Beta</SelectItem>
                  <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
                  <SelectItem value="gpt-4">GPT-4</SelectItem>
                  <SelectItem value="claude-3-haiku">Claude 3 Haiku</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                API Key
              </label>
              <div className="relative">
                <Input
                  type="password"
                  placeholder="Enter your API key..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="h-8 text-xs pr-8"
                />
                <Key className="absolute right-2 top-1.5 h-3 w-3 text-muted-foreground" />
              </div>
            </div>
            
            <div className="flex items-end">
              <Button size="sm" className="h-8">
                <Settings className="w-3 h-3 mr-1" />
                Config
              </Button>
            </div>
          </div>

          {/* Input/Output Row */}
          <div className="flex gap-3 flex-1">
            <div className="flex-1 flex flex-col">
              <label className="text-xs font-medium text-muted-foreground mb-1">
                Test Input
              </label>
              <Textarea
                placeholder="Enter your test prompt here..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 text-xs resize-none"
              />
              <Button
                onClick={handleRunTest}
                disabled={isRunning || !input.trim() || !apiKey.trim()}
                className="mt-2 h-8"
                size="sm"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3 mr-1" />
                    Test Pipeline
                  </>
                )}
              </Button>
            </div>
            
            <div className="flex-1 flex flex-col">
              <label className="text-xs font-medium text-muted-foreground mb-1">
                Pipeline Output
              </label>
              <div className="flex-1 p-3 bg-muted/30 rounded border border-border text-xs font-mono overflow-auto">
                {output || (
                  <span className="text-muted-foreground italic">
                    Output will appear here after running the pipeline...
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}