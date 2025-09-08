
import React, { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Play, Plus, Beaker, TrendingUp, Clock, CheckCircle, XCircle, Loader2, Star } from "lucide-react";
import { useLabDashboardData, useCreateExperiment, useCreateModel } from "@/hooks/useApiServices";
import { toast } from "sonner";
import { format } from "date-fns";

// New Experiment Form Component
const NewExperimentForm: React.FC<{
  models: unknown[];
  onSubmit: (data: unknown) => void;
  isSubmitting: boolean;
}> = ({ models, onSubmit, isSubmitting }) => {
  const [formData, setFormData] = useState({
    experiment_name: '',
    model_id: '',
    dataset_id: '',
    parameters: {
      batch_size: 32,
      learning_rate: 0.001,
      epochs: 10
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.experiment_name || !formData.model_id) {
      toast.error('Please fill in required fields');
      return;
    }
    onSubmit(formData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Experiment Runner</CardTitle>
        <CardDescription>
          Configure and run experiments with your models
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="experiment_name">Experiment Name</Label>
            <Input
              id="experiment_name"
              value={formData.experiment_name}
              onChange={(e) => setFormData(prev => ({ ...prev, experiment_name: e.target.value }))}
              placeholder="Enter experiment name..."
              required
            />
          </div>
          
          <div>
            <Label htmlFor="model_id">Select Model</Label>
            <Select 
              value={formData.model_id} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, model_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a model..." />
              </SelectTrigger>
              <SelectContent>
                {models.map(model => (
                  <SelectItem key={model.model_id} value={model.model_id}>
                    {model.model_name} ({model.provider} - {model.model_type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="dataset_id">Dataset ID (Optional)</Label>
            <Input
              id="dataset_id"
              value={formData.dataset_id}
              onChange={(e) => setFormData(prev => ({ ...prev, dataset_id: e.target.value }))}
              placeholder="Enter dataset ID..."
            />
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label htmlFor="batch_size">Batch Size</Label>
              <Input
                id="batch_size"
                type="number"
                value={formData.parameters.batch_size}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  parameters: { ...prev.parameters, batch_size: parseInt(e.target.value) }
                }))}
              />
            </div>
            <div>
              <Label htmlFor="learning_rate">Learning Rate</Label>
              <Input
                id="learning_rate"
                type="number"
                step="0.0001"
                value={formData.parameters.learning_rate}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  parameters: { ...prev.parameters, learning_rate: parseFloat(e.target.value) }
                }))}
              />
            </div>
            <div>
              <Label htmlFor="epochs">Epochs</Label>
              <Input
                id="epochs"
                type="number"
                value={formData.parameters.epochs}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  parameters: { ...prev.parameters, epochs: parseInt(e.target.value) }
                }))}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Experiment...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Run Experiment
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

// Status Badge Component
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'completed':
        return { icon: CheckCircle, className: 'bg-green-500/20 text-green-500', label: 'Completed' };
      case 'running':
        return { icon: Loader2, className: 'bg-blue-500/20 text-blue-500 animate-pulse', label: 'Running' };
      case 'failed':
        return { icon: XCircle, className: 'bg-red-500/20 text-red-500', label: 'Failed' };
      case 'cancelled':
        return { icon: XCircle, className: 'bg-gray-500/20 text-gray-500', label: 'Cancelled' };
      case 'queued':
        return { icon: Clock, className: 'bg-yellow-500/20 text-yellow-500', label: 'Queued' };
      default:
        return { icon: Clock, className: 'bg-gray-500/20 text-gray-500', label: status };
    }
  };
  
  const config = getStatusConfig(status);
  const Icon = config.icon;
  
  return (
    <Badge variant="secondary" className={config.className}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  );
};

