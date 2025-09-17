import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Play, Clock, Users, Filter, Search, BookOpen, Code, Sparkles, BarChart2 } from 'lucide-react';

const Tutorials = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const tutorials = [
    {
      id: 1,
      title: "Building Your First AI Agent",
      description: "Learn to create a simple conversational AI agent using the visual flow builder",
      category: "beginner",
      type: "agent-builder",
      duration: "15 min",
      students: 1245,
      difficulty: "Beginner",
      author: "Dr. Sarah Chen",
      thumbnail: "agent-builder-tutorial.jpg",
      tags: ["agent-builder", "beginner", "chatbot"]
    },
    {
      id: 2,
      title: "Data Pipeline Creation",
      description: "Set up automated data pipelines for your machine learning workflows",
      category: "intermediate",
      type: "data-processing",
      duration: "25 min",
      students: 892,
      difficulty: "Intermediate",
      author: "Alex Rodriguez",
      thumbnail: "data-pipeline-tutorial.jpg",
      tags: ["data", "pipeline", "automation"]
    },
    {
      id: 3,
      title: "Model Training Best Practices",
      description: "Learn advanced techniques for training and optimizing machine learning models",
      category: "advanced",
      type: "ai-lab",
      duration: "35 min",
      students: 567,
      difficulty: "Advanced",
      author: "Prof. Michael Zhang",
      thumbnail: "model-training-tutorial.jpg",
      tags: ["ml", "training", "optimization"]
    },
    {
      id: 4,
      title: "Creating Interactive Dashboards",
      description: "Build beautiful, interactive dashboards to visualize your data insights",
      category: "intermediate",
      type: "observatory",
      duration: "20 min",
      students: 743,
      difficulty: "Intermediate",
      author: "Emma Thompson",
      thumbnail: "dashboard-tutorial.jpg",
      tags: ["visualization", "dashboard", "analytics"]
    },
    {
      id: 5,
      title: "API Integration Guide",
      description: "Connect external APIs and services to your AI workflows",
      category: "intermediate",
      type: "integration",
      duration: "18 min",
      students: 623,
      difficulty: "Intermediate",
      author: "David Kim",
      thumbnail: "api-integration-tutorial.jpg",
      tags: ["api", "integration", "workflow"]
    },
    {
      id: 6,
      title: "Advanced Prompt Engineering",
      description: "Master the art of crafting effective prompts for large language models",
      category: "advanced",
      type: "llm",
      duration: "30 min",
      students: 1089,
      difficulty: "Advanced",
      author: "Dr. Lisa Wang",
      thumbnail: "prompt-engineering-tutorial.jpg",
      tags: ["llm", "prompting", "ai"]
    }
  ];

  const filteredTutorials = tutorials.filter(tutorial =>
    tutorial.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tutorial.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tutorial.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner': return 'bg-green-500/20 text-green-500';
      case 'Intermediate': return 'bg-yellow-500/20 text-yellow-500';
      case 'Advanced': return 'bg-red-500/20 text-red-500';
      default: return 'bg-gray-500/20 text-gray-500';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'agent-builder': return <Code className="h-4 w-4" />;
      case 'ai-lab': return <Sparkles className="h-4 w-4" />;
      case 'observatory': return <BarChart2 className="h-4 w-4" />;
      default: return <BookOpen className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-workbbench-dark-purple to-black text-white">
      <Navbar />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="text-gradient bg-gradient-to-r from-workbbench-purple to-workbbench-orange">
              Tutorials
            </span>
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Step-by-step tutorials to help you master AI development with Workbbench. From beginner basics to advanced techniques.
          </p>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              id="tutorials-search"
              name="tutorialsSearch"
              type="text"
              className="w-full bg-secondary/60 border border-white/10 text-white pl-12 pr-4 py-3 rounded-md"
              placeholder="Search tutorials..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoComplete="off"
            />
          </div>
          <Button variant="outline" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
        </div>

        {/* Tabs for Categories */}
        <Tabs defaultValue="all" className="mb-8">
          <TabsList className="bg-secondary/50 mb-6">
            <TabsTrigger value="all">All Tutorials</TabsTrigger>
            <TabsTrigger value="beginner">Beginner</TabsTrigger>
            <TabsTrigger value="intermediate">Intermediate</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <TutorialGrid tutorials={filteredTutorials} getDifficultyColor={getDifficultyColor} getTypeIcon={getTypeIcon} />
          </TabsContent>
          
          <TabsContent value="beginner">
            <TutorialGrid 
              tutorials={filteredTutorials.filter(t => t.category === 'beginner')} 
              getDifficultyColor={getDifficultyColor} 
              getTypeIcon={getTypeIcon} 
            />
          </TabsContent>
          
          <TabsContent value="intermediate">
            <TutorialGrid 
              tutorials={filteredTutorials.filter(t => t.category === 'intermediate')} 
              getDifficultyColor={getDifficultyColor} 
              getTypeIcon={getTypeIcon} 
            />
          </TabsContent>
          
          <TabsContent value="advanced">
            <TutorialGrid 
              tutorials={filteredTutorials.filter(t => t.category === 'advanced')} 
              getDifficultyColor={getDifficultyColor} 
              getTypeIcon={getTypeIcon} 
            />
          </TabsContent>
        </Tabs>

        {/* Featured Learning Path */}
        <section className="mt-16">
          <h2 className="text-3xl font-bold mb-8">Featured Learning Path</h2>
          <Card className="bg-gradient-to-r from-workbbench-purple/20 to-workbbench-blue/20 border-white/10">
            <CardHeader>
              <CardTitle className="text-2xl">Complete AI Agent Development</CardTitle>
              <CardDescription className="text-lg">
                A comprehensive learning path that takes you from beginner to expert in AI agent development
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-workbbench-purple/20 flex items-center justify-center">
                    <span className="text-lg font-bold">1</span>
                  </div>
                  <div>
                    <h4 className="font-medium">Fundamentals</h4>
                    <p className="text-sm text-gray-400">Basic concepts and setup</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-workbbench-blue/20 flex items-center justify-center">
                    <span className="text-lg font-bold">2</span>
                  </div>
                  <div>
                    <h4 className="font-medium">Building</h4>
                    <p className="text-sm text-gray-400">Create your first agents</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-workbbench-orange/20 flex items-center justify-center">
                    <span className="text-lg font-bold">3</span>
                  </div>
                  <div>
                    <h4 className="font-medium">Mastery</h4>
                    <p className="text-sm text-gray-400">Advanced patterns and deployment</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 mb-4">
                <Badge variant="secondary">6 Tutorials</Badge>
                <Badge variant="secondary">4 Hours Total</Badge>
                <Badge variant="secondary">Certificate Included</Badge>
              </div>
              <Button className="bg-workbbench-purple hover:bg-workbbench-purple/90">
                Start Learning Path
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
};

