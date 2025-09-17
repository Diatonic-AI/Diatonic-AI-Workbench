import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Bot, 
  Zap, 
  MessageSquare, 
  Play, 
  Save, 
  Share2, 
  Settings,
  Plus,
  Sparkles,
  Brain,
  Database,
  Globe,
  Mail,
  Calendar,
  FileText,
  Image,
  Music,
  Video,
  Code,
  Layers,
  ArrowRight,
  ChevronRight
} from 'lucide-react';
import { AgentBuilder } from '@/components/agent-builder/AgentBuilder';

interface NodeTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  category: 'trigger' | 'action' | 'ai' | 'data' | 'utility';
  color: string;
}

const nodeTemplates: NodeTemplate[] = [
  // Triggers
  { id: 'webhook', name: 'Webhook Trigger', description: 'Start when receiving a web request', icon: Globe, category: 'trigger', color: 'green' },
  { id: 'schedule', name: 'Schedule Trigger', description: 'Run on a timer or schedule', icon: Calendar, category: 'trigger', color: 'green' },
  { id: 'email', name: 'Email Trigger', description: 'Activate when email received', icon: Mail, category: 'trigger', color: 'green' },
  
  // AI Nodes
  { id: 'chat', name: 'AI Chat', description: 'Have a conversation with AI', icon: MessageSquare, category: 'ai', color: 'purple' },
  { id: 'analyze', name: 'AI Analyzer', description: 'Analyze and understand content', icon: Brain, category: 'ai', color: 'purple' },
  { id: 'generate', name: 'AI Generator', description: 'Generate text, images, or code', icon: Sparkles, category: 'ai', color: 'purple' },
  
  // Actions
  { id: 'database', name: 'Database Action', description: 'Store or retrieve data', icon: Database, category: 'action', color: 'blue' },
  { id: 'email_send', name: 'Send Email', description: 'Send emails to recipients', icon: Mail, category: 'action', color: 'blue' },
  { id: 'file', name: 'File Handler', description: 'Process files and documents', icon: FileText, category: 'action', color: 'blue' },
  
  // Data Processing
  { id: 'transform', name: 'Data Transform', description: 'Transform and format data', icon: Code, category: 'data', color: 'orange' },
  { id: 'filter', name: 'Data Filter', description: 'Filter and sort information', icon: Layers, category: 'data', color: 'orange' },
];

const categoryColors = {
  trigger: 'bg-green-100 text-green-800 border-green-200',
  action: 'bg-blue-100 text-blue-800 border-blue-200',
  ai: 'bg-purple-100 text-purple-800 border-purple-200',
  data: 'bg-orange-100 text-orange-800 border-orange-200',
  utility: 'bg-gray-100 text-gray-800 border-gray-200'
};

