
import { useState } from "react"; // React namespace import not required with jsx: 'react-jsx' (see tsconfig)
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Plus, 
  Sparkles, 
  WandSparkles, 
  CodeSquare, 
  TrendingUp,
  Zap,
  Filter,
  Search,
  Layers,
  Bot,
  Workflow
} from "lucide-react";
import { AgentBuilder } from "@/components/agent-builder/AgentBuilder";
import { useToolsetDashboardData } from "@/hooks/useApiServices";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Toolset = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("tools");
  
  const {
    templates,
    categories,
    flowStats,
    popularTemplates,
    isLoading,
    error
  } = useToolsetDashboardData();

  const filteredTemplates = templates.filter(template => {
    const templateName = template.template_name?.toLowerCase?.() || "";
    const templateDescription = template.description?.toLowerCase?.() || "";
    const term = searchTerm.toLowerCase();
    const matchesSearch = templateName.includes(term) || templateDescription.includes(term);
    const matchesCategory = selectedCategory === "all" || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">AI Toolset</h1>
            <p className="text-muted-foreground">
              Create and configure AI agents, workflows, and models
            </p>
          </div>
          <Button onClick={() => navigate('/toolset/agent-builder')}>
            <Plus className="mr-2 h-4 w-4" />
            New Agent
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Templates</CardTitle>
              <CodeSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{templates.length}</div>
              <p className="text-xs text-muted-foreground">
                Available agent templates
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Nodes</CardTitle>
              <Layers className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{flowStats.total_nodes || 0}</div>
              <p className="text-xs text-muted-foreground">
                Workflow components
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Flow Size</CardTitle>
              <Workflow className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Math.round(flowStats.avg_nodes_per_flow || 0)}</div>
              <p className="text-xs text-muted-foreground">
                Nodes per workflow
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Categories</CardTitle>
              <Filter className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{categories.length}</div>
              <p className="text-xs text-muted-foreground">
                Template categories
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="tools">
              <CodeSquare className="mr-2 h-4 w-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="agent-builder">
              <WandSparkles className="mr-2 h-4 w-4" />
              Agent Builder
            </TabsTrigger>
            <TabsTrigger value="popular">
              <TrendingUp className="mr-2 h-4 w-4" />
              Popular
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="tools" className="space-y-6">
            {/* Search and Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(({ category, count }: { category: string; count: number }) => (
                    <SelectItem key={category} value={category}>
                      {category} ({count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>
                  Error loading templates: {error.message}
                </AlertDescription>
              </Alert>
            )}
            {/* Templates Grid */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-4 w-[250px]" />
                      <Skeleton className="h-4 w-[200px]" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-32 w-full" />
                    </CardContent>
                    <CardFooter>
                      <Skeleton className="h-10 w-full" />
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTemplates.map((template) => (
                  <Card key={template.template_id} className="hover:shadow-lg transition-shadow duration-200">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Bot className="h-5 w-5 text-primary" />
                          <CardTitle className="text-lg">{template.template_name}</CardTitle>
                        </div>
                        <Badge variant="secondary">
                          {template.category || 'General'}
                        </Badge>
                      </div>
                      <CardDescription>{template.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>Usage Count:</span>
                          <span>{template.usage_count || 0}</span>
                        </div>
                        {template.tags && (
                          <div className="flex flex-wrap gap-1">
                            {template.tags.slice(0, 3).map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {template.tags.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{template.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="space-x-2">
                      <Button variant="secondary" className="flex-1">
                        Preview
                      </Button>
                      <Button className="flex-1">
                        <Zap className="mr-2 h-4 w-4" />
                        Use Template
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}

            {!isLoading && filteredTemplates.length === 0 && (
              <div className="text-center py-12">
                <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No templates found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || selectedCategory !== "all" 
                    ? "Try adjusting your search or filter criteria" 
                    : "No agent templates available yet"}
                </p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="popular" className="space-y-6">
            <h2 className="text-xl font-semibold">Popular Templates</h2>
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-4 w-[250px]" />
                      <Skeleton className="h-4 w-[200px]" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-32 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {popularTemplates.slice(0, 6).map((template, index) => (
                  <Card key={template.template_id} className="hover:shadow-lg transition-shadow duration-200">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center justify-center w-6 h-6 bg-primary text-primary-foreground rounded-full text-sm font-bold">
                            {index + 1}
                          </div>
                          <CardTitle className="text-lg">{template.template_name}</CardTitle>
                        </div>
                        <Badge variant="secondary">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          {template.usage_count}
                        </Badge>
                      </div>
                      <CardDescription>{template.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {template.tags && (
                        <div className="flex flex-wrap gap-1">
                          {template.tags.slice(0, 3).map((tag, tagIndex) => (
                            <Badge key={tagIndex} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                    <CardFooter>
                      <Button className="w-full">
                        <Zap className="mr-2 h-4 w-4" />
                        Use Template
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="agent-builder">
            <Card>
              <CardHeader>
                <CardTitle>Agent Builder Canvas</CardTitle>
                <CardDescription>
                  Create AI agents visually by connecting components in a workflow
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AgentBuilder />
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline">Clear Canvas</Button>
                <Button>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Save Agent
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Toolset;