const TutorialGrid = ({ tutorials, getDifficultyColor, getTypeIcon }: {
  tutorials: any[],
  getDifficultyColor: (difficulty: string) => string,
  getTypeIcon: (type: string) => React.ReactNode
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {tutorials.map((tutorial) => (
        <Card key={tutorial.id} className="bg-secondary/30 border-white/10 hover:border-white/20 transition-all group">
          <div className="relative">
            <div className="h-48 bg-gradient-to-br from-workbbench-purple/20 to-workbbench-blue/20 rounded-t-lg flex items-center justify-center">
              <Play className="h-12 w-12 text-white/60 group-hover:text-white transition-colors" />
            </div>
            <div className="absolute top-3 right-3">
              <Badge className={`${getDifficultyColor(tutorial.difficulty)} border-0`}>
                {tutorial.difficulty}
              </Badge>
            </div>
          </div>
          
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              {getTypeIcon(tutorial.type)}
              <span className="text-sm text-gray-400 capitalize">{tutorial.type.replace('-', ' ')}</span>
            </div>
            <CardTitle className="line-clamp-2">{tutorial.title}</CardTitle>
            <CardDescription className="line-clamp-3">{tutorial.description}</CardDescription>
          </CardHeader>
          
          <CardContent>
            <div className="flex items-center gap-4 mb-4 text-sm text-gray-400">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {tutorial.duration}
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {tutorial.students.toLocaleString()}
              </div>
            </div>
            
            <div className="flex flex-wrap gap-1 mb-4">
              {tutorial.tags.slice(0, 3).map((tag: string, index: number) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">by {tutorial.author}</span>
              <Button size="sm" className="bg-workbbench-purple hover:bg-workbbench-purple/90">
                Start Tutorial
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default Tutorials;
