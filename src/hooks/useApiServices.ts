// React Query hooks for AI Lab and Toolset API services
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agentTemplatesService, type CreateAgentTemplateInput, type UpdateAgentTemplateInput, type AgentTemplatesFilter } from '@/lib/api/agent-templates';
import { labService, type CreateModelInput, type CreateExperimentRunInput, type UpdateExperimentRunInput, type LabFilter } from '@/lib/api/lab';
import { flowNodeConfigsService, type CreateFlowNodeInput, type UpdateFlowNodeInput, type FlowNodeFilter } from '@/lib/api/flow-nodes';

// ==================== AGENT TEMPLATES HOOKS ====================

export const useAgentTemplates = (filters?: AgentTemplatesFilter) => {
  return useQuery({
    queryKey: ['agent-templates', filters],
    queryFn: () => agentTemplatesService.searchTemplates(filters || {}),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useAgentTemplate = (templateId: string) => {
  return useQuery({
    queryKey: ['agent-template', templateId],
    queryFn: () => agentTemplatesService.getTemplate(templateId),
    enabled: !!templateId,
  });
};

export const usePopularTemplates = (category?: string, limit?: number) => {
  return useQuery({
    queryKey: ['popular-templates', category, limit],
    queryFn: () => 
      category 
        ? agentTemplatesService.getPopularTemplatesByCategory(category, limit)
        : agentTemplatesService.getPublicTemplates(limit),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useTemplateCategories = () => {
  return useQuery({
    queryKey: ['template-categories'],
    queryFn: () => agentTemplatesService.getTemplateCategories(),
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
};

export const useCreateTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateAgentTemplateInput) => 
      agentTemplatesService.createTemplate(input),
    onSuccess: () => {
      // Invalidate and refetch templates
      queryClient.invalidateQueries({ queryKey: ['agent-templates'] });
      queryClient.invalidateQueries({ queryKey: ['popular-templates'] });
      queryClient.invalidateQueries({ queryKey: ['template-categories'] });
    },
  });
};

export const useUpdateTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ templateId, input }: { templateId: string; input: UpdateAgentTemplateInput }) =>
      agentTemplatesService.updateTemplate(templateId, input),
    onSuccess: (data, variables) => {
      // Update specific template cache
      queryClient.setQueryData(['agent-template', variables.templateId], data);
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['agent-templates'] });
    },
  });
};

export const useDeleteTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (templateId: string) => 
      agentTemplatesService.deleteTemplate(templateId),
    onSuccess: (_, templateId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: ['agent-template', templateId] });
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: ['agent-templates'] });
    },
  });
};

export const useIncrementTemplateUsage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (templateId: string) => 
      agentTemplatesService.incrementUsageCount(templateId),
    onSuccess: (_, templateId) => {
      // Invalidate template and popular lists
      queryClient.invalidateQueries({ queryKey: ['agent-template', templateId] });
      queryClient.invalidateQueries({ queryKey: ['popular-templates'] });
    },
  });
};

// ==================== LAB SERVICE HOOKS ====================

// Model Registry Hooks
export const useLabModels = (filters?: LabFilter) => {
  return useQuery({
    queryKey: ['lab-models', filters],
    queryFn: () => labService.searchModels(filters || {}),
    staleTime: 5 * 60 * 1000,
  });
};

export const useLabModel = (modelId: string) => {
  return useQuery({
    queryKey: ['lab-model', modelId],
    queryFn: () => labService.getModel(modelId),
    enabled: !!modelId,
  });
};

export const useModelsByProvider = (provider: string) => {
  return useQuery({
    queryKey: ['models-by-provider', provider],
    queryFn: () => labService.getModelsByProvider(provider),
    enabled: !!provider,
  });
};

export const usePublicModels = (limit?: number) => {
  return useQuery({
    queryKey: ['public-models', limit],
    queryFn: () => labService.getPublicModels(limit),
    staleTime: 10 * 60 * 1000,
  });
};

export const useCreateModel = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateModelInput) => 
      labService.createModel(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-models'] });
      queryClient.invalidateQueries({ queryKey: ['public-models'] });
    },
  });
};

export const useUpdateModelRating = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ modelId, rating }: { modelId: string; rating: number }) =>
      labService.updateModelRating(modelId, rating),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lab-model', variables.modelId] });
      queryClient.invalidateQueries({ queryKey: ['public-models'] });
    },
  });
};

// Experiment Run Hooks
export const useExperimentRuns = (tenantId?: string) => {
  return useQuery({
    queryKey: ['experiment-runs', tenantId],
    queryFn: () => labService.getTenantExperimentRuns(tenantId),
    staleTime: 30 * 1000, // 30 seconds for real-time feel
  });
};

