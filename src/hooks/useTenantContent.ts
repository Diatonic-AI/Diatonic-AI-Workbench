import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDevAuth } from '@/contexts/DevAuthContext';
import { 
  ToolsetItem, 
  LabExperiment, 
  DashboardMetric, 
  CommunityPost, 
  EducationCourse 
} from '@/types/content';
import { 
  ApiResponse, 
  PaginatedResponse, 
  createServiceClient,
  extractData 
} from '@/lib/tenant-service-client';

// Custom hook for tenant-aware API calls
function useTenantServiceClient() {
  const { tenantId, user } = useDevAuth();
  
  const client = createServiceClient(
    tenantId, 
    user?.id // Use user ID as simple auth token for dev
  );
  
  return client;
}

// Query key factory for consistent caching
const queryKeys = {
  toolset: (tenantId: string) => ['toolset', tenantId] as const,
  toolsetItem: (tenantId: string, id: string) => ['toolset', tenantId, id] as const,
  
  lab: (tenantId: string) => ['lab', tenantId] as const,
  labExperiment: (tenantId: string, id: string) => ['lab', tenantId, id] as const,
  
  dashboard: (tenantId: string) => ['dashboard', tenantId] as const,
  dashboardMetric: (tenantId: string, id: string) => ['dashboard', tenantId, id] as const,
  
  community: (tenantId: string) => ['community', tenantId] as const,
  communityPost: (tenantId: string, id: string) => ['community', tenantId, id] as const,
  
  education: (tenantId: string) => ['education', tenantId] as const,
  educationCourse: (tenantId: string, id: string) => ['education', tenantId, id] as const,
};

// Toolset Content Hooks
export function useToolsetItems() {
  const { tenantId, isAuthenticated } = useDevAuth();
  const client = useTenantServiceClient();
  
  return useQuery({
    queryKey: queryKeys.toolset(tenantId),
    queryFn: async () => {
      const response = await client.get<ApiResponse<ToolsetItem[]>>('/api/toolset');
      return extractData(response);
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false
  });
}

export function useToolsetItem(id: string) {
  const { tenantId, isAuthenticated } = useDevAuth();
  const client = useTenantServiceClient();
  
  return useQuery({
    queryKey: queryKeys.toolsetItem(tenantId, id),
    queryFn: async () => {
      const response = await client.get<ApiResponse<ToolsetItem>>(`/api/toolset/${id}`);
      return extractData(response);
    },
    enabled: isAuthenticated && !!id,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useCreateToolsetItem() {
  const { tenantId } = useDevAuth();
  const client = useTenantServiceClient();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Omit<ToolsetItem, 'id' | 'created_at' | 'updated_at'>) => {
      const response = await client.post<ApiResponse<ToolsetItem>>('/api/toolset', data);
      return extractData(response);
    },
    onSuccess: () => {
      // Invalidate and refetch toolset list
      queryClient.invalidateQueries({ queryKey: queryKeys.toolset(tenantId) });
    }
  });
}

export function useUpdateToolsetItem() {
  const { tenantId } = useDevAuth();
  const client = useTenantServiceClient();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { 
      id: string; 
      data: Partial<Omit<ToolsetItem, 'id' | 'created_at' | 'updated_at'>>
    }) => {
      const response = await client.put<ApiResponse<ToolsetItem>>(`/api/toolset/${id}`, data);
      return extractData(response);
    },
    onSuccess: (data) => {
      // Update cache for specific item
      queryClient.setQueryData(queryKeys.toolsetItem(tenantId, data.id), data);
      // Invalidate list to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.toolset(tenantId) });
    }
  });
}

// Lab Content Hooks
export function useLabExperiments() {
  const { tenantId, isAuthenticated } = useDevAuth();
  const client = useTenantServiceClient();
  
  return useQuery({
    queryKey: queryKeys.lab(tenantId),
    queryFn: async () => {
      const response = await client.get<ApiResponse<LabExperiment[]>>('/api/lab');
      return extractData(response);
    },
    enabled: isAuthenticated,
    staleTime: 3 * 60 * 1000, // 3 minutes
  });
}

export function useLabExperiment(id: string) {
  const { tenantId, isAuthenticated } = useDevAuth();
  const client = useTenantServiceClient();
  
  return useQuery({
    queryKey: queryKeys.labExperiment(tenantId, id),
    queryFn: async () => {
      const response = await client.get<ApiResponse<LabExperiment>>(`/api/lab/${id}`);
      return extractData(response);
    },
    enabled: isAuthenticated && !!id,
  });
}

export function useCreateLabExperiment() {
  const { tenantId } = useDevAuth();
  const client = useTenantServiceClient();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Omit<LabExperiment, 'id' | 'created_at' | 'updated_at'>) => {
      const response = await client.post<ApiResponse<LabExperiment>>('/api/lab', data);
      return extractData(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.lab(tenantId) });
    }
  });
}

// Dashboard Metrics Hooks
export function useDashboardMetrics() {
  const { tenantId, isAuthenticated } = useDevAuth();
  const client = useTenantServiceClient();
  
  return useQuery({
    queryKey: queryKeys.dashboard(tenantId),
    queryFn: async () => {
      const response = await client.get<ApiResponse<DashboardMetric[]>>('/api/dashboard');
      return extractData(response);
    },
    enabled: isAuthenticated,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  });
}

