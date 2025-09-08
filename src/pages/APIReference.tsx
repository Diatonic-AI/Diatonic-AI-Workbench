import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Code, Copy, ExternalLink, Download, Search, CheckCircle, Lock, Globe } from 'lucide-react';

const APIReference = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const endpoints = [
    {
      method: 'GET',
      path: '/api/auth/me',
      description: 'Get current user profile and permissions',
      category: 'Authentication',
      authenticated: true,
      params: [],
      response: {
        id: 'string',
        email: 'string',
        name: 'string',
        permissions: 'array'
      }
    },
    {
      method: 'GET',
      path: '/api/projects',
      description: 'List all projects for the authenticated user',
      category: 'Projects',
      authenticated: true,
      params: [
        { name: 'limit', type: 'number', description: 'Number of projects to return' },
        { name: 'offset', type: 'number', description: 'Offset for pagination' }
      ],
      response: {
        projects: 'array',
        total: 'number',
        hasMore: 'boolean'
      }
    },
    {
      method: 'POST',
      path: '/api/projects',
      description: 'Create a new project',
      category: 'Projects',
      authenticated: true,
      params: [],
      body: {
        name: 'string',
        description: 'string',
        type: 'string'
      },
      response: {
        id: 'string',
        name: 'string',
        createdAt: 'string'
      }
    },
    {
      method: 'GET',
      path: '/api/courses',
      description: 'List available courses',
      category: 'Education',
      authenticated: false,
      params: [
        { name: 'category', type: 'string', description: 'Filter by category' },
        { name: 'level', type: 'string', description: 'Filter by difficulty level' }
      ],
      response: {
        courses: 'array',
        total: 'number'
      }
    },
    {
      method: 'POST',
      path: '/api/experiments',
      description: 'Create a new experiment',
      category: 'AI Lab',
      authenticated: true,
      params: [],
      body: {
        name: 'string',
        projectId: 'string',
        hypothesis: 'string',
        config: 'object'
      },
      response: {
        id: 'string',
        status: 'string',
        createdAt: 'string'
      }
    },
    {
      method: 'GET',
      path: '/api/analytics/events',
      description: 'Retrieve analytics events',
      category: 'Analytics',
      authenticated: true,
      params: [
        { name: 'startDate', type: 'string', description: 'Start date for events' },
        { name: 'endDate', type: 'string', description: 'End date for events' },
        { name: 'eventType', type: 'string', description: 'Type of events to retrieve' }
      ],
      response: {
        events: 'array',
        aggregates: 'object'
      }
    }
  ];

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'GET': return 'bg-green-500/20 text-green-500 border-green-500/30';
      case 'POST': return 'bg-blue-500/20 text-blue-500 border-blue-500/30';
      case 'PUT': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30';
      case 'DELETE': return 'bg-red-500/20 text-red-500 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-500 border-gray-500/30';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-workbbench-dark-purple to-black text-white">
      <Navbar />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-gradient bg-gradient-to-r from-workbbench-blue to-workbbench-green">
              API Reference
            </span>
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Complete REST API documentation for Workbbench. Build powerful integrations with our comprehensive API.
          </p>
        </div>

        {/* Quick Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="bg-secondary/30 border-white/10">
            <CardHeader className="text-center">
              <Globe className="h-12 w-12 text-workbbench-blue mx-auto mb-4" />
              <CardTitle>Base URL</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <code className="bg-secondary/60 px-3 py-1 rounded text-sm">
                https://api.workbbench.ai/v1
              </code>
              <Button variant="ghost" size="sm" className="ml-2">
                <Copy className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-secondary/30 border-white/10">
            <CardHeader className="text-center">
              <Lock className="h-12 w-12 text-workbbench-purple mx-auto mb-4" />
              <CardTitle>Authentication</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-gray-300">Bearer Token</p>
              <code className="bg-secondary/60 px-2 py-1 rounded text-xs block mt-2">
                Authorization: Bearer YOUR_TOKEN
              </code>
            </CardContent>
          </Card>

          <Card className="bg-secondary/30 border-white/10">
            <CardHeader className="text-center">
              <CheckCircle className="h-12 w-12 text-workbbench-green mx-auto mb-4" />
              <CardTitle>Rate Limits</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-gray-300">1000 requests/hour</p>
              <p className="text-xs text-gray-400 mt-1">Per API key</p>
            </CardContent>
          </Card>
        </div>

        {/* API Explorer */}
        <Tabs defaultValue="authentication" className="mb-12">
          <TabsList className="bg-secondary/50 mb-6">
            <TabsTrigger value="authentication">Authentication</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="education">Education</TabsTrigger>
            <TabsTrigger value="ailab">AI Lab</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {['authentication', 'projects', 'education', 'ailab', 'analytics'].map(category => (
            <TabsContent key={category} value={category}>
              <div className="space-y-6">
                {endpoints
                  .filter(endpoint => endpoint.category.toLowerCase().replace(' ', '') === category)
                  .map((endpoint, index) => (
                    <Card key={index} className="bg-secondary/30 border-white/10">
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <Badge className={`${getMethodColor(endpoint.method)} border font-mono`}>
                              {endpoint.method}
                            </Badge>
                            <code className="text-lg font-mono">{endpoint.path}</code>
                            {endpoint.authenticated && <Lock className="h-4 w-4 text-yellow-500" />}
                          </div>
                          <Button variant="outline" size="sm">
                            Try it
                          </Button>
                        </div>
                        <CardDescription className="mt-2">
                          {endpoint.description}
                        </CardDescription>
                      </CardHeader>
                      
                      <CardContent>
                        {/* Parameters */}
                        {endpoint.params && endpoint.params.length > 0 && (
                          <div className="mb-6">
                            <h4 className="font-semibold mb-3">Parameters</h4>
                            <div className="space-y-2">
                              {endpoint.params.map((param, idx) => (
                                <div key={idx} className="flex items-center gap-4 p-3 bg-secondary/30 rounded">
                                  <code className="font-mono text-sm text-workbbench-blue">{param.name}</code>
                                  <Badge variant="outline" className="text-xs">{param.type}</Badge>
                                  <span className="text-sm text-gray-300 flex-1">{param.description}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Request Body */}
                        {endpoint.body && (
                          <div className="mb-6">
                            <h4 className="font-semibold mb-3">Request Body</h4>
                            <pre className="bg-black/50 p-4 rounded text-sm overflow-x-auto">
                              <code>{JSON.stringify(endpoint.body, null, 2)}</code>
                            </pre>
                          </div>
                        )}

                        {/* Response */}
                        <div>
                          <h4 className="font-semibold mb-3">Response</h4>
                          <pre className="bg-black/50 p-4 rounded text-sm overflow-x-auto">
                            <code>{JSON.stringify(endpoint.response, null, 2)}</code>
                          </pre>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* SDKs and Libraries */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold mb-8">SDKs & Libraries</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { name: 'JavaScript/TypeScript', icon: '🟨', status: 'Available' },
              { name: 'Python', icon: '🐍', status: 'Available' },
              { name: 'Go', icon: '🔵', status: 'Coming Soon' },
              { name: 'Java', icon: '☕', status: 'Coming Soon' }
            ].map((sdk, index) => (
              <Card key={index} className="bg-secondary/30 border-white/10">
                <CardHeader className="text-center">
                  <div className="text-4xl mb-2">{sdk.icon}</div>
                  <CardTitle className="text-lg">{sdk.name}</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <Badge 
                    variant={sdk.status === 'Available' ? 'default' : 'secondary'}
                    className="mb-4"
                  >
                    {sdk.status}
                  </Badge>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    disabled={sdk.status !== 'Available'}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {sdk.status === 'Available' ? 'Download' : 'Notify Me'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Code Examples */}
        <section>
          <h2 className="text-3xl font-bold mb-8">Code Examples</h2>
          <Tabs defaultValue="javascript">
            <TabsList className="bg-secondary/50 mb-6">
              <TabsTrigger value="javascript">JavaScript</TabsTrigger>
              <TabsTrigger value="python">Python</TabsTrigger>
              <TabsTrigger value="curl">cURL</TabsTrigger>
            </TabsList>

            <TabsContent value="javascript">
              <Card className="bg-secondary/30 border-white/10">
                <CardHeader>
                  <CardTitle>Authentication & Making Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="bg-black/50 p-6 rounded text-sm overflow-x-auto">
                    <code>{`// Install the SDK
npm install @workbbench/sdk

// Initialize the client
import { WorkbbenchClient } from '@workbbench/sdk';

const client = new WorkbbenchClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.workbbench.ai/v1'
});

// Get user profile
const user = await client.auth.me();

// List projects
const projects = await client.projects.list({
  limit: 10,
  offset: 0
});

// Create a new project
const newProject = await client.projects.create({
  name: 'My AI Project',
  description: 'Building something amazing',
  type: 'ml-experiment'
});`}</code>
                  </pre>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="python">
              <Card className="bg-secondary/30 border-white/10">
                <CardHeader>
                  <CardTitle>Python SDK Usage</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="bg-black/50 p-6 rounded text-sm overflow-x-auto">
                    <code>{`# Install the SDK
pip install workbbench-sdk

# Import and initialize
from workbbench import WorkbbenchClient

client = WorkbbenchClient(
    api_key="your-api-key",
    base_url="https://api.workbbench.ai/v1"
)

# Get user profile
user = client.auth.me()

# List projects
projects = client.projects.list(limit=10, offset=0)

# Create a new experiment
experiment = client.experiments.create(
    name="Model Training Experiment",
    project_id="proj_123",
    hypothesis="Increasing batch size improves accuracy",
    config={
        "batch_size": 64,
        "learning_rate": 0.001
    }
)`}</code>
                  </pre>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="curl">
              <Card className="bg-secondary/30 border-white/10">
                <CardHeader>
                  <CardTitle>cURL Examples</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="bg-black/50 p-6 rounded text-sm overflow-x-auto">
                    <code>{`# Get user profile
curl -X GET "https://api.workbbench.ai/v1/api/auth/me" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"

# List projects
curl -X GET "https://api.workbbench.ai/v1/api/projects?limit=10" \\
  -H "Authorization: Bearer YOUR_API_KEY"

# Create a new project
curl -X POST "https://api.workbbench.ai/v1/api/projects" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "My AI Project",
    "description": "Building something amazing",
    "type": "ml-experiment"
  }'`}</code>
                  </pre>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </section>
      </div>
    </div>
  );
};

export default APIReference;
