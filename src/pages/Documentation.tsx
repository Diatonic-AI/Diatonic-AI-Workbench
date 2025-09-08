import React from 'react';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Book, Code, ExternalLink, Download, Search, Users } from 'lucide-react';

const Documentation = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-workbbench-dark-purple to-black text-white">
      <Navbar />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-gradient bg-gradient-to-r from-workbbench-purple to-workbbench-blue">
              Documentation
            </span>
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Complete guides, API references, and tutorials to help you build amazing AI applications with Workbbench.
          </p>
        </div>

        {/* Search */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              className="w-full bg-secondary/60 border border-white/10 text-white pl-12 pr-4 py-3 rounded-md"
              placeholder="Search documentation..."
            />
          </div>
        </div>

        {/* Quick Start */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8">Quick Start</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-secondary/50 border-white/10 hover:border-workbbench-purple/50 transition-all">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Book className="h-5 w-5 mr-2 text-workbbench-purple" />
                  Getting Started
                </CardTitle>
                <CardDescription>
                  Learn the basics of Workbbench platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>• Platform Overview</li>
                  <li>• Account Setup</li>
                  <li>• First Project</li>
                  <li>• Basic Concepts</li>
                </ul>
                <Button variant="outline" size="sm" className="mt-4 w-full">
                  Start Reading
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-secondary/50 border-white/10 hover:border-workbbench-blue/50 transition-all">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Code className="h-5 w-5 mr-2 text-workbbench-blue" />
                  API Reference
                </CardTitle>
                <CardDescription>
                  Complete REST API documentation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>• Authentication</li>
                  <li>• Endpoints</li>
                  <li>• Request/Response</li>
                  <li>• SDKs</li>
                </ul>
                <Button variant="outline" size="sm" className="mt-4 w-full">
                  View API Docs
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-secondary/50 border-white/10 hover:border-workbbench-orange/50 transition-all">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2 text-workbbench-orange" />
                  Tutorials
                </CardTitle>
                <CardDescription>
                  Step-by-step guides and examples
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>• Building Your First Agent</li>
                  <li>• Data Processing</li>
                  <li>• Model Training</li>
                  <li>• Deployment</li>
                </ul>
                <Button variant="outline" size="sm" className="mt-4 w-full">
                  Browse Tutorials
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Documentation Sections */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8">Documentation Sections</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Platform Guides */}
            <Card className="bg-secondary/30 border-white/10">
              <CardHeader>
                <CardTitle>Platform Guides</CardTitle>
                <CardDescription>Comprehensive guides for each platform component</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-md">
                    <div>
                      <h4 className="font-medium">Education Hub</h4>
                      <p className="text-sm text-gray-400">Learning paths and courses</p>
                    </div>
                    <ExternalLink className="h-4 w-4" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-md">
                    <div>
                      <h4 className="font-medium">Studio Toolset</h4>
                      <p className="text-sm text-gray-400">Agent builder and tools</p>
                    </div>
                    <ExternalLink className="h-4 w-4" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-md">
                    <div>
                      <h4 className="font-medium">AI Lab</h4>
                      <p className="text-sm text-gray-400">Experiments and models</p>
                    </div>
                    <ExternalLink className="h-4 w-4" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-md">
                    <div>
                      <h4 className="font-medium">Observatory</h4>
                      <p className="text-sm text-gray-400">Analytics and visualization</p>
                    </div>
                    <ExternalLink className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Developer Resources */}
            <Card className="bg-secondary/30 border-white/10">
              <CardHeader>
                <CardTitle>Developer Resources</CardTitle>
                <CardDescription>Tools and resources for developers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-md">
                    <div>
                      <h4 className="font-medium">REST API</h4>
                      <p className="text-sm text-gray-400">Complete API reference</p>
                    </div>
                    <ExternalLink className="h-4 w-4" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-md">
                    <div>
                      <h4 className="font-medium">WebSocket API</h4>
                      <p className="text-sm text-gray-400">Real-time communication</p>
                    </div>
                    <ExternalLink className="h-4 w-4" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-md">
                    <div>
                      <h4 className="font-medium">SDKs & Libraries</h4>
                      <p className="text-sm text-gray-400">Official client libraries</p>
                    </div>
                    <Download className="h-4 w-4" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-md">
                    <div>
                      <h4 className="font-medium">Webhooks</h4>
                      <p className="text-sm text-gray-400">Event-driven integrations</p>
                    </div>
                    <ExternalLink className="h-4 w-4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Popular Articles */}
        <section>
          <h2 className="text-3xl font-bold mb-8">Popular Articles</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: "Building Your First AI Agent",
                description: "Step-by-step guide to creating your first agent using the visual flow builder",
                category: "Tutorial",
                readTime: "15 min read"
              },
              {
                title: "Understanding Model Training",
                description: "Deep dive into model training concepts and best practices",
                category: "Guide",
                readTime: "12 min read"
              },
              {
                title: "API Authentication",
                description: "How to authenticate with the Workbbench API using various methods",
                category: "Reference",
                readTime: "8 min read"
              },
              {
                title: "Data Pipeline Setup",
                description: "Setting up efficient data pipelines for your ML workflows",
                category: "Tutorial",
                readTime: "20 min read"
              },
              {
                title: "Advanced Flow Patterns",
                description: "Common patterns and best practices for complex agent flows",
                category: "Guide",
                readTime: "18 min read"
              },
              {
                title: "Deployment Strategies",
                description: "Different approaches to deploying your AI agents to production",
                category: "Guide",
                readTime: "25 min read"
              }
            ].map((article, index) => (
              <Card key={index} className="bg-secondary/30 border-white/10 hover:border-white/20 transition-colors">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs px-2 py-1 rounded bg-workbbench-purple/20 text-workbbench-purple">
                      {article.category}
                    </span>
                    <span className="text-xs text-gray-400">{article.readTime}</span>
                  </div>
                  <CardTitle className="text-lg">{article.title}</CardTitle>
                  <CardDescription>{article.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Documentation;