const Lab = () => {
  const { 
    models, 
    experiments, 
    runningExperiments, 
    stats, 
    popularModels, 
    isLoading, 
    error 
  } = useLabDashboardData();
  
  const createExperimentMutation = useCreateExperiment();
  
  const handleCreateExperiment = async (experimentData: unknown) => {
    try {
      await createExperimentMutation.mutateAsync(experimentData);
      toast.success('Experiment created successfully!');
    } catch (error) {
      console.error('Failed to create experiment:', error);
      toast.error('Failed to create experiment. Please try again.');
    }
  };
  
  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Alert className="max-w-md">
            <AlertDescription>
              Failed to load lab data. Please check your connection and try again.
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Beaker className="h-8 w-8 text-primary" />
              AI Lab
            </h1>
            <p className="text-muted-foreground">
              Run experiments, manage models, and analyze results
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Add Model
            </Button>
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Experiments</p>
                  <p className="text-2xl font-bold">
                    {isLoading ? <Skeleton className="h-8 w-16" /> : stats.total}
                  </p>
                </div>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Running</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {isLoading ? <Skeleton className="h-8 w-16" /> : runningExperiments.length}
                  </p>
                </div>
                <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Recent (24h)</p>
                  <p className="text-2xl font-bold text-green-600">
                    {isLoading ? <Skeleton className="h-8 w-16" /> : stats.recent_runs}
                  </p>
                </div>
                <Clock className="h-4 w-4 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg Duration</p>
                  <p className="text-2xl font-bold">
                    {isLoading ? <Skeleton className="h-8 w-16" /> : `${Math.round(stats.avg_duration / 60)}m`}
                  </p>
                </div>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Experiment Runner Form */}
          <NewExperimentForm 
            models={models}
            onSubmit={handleCreateExperiment}
            isSubmitting={createExperimentMutation.isPending}
          />
          
          {/* Recent Experiments */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Experiments</CardTitle>
                <CardDescription>
                  View and manage your experiments
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="p-4 border rounded-md">
                        <Skeleton className="h-6 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-1/2 mb-2" />
                        <Skeleton className="h-20 w-full" />
                      </div>
                    ))}
                  </div>
                ) : experiments.length > 0 ? (
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {experiments.map((experiment) => (
                      <div 
                        key={experiment.run_id}
                        className="p-4 border border-border/50 rounded-md hover:border-border transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium">{experiment.experiment_name}</h3>
                          <StatusBadge status={experiment.status} />
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mb-2">
                          <Badge variant="outline">ID: {experiment.experiment_id.slice(-8)}</Badge>
                          <Badge variant="outline">Model: {experiment.model_id.slice(-8)}</Badge>
                          {experiment.dataset_id && (
                            <Badge variant="outline">Dataset: {experiment.dataset_id.slice(-8)}</Badge>
                          )}
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-2">
                          Started: {format(new Date(experiment.started_at), 'MMM dd, yyyy HH:mm')}
                        </p>
                        
                        {experiment.status === 'completed' && experiment.results ? (
                          <div className="grid grid-cols-2 gap-2 mt-3">
                            <div className="bg-secondary/30 p-2 rounded-md text-center">
                              <p className="text-xs text-muted-foreground">Duration</p>
                              <p className="text-lg font-mono">
                                {experiment.duration_seconds ? `${Math.round(experiment.duration_seconds / 60)}m` : 'N/A'}
                              </p>
                            </div>
                            <div className="bg-secondary/30 p-2 rounded-md text-center">
                              <p className="text-xs text-muted-foreground">Results</p>
                              <p className="text-sm font-mono truncate">View Details</p>
                            </div>
                          </div>
                        ) : experiment.status === 'failed' && experiment.error_message ? (
                          <Alert>
                            <AlertDescription className="text-sm">
                              {experiment.error_message}
                            </AlertDescription>
                          </Alert>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Beaker className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No experiments yet. Create your first experiment above!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Popular Models Section */}
        {popularModels.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Popular Models
              </CardTitle>
              <CardDescription>
                Most used models in experiments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {popularModels.map((modelStat) => {
                  const model = models.find(m => m.model_id === modelStat.model_id);
                  return model ? (
                    <div key={modelStat.model_id} className="p-3 border rounded-md">
                      <h4 className="font-medium">{model.model_name}</h4>
                      <p className="text-sm text-muted-foreground">{model.provider} • {model.model_type}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Used in {modelStat.experiment_count} experiments
                      </p>
                    </div>
                  ) : null;
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Lab;