export function useDashboardMetric(id: string) {
  const { tenantId, isAuthenticated } = useDevAuth();
  const client = useTenantServiceClient();
  
  return useQuery({
    queryKey: queryKeys.dashboardMetric(tenantId, id),
    queryFn: async () => {
      const response = await client.get<ApiResponse<DashboardMetric>>(`/api/dashboard/${id}`);
      return extractData(response);
    },
    enabled: isAuthenticated && !!id,
  });
}

// Community Content Hooks
export function useCommunityPosts(page = 1, limit = 10) {
  const { tenantId } = useDevAuth(); // Community allows anonymous access
  const client = useTenantServiceClient();
  
  return useQuery({
    queryKey: [...queryKeys.community(tenantId), 'page', page, 'limit', limit],
    queryFn: async () => {
      const response = await client.get<PaginatedResponse<CommunityPost>>(
        '/api/community',
        { page: page.toString(), limit: limit.toString() }
      );
      return response; // Return full paginated response
    },
    staleTime: 60 * 1000, // 1 minute
    keepPreviousData: true, // Keep previous data while fetching new page
  });
}

export function useCommunityPost(id: string) {
  const { tenantId } = useDevAuth();
  const client = useTenantServiceClient();
  
  return useQuery({
    queryKey: queryKeys.communityPost(tenantId, id),
    queryFn: async () => {
      const response = await client.get<ApiResponse<CommunityPost>>(`/api/community/${id}`);
      return extractData(response);
    },
    enabled: !!id,
  });
}

export function useCreateCommunityPost() {
  const { tenantId } = useDevAuth();
  const client = useTenantServiceClient();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Omit<CommunityPost, 'id' | 'created_at' | 'updated_at'>) => {
      const response = await client.post<ApiResponse<CommunityPost>>('/api/community', data);
      return extractData(response);
    },
    onSuccess: () => {
      // Invalidate all community queries to refresh lists
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.community(tenantId),
        exact: false 
      });
    }
  });
}

// Education Content Hooks
export function useEducationCourses() {
  const { tenantId } = useDevAuth();
  const client = useTenantServiceClient();
  
  return useQuery({
    queryKey: queryKeys.education(tenantId),
    queryFn: async () => {
      const response = await client.get<ApiResponse<EducationCourse[]>>('/api/education');
      return extractData(response);
    },
    staleTime: 10 * 60 * 1000, // 10 minutes (education content changes less frequently)
  });
}

export function useEducationCourse(id: string) {
  const { tenantId } = useDevAuth();
  const client = useTenantServiceClient();
  
  return useQuery({
    queryKey: queryKeys.educationCourse(tenantId, id),
    queryFn: async () => {
      const response = await client.get<ApiResponse<EducationCourse>>(`/api/education/${id}`);
      return extractData(response);
    },
    enabled: !!id,
  });
}

export function useCreateEducationCourse() {
  const { tenantId } = useDevAuth();
  const client = useTenantServiceClient();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Omit<EducationCourse, 'id' | 'created_at' | 'updated_at'>) => {
      const response = await client.post<ApiResponse<EducationCourse>>('/api/education', data);
      return extractData(response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.education(tenantId) });
    }
  });
}

// Generic content hooks for flexibility
export function useContentList<T>(
  endpoint: string,
  queryKey: string[],
  options: {
    enabled?: boolean;
    staleTime?: number;
    refetchInterval?: number;
  } = {}
) {
  const { isAuthenticated } = useDevAuth();
  const client = useTenantServiceClient();
  
  return useQuery({
    queryKey,
    queryFn: async () => {
      const response = await client.get<ApiResponse<T[]>>(endpoint);
      return extractData(response);
    },
    enabled: options.enabled ?? isAuthenticated,
    staleTime: options.staleTime ?? 5 * 60 * 1000,
    refetchInterval: options.refetchInterval,
  });
}

export function useContentItem<T>(
  endpoint: string,
  queryKey: string[],
  enabled = true
) {
  const { isAuthenticated } = useDevAuth();
  const client = useTenantServiceClient();
  
  return useQuery({
    queryKey,
    queryFn: async () => {
      const response = await client.get<ApiResponse<T>>(endpoint);
      return extractData(response);
    },
    enabled: enabled && isAuthenticated,
  });
}

// Health check hook for development
export function useApiHealth() {
  const client = useTenantServiceClient();
  
  return useQuery({
    queryKey: ['api-health'],
    queryFn: () => client.healthCheck(),
    staleTime: 30 * 1000, // 30 seconds
    retry: 2,
    refetchOnMount: true,
  });
}

// Development utilities hook
export function useDevUtilities() {
  const { tenantId, user, isAuthenticated, simulateLogin, switchTenant } = useDevAuth();
  const queryClient = useQueryClient();
  
  const clearAllCaches = () => {
    queryClient.clear();
    console.log('🗑️ All React Query caches cleared');
  };
  
  const invalidateContentCaches = () => {
    queryClient.invalidateQueries({ 
      predicate: (query) => {
        return query.queryKey[0] && typeof query.queryKey[0] === 'string' && 
               ['toolset', 'lab', 'dashboard', 'community', 'education'].includes(query.queryKey[0]);
      }
    });
    console.log('🔄 Content caches invalidated');
  };
  
  const switchDevTenant = (newTenantId: string) => {
    switchTenant(newTenantId);
    // Clear caches when switching tenants
    setTimeout(() => {
      clearAllCaches();
    }, 100);
  };
  
  return {
    // Current state
    tenantId,
    user,
    isAuthenticated,
    
    // Dev actions
    simulateLogin,
    switchTenant: switchDevTenant,
    
    // Cache management
    clearAllCaches,
    invalidateContentCaches,
    
    // Quick access to query client
    queryClient
  };
}