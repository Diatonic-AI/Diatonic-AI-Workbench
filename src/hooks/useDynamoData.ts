import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contentService } from '../lib/content-service';
import type {
  ToolsetItem,
  LabExperiment,
  DashboardMetric,
  CommunityPost,
  EducationCourse
} from '../lib/content-service';

// Re-export types for convenience
export type {
  ToolsetItem,
  LabExperiment,
  DashboardMetric,
  CommunityPost,
  EducationCourse
} from '../lib/content-service';

// Custom hooks for each data type
export function useToolsetItems() {
  return useQuery({
    queryKey: ['toolset-items'],
    queryFn: () => contentService.getToolsetItems(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

export function useLabExperiments(filters?: { status?: string }) {
  return useQuery({
    queryKey: ['lab-experiments', filters],
    queryFn: () => contentService.getLabExperiments(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
  });
}

export function useDashboardMetrics(tenantId: string = 'dev-tenant') {
  return useQuery({
    queryKey: ['dashboard-metrics', tenantId],
    queryFn: () => contentService.getDashboardMetrics(tenantId),
    staleTime: 1 * 60 * 1000, // 1 minute - fresher for dashboard
    retry: 2,
  });
}

export function useCommunityPosts(filters?: { category?: string; published?: boolean }) {
  return useQuery({
    queryKey: ['community-posts', filters],
    queryFn: () => contentService.getCommunityPosts(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

export function useEducationCourses(filters?: { difficulty?: string; published?: boolean }) {
  return useQuery({
    queryKey: ['education-courses', filters],
    queryFn: () => contentService.getEducationCourses(filters),
    staleTime: 10 * 60 * 1000, // 10 minutes - courses change less frequently
    retry: 2,
  });
}

// Mutation hooks for write operations
export function useCreateToolsetItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (item: Omit<ToolsetItem, 'created_at' | 'updated_at'>) => 
      contentService.createToolsetItem(item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['toolset-items'] });
    },
  });
}

export function useUpdateToolsetItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ tool_id, updates }: { tool_id: string; updates: Partial<ToolsetItem> }) =>
      contentService.updateToolsetItem(tool_id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['toolset-items'] });
    },
  });
}

export function useCreateLabExperiment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (experiment: Omit<LabExperiment, 'created_at' | 'updated_at'>) =>
      contentService.createLabExperiment(experiment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lab-experiments'] });
    },
  });
}

// Generic hook for any DynamoDB operation with error handling
export function useDynamoOperation<T>(
  operationFn: () => Promise<T>,
  queryKey: string[],
  options?: {
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
    enabled?: boolean;
  }
) {
  return useQuery({
    queryKey,
    queryFn: operationFn,
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors
      if (error.message.includes('4')) return false;
      return failureCount < 3;
    },
  });
}

// Loading states hook
export function useLoadingStates() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setSuccess(false);
  }, []);

  const executeAsync = useCallback(async <T>(
    operation: () => Promise<T>
  ): Promise<T | null> => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await operation();
      setSuccess(true);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    success,
    reset,
    executeAsync,
  };
}

// Pagination hook for large datasets
export function usePagination<T>(
  data: T[] | undefined,
  itemsPerPage: number = 10
) {
  const [currentPage, setCurrentPage] = useState(1);

  const totalItems = data?.length || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = data?.slice(startIndex, endIndex) || [];

  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  }, [totalPages]);

  const nextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);

  const prevPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  const reset = useCallback(() => {
    setCurrentPage(1);
  }, []);

  return {
    currentPage,
    totalPages,
    totalItems,
    currentItems,
    goToPage,
    nextPage,
    prevPage,
    reset,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
  };
}