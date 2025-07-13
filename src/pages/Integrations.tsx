import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Plus, Settings, Trash2, TestTube, CheckCircle, XCircle, RefreshCw, ExternalLink } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Integration {
  id: string;
  name: string;
  type: string;
  config: any;
  status: string;
  last_validated: string;
  validation_error?: string;
  created_at: string;
}

interface IntegrationForm {
  name: string;
  type: string;
  config: any;
  credentials: any;
}

export default function IntegrationsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [integrationTypes, setIntegrationTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [testingIntegration, setTestingIntegration] = useState<string | null>(null);
  const [form, setForm] = useState<IntegrationForm>({
    name: '',
    type: '',
    config: {},
    credentials: {}
  });

  useEffect(() => {
    if (user) {
      Promise.all([
        loadIntegrations(),
        loadIntegrationTypes()
      ]);
    }
  }, [user]);

  const loadIntegrationTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('integration_types')
        .select('*')
        .order('category', { ascending: true });

      if (error) throw error;
      setIntegrationTypes(data || []);
    } catch (error: any) {
      toast({
        title: "Failed to load integration types",
        description: error.message,
        variant: "destructive"
      });
    }
  };

const FALLBACK_INTEGRATION_TYPES = [
  // Vector Databases
  {
    id: 'pinecone',
    name: 'Pinecone',
    description: 'Managed vector database service',
    icon: '🌲',
    category: 'vector-db',
    fields: {
      config: [
        { key: 'indexName', label: 'Index Name', type: 'text', placeholder: 'my-index' },
        { key: 'environment', label: 'Environment', type: 'select', options: ['us-west1-gcp', 'us-east1-gcp', 'eu-west1-gcp'] }
      ],
      credentials: [
        { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'Your Pinecone API key' }
      ]
    }
  },
  {
    id: 'weaviate',
    name: 'Weaviate',
    description: 'Open-source vector database',
    icon: '🔷',
    category: 'vector-db',
    fields: {
      config: [
        { key: 'endpoint', label: 'Endpoint URL', type: 'text', placeholder: 'https://your-cluster.weaviate.network' },
        { key: 'className', label: 'Class Name', type: 'text', placeholder: 'Document' }
      ],
      credentials: [
        { key: 'apiKey', label: 'API Key (optional)', type: 'password', placeholder: 'Weaviate API key' }
      ]
    }
  },
  {
    id: 'qdrant',
    name: 'Qdrant',
    description: 'Vector similarity search engine',
    icon: '⚡',
    category: 'vector-db',
    fields: {
      config: [
        { key: 'endpoint', label: 'Endpoint URL', type: 'text', placeholder: 'https://your-cluster.qdrant.io' },
        { key: 'collectionName', label: 'Collection Name', type: 'text', placeholder: 'documents' }
      ],
      credentials: [
        { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'Your Qdrant API key' }
      ]
    }
  },
  {
    id: 'chroma',
    name: 'Chroma',
    description: 'Open-source embedding database',
    icon: '🎨',
    category: 'vector-db',
    fields: {
      config: [
        { key: 'endpoint', label: 'Endpoint URL', type: 'text', placeholder: 'http://localhost:8000' },
        { key: 'collectionName', label: 'Collection Name', type: 'text', placeholder: 'my-collection' }
      ],
      credentials: []
    }
  },
  
  // Knowledge Sources
  {
    id: 'notion',
    name: 'Notion',
    description: 'Pages and databases as knowledge bases',
    icon: '🔲',
    category: 'knowledge',
    isOAuth: true,
    tier: 'pro',
    fields: {
      config: [
        { key: 'dataTypes', label: 'Data Types', type: 'multi-select', options: ['pages', 'databases'], defaultValue: ['pages'] }
      ],
      credentials: []
    }
  },
  {
    id: 'google-workspace',
    name: 'Google Workspace',
    description: 'Docs, Sheets, and Drive content',
    icon: '📄',
    category: 'knowledge',
    isOAuth: true,
    tier: 'pro',
    fields: {
      config: [
        { key: 'dataTypes', label: 'Data Types', type: 'multi-select', options: ['documents', 'sheets', 'slides'], defaultValue: ['documents'] },
        { key: 'folderFilter', label: 'Folder Filter (optional)', type: 'text', placeholder: 'Folder ID or name' }
      ],
      credentials: []
    }
  },
  {
    id: 'microsoft-365',
    name: 'Microsoft 365',
    description: 'Office documents and Outlook data',
    icon: '🔵',
    category: 'knowledge',
    isOAuth: true,
    tier: 'pro',
    fields: {
      config: [
        { key: 'dataTypes', label: 'Data Types', type: 'multi-select', options: ['documents', 'emails', 'teams'], defaultValue: ['documents'] },
        { key: 'includeAttachments', label: 'Include Attachments', type: 'checkbox', defaultValue: false }
      ],
      credentials: []
    }
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    description: 'CRM records and knowledge articles',
    icon: '☁️',
    category: 'crm',
    tier: 'enterprise',
    fields: {
      config: [
        { key: 'instanceUrl', label: 'Instance URL', type: 'text', placeholder: 'https://your-domain.salesforce.com' },
        { key: 'objectTypes', label: 'Object Types', type: 'multi-select', options: ['Account', 'Contact', 'Lead', 'Opportunity', 'Case'], defaultValue: ['Account', 'Contact'] }
      ],
      credentials: [
        { key: 'consumerKey', label: 'Consumer Key', type: 'password', placeholder: 'Your connected app consumer key' },
        { key: 'consumerSecret', label: 'Consumer Secret', type: 'password', placeholder: 'Your connected app consumer secret' },
        { key: 'accessToken', label: 'Access Token', type: 'password', placeholder: 'Your access token' }
      ]
    }
  },
  
  // Productivity Apps
  {
    id: 'trello',
    name: 'Trello',
    description: 'Boards, lists, and cards',
    icon: '📋',
    category: 'productivity',
    fields: {
      config: [
        { key: 'boardIds', label: 'Board IDs (comma-separated)', type: 'text', placeholder: 'board1,board2,board3' }
      ],
      credentials: [
        { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'Your Trello API key' },
        { key: 'token', label: 'Token', type: 'password', placeholder: 'Your Trello token' }
      ]
    }
  },
  {
    id: 'evernote',
    name: 'Evernote',
    description: 'Notes and notebooks',
    icon: '🐘',
    category: 'productivity',
    fields: {
      config: [
        { key: 'sandbox', label: 'Use Sandbox', type: 'checkbox', defaultValue: false }
      ],
      credentials: [
        { key: 'developerToken', label: 'Developer Token', type: 'password', placeholder: 'Your Evernote developer token' }
      ]
    }
  },
  {
    id: 'todoist',
    name: 'Todoist',
    description: 'Tasks and projects',
    icon: '✅',
    category: 'productivity',
    fields: {
      config: [
        { key: 'includeCompleted', label: 'Include Completed Tasks', type: 'checkbox', defaultValue: false }
      ],
      credentials: [
        { key: 'apiToken', label: 'API Token', type: 'password', placeholder: 'Your Todoist API token' }
      ]
    }
  },
  
  // Design & Creative
  {
    id: 'canva',
    name: 'Canva',
    description: 'Design assets and templates',
    icon: '🎨',
    category: 'creative',
    tier: 'pro',
    fields: {
      config: [
        { key: 'teamId', label: 'Team ID (optional)', type: 'text', placeholder: 'Your team ID' }
      ],
      credentials: [
        { key: 'apiKey', label: 'API Key', type: 'password', placeholder: 'Your Canva API key' }
      ]
    }
  },
  
  // Forms & Surveys
  {
    id: 'typeform',
    name: 'Typeform',
    description: 'Form responses and analytics',
    icon: '📝',
    category: 'forms',
    fields: {
      config: [
        { key: 'formIds', label: 'Form IDs (comma-separated)', type: 'text', placeholder: 'form1,form2,form3' }
      ],
      credentials: [
        { key: 'personalAccessToken', label: 'Personal Access Token', type: 'password', placeholder: 'Your Typeform PAT' }
      ]
    }
  },
  
  // Automation
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'Webhook triggers and automations',
    icon: '⚡',
    category: 'automation',
    tier: 'enterprise',
    fields: {
      config: [
        { key: 'triggerEvents', label: 'Trigger Events', type: 'multi-select', options: ['blueprint_saved', 'simulation_completed', 'optimization_applied'], defaultValue: ['blueprint_saved'] }
      ],
      credentials: [
        { key: 'webhookUrl', label: 'Webhook URL', type: 'text', placeholder: 'https://hooks.zapier.com/hooks/catch/...' }
      ]
    }
  }
];


  useEffect(() => {
    if (user) {
      loadIntegrations();
    }
  }, [user]);

  const loadIntegrations = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('integration-manager', {
        body: { action: 'list' }
      });

      if (error) throw error;
      setIntegrations(data.integrations);
    } catch (error: any) {
      toast({
        title: "Failed to load integrations",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateIntegration = async () => {
    if (!form.name || !form.type) {
      toast({
        title: "Validation Error",
        description: "Name and type are required",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('integration-manager', {
        body: {
          action: 'create',
          name: form.name,
          type: form.type,
          config: form.config,
          credentials: form.credentials
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Integration Created",
          description: `${form.name} integration created successfully`
        });
        setShowCreateModal(false);
        setForm({ name: '', type: '', config: {}, credentials: {} });
        await loadIntegrations();
      } else {
        toast({
          title: "Creation Failed",
          description: data.error,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleTestIntegration = async (integrationId: string) => {
    setTestingIntegration(integrationId);
    try {
      const { data, error } = await supabase.functions.invoke('integration-manager', {
        body: {
          action: 'test',
          integrationId
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Test Successful",
          description: "Integration is working correctly"
        });
      } else {
        toast({
          title: "Test Failed",
          description: data.error,
          variant: "destructive"
        });
      }
      await loadIntegrations();
    } catch (error: any) {
      toast({
        title: "Test Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setTestingIntegration(null);
    }
  };

  const handleDeleteIntegration = async (integrationId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete the "${name}" integration?`)) {
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('integration-manager', {
        body: {
          action: 'delete',
          integrationId
        }
      });

      if (error) throw error;

      toast({
        title: "Integration Deleted",
        description: `${name} integration removed successfully`
      });
      await loadIntegrations();
    } catch (error: any) {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const updateFormField = (section: 'config' | 'credentials', key: string, value: any) => {
    setForm(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  const handleOAuthStart = async (provider: string) => {
    try {
      const redirectUri = `${window.location.origin}/integrations/oauth-callback`;
      
      const { data, error } = await supabase.functions.invoke('integration-manager', {
        body: {
          action: 'oauth-start',
          provider,
          redirectUri
        }
      });

      if (error) throw error;

      if (data.success) {
        // Store provider info for callback
        localStorage.setItem('oauth_provider', provider);
        localStorage.setItem('oauth_redirect_uri', redirectUri);
        
        // Redirect to OAuth provider
        window.location.href = data.authUrl;
      } else {
        toast({
          title: "OAuth Error",
          description: data.error,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "OAuth Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const availableTypes = integrationTypes.length > 0 ? integrationTypes : FALLBACK_INTEGRATION_TYPES;
  const selectedIntegrationType = availableTypes.find(t => t.id === form.type);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Integrations</h1>
          <p className="text-muted-foreground">Manage your external data source connections</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Integration
        </Button>
      </div>

      <Tabs defaultValue="active" className="w-full">
        <TabsList>
          <TabsTrigger value="active">Active Integrations</TabsTrigger>
          <TabsTrigger value="browse">Browse Providers</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {integrations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64">
                <Settings className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No integrations configured</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Connect to external vector databases to enhance your RAG workflows
                </p>
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Integration
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {integrations.map((integration) => (
                <Card key={integration.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">
                          {availableTypes.find(t => t.id === integration.type)?.icon || '🔗'}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{integration.name}</CardTitle>
                          <CardDescription>
                            {availableTypes.find(t => t.id === integration.type)?.name || integration.type}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={integration.status === 'active' ? 'default' : 'destructive'}>
                          {integration.status === 'active' ? (
                            <CheckCircle className="w-3 h-3 mr-1" />
                          ) : (
                            <XCircle className="w-3 h-3 mr-1" />
                          )}
                          {integration.status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        {integration.last_validated && (
                          <div>Last tested: {new Date(integration.last_validated).toLocaleString()}</div>
                        )}
                        {integration.validation_error && (
                          <div className="text-destructive flex items-center gap-1 mt-1">
                            <AlertCircle className="w-3 h-3" />
                            {integration.validation_error}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTestIntegration(integration.id)}
                          disabled={testingIntegration === integration.id}
                        >
                          {testingIntegration === integration.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <TestTube className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteIntegration(integration.id, integration.name)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="browse" className="space-y-4">
          <Tabs defaultValue="vector-db" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="vector-db">Vector DBs</TabsTrigger>
              <TabsTrigger value="knowledge">Knowledge</TabsTrigger>
              <TabsTrigger value="productivity">Productivity</TabsTrigger>
              <TabsTrigger value="automation">Automation</TabsTrigger>
            </TabsList>

            {['vector-db', 'knowledge', 'productivity', 'automation'].map((category) => (
              <TabsContent key={category} value={category} className="space-y-4">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableTypes
                    .filter(type => type.category === category || 
                      (category === 'productivity' && ['crm', 'creative', 'forms'].includes(type.category || '')) ||
                      (category === 'automation' && type.category === 'automation'))
                    .map((type) => (
                    <Card key={type.id} className="cursor-pointer hover:shadow-md transition-shadow relative">
                      {type.tier && (
                        <Badge 
                          variant={type.tier === 'enterprise' ? 'destructive' : 'secondary'} 
                          className="absolute top-2 right-2 text-xs"
                        >
                          {type.tier.toUpperCase()}
                        </Badge>
                      )}
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <div className="text-3xl">{type.icon}</div>
                          <div>
                            <CardTitle className="text-lg">{type.name}</CardTitle>
                            <CardDescription>{type.description}</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Button 
                          className="w-full" 
                          onClick={() => {
                            if (type.isOAuth) {
                              handleOAuthStart(type.id);
                            } else {
                              setForm(prev => ({ ...prev, type: type.id }));
                              setShowCreateModal(true);
                            }
                          }}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          {type.isOAuth ? 'Connect with OAuth' : `Connect ${type.name}`}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </TabsContent>
      </Tabs>

      {/* Create Integration Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Integration</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="integrationName">Integration Name</Label>
                <Input
                  id="integrationName"
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="My Production Database"
                />
              </div>
              <div>
                <Label htmlFor="integrationType">Provider</Label>
                <Select value={form.type} onValueChange={(value) => setForm(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        <div className="flex items-center gap-2">
                          <span>{type.icon}</span>
                          <span>{type.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedIntegrationType && (
              <Tabs defaultValue="config" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="config">Configuration</TabsTrigger>
                  <TabsTrigger value="credentials">Credentials</TabsTrigger>
                </TabsList>

                <TabsContent value="config" className="space-y-4">
                  {(selectedIntegrationType.config_fields || selectedIntegrationType.fields?.config || []).map((field: any) => (
                    <div key={field.key}>
                      <Label htmlFor={field.key}>{field.label}</Label>
                      {field.type === 'select' ? (
                        <Select 
                          value={form.config[field.key] || ''} 
                          onValueChange={(value) => updateFormField('config', field.key, value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                          </SelectTrigger>
                          <SelectContent>
                            {field.options?.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          id={field.key}
                          type={field.type}
                          value={form.config[field.key] || ''}
                          onChange={(e) => updateFormField('config', field.key, e.target.value)}
                          placeholder={field.placeholder}
                        />
                      )}
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="credentials" className="space-y-4">
                  {(selectedIntegrationType.credential_fields || selectedIntegrationType.fields?.credentials || []).length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No credentials required for this integration type
                    </div>
                  ) : (
                    (selectedIntegrationType.credential_fields || selectedIntegrationType.fields?.credentials || []).map((field: any) => (
                      <div key={field.key}>
                        <Label htmlFor={field.key}>{field.label}</Label>
                        <Input
                          id={field.key}
                          type={field.type}
                          value={form.credentials[field.key] || ''}
                          onChange={(e) => updateFormField('credentials', field.key, e.target.value)}
                          placeholder={field.placeholder}
                        />
                      </div>
                    ))
                  )}
                </TabsContent>
              </Tabs>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateIntegration} disabled={!form.name || !form.type}>
              Create Integration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}