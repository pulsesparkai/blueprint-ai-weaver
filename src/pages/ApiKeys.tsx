import React, { useState, useEffect } from 'react';
import { Plus, Key, Database, Brain, Eye, EyeOff, Edit, Trash2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Integration {
  id: string;
  name: string;
  type: string;
  status: string;
  last_validated?: string;
  validation_error?: string;
  created_at: string;
  config: any;
  user_id: string;
  credential_refs: any;
  updated_at: string;
}

interface IntegrationFormData {
  name: string;
  type: string;
  apiKey: string;
  config: Record<string, string>;
}

const INTEGRATION_TYPES = [
  { value: 'openai', label: 'OpenAI', category: 'LLM', icon: Brain },
  { value: 'anthropic', label: 'Anthropic', category: 'LLM', icon: Brain },
  { value: 'pinecone', label: 'Pinecone', category: 'Vector DB', icon: Database },
  { value: 'weaviate', label: 'Weaviate', category: 'Vector DB', icon: Database },
  { value: 'qdrant', label: 'Qdrant', category: 'Vector DB', icon: Database },
];

const ApiKeys = () => {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState<Integration | null>(null);
  const [testingConnections, setTestingConnections] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const [formData, setFormData] = useState<IntegrationFormData>({
    name: '',
    type: '',
    apiKey: '',
    config: {}
  });

  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIntegrations(data || []);
    } catch (error) {
      console.error('Error loading integrations:', error);
      toast({
        title: "Error",
        description: "Failed to load integrations",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: '',
      apiKey: '',
      config: {}
    });
    setEditingIntegration(null);
    setShowApiKey(false);
  };

  const getConfigFields = (type: string) => {
    switch (type) {
      case 'pinecone':
        return [
          { key: 'environment', label: 'Environment', placeholder: 'us-east-1-aws' },
          { key: 'index_name', label: 'Index Name', placeholder: 'my-index' }
        ];
      case 'weaviate':
        return [
          { key: 'endpoint', label: 'Endpoint', placeholder: 'https://my-cluster.weaviate.network' },
          { key: 'class_name', label: 'Class Name', placeholder: 'Document' }
        ];
      case 'qdrant':
        return [
          { key: 'endpoint', label: 'Endpoint', placeholder: 'https://my-cluster.qdrant.tech' },
          { key: 'collection_name', label: 'Collection Name', placeholder: 'documents' }
        ];
      default:
        return [];
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.type || !formData.apiKey) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        toast({
          title: "Error",
          description: "You must be logged in to manage integrations",
          variant: "destructive"
        });
        return;
      }

      // Generate credential reference
      const credentialRef = `${formData.type}_${Date.now()}`;
      
      // Store encrypted credentials (in real app, this would be properly encrypted)
      const { error: credError } = await supabase
        .from('integration_credentials')
        .insert({
          credential_ref: credentialRef,
          encrypted_data: formData.apiKey, // In production, encrypt this
          expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
          user_id: user.id
        });

      if (credError) throw credError;

      // Store integration
      const integrationData = {
        name: formData.name,
        type: formData.type,
        config: formData.config,
        credential_refs: { api_key: credentialRef },
        status: 'active',
        user_id: user.id
      };

      let result;
      if (editingIntegration) {
        result = await supabase
          .from('integrations')
          .update(integrationData)
          .eq('id', editingIntegration.id)
          .select();
      } else {
        result = await supabase
          .from('integrations')
          .insert(integrationData)
          .select();
      }

      if (result.error) throw result.error;

      toast({
        title: "Success",
        description: `Integration ${editingIntegration ? 'updated' : 'created'} successfully`
      });

      setShowAddDialog(false);
      resetForm();
      loadIntegrations();
    } catch (error) {
      console.error('Error saving integration:', error);
      toast({
        title: "Error",
        description: `Failed to ${editingIntegration ? 'update' : 'create'} integration`,
        variant: "destructive"
      });
    }
  };

  const testConnection = async (integration: Integration) => {
    setTestingConnections(prev => new Set([...prev, integration.id]));
    
    try {
      const { data, error } = await supabase.rpc('test_integration', {
        integration_id: integration.id
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      
      toast({
        title: "Connection Test",
        description: result.success ? "Connection successful!" : `Connection failed: ${result.error}`,
        variant: result.success ? "default" : "destructive"
      });

      // Reload integrations to get updated status
      loadIntegrations();
    } catch (error) {
      console.error('Error testing connection:', error);
      toast({
        title: "Error",
        description: "Failed to test connection",
        variant: "destructive"
      });
    } finally {
      setTestingConnections(prev => {
        const newSet = new Set(prev);
        newSet.delete(integration.id);
        return newSet;
      });
    }
  };

  const deleteIntegration = async (integration: Integration) => {
    if (!confirm(`Are you sure you want to delete "${integration.name}"?`)) {
      return;
    }

    try {
      // Delete integration (credentials will be cleaned up by cleanup function)
      const { error } = await supabase
        .from('integrations')
        .delete()
        .eq('id', integration.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Integration deleted successfully"
      });

      loadIntegrations();
    } catch (error) {
      console.error('Error deleting integration:', error);
      toast({
        title: "Error",
        description: "Failed to delete integration",
        variant: "destructive"
      });
    }
  };

  const startEdit = (integration: Integration) => {
    setEditingIntegration(integration);
    setFormData({
      name: integration.name,
      type: integration.type,
      apiKey: '', // Don't pre-fill for security
      config: integration.config || {}
    });
    setShowAddDialog(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4" />;
      case 'error':
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const selectedType = INTEGRATION_TYPES.find(t => t.value === formData.type);
  const configFields = getConfigFields(formData.type);

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">API Keys & Integrations</h1>
          <p className="text-gray-600 mt-2">Manage your LLM providers and vector database connections</p>
        </div>
        
        <Dialog open={showAddDialog} onOpenChange={(open) => {
          setShowAddDialog(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Integration
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingIntegration ? 'Edit Integration' : 'Add New Integration'}
              </DialogTitle>
              <DialogDescription>
                Configure a new API integration for LLM or vector database services.
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Integration Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="My OpenAI Integration"
                  required
                />
              </div>

              <div>
                <Label htmlFor="type">Service Type</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, type: value, config: {} }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select integration type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border z-50">
                    {INTEGRATION_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center space-x-2">
                          <type.icon className="h-4 w-4" />
                          <span>{type.label}</span>
                          <Badge variant="outline" className="ml-2">{type.category}</Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="apiKey">API Key</Label>
                <div className="relative">
                  <Input
                    id="apiKey"
                    type={showApiKey ? 'text' : 'password'}
                    value={formData.apiKey}
                    onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                    placeholder="sk-..."
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {configFields.map((field) => (
                <div key={field.key}>
                  <Label htmlFor={field.key}>{field.label}</Label>
                  <Input
                    id={field.key}
                    value={formData.config[field.key] || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      config: { ...prev.config, [field.key]: e.target.value }
                    }))}
                    placeholder={field.placeholder}
                  />
                </div>
              ))}

              <div className="flex justify-end space-x-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowAddDialog(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingIntegration ? 'Update' : 'Create'} Integration
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {integrations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Key className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No integrations configured</h3>
            <p className="text-gray-600 text-center mb-4">
              Get started by adding your first API integration for LLM or vector database services.
            </p>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Integration
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {integrations.map((integration) => {
            const typeInfo = INTEGRATION_TYPES.find(t => t.value === integration.type);
            const Icon = typeInfo?.icon || Key;
            const isTesting = testingConnections.has(integration.id);
            
            return (
              <Card key={integration.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <Icon className="h-5 w-5 text-gray-700" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{integration.name}</CardTitle>
                        <CardDescription className="flex items-center space-x-2">
                          <span>{typeInfo?.label || integration.type}</span>
                          <Badge variant="outline">{typeInfo?.category || 'Unknown'}</Badge>
                        </CardDescription>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEdit(integration)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteIntegration(integration)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Status</span>
                    <Badge className={getStatusColor(integration.status)}>
                      {getStatusIcon(integration.status)}
                      <span className="ml-1 capitalize">{integration.status}</span>
                    </Badge>
                  </div>
                  
                  {integration.last_validated && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Last Tested</span>
                      <span className="text-sm text-gray-900">
                        {new Date(integration.last_validated).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  
                  {integration.validation_error && (
                    <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                      {integration.validation_error}
                    </div>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => testConnection(integration)}
                    disabled={isTesting}
                  >
                    {isTesting ? 'Testing...' : 'Test Connection'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ApiKeys;