import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useGraph } from '@/contexts/GraphContext';
import { X, Plus } from 'lucide-react';

export function NodeConfigModal() {
  const { state, dispatch } = useGraph();
  const { selectedNode, configPanelOpen } = state;
  const [localData, setLocalData] = useState<any>({});

  React.useEffect(() => {
    if (selectedNode) {
      setLocalData(selectedNode.data);
    }
  }, [selectedNode]);

  const handleSave = () => {
    if (selectedNode) {
      dispatch({
        type: 'UPDATE_NODE',
        payload: { id: selectedNode.id, data: localData }
      });
    }
    handleClose();
  };

  const handleClose = () => {
    dispatch({ type: 'OPEN_CONFIG_PANEL', payload: false });
    dispatch({ type: 'SELECT_NODE', payload: null });
  };

  const updateData = (key: string, value: any) => {
    setLocalData((prev: any) => ({ ...prev, [key]: value }));
  };

  const addVariable = () => {
    const variables = localData.variables || [];
    const newVar = `variable_${variables.length + 1}`;
    updateData('variables', [...variables, newVar]);
  };

  const removeVariable = (index: number) => {
    const variables = [...(localData.variables || [])];
    variables.splice(index, 1);
    updateData('variables', variables);
  };

  const updateVariable = (index: number, value: string) => {
    const variables = [...(localData.variables || [])];
    variables[index] = value;
    updateData('variables', variables);
  };

  if (!selectedNode || !configPanelOpen) return null;

  const renderRAGRetrieverConfig = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="vectorDB">Vector Database</Label>
        <Select value={localData.vectorDB || 'pinecone'} onValueChange={(value) => updateData('vectorDB', value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pinecone">Pinecone</SelectItem>
            <SelectItem value="faiss">FAISS</SelectItem>
            <SelectItem value="weaviate">Weaviate</SelectItem>
            <SelectItem value="chroma">Chroma</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <Label htmlFor="apiEndpoint">API Endpoint / Connection String</Label>
        <Input
          id="apiEndpoint"
          value={localData.apiEndpoint || ''}
          onChange={(e) => updateData('apiEndpoint', e.target.value)}
          placeholder="https://your-index-12345.pinecone.io"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="topK">Top K Results</Label>
          <Input
            id="topK"
            type="number"
            value={localData.topK || 5}
            onChange={(e) => updateData('topK', parseInt(e.target.value))}
            min="1"
            max="20"
          />
        </div>
        <div>
          <Label htmlFor="similarityThreshold">Similarity Threshold</Label>
          <Input
            id="similarityThreshold"
            type="number"
            step="0.1"
            value={localData.similarityThreshold || 0.7}
            onChange={(e) => updateData('similarityThreshold', parseFloat(e.target.value))}
            min="0"
            max="1"
          />
        </div>
      </div>
      
      <div>
        <Label htmlFor="namespace">Namespace (optional)</Label>
        <Input
          id="namespace"
          value={localData.namespace || ''}
          onChange={(e) => updateData('namespace', e.target.value)}
          placeholder="production"
        />
      </div>
    </div>
  );

  const renderMemoryStoreConfig = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="storeType">Store Type</Label>
        <Select value={localData.storeType || 'redis'} onValueChange={(value) => updateData('storeType', value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="redis">Redis</SelectItem>
            <SelectItem value="memory">In-Memory</SelectItem>
            <SelectItem value="postgresql">PostgreSQL</SelectItem>
            <SelectItem value="mongodb">MongoDB</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <Label htmlFor="connectionString">Connection String</Label>
        <Input
          id="connectionString"
          value={localData.connectionString || ''}
          onChange={(e) => updateData('connectionString', e.target.value)}
          placeholder="redis://localhost:6379"
          type="password"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="maxTokens">Max Tokens</Label>
          <Input
            id="maxTokens"
            type="number"
            value={localData.maxTokens || 2000}
            onChange={(e) => updateData('maxTokens', parseInt(e.target.value))}
            min="100"
            max="10000"
          />
        </div>
        <div>
          <Label htmlFor="ttl">TTL (minutes)</Label>
          <Input
            id="ttl"
            type="number"
            value={localData.ttl || 60}
            onChange={(e) => updateData('ttl', parseInt(e.target.value))}
            min="1"
          />
        </div>
      </div>
    </div>
  );

  const renderPromptTemplateConfig = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="template">Prompt Template</Label>
        <Textarea
          id="template"
          value={localData.template || ''}
          onChange={(e) => updateData('template', e.target.value)}
          placeholder="You are a helpful assistant.&#10;&#10;Context: {context}&#10;Question: {question}"
          rows={6}
          className="font-mono text-sm"
        />
      </div>
      
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Variables</Label>
          <Button size="sm" variant="outline" onClick={addVariable}>
            <Plus className="w-4 h-4 mr-1" />
            Add Variable
          </Button>
        </div>
        <div className="space-y-2">
          {(localData.variables || []).map((variable: string, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={variable}
                onChange={(e) => updateVariable(index, e.target.value)}
                placeholder="variable_name"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => removeVariable(index)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
        {(localData.variables || []).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {localData.variables.map((variable: string, index: number) => (
              <Badge key={index} variant="secondary">
                {`{${variable}}`}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderStateTrackerConfig = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="trackingType">Tracking Type</Label>
        <Select value={localData.trackingType || 'conversation'} onValueChange={(value) => updateData('trackingType', value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="conversation">Conversation</SelectItem>
            <SelectItem value="user_session">User Session</SelectItem>
            <SelectItem value="context_window">Context Window</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <Label htmlFor="maxHistory">Max History Items</Label>
        <Input
          id="maxHistory"
          type="number"
          value={localData.maxHistory || 10}
          onChange={(e) => updateData('maxHistory', parseInt(e.target.value))}
          min="1"
          max="100"
        />
      </div>
      
      <div>
        <Label htmlFor="stateFields">State Fields (JSON)</Label>
        <Textarea
          id="stateFields"
          value={localData.stateFields || '{}'}
          onChange={(e) => updateData('stateFields', e.target.value)}
          placeholder='{"user_preferences": {}, "conversation_topic": ""}'
          rows={4}
          className="font-mono text-sm"
        />
      </div>
    </div>
  );

  const renderOutputParserConfig = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="parserType">Parser Type</Label>
        <Select value={localData.parserType || 'json'} onValueChange={(value) => updateData('parserType', value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="json">JSON</SelectItem>
            <SelectItem value="xml">XML</SelectItem>
            <SelectItem value="regex">Regex</SelectItem>
            <SelectItem value="structured">Structured</SelectItem>
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <Label htmlFor="schema">Output Schema</Label>
        <Textarea
          id="schema"
          value={typeof localData.schema === 'string' ? localData.schema : JSON.stringify(localData.schema || {}, null, 2)}
          onChange={(e) => updateData('schema', e.target.value)}
          placeholder='{"type": "object", "properties": {"answer": {"type": "string"}, "confidence": {"type": "number"}}}'
          rows={6}
          className="font-mono text-sm"
        />
      </div>
      
      {localData.parserType === 'regex' && (
        <div>
          <Label htmlFor="regexPattern">Regex Pattern</Label>
          <Input
            id="regexPattern"
            value={localData.regexPattern || ''}
            onChange={(e) => updateData('regexPattern', e.target.value)}
            placeholder="(?P<answer>.*?)(?P<confidence>\d+\.?\d*)"
            className="font-mono"
          />
        </div>
      )}
    </div>
  );

  const renderConfigContent = () => {
    switch (selectedNode.type) {
      case 'rag-retriever':
        return renderRAGRetrieverConfig();
      case 'memory-store':
        return renderMemoryStoreConfig();
      case 'prompt-template':
        return renderPromptTemplateConfig();
      case 'state-tracker':
        return renderStateTrackerConfig();
      case 'output-parser':
        return renderOutputParserConfig();
      default:
        return <div>No configuration available for this node type.</div>;
    }
  };

  return (
    <Dialog open={configPanelOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {selectedNode.data.icon && (
              <div className="p-2 rounded-md bg-gradient-primary text-primary-foreground">
                {selectedNode.data.icon as React.ReactNode}
              </div>
            )}
            Configure {selectedNode.data.label}
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          <div className="mb-4">
            <Label htmlFor="nodeLabel">Node Label</Label>
            <Input
              id="nodeLabel"
              value={localData.label || ''}
              onChange={(e) => updateData('label', e.target.value)}
              placeholder="Enter a descriptive label"
            />
          </div>
          
          {renderConfigContent()}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}