export const useExperimentRun = (runId: string) => {
  return useQuery({
    queryKey: ['experiment-run', runId],
    queryFn: () => labService.getExperimentRun(runId),
    enabled: !!runId,
  });
};

export const useRunningExperiments = () => {
  return useQuery({
    queryKey: ['running-experiments'],
    queryFn: () => labService.getRunningExperiments(),
    refetchInterval: 5 * 1000, // Refetch every 5 seconds
    staleTime: 0,
  });
};

export const useExperimentStats = (tenantId?: string) => {
  return useQuery({
    queryKey: ['experiment-stats', tenantId],
    queryFn: () => labService.getExperimentStats(tenantId),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const usePopularModels = () => {
  return useQuery({
    queryKey: ['popular-models'],
    queryFn: () => labService.getPopularModels(),
    staleTime: 10 * 60 * 1000,
  });
};

export const useCreateExperiment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateExperimentRunInput) => 
      labService.createExperimentRun(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experiment-runs'] });
      queryClient.invalidateQueries({ queryKey: ['experiment-stats'] });
    },
  });
};

export const useUpdateExperiment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ runId, input }: { runId: string; input: UpdateExperimentRunInput }) =>
      labService.updateExperimentRun(runId, input),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(['experiment-run', variables.runId], data);
      queryClient.invalidateQueries({ queryKey: ['experiment-runs'] });
      queryClient.invalidateQueries({ queryKey: ['running-experiments'] });
    },
  });
};

export const useCancelExperiment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (runId: string) => labService.cancelExperimentRun(runId),
    onSuccess: (_, runId) => {
      queryClient.invalidateQueries({ queryKey: ['experiment-run', runId] });
      queryClient.invalidateQueries({ queryKey: ['running-experiments'] });
    },
  });
};

export const useCompleteExperiment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ runId, results, resourceUsage }: { 
      runId: string; 
      results: unknown; 
      resourceUsage?: unknown 
    }) => labService.completeExperimentRun(runId, results, resourceUsage),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['experiment-run', variables.runId] });
      queryClient.invalidateQueries({ queryKey: ['experiment-runs'] });
      queryClient.invalidateQueries({ queryKey: ['running-experiments'] });
    },
  });
};

// ==================== FLOW NODE CONFIGS HOOKS ====================

export const useFlowNodes = (filters?: FlowNodeFilter) => {
  return useQuery({
    queryKey: ['flow-nodes', filters],
    queryFn: () => flowNodeConfigsService.searchFlowNodes(filters || {}),
    staleTime: 2 * 60 * 1000,
  });
};

export const useFlowNode = (nodeId: string) => {
  return useQuery({
    queryKey: ['flow-node', nodeId],
    queryFn: () => flowNodeConfigsService.getFlowNode(nodeId),
    enabled: !!nodeId,
  });
};

export const useTemplateNodes = (templateId: string) => {
  return useQuery({
    queryKey: ['template-nodes', templateId],
    queryFn: () => flowNodeConfigsService.getTemplateNodes(templateId),
    enabled: !!templateId,
  });
};

export const useFlowConfiguration = (templateId: string) => {
  return useQuery({
    queryKey: ['flow-configuration', templateId],
    queryFn: () => flowNodeConfigsService.getFlowConfiguration(templateId),
    enabled: !!templateId,
  });
};

export const useFlowStats = (templateId?: string) => {
  return useQuery({
    queryKey: ['flow-stats', templateId],
    queryFn: () => flowNodeConfigsService.getFlowStats(templateId),
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateFlowNode = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateFlowNodeInput) => 
      flowNodeConfigsService.createFlowNode(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['flow-nodes'] });
      if (data.template_id) {
        queryClient.invalidateQueries({ queryKey: ['template-nodes', data.template_id] });
        queryClient.invalidateQueries({ queryKey: ['flow-configuration', data.template_id] });
      }
    },
  });
};

export const useUpdateFlowNode = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ nodeId, input }: { nodeId: string; input: UpdateFlowNodeInput }) =>
      flowNodeConfigsService.updateFlowNode(nodeId, input),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(['flow-node', variables.nodeId], data);
      if (data?.template_id) {
        queryClient.invalidateQueries({ queryKey: ['template-nodes', data.template_id] });
        queryClient.invalidateQueries({ queryKey: ['flow-configuration', data.template_id] });
      }
    },
  });
};

export const useDeleteFlowNode = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (nodeId: string) => flowNodeConfigsService.deleteFlowNode(nodeId),
    onSuccess: (_, nodeId) => {
      queryClient.removeQueries({ queryKey: ['flow-node', nodeId] });
      queryClient.invalidateQueries({ queryKey: ['flow-nodes'] });
      queryClient.invalidateQueries({ queryKey: ['template-nodes'] });
    },
  });
};

