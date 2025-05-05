
import React from "react";
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
import { Code, Plus } from "lucide-react";

const TEMPLATES = [
  {
    id: 1,
    title: "Neural Network",
    description: "Build a simple neural network with configurable layers",
    icon: Code,
  },
  {
    id: 2,
    title: "Chatbot",
    description: "Create a chatbot using prompt engineering and LLMs",
    icon: Code,
  },
  {
    id: 3,
    title: "Image Classifier",
    description: "Build a model that can classify images into categories",
    icon: Code,
  },
];

const Toolset = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Studio</h1>
            <p className="text-muted-foreground">
              Create and configure AI models and workflows
            </p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Project
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="pb-2">
              <CardTitle>Model Builder</CardTitle>
              <CardDescription>
                Drag-and-drop interface for creating neural network models
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-32 bg-secondary/40 rounded-md flex items-center justify-center text-muted-foreground">
                Drag components here to build your model
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">
                Open Builder
              </Button>
            </CardFooter>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="pb-2">
              <CardTitle>Prompt Editor</CardTitle>
              <CardDescription>
                Create and test prompts for large language models
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-32 bg-secondary/40 rounded-md p-2 overflow-hidden text-sm text-muted-foreground">
                Write your prompt here to test with different LLMs...
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">
                Open Editor
              </Button>
            </CardFooter>
          </Card>
          
          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="pb-2">
              <CardTitle>Project Management</CardTitle>
              <CardDescription>
                Manage and organize your AI projects
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-32 bg-secondary/40 rounded-md flex items-center justify-center text-muted-foreground">
                No projects yet
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">
                View Projects
              </Button>
            </CardFooter>
          </Card>
        </div>
        
        <h2 className="text-xl font-semibold mt-8 mb-4">Templates</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TEMPLATES.map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <template.icon className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">{template.title}</CardTitle>
                </div>
                <CardDescription>{template.description}</CardDescription>
              </CardHeader>
              <CardFooter>
                <Button variant="secondary" className="w-full">
                  Use Template
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Toolset;