export default function EnhancedAgentBuilderPage() {
  const [activeTab, setActiveTab] = useState('builder');
  const [chatInput, setChatInput] = useState('');
  const [agentName, setAgentName] = useState('My AI Agent');
  const [agentDescription, setAgentDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredTemplates = selectedCategory === 'all' 
    ? nodeTemplates 
    : nodeTemplates.filter(template => template.category === selectedCategory);

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim()) {
      // Handle AI chat interaction
      console.log('AI Chat:', chatInput);
      setChatInput('');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">AI Agent Builder</h1>
            <p className="text-muted-foreground">
              Create powerful AI agents with drag-and-drop simplicity
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
            <Button variant="outline" size="sm">
              <Save className="mr-2 h-4 w-4" />
              Save
            </Button>
            <Button size="sm">
              <Play className="mr-2 h-4 w-4" />
              Test Agent
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="builder">
              <Layers className="mr-2 h-4 w-4" />
              Visual Builder
            </TabsTrigger>
            <TabsTrigger value="chat">
              <MessageSquare className="mr-2 h-4 w-4" />
              AI Assistant
            </TabsTrigger>
            <TabsTrigger value="templates">
              <Bot className="mr-2 h-4 w-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Visual Builder Tab */}
          <TabsContent value="builder" className="space-y-6">
            <div className="grid grid-cols-12 gap-6">
              {/* Node Palette */}
              <div className="col-span-3">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Node Palette</CardTitle>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        variant={selectedCategory === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedCategory('all')}
                      >
                        All
                      </Button>
                      <Button
                        variant={selectedCategory === 'trigger' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedCategory('trigger')}
                      >
                        Triggers
                      </Button>
                      <Button
                        variant={selectedCategory === 'ai' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedCategory('ai')}
                      >
                        AI
                      </Button>
                      <Button
                        variant={selectedCategory === 'action' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedCategory('action')}
                      >
                        Actions
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {filteredTemplates.map((template) => {
                      const IconComponent = template.icon;
                      return (
                        <div
                          key={template.id}
                          className="p-3 border rounded-md cursor-pointer hover:bg-accent transition-colors"
                          draggable
                        >
                          <div className="flex items-center gap-3">
                            <IconComponent className="h-5 w-5 text-muted-foreground" />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm">{template.name}</div>
                              <div className="text-xs text-muted-foreground truncate">
                                {template.description}
                              </div>
                            </div>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${categoryColors[template.category]}`}
                            >
                              {template.category}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>

              {/* Canvas Area */}
              <div className="col-span-9">
                <Card className="h-[600px]">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Agent Flow</CardTitle>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Plus className="mr-2 h-4 w-4" />
                          Add Node
                        </Button>
                        <Button variant="outline" size="sm">
                          Auto-Layout
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 h-[calc(100%-80px)]">
                    <AgentBuilder />
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* AI Assistant Tab */}
          <TabsContent value="chat" className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              {/* Chat Interface */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    AI Assistant
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="h-96 border rounded-md p-4 bg-muted/20 overflow-y-auto">
                    <div className="space-y-4">
                      <div className="bg-primary text-primary-foreground p-3 rounded-lg max-w-xs">
                        Hello! I'm your AI Agent Builder assistant. I can help you create workflows using plain English. Just tell me what you want your agent to do!
                      </div>
                      <div className="bg-secondary p-3 rounded-lg max-w-xs ml-auto">
                        I want to create an agent that monitors my email and summarizes important messages
                      </div>
                      <div className="bg-primary text-primary-foreground p-3 rounded-lg max-w-xs">
                        Great! I'll help you build that. Here's what we'll need:
                        <br /><br />
                        1. Email Trigger - to monitor incoming emails
                        <br />
                        2. AI Analyzer - to determine importance
                        <br />
                        3. AI Generator - to create summaries
                        <br />
                        4. Send Email - to deliver the summary
                        <br /><br />
                        Should I create this workflow for you?
                      </div>
                    </div>
                  </div>
                  
                  <form onSubmit={handleChatSubmit} className="flex gap-2">
                    <Input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Describe what you want your agent to do..."
                      className="flex-1"
                    />
                    <Button type="submit">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Quick Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <MessageSquare className="mr-3 h-4 w-4" />
                    "Create a chatbot for customer support"
                    <ChevronRight className="ml-auto h-4 w-4" />
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Mail className="mr-3 h-4 w-4" />
                    "Monitor emails and auto-respond"
                    <ChevronRight className="ml-auto h-4 w-4" />
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Database className="mr-3 h-4 w-4" />
                    "Process data and generate reports"
                    <ChevronRight className="ml-auto h-4 w-4" />
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Calendar className="mr-3 h-4 w-4" />
                    "Schedule and manage meetings"
                    <ChevronRight className="ml-auto h-4 w-4" />
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="mr-3 h-4 w-4" />
                    "Analyze documents and extract insights"
                    <ChevronRight className="ml-auto h-4 w-4" />
                  </Button>

                  <Separator className="my-4" />

                  <div className="space-y-2">
                    <h4 className="font-medium">Recent Suggestions</h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div>• Social media content scheduler</div>
                      <div>• Invoice processing automation</div>
                      <div>• Lead qualification assistant</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Customer Support Bot
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Automated customer support that handles common inquiries and escalates complex issues.
                  </p>
                  <div className="flex justify-between items-center">
                    <Badge variant="secondary">Popular</Badge>
                    <Button size="sm">Use Template</Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Email Automation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Smart email processing, categorization, and automated responses.
                  </p>
                  <div className="flex justify-between items-center">
                    <Badge variant="outline">Business</Badge>
                    <Button size="sm">Use Template</Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Data Processing
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Automated data collection, processing, and report generation.
                  </p>
                  <div className="flex justify-between items-center">
                    <Badge variant="outline">Analytics</Badge>
                    <Button size="sm">Use Template</Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Content Generator
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    AI-powered content creation for social media, blogs, and marketing.
                  </p>
                  <div className="flex justify-between items-center">
                    <Badge variant="outline">Creative</Badge>
                    <Button size="sm">Use Template</Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Meeting Assistant
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Schedule meetings, send reminders, and manage calendar conflicts.
                  </p>
                  <div className="flex justify-between items-center">
                    <Badge variant="outline">Productivity</Badge>
                    <Button size="sm">Use Template</Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Document Analyzer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Extract insights and key information from documents and PDFs.
                  </p>
                  <div className="flex justify-between items-center">
                    <Badge variant="outline">Analysis</Badge>
                    <Button size="sm">Use Template</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Agent Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Agent Name</label>
                    <Input
                      value={agentName}
                      onChange={(e) => setAgentName(e.target.value)}
                      placeholder="Enter agent name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      value={agentDescription}
                      onChange={(e) => setAgentDescription(e.target.value)}
                      placeholder="Describe what your agent does"
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Execution Mode</label>
                    <select className="w-full mt-1 p-2 border border-border rounded-md bg-background">
                      <option>Manual Trigger</option>
                      <option>Automatic</option>
                      <option>Scheduled</option>
                    </select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Advanced Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Error Handling</div>
                      <div className="text-sm text-muted-foreground">How to handle errors</div>
                    </div>
                    <select className="p-2 border border-border rounded-md bg-background">
                      <option>Stop on Error</option>
                      <option>Continue on Error</option>
                      <option>Retry Failed Steps</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Logging Level</div>
                      <div className="text-sm text-muted-foreground">Detail level for logs</div>
                    </div>
                    <select className="p-2 border border-border rounded-md bg-background">
                      <option>Basic</option>
                      <option>Detailed</option>
                      <option>Debug</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Timeout</div>
                      <div className="text-sm text-muted-foreground">Maximum execution time</div>
                    </div>
                    <Input type="number" defaultValue="300" className="w-20" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