export const useCreateFlow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (flowConfig: {
      flow_name: string;
      description: string;
      template_id?: string;
      nodes: Omit<CreateFlowNodeInput, 'template_id'>[];
    }) => flowNodeConfigsService.createFlow(flowConfig),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['flow-nodes'] });
      if (data.template_id) {
        queryClient.invalidateQueries({ queryKey: ['flow-configuration', data.template_id] });
      }
    },
  });
};

export const useDeleteFlow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (templateId: string) => flowNodeConfigsService.deleteFlow(templateId),
    onSuccess: (_, templateId) => {
      queryClient.removeQueries({ queryKey: ['flow-configuration', templateId] });
      queryClient.invalidateQueries({ queryKey: ['flow-nodes'] });
      queryClient.invalidateQueries({ queryKey: ['template-nodes'] });
    },
  });
};

export const useCloneFlow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      sourceTemplateId, 
      newFlowName, 
      newDescription 
    }: {
      sourceTemplateId: string;
      newFlowName: string;
      newDescription?: string;
    }) => flowNodeConfigsService.cloneFlow(sourceTemplateId, newFlowName, newDescription),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flow-nodes'] });
      queryClient.invalidateQueries({ queryKey: ['flow-stats'] });
    },
  });
};

export const useValidateFlow = (templateId: string) => {
  return useQuery({
    queryKey: ['validate-flow', templateId],
    queryFn: () => flowNodeConfigsService.validateFlow(templateId),
    enabled: !!templateId,
    staleTime: 60 * 1000, // 1 minute
  });
};

export const useReorderFlowNodes = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      templateId, 
      nodePositions 
    }: {
      templateId: string;
      nodePositions: { node_id: string; position: number }[];
    }) => flowNodeConfigsService.reorderFlowNodes(templateId, nodePositions),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['template-nodes', variables.templateId] });
      queryClient.invalidateQueries({ queryKey: ['flow-configuration', variables.templateId] });
    },
  });
};

// ==================== COMPOSITE HOOKS ====================

/**
 * Hook for getting comprehensive lab dashboard data
 */
export const useLabDashboardData = () => {
  const models = useLabModels({ limit: 10 });
  const experiments = useExperimentRuns();
  const runningExperiments = useRunningExperiments();
  const stats = useExperimentStats();
  const popularModels = usePopularModels();

  return {
    models: models.data || [],
    experiments: experiments.data || [],
    runningExperiments: runningExperiments.data || [],
    stats: stats.data || { total: 0, by_status: {}, recent_runs: 0, avg_duration: 0 },
    popularModels: popularModels.data || [],
    isLoading: models.isLoading || experiments.isLoading || stats.isLoading,
    error: models.error || experiments.error || stats.error,
  };
};

/**
 * Hook for getting comprehensive toolset data
 */
export const useToolsetDashboardData = () => {
  const templates = useAgentTemplates({ limit: 20 });
  const categories = useTemplateCategories();
  const flowStats = useFlowStats();
  const popularTemplates = usePopularTemplates();

  return {
    templates: templates.data || [],
    categories: categories.data || [],
    flowStats: flowStats.data || { total_nodes: 0, nodes_by_type: {}, avg_nodes_per_flow: 0, most_used_node_type: 'none' },
    popularTemplates: popularTemplates.data || [],
    isLoading: templates.isLoading || categories.isLoading || flowStats.isLoading,
    error: templates.error || categories.error || flowStats.error,
  };
};

export default {
  // Agent Templates
  useAgentTemplates,
  useAgentTemplate,
  usePopularTemplates,
  useTemplateCategories,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  useIncrementTemplateUsage,
  
  // Lab Models
  useLabModels,
  useLabModel,
  useModelsByProvider,
  usePublicModels,
  useCreateModel,
  useUpdateModelRating,
  
  // Experiments
  useExperimentRuns,
  useExperimentRun,
  useRunningExperiments,
  useExperimentStats,
  usePopularModels,
  useCreateExperiment,
  useUpdateExperiment,
  useCancelExperiment,
  useCompleteExperiment,
  
  // Flow Nodes
  useFlowNodes,
  useFlowNode,
  useTemplateNodes,
  useFlowConfiguration,
  useFlowStats,
  useCreateFlowNode,
  useUpdateFlowNode,
  useDeleteFlowNode,
  useCreateFlow,
  useDeleteFlow,
  useCloneFlow,
  useValidateFlow,
  useReorderFlowNodes,
  
  // Composite
  useLabDashboardData,
  useToolsetDashboardData,
};
