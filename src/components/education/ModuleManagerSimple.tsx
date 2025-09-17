import React, { useState } from 'react';
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
  Plus, 
  Edit, 
  Trash2, 
  Upload, 
  Clock, 
  User, 
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  useEducationModules, 
  useCreateModule, 
  useUpdateModule, 
  useDeleteModule, 
  useUploadModuleContent,
  type EducationModule,
  type CreateModuleRequest 
} from '@/hooks/useEducationModules';

// Create Module Form
interface ModuleFormProps {
  module?: EducationModule | null;
  onSubmit: (data: CreateModuleRequest) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

const ModuleForm: React.FC<ModuleFormProps> = ({ module, onSubmit, onCancel, isSubmitting }) => {
  const [formData, setFormData] = useState<CreateModuleRequest>({
    title: module?.title || '',
    description: module?.description || '',
    category: module?.category || 'fundamentals',
    level: module?.level || 'beginner',
    estimatedDuration: module?.estimatedDuration || 60,
    tags: module?.tags || [],
    isPublished: module?.isPublished || false,
  });

  const [tagsInput, setTagsInput] = useState(module?.tags?.join(', ') || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      tags: tagsInput.split(',').map(tag => tag.trim()).filter(Boolean),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Enter module title"
          required
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Enter module description"
          rows={3}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="category">Category</Label>
          <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fundamentals">AI Fundamentals</SelectItem>
              <SelectItem value="machine-learning">Machine Learning</SelectItem>
              <SelectItem value="advanced">Advanced Topics</SelectItem>
              <SelectItem value="practical">Practical Applications</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="level">Difficulty Level</Label>
          <Select value={formData.level} onValueChange={(value: 'beginner' | 'intermediate' | 'advanced') => setFormData({ ...formData, level: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select level" />
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
        <Label htmlFor="duration">Estimated Duration (minutes)</Label>
        <Input
          id="duration"
          type="number"
          value={formData.estimatedDuration}
          onChange={(e) => setFormData({ ...formData, estimatedDuration: parseInt(e.target.value) || 0 })}
          placeholder="60"
          min="1"
          required
        />
      </div>

      <div>
        <Label htmlFor="tags">Tags (comma separated)</Label>
        <Input
          id="tags"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="ai, machine learning, beginner"
        />
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="published"
          checked={formData.isPublished}
          onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
          className="rounded"
        />
        <Label htmlFor="published">Published (visible to students)</Label>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {module ? 'Updating...' : 'Creating...'}
            </>
          ) : (
            module ? 'Update Module' : 'Create Module'
          )}
        </Button>
      </DialogFooter>
    </form>
  );
};

// Upload Content Dialog
interface UploadDialogProps {
  module: EducationModule;
  isOpen: boolean;
  onClose: () => void;
}

const UploadDialog: React.FC<UploadDialogProps> = ({ module, isOpen, onClose }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const uploadMutation = useUploadModuleContent();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 100MB)
      if (file.size > 100 * 1024 * 1024) {
        toast.error('File size must be less than 100MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      await uploadMutation.mutateAsync({
        moduleId: module.moduleId,
        file: selectedFile,
        onUploadProgress: setUploadProgress,
      });
      toast.success('Content uploaded successfully!');
      onClose();
      setSelectedFile(null);
      setUploadProgress(0);
    } catch (error) {
      toast.error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload Content - {module.title}</DialogTitle>
          <DialogDescription>
            Upload videos, documents, or other learning materials for this module.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="file-upload">Select File</Label>
            <Input
              id="file-upload"
              type="file"
              onChange={handleFileSelect}
              accept=".mp4,.mov,.pdf,.docx,.pptx,.zip"
              className="cursor-pointer"
            />
            <p className="text-sm text-gray-500 mt-1">
              Supported formats: MP4, MOV, PDF, DOCX, PPTX, ZIP (max 100MB)
            </p>
          </div>

          {selectedFile && (
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-gray-500">
                    {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                  </p>
                </div>
              </div>
            </div>
          )}

          {uploadMutation.isPending && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={uploadMutation.isPending}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpload} 
            disabled={!selectedFile || uploadMutation.isPending}
          >
            {uploadMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload Content
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Main ModuleManager Component
const ModuleManagerSimple: React.FC = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingModule, setEditingModule] = useState<EducationModule | null>(null);
  const [uploadModule, setUploadModule] = useState<EducationModule | null>(null);

  // Hooks
  const { data: modules = [], isLoading, error } = useEducationModules();
  const createMutation = useCreateModule();
  const updateMutation = useUpdateModule();
  const deleteMutation = useDeleteModule();

  const handleCreateModule = async (data: CreateModuleRequest) => {
    try {
      await createMutation.mutateAsync(data);
      toast.success('Module created successfully!');
      setIsCreateDialogOpen(false);
    } catch (error) {
      toast.error(`Failed to create module: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleUpdateModule = async (data: CreateModuleRequest) => {
    if (!editingModule) return;
    
    try {
      await updateMutation.mutateAsync({
        moduleId: editingModule.moduleId,
        ...data,
      });
      toast.success('Module updated successfully!');
      setEditingModule(null);
    } catch (error) {
      toast.error(`Failed to update module: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDeleteModule = async (moduleId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(moduleId);
      toast.success('Module deleted successfully!');
    } catch (error) {
      toast.error(`Failed to delete module: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading modules...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load modules. Please check your connection and try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Module Management</h2>
          <p className="text-gray-600">Create and manage AI education modules</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Module
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Module</DialogTitle>
              <DialogDescription>
                Create a new educational module for students to learn from.
              </DialogDescription>
            </DialogHeader>
            <ModuleForm
              onSubmit={handleCreateModule}
              onCancel={() => setIsCreateDialogOpen(false)}
              isSubmitting={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {modules.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No modules yet</h3>
            <p className="text-gray-600 mb-4">Create your first educational module to get started.</p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create First Module
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((module) => (
            <Card key={module.moduleId} className="group hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-2">{module.title}</CardTitle>
                    <CardDescription className="mt-2 line-clamp-3">
                      {module.description}
                    </CardDescription>
                  </div>
                  <Badge variant={module.isPublished ? "default" : "secondary"}>
                    {module.isPublished ? "Published" : "Draft"}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {module.estimatedDuration} min
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {module.level}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-1" />
                    {new Date(module.createdAt).toLocaleDateString()}
                  </div>

                  {module.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {module.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {module.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{module.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>

              <CardFooter className="pt-0">
                <div className="flex w-full gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingModule(module)}
                    className="flex-1"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setUploadModule(module)}
                    className="flex-1"
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    Content
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteModule(module.moduleId, module.title)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Module Dialog */}
      <Dialog open={!!editingModule} onOpenChange={() => setEditingModule(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Module</DialogTitle>
            <DialogDescription>
              Update the module information and settings.
            </DialogDescription>
          </DialogHeader>
          {editingModule && (
            <ModuleForm
              module={editingModule}
              onSubmit={handleUpdateModule}
              onCancel={() => setEditingModule(null)}
              isSubmitting={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Upload Content Dialog */}
      {uploadModule && (
        <UploadDialog
          module={uploadModule}
          isOpen={!!uploadModule}
          onClose={() => setUploadModule(null)}
        />
      )}
    </div>
  );
};

export default ModuleManagerSimple;