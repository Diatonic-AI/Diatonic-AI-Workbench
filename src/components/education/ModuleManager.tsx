import React, { useState, useEffect } from 'react';
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Upload, 
  FileText, 
  Video, 
  Image, 
  Clock, 
  User, 
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';

// Types
interface Module {
  module_id: string;
  organization_id: string;
  title: string;
  description: string;
  content_type: 'video' | 'interactive' | 'text' | 'mixed';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimated_duration: number;
  prerequisites: string[];
  learning_objectives: string[];
  content_url?: string;
  thumbnail_url?: string;
  tags: string[];
  status: 'draft' | 'review' | 'published' | 'archived';
  created_by: string;
  version: string;
  created_at: string;
  updated_at: string;
  metrics: {
    views: number;
    completions: number;
    rating: number;
    rating_count: number;
  };
}

interface ModuleFormData {
  title: string;
  description: string;
  content_type: 'video' | 'interactive' | 'text' | 'mixed';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimated_duration: number;
  prerequisites: string[];
  learning_objectives: string[];
  tags: string[];
}

// Mock API service (replace with actual API calls)
const moduleService = {
  async getModules(status?: string): Promise<{ modules: Module[]; count: number }> {
    // This would call your actual API
    return {
      modules: [],
      count: 0
    };
  },

  async createModule(data: ModuleFormData): Promise<Module> {
    const response = await fetch('/api/education/modules', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error('Failed to create module');
    }
    
    return response.json();
  },

  async updateModule(moduleId: string, data: Partial<ModuleFormData>): Promise<Module> {
    const response = await fetch(`/api/education/modules/${moduleId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error('Failed to update module');
    }
    
    return response.json();
  },

  async deleteModule(moduleId: string): Promise<void> {
    const response = await fetch(`/api/education/modules/${moduleId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete module');
    }
  },

  async getUploadUrl(moduleId: string, filename: string, contentType: string, fileSize: number) {
    const response = await fetch(`/api/education/modules/${moduleId}/upload-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify({ filename, contentType, fileSize })
    });
    
    if (!response.ok) {
      throw new Error('Failed to get upload URL');
    }
    
    return response.json();
  },

  async confirmUpload(moduleId: string, contentUrl: string, thumbnailUrl?: string) {
    const response = await fetch(`/api/education/modules/${moduleId}/confirm-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
      },
      body: JSON.stringify({ contentUrl, thumbnailUrl })
    });
    
    if (!response.ok) {
      throw new Error('Failed to confirm upload');
    }
    
    return response.json();
  }
};

// Module Form Component
const ModuleForm: React.FC<{
  module?: Module;
  onSubmit: (data: ModuleFormData) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}> = ({ module, onSubmit, onCancel, isSubmitting }) => {
  const [formData, setFormData] = useState<ModuleFormData>({
    title: module?.title || '',
    description: module?.description || '',
    content_type: module?.content_type || 'mixed',
    difficulty: module?.difficulty || 'beginner',
    estimated_duration: module?.estimated_duration || 0,
    prerequisites: module?.prerequisites || [],
    learning_objectives: module?.learning_objectives || [],
    tags: module?.tags || []
  });

  const [tagsInput, setTagsInput] = useState('');
  const [objectivesInput, setObjectivesInput] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error('Title and description are required');
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      toast.error('Failed to save module');
    }
  };

  const addTag = () => {
    if (tagsInput.trim() && !formData.tags.includes(tagsInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagsInput.trim()]
      }));
      setTagsInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const addObjective = () => {
    if (objectivesInput.trim() && !formData.learning_objectives.includes(objectivesInput.trim())) {
      setFormData(prev => ({
        ...prev,
        learning_objectives: [...prev.learning_objectives, objectivesInput.trim()]
      }));
      setObjectivesInput('');
    }
  };

  const removeObjective = (objToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      learning_objectives: prev.learning_objectives.filter(obj => obj !== objToRemove)
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Enter module title"
            required
          />
        </div>
        <div>
          <Label htmlFor="duration">Duration (minutes)</Label>
          <Input
            id="duration"
            type="number"
            value={formData.estimated_duration}
            onChange={(e) => setFormData(prev => ({ ...prev, estimated_duration: parseInt(e.target.value) || 0 }))}
            placeholder="0"
            min="0"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Describe the module content and objectives"
          rows={3}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="content_type">Content Type</Label>
          <Select 
            value={formData.content_type} 
            onValueChange={(value: any) => setFormData(prev => ({ ...prev, content_type: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select content type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="video">Video</SelectItem>
              <SelectItem value="interactive">Interactive</SelectItem>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="mixed">Mixed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="difficulty">Difficulty</Label>
          <Select 
            value={formData.difficulty} 
            onValueChange={(value: any) => setFormData(prev => ({ ...prev, difficulty: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Tags</Label>
        <div className="flex gap-2 mb-2">
          <Input
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="Add a tag"
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
          />
          <Button type="button" onClick={addTag} variant="outline" size="sm">
            Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {formData.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
              {tag} ×
            </Badge>
          ))}
        </div>
      </div>

      <div>
        <Label>Learning Objectives</Label>
        <div className="flex gap-2 mb-2">
          <Input
            value={objectivesInput}
            onChange={(e) => setObjectivesInput(e.target.value)}
            placeholder="Add a learning objective"
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addObjective())}
          />
          <Button type="button" onClick={addObjective} variant="outline" size="sm">
            Add
          </Button>
        </div>
        <ul className="space-y-1">
          {formData.learning_objectives.map((obj, index) => (
            <li key={index} className="flex items-center gap-2 text-sm bg-muted p-2 rounded">
              <span>• {obj}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeObjective(obj)}
                className="ml-auto h-6 w-6 p-0"
              >
                ×
              </Button>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : (module ? 'Update' : 'Create')} Module
        </Button>
      </div>
    </form>
  );
};

// Content Upload Component
const ContentUpload: React.FC<{
  module: Module;
  onUploadComplete: () => void;
}> = ({ module, onUploadComplete }) => {
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploadState('uploading');
      setUploadProgress(0);

      // Get presigned URL
      const uploadInfo = await moduleService.getUploadUrl(
        module.module_id,
        selectedFile.name,
        selectedFile.type,
        selectedFile.size
      );

      // Upload to S3
      const uploadResponse = await fetch(uploadInfo.uploadUrl, {
        method: 'PUT',
        body: selectedFile,
        headers: {
          'Content-Type': selectedFile.type
        }
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      setUploadProgress(100);

      // Confirm upload
      await moduleService.confirmUpload(module.module_id, uploadInfo.downloadUrl);

      setUploadState('success');
      toast.success('Upload completed successfully');
      onUploadComplete();
    } catch (error) {
      setUploadState('error');
      toast.error('Upload failed');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="file">Select Content File</Label>
        <Input
          id="file"
          type="file"
          onChange={handleFileSelect}
          accept="video/*,image/*,.pdf,.txt,.md"
        />
        <p className="text-sm text-muted-foreground mt-1">
          Supported: Videos (MP4, WebM, MOV), Images (JPEG, PNG, GIF), Documents (PDF, TXT, MD)
        </p>
      </div>

      {uploadState === 'uploading' && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button 
          onClick={handleUpload} 
          disabled={!selectedFile || uploadState === 'uploading'}
          className="flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          {uploadState === 'uploading' ? 'Uploading...' : 'Upload Content'}
        </Button>
      </div>

      {uploadState === 'success' && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Content uploaded successfully!
          </AlertDescription>
        </Alert>
      )}

      {uploadState === 'error' && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            Upload failed. Please try again.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

// Main Module Manager Component
export const ModuleManager: React.FC = () => {
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadModules();
  }, [statusFilter]);

  const loadModules = async () => {
    try {
      setLoading(true);
      const result = await moduleService.getModules(statusFilter === 'all' ? undefined : statusFilter);
      setModules(result.modules);
    } catch (error) {
      toast.error('Failed to load modules');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateModule = async (data: ModuleFormData) => {
    setIsSubmitting(true);
    try {
      const newModule = await moduleService.createModule(data);
      setModules(prev => [newModule, ...prev]);
      setShowCreateDialog(false);
      toast.success('Module created successfully');
    } catch (error) {
      toast.error('Failed to create module');
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateModule = async (data: ModuleFormData) => {
    if (!selectedModule) return;
    
    setIsSubmitting(true);
    try {
      const updatedModule = await moduleService.updateModule(selectedModule.module_id, data);
      setModules(prev => prev.map(m => m.module_id === updatedModule.module_id ? updatedModule : m));
      setShowEditDialog(false);
      setSelectedModule(null);
      toast.success('Module updated successfully');
    } catch (error) {
      toast.error('Failed to update module');
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteModule = async (module: Module) => {
    if (!confirm('Are you sure you want to delete this module?')) return;
    
    try {
      await moduleService.deleteModule(module.module_id);
      setModules(prev => prev.filter(m => m.module_id !== module.module_id));
      toast.success('Module deleted successfully');
    } catch (error) {
      toast.error('Failed to delete module');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'draft':
        return <FileText className="w-4 h-4 text-gray-600" />;
      case 'review':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'archived':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getContentTypeIcon = (contentType: string) => {
    switch (contentType) {
      case 'video':
        return <Video className="w-4 h-4" />;
      case 'text':
        return <FileText className="w-4 h-4" />;
      case 'interactive':
        return <Image className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Module Manager</h1>
          <p className="text-muted-foreground">Create and manage AI education modules</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Module
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Module</DialogTitle>
              <DialogDescription>
                Create a new AI education module that can be used across courses
              </DialogDescription>
            </DialogHeader>
            <ModuleForm
              onSubmit={handleCreateModule}
              onCancel={() => setShowCreateDialog(false)}
              isSubmitting={isSubmitting}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-center">
            <Label>Filter by status:</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modules</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Modules Table */}
      <Card>
        <CardHeader>
          <CardTitle>Modules ({modules.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading modules...</div>
          ) : modules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No modules found. Create your first module to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Difficulty</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Views</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modules.map((module) => (
                  <TableRow key={module.module_id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{module.title}</div>
                        <div className="text-sm text-muted-foreground">
                          {module.description.substring(0, 60)}...
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getContentTypeIcon(module.content_type)}
                        <span className="capitalize">{module.content_type}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {module.difficulty}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {module.estimated_duration}m
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(module.status)}
                        <span className="capitalize">{module.status}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        {module.metrics.views}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {new Date(module.created_at).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedModule(module);
                            setShowEditDialog(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedModule(module);
                            setShowUploadDialog(true);
                          }}
                        >
                          <Upload className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteModule(module)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Module Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Module</DialogTitle>
            <DialogDescription>
              Update the module information and settings
            </DialogDescription>
          </DialogHeader>
          {selectedModule && (
            <ModuleForm
              module={selectedModule}
              onSubmit={handleUpdateModule}
              onCancel={() => {
                setShowEditDialog(false);
                setSelectedModule(null);
              }}
              isSubmitting={isSubmitting}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Upload Content Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Content</DialogTitle>
            <DialogDescription>
              Upload content for: {selectedModule?.title}
            </DialogDescription>
          </DialogHeader>
          {selectedModule && (
            <ContentUpload
              module={selectedModule}
              onUploadComplete={() => {
                setShowUploadDialog(false);
                setSelectedModule(null);
                loadModules();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};