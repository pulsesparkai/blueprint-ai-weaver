import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, ExternalLink, Code, Key, Database, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ApiDocs = () => {
  const [selectedEndpoint, setSelectedEndpoint] = useState('blueprints');
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Code example copied to clipboard",
    });
  };

  const endpoints = {
    blueprints: {
      title: "Blueprints API",
      description: "Manage AI pipeline blueprints",
      methods: [
        {
          method: "GET",
          path: "/api/blueprints",
          description: "List all blueprints",
          params: "?limit=10&offset=0",
          response: `{
  "blueprints": [
    {
      "id": "uuid",
      "title": "My Pipeline",
      "description": "Pipeline description",
      "nodes": [...],
      "edges": [...],
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 25,
  "limit": 10,
  "offset": 0
}`
        },
        {
          method: "POST",
          path: "/api/blueprints",
          description: "Create a new blueprint",
          body: `{
  "title": "New Pipeline",
  "description": "Pipeline description",
  "nodes": [],
  "edges": []
}`,
          response: `{
  "id": "uuid",
  "title": "New Pipeline",
  "description": "Pipeline description",
  "nodes": [],
  "edges": [],
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}`
        },
        {
          method: "GET",
          path: "/api/blueprints/{id}",
          description: "Get a specific blueprint",
          response: `{
  "id": "uuid",
  "title": "My Pipeline",
  "description": "Pipeline description",
  "nodes": [...],
  "edges": [...],
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}`
        },
        {
          method: "PUT",
          path: "/api/blueprints/{id}",
          description: "Update a blueprint",
          body: `{
  "title": "Updated Pipeline",
  "description": "Updated description",
  "nodes": [...],
  "edges": [...]
}`,
          response: `{
  "id": "uuid",
  "title": "Updated Pipeline",
  "description": "Updated description",
  "nodes": [...],
  "edges": [...],
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}`
        },
        {
          method: "DELETE",
          path: "/api/blueprints/{id}",
          description: "Delete a blueprint",
          response: `{
  "message": "Blueprint deleted successfully"
}`
        }
      ]
    },
    execution: {
      title: "Execution API",
      description: "Execute and monitor pipeline runs",
      methods: [
        {
          method: "POST",
          path: "/api/execute",
          description: "Execute a pipeline",
          body: `{
  "blueprint_id": "uuid",
  "input_data": {
    "query": "What is AI?",
    "context": "...",
    "parameters": {}
  },
  "llm_provider": "openai",
  "model": "gpt-4"
}`,
          response: `{
  "execution_id": "uuid",
  "status": "running",
  "started_at": "2024-01-01T00:00:00Z",
  "estimated_completion": "2024-01-01T00:02:00Z"
}`
        },
        {
          method: "GET",
          path: "/api/executions/{id}",
          description: "Get execution status",
          response: `{
  "id": "uuid",
  "blueprint_id": "uuid",
  "status": "completed",
  "input_data": {...},
  "output": "AI stands for Artificial Intelligence...",
  "execution_steps": [...],
  "metrics": {
    "tokens_used": 1250,
    "cost_usd": 0.025,
    "latency_ms": 1850
  },
  "started_at": "2024-01-01T00:00:00Z",
  "completed_at": "2024-01-01T00:01:52Z"
}`
        },
        {
          method: "GET",
          path: "/api/executions",
          description: "List execution history",
          params: "?blueprint_id=uuid&status=completed&limit=20",
          response: `{
  "executions": [...],
  "total": 150,
  "limit": 20,
  "offset": 0
}`
        }
      ]
    },
    integrations: {
      title: "Integrations API",
      description: "Manage external service integrations",
      methods: [
        {
          method: "GET",
          path: "/api/integrations",
          description: "List all integrations",
          response: `{
  "integrations": [
    {
      "id": "uuid",
      "name": "OpenAI Integration",
      "type": "openai",
      "status": "active",
      "config": {...},
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}`
        },
        {
          method: "POST",
          path: "/api/integrations",
          description: "Create new integration",
          body: `{
  "name": "My OpenAI Integration",
  "type": "openai",
  "config": {
    "api_key": "sk-...",
    "model": "gpt-4",
    "temperature": 0.7
  }
}`,
          response: `{
  "id": "uuid",
  "name": "My OpenAI Integration",
  "type": "openai",
  "status": "active",
  "config": {...},
  "created_at": "2024-01-01T00:00:00Z"
}`
        },
        {
          method: "POST",
          path: "/api/integrations/{id}/test",
          description: "Test integration connection",
          response: `{
  "success": true,
  "message": "Integration test successful",
  "response_time_ms": 245
}`
        }
      ]
    }
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-green-100 text-green-800';
      case 'POST': return 'bg-blue-100 text-blue-800';
      case 'PUT': return 'bg-yellow-100 text-yellow-800';
      case 'DELETE': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-3xl font-bold flex items-center gap-3">
            <Code className="h-8 w-8" />
            API Documentation
          </CardTitle>
          <p className="text-muted-foreground">
            Complete reference for the AI Pipeline Platform API
          </p>
        </CardHeader>
      </Card>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Endpoints</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant={selectedEndpoint === 'blueprints' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setSelectedEndpoint('blueprints')}
              >
                <Database className="h-4 w-4 mr-2" />
                Blueprints
              </Button>
              <Button
                variant={selectedEndpoint === 'execution' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setSelectedEndpoint('execution')}
              >
                <Zap className="h-4 w-4 mr-2" />
                Execution
              </Button>
              <Button
                variant={selectedEndpoint === 'integrations' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setSelectedEndpoint('integrations')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Integrations
              </Button>
            </CardContent>
          </Card>

          {/* Authentication */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Key className="h-5 w-5" />
                Authentication
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                All API requests require authentication using API keys.
              </p>
              <div className="space-y-2">
                <p className="text-xs font-medium">Header:</p>
                <code className="block bg-muted p-2 rounded text-xs">
                  Authorization: Bearer YOUR_API_KEY
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard('Authorization: Bearer YOUR_API_KEY')}
                  className="w-full"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">
                {endpoints[selectedEndpoint as keyof typeof endpoints].title}
              </CardTitle>
              <p className="text-muted-foreground">
                {endpoints[selectedEndpoint as keyof typeof endpoints].description}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                {endpoints[selectedEndpoint as keyof typeof endpoints].methods.map((method, index) => (
                  <div key={index} className="border rounded-lg p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <Badge className={getMethodColor(method.method)}>
                        {method.method}
                      </Badge>
                      <code className="text-lg font-mono">
                        {method.path}
                        {method.params && <span className="text-muted-foreground">{method.params}</span>}
                      </code>
                    </div>
                    
                    <p className="text-muted-foreground mb-4">
                      {method.description}
                    </p>

                    <Tabs defaultValue="response" className="w-full">
                      <TabsList>
                        {method.body && <TabsTrigger value="request">Request</TabsTrigger>}
                        <TabsTrigger value="response">Response</TabsTrigger>
                        <TabsTrigger value="example">Example</TabsTrigger>
                      </TabsList>
                      
                      {method.body && (
                        <TabsContent value="request">
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <h4 className="font-medium">Request Body</h4>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => copyToClipboard(method.body || '')}
                              >
                                <Copy className="h-3 w-3 mr-1" />
                                Copy
                              </Button>
                            </div>
                            <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                              <code>{method.body}</code>
                            </pre>
                          </div>
                        </TabsContent>
                      )}
                      
                      <TabsContent value="response">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <h4 className="font-medium">Response</h4>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(method.response)}
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Copy
                            </Button>
                          </div>
                          <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                            <code>{method.response}</code>
                          </pre>
                        </div>
                      </TabsContent>
                      
                      <TabsContent value="example">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <h4 className="font-medium">cURL Example</h4>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(`curl -X ${method.method} \\
  https://api.yourplatform.com${method.path} \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"${method.body ? ` \\
  -d '${method.body.replace(/\n/g, '').replace(/\s+/g, ' ')}'` : ''}`)}
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Copy
                            </Button>
                          </div>
                          <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                            <code>{`curl -X ${method.method} \\
  https://api.yourplatform.com${method.path} \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"${method.body ? ` \\
  -d '${method.body.replace(/\n/g, '').replace(/\s+/g, ' ')}'` : ''}`}</code>
                          </pre>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Error Codes */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Error Codes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Badge variant="outline" className="mb-2">400 Bad Request</Badge>
                    <p className="text-sm text-muted-foreground">Invalid request format or parameters</p>
                  </div>
                  <div>
                    <Badge variant="outline" className="mb-2">401 Unauthorized</Badge>
                    <p className="text-sm text-muted-foreground">Invalid or missing API key</p>
                  </div>
                  <div>
                    <Badge variant="outline" className="mb-2">403 Forbidden</Badge>
                    <p className="text-sm text-muted-foreground">Insufficient permissions</p>
                  </div>
                  <div>
                    <Badge variant="outline" className="mb-2">404 Not Found</Badge>
                    <p className="text-sm text-muted-foreground">Resource not found</p>
                  </div>
                  <div>
                    <Badge variant="outline" className="mb-2">429 Too Many Requests</Badge>
                    <p className="text-sm text-muted-foreground">Rate limit exceeded</p>
                  </div>
                  <div>
                    <Badge variant="outline" className="mb-2">500 Internal Server Error</Badge>
                    <p className="text-sm text-muted-foreground">Unexpected server error</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rate Limits */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Rate Limits</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">1000</div>
                    <div className="text-sm text-muted-foreground">Requests per hour</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">100</div>
                    <div className="text-sm text-muted-foreground">Executions per hour</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">10</div>
                    <div className="text-sm text-muted-foreground">Concurrent executions</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ApiDocs;