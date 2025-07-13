import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Plus, Settings, Trash2, ExternalLink, Database, Brain, MessageSquare, FileText } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import IntegrationStatusMonitor from './IntegrationStatusMonitor';

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

interface IntegrationType {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  config_fields: any;
  credential_fields: any;
  is_oauth: boolean;
  tier: string;
}

const CATEGORY_ICONS = {
  'vector-db': Database,
  'llm': Brain,
  'knowledge': FileText,
  'communication': MessageSquare,
  'crm': Settings,
  'productivity': Settings,
  'creative': Settings,
  'forms': Settings,
  'automation': Settings
};

export default function ProductionIntegrationsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [integrationTypes, setIntegrationTypes] = useState<IntegrationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedType, setSelectedType] = useState<IntegrationType | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      const [integrationsResult, typesResult] = await Promise.all([
        supabase
          .from('integrations')
          .select('*')
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('integration_types')
          .select('*')
          .order('category', { ascending: true })
      ]);

      if (integrationsResult.error) throw integrationsResult.error;
      if (typesResult.error) throw typesResult.error;

      setIntegrations(integrationsResult.data || []);
      setIntegrationTypes(typesResult.data || []);
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
    if (!selectedType || !formData.name) {
      toast({
        title: "Validation Error",
        description: "Name and type are required",
        variant: "destructive"
      });
      return;
    }

    try {
      // Validate required fields
      const requiredConfigFields = selectedType.config_fields?.filter(f => f.required) || [];
      const requiredCredFields = selectedType.credential_fields?.filter(f => f.required) || [];
      
      const missingFields = [];
      for (const field of requiredConfigFields) {
        if (!formData.config?.[field.key]) {
          missingFields.push(field.label);
        }
      }
      for (const field of requiredCredFields) {
        if (!formData.credentials?.[field.key]) {
          missingFields.push(field.label);
        }
      }

      if (missingFields.length > 0) {
        toast({
          title: "Missing Required Fields",
          description: `Please fill in: ${missingFields.join(', ')}`,
          variant: "destructive"
        });
        return;
      }

      const { data, error } = await supabase.functions.invoke('integration-manager', {
        body: {
          action: 'create',
          name: formData.name,
          type: selectedType.id,
          config: formData.config || {},
          credentials: formData.credentials || {}
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Integration Created",
          description: `${formData.name} integration created successfully`
        });
        setShowCreateModal(false);
        setFormData({});
        setSelectedType(null);
        await loadData();
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

  const handleOAuthIntegration = async (type: IntegrationType) => {
    try {
      const redirectUri = `${window.location.origin}/integrations/oauth-callback`;
      
      const { data, error } = await supabase.functions.invoke('oauth-integration-handler', {
        body: {
          action: 'start',
          provider: type.id,
          redirectUri
        }
      });

      if (error) throw error;

      if (data.success) {
        localStorage.setItem('oauth_provider', type.id);
        localStorage.setItem('oauth_name', `${type.name} Integration`);
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

  const handleDeleteIntegration = async (integration: Integration) => {
    if (!confirm(`Are you sure you want to delete "${integration.name}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('integrations')
        .delete()
        .eq('id', integration.id);

      if (error) throw error;

      toast({
        title: "Integration Deleted",
        description: `${integration.name} has been removed`
      });
      await loadData();
    } catch (error: any) {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const updateFormData = (section: string, key: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  const renderFieldInput = (field: any, section: string) => {
    const value = formData[section]?.[field.key] || '';

    switch (field.type) {
      case 'password':
        return (
          <Input
            type="password"
            value={value}
            onChange={(e) => updateFormData(section, field.key, e.target.value)}
            placeholder={field.placeholder}
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => updateFormData(section, field.key, parseFloat(e.target.value))}
            placeholder={field.placeholder}
            min={field.min}
            max={field.max}
          />
        );
      case 'select':
        return (
          <Select value={value} onValueChange={(val) => updateFormData(section, field.key, val)}>
            <SelectTrigger>
              <SelectValue placeholder={`Select ${field.label}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option: string) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={value || false}
              onChange={(e) => updateFormData(section, field.key, e.target.checked)}
              className="rounded border-gray-300"
            />
            <Label>{field.label}</Label>
          </div>
        );
      default:
        return (
          <Input
            value={value}
            onChange={(e) => updateFormData(section, field.key, e.target.value)}
            placeholder={field.placeholder}
          />
        );
    }
  };

  const categorizedTypes = integrationTypes.reduce((acc, type) => {
    if (!acc[type.category]) {
      acc[type.category] = [];
    }
    acc[type.category].push(type);
    return acc;
  }, {} as Record<string, IntegrationType[]>);

  const filteredIntegrations = activeTab === 'all' 
    ? integrations 
    : integrations.filter(i => {
        const type = integrationTypes.find(t => t.id === i.type);
        return type?.category === activeTab;
      });

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading integrations...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Production Integrations</h1>
          <p className="text-muted-foreground mt-2">
            Manage your third-party integrations with real-time monitoring and health checks
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Integration
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="vector-db">Vector DB</TabsTrigger>
          <TabsTrigger value="llm">LLM</TabsTrigger>
          <TabsTrigger value="knowledge">Knowledge</TabsTrigger>
          <TabsTrigger value="communication">Communication</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {filteredIntegrations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Integrations Found</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Get started by adding your first integration to unlock powerful features.
                </p>
                <Button onClick={() => setShowCreateModal(true)}>
                  Add Integration
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredIntegrations.map((integration) => (
                <div key={integration.id} className="relative">
                  <IntegrationStatusMonitor
                    integration={integration}
                    onStatusUpdate={(id, status) => {
                      setIntegrations(prev => 
                        prev.map(i => i.id === id ? { ...i, status } : i)
                      );
                    }}
                  />
                  <div className="absolute top-2 right-2 flex space-x-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteIntegration(integration)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Integration Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Integration</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {!selectedType ? (
              <div>
                <h3 className="text-lg font-semibold mb-4">Choose Integration Type</h3>
                <div className="space-y-4">
                  {Object.entries(categorizedTypes).map(([category, types]) => {
                    const IconComponent = CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS] || Settings;
                    return (
                      <div key={category}>
                        <div className="flex items-center mb-2">
                          <IconComponent className="h-4 w-4 mr-2" />
                          <h4 className="font-medium capitalize">{category.replace('-', ' ')}</h4>
                        </div>
                        <div className="grid gap-2">
                          {types.map((type) => (
                            <Card
                              key={type.id}
                              className="cursor-pointer hover:bg-accent transition-colors"
                              onClick={() => {
                                if (type.is_oauth) {
                                  handleOAuthIntegration(type);
                                } else {
                                  setSelectedType(type);
                                }
                              }}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    <span className="text-2xl">{type.icon}</span>
                                    <div>
                                      <div className="font-medium">{type.name}</div>
                                      <div className="text-sm text-muted-foreground">{type.description}</div>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    {type.is_oauth && (
                                      <Badge variant="outline">OAuth</Badge>
                                    )}
                                    <Badge variant="secondary">{type.tier}</Badge>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedType(null)}>
                    ← Back
                  </Button>
                  <div>
                    <h3 className="text-lg font-semibold">{selectedType.name}</h3>
                    <p className="text-sm text-muted-foreground">{selectedType.description}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="integration-name">Integration Name</Label>
                    <Input
                      id="integration-name"
                      value={formData.name || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder={`My ${selectedType.name} Integration`}
                    />
                  </div>

                  {selectedType.config_fields?.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Configuration</h4>
                      <div className="space-y-3">
                        {selectedType.config_fields.map((field) => (
                          <div key={field.key}>
                            <Label htmlFor={field.key}>
                              {field.label}
                              {field.required && <span className="text-red-500">*</span>}
                            </Label>
                            {renderFieldInput(field, 'config')}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedType.credential_fields?.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Credentials</h4>
                      <div className="space-y-3">
                        {selectedType.credential_fields.map((field) => (
                          <div key={field.key}>
                            <Label htmlFor={field.key}>
                              {field.label}
                              {field.required && <span className="text-red-500">*</span>}
                            </Label>
                            {renderFieldInput(field, 'credentials')}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {selectedType && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedType(null)}>
                Cancel
              </Button>
              <Button onClick={handleCreateIntegration}>
                Create Integration
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}