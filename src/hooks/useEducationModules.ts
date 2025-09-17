import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_AWS_API_GATEWAY_ENDPOINT || 'https://your-api-id.execute-api.us-east-2.amazonaws.com/prod';

export interface EducationModule {
  moduleId: string;
  tenantId: string;
  title: string;
  description: string;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  estimatedDuration: number; // in minutes
  contentUrl?: string;
  tags: string[];
  isPublished: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  enrollmentCount?: number;
  rating?: number;
}

export interface CreateModuleRequest {
  title: string;
  description: string;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  estimatedDuration: number;
  tags: string[];
  isPublished?: boolean;
}

export interface UpdateModuleRequest extends Partial<CreateModuleRequest> {
  moduleId: string;
}

export interface PresignedUploadResponse {
  uploadUrl: string;
  contentUrl: string;
  fields?: Record<string, string>;
}

// API functions
const educationModulesAPI = {
  async getAllModules(authToken: string): Promise<EducationModule[]> {
    const response = await fetch(`${API_BASE_URL}/education/modules`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch modules: ${response.status}`);
    }
    
    const data = await response.json();
    return data.modules || [];
  },

  async getModule(moduleId: string, authToken: string): Promise<EducationModule> {
    const response = await fetch(`${API_BASE_URL}/education/modules/${moduleId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch module: ${response.status}`);
    }
    
    return response.json();
  },

  async createModule(module: CreateModuleRequest, authToken: string): Promise<EducationModule> {
    const response = await fetch(`${API_BASE_URL}/education/modules`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(module),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to create module: ${response.status}`);
    }
    
    return response.json();
  },

  async updateModule(update: UpdateModuleRequest, authToken: string): Promise<EducationModule> {
    const { moduleId, ...updateData } = update;
    const response = await fetch(`${API_BASE_URL}/education/modules/${moduleId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to update module: ${response.status}`);
    }
    
    return response.json();
  },

  async deleteModule(moduleId: string, authToken: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/education/modules/${moduleId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to delete module: ${response.status}`);
    }
  },

  async getPresignedUploadUrl(moduleId: string, fileName: string, contentType: string, authToken: string): Promise<PresignedUploadResponse> {
    const response = await fetch(`${API_BASE_URL}/education/modules/${moduleId}/upload-url`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileName,
        contentType,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to get upload URL: ${response.status}`);
    }
    
    return response.json();
  },

  async uploadContent(uploadUrl: string, file: File, fields?: Record<string, string>): Promise<void> {
    if (fields) {
      // S3 POST upload with form data
      const formData = new FormData();
      Object.entries(fields).forEach(([key, value]) => {
        formData.append(key, value);
      });
      formData.append('file', file);
      
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`Failed to upload content: ${response.status}`);
      }
    } else {
      // Direct PUT upload
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to upload content: ${response.status}`);
      }
    }
  },
};

// Custom hooks
export const useEducationModules = () => {
  const { user, getAuthToken } = useAuth();
  
  return useQuery({
    queryKey: ['education-modules'],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');
      const token = await getAuthToken();
      return educationModulesAPI.getAllModules(token);
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useEducationModule = (moduleId: string) => {
  const { user, getAuthToken } = useAuth();
  
  return useQuery({
    queryKey: ['education-module', moduleId],
    queryFn: async () => {
      if (!user) throw new Error('User not authenticated');
      const token = await getAuthToken();
      return educationModulesAPI.getModule(moduleId, token);
    },
    enabled: !!user && !!moduleId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateModule = () => {
  const { user, getAuthToken } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (module: CreateModuleRequest) => {
      if (!user) throw new Error('User not authenticated');
      const token = await getAuthToken();
      return educationModulesAPI.createModule(module, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['education-modules'] });
    },
  });
};

export const useUpdateModule = () => {
  const { user, getAuthToken } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (update: UpdateModuleRequest) => {
      if (!user) throw new Error('User not authenticated');
      const token = await getAuthToken();
      return educationModulesAPI.updateModule(update, token);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['education-modules'] });
      queryClient.invalidateQueries({ queryKey: ['education-module', data.moduleId] });
    },
  });
};

export const useDeleteModule = () => {
  const { user, getAuthToken } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (moduleId: string) => {
      if (!user) throw new Error('User not authenticated');
      const token = await getAuthToken();
      return educationModulesAPI.deleteModule(moduleId, token);
    },
    onSuccess: (_, moduleId) => {
      queryClient.invalidateQueries({ queryKey: ['education-modules'] });
      queryClient.removeQueries({ queryKey: ['education-module', moduleId] });
    },
  });
};

export const useUploadModuleContent = () => {
  const { user, getAuthToken } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      moduleId, 
      file, 
      onUploadProgress 
    }: { 
      moduleId: string; 
      file: File; 
      onUploadProgress?: (progress: number) => void;
    }) => {
      if (!user) throw new Error('User not authenticated');
      const token = await getAuthToken();
      
      // Step 1: Get presigned upload URL
      const uploadResponse = await educationModulesAPI.getPresignedUploadUrl(
        moduleId, 
        file.name, 
        file.type, 
        token
      );
      
      // Step 2: Upload file to S3
      await educationModulesAPI.uploadContent(
        uploadResponse.uploadUrl, 
        file, 
        uploadResponse.fields
      );
      
      // Step 3: Update module with content URL (if needed)
      if (uploadResponse.contentUrl) {
        await educationModulesAPI.updateModule({
          moduleId,
          contentUrl: uploadResponse.contentUrl
        }, token);
      }
      
      return uploadResponse;
    },
    onSuccess: (_, { moduleId }) => {
      queryClient.invalidateQueries({ queryKey: ['education-modules'] });
      queryClient.invalidateQueries({ queryKey: ['education-module', moduleId] });
    },
  });
};

// Export the API for direct use if needed
export { educationModulesAPI };