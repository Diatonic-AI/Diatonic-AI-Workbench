
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
import { Play, Plus } from "lucide-react";

// Mock data for models
const MODELS = [
  { id: 1, name: "Sentiment Classifier", type: "Neural Network" },
  { id: 2, name: "Text Generator", type: "LLM" },
];

// Mock data for datasets
const DATASETS = [
  { id: 1, name: "Customer Reviews", rows: 5000 },
  { id: 2, name: "Product Descriptions", rows: 2500 },
];

// Mock data for experiments
const EXPERIMENTS = [
  { 
    id: 1, 
    name: "Sentiment Training Run", 
    model: "Sentiment Classifier", 
    dataset: "Customer Reviews",
    status: "Completed",
    results: { accuracy: "88%", loss: "0.23" }
  },
  { 
    id: 2, 
    name: "Text Gen Fine-tuning", 
    model: "Text Generator", 
    dataset: "Product Descriptions",
    status: "Running",
    progress: "65%"
  },
];

const Lab = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Lab</h1>
            <p className="text-muted-foreground">
              Run experiments with your models and datasets
            </p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Experiment
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Experiment Runner</CardTitle>
              <CardDescription>
                Configure and run experiments with your models
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Select Model</label>
                <select className="w-full p-2 rounded-md border border-border bg-background">
                  <option value="">Select a model...</option>
                  {MODELS.map(model => (
                    <option key={model.id} value={model.id}>{model.name} ({model.type})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Select Dataset</label>
                <select className="w-full p-2 rounded-md border border-border bg-background">
                  <option value="">Select a dataset...</option>
                  {DATASETS.map(dataset => (
                    <option key={dataset.id} value={dataset.id}>{dataset.name} ({dataset.rows} rows)</option>
                  ))}
                </select>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full">
                <Play className="mr-2 h-4 w-4" />
                Run Experiment
              </Button>
            </CardFooter>
          </Card>

          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Experiments</CardTitle>
                <CardDescription>
                  View and manage your experiments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {EXPERIMENTS.map((exp) => (
                    <div 
                      key={exp.id}
                      className="p-4 border border-border/50 rounded-md hover:border-border transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium">{exp.name}</h3>
                        <div className={`text-xs px-2 py-1 rounded-full ${
                          exp.status === "Completed" 
                            ? "bg-green-500/20 text-green-500" 
                            : "bg-blue-500/20 text-blue-500"
                        }`}>
                          {exp.status}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        Model: {exp.model} • Dataset: {exp.dataset}
                      </p>
                      
                      {exp.status === "Completed" ? (
                        <div className="grid grid-cols-2 gap-2 mt-3">
                          <div className="bg-secondary/30 p-2 rounded-md text-center">
                            <p className="text-xs text-muted-foreground">Accuracy</p>
                            <p className="text-lg font-mono">{exp.results.accuracy}</p>
                          </div>
                          <div className="bg-secondary/30 p-2 rounded-md text-center">
                            <p className="text-xs text-muted-foreground">Loss</p>
                            <p className="text-lg font-mono">{exp.results.loss}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3">
                          <div className="flex justify-between text-xs mb-1">
                            <span>Progress</span>
                            <span>{exp.progress}</span>
                          </div>
                          <div className="h-2 bg-secondary rounded-full">
                            <div 
                              className="h-2 bg-primary rounded-full" 
                              style={{ width: exp.progress }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Lab;
