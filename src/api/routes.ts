/**
 * API Routes for DynamoDB Data Access
 * Provides REST endpoints for frontend consumption
 */

import { Request, Response, NextFunction } from 'express';
import { contentService } from '../lib/content-service';
import type {
  ToolsetItem,
  LabExperiment,
  DashboardMetric,
  CommunityPost,
  EducationCourse
} from '../lib/content-service';

// Error handler middleware
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('API Error:', err);
  
  if (err.message.includes('ValidationException')) {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message,
      status: 400
    });
  }
  
  if (err.message.includes('ResourceNotFoundException')) {
    return res.status(404).json({
      error: 'Resource Not Found',
      message: err.message,
      status: 404
    });
  }
  
  return res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    status: 500
  });
};

// Health check endpoint
export const healthCheck = async (req: Request, res: Response) => {
  try {
    const isHealthy = await contentService.healthCheck();
    
    if (isHealthy) {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          dynamodb: 'connected',
          contentService: 'operational'
        }
      });
    } else {
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        services: {
          dynamodb: 'disconnected',
          contentService: 'degraded'
        }
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Toolset Items Endpoints
export const getToolsetItems = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await contentService.getToolsetItems();
    
    res.json({
      data: items,
      count: items.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

export const createToolsetItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const itemData: Omit<ToolsetItem, 'created_at' | 'updated_at'> = req.body;
    
    // Validate required fields
    if (!itemData.tool_id || !itemData.name || !itemData.category) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['tool_id', 'name', 'category'],
        status: 400
      });
    }
    
    const newItem = await contentService.createToolsetItem(itemData);
    
    res.status(201).json({
      data: newItem,
      message: 'Toolset item created successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

export const updateToolsetItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { toolId } = req.params;
    const updates: Partial<ToolsetItem> = req.body;
    
    const updatedItem = await contentService.updateToolsetItem(toolId, updates);
    
    res.json({
      data: updatedItem,
      message: 'Toolset item updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

// Lab Experiments Endpoints
export const getLabExperiments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.query;
    const filters = status ? { status: status as string } : undefined;
    
    const experiments = await contentService.getLabExperiments(filters);
    
    res.json({
      data: experiments,
      count: experiments.length,
      filters: filters || {},
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

export const createLabExperiment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const experimentData: Omit<LabExperiment, 'created_at' | 'updated_at' | 'tenant_id'> = req.body;
    
    // Validate required fields
    if (!experimentData.experiment_id || !experimentData.name || !experimentData.version) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['experiment_id', 'name', 'version'],
        status: 400
      });
    }
    
    const newExperiment = await contentService.createLabExperiment(experimentData);
    
    res.status(201).json({
      data: newExperiment,
      message: 'Lab experiment created successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

// Dashboard Metrics Endpoints
export const getDashboardMetrics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenant_id } = req.query;
    const tenantId = tenant_id as string || 'dev-tenant';
    
    const metrics = await contentService.getDashboardMetrics(tenantId);
    
    res.json({
      data: metrics,
      count: metrics.length,
      tenant_id: tenantId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

// Community Posts Endpoints
export const getCommunityPosts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category, published } = req.query;
    const filters: { category?: string; published?: boolean } = {};
    
    if (category) filters.category = category as string;
    if (published !== undefined) filters.published = published === 'true';
    
    const posts = await contentService.getCommunityPosts(Object.keys(filters).length > 0 ? filters : undefined);
    
    res.json({
      data: posts,
      count: posts.length,
      filters,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

// Education Courses Endpoints
export const getEducationCourses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { difficulty, published } = req.query;
    const filters: { difficulty?: string; published?: boolean } = {};
    
    if (difficulty) filters.difficulty = difficulty as string;
    if (published !== undefined) filters.published = published === 'true';
    
    const courses = await contentService.getEducationCourses(Object.keys(filters).length > 0 ? filters : undefined);
    
    res.json({
      data: courses,
      count: courses.length,
      filters,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

// Batch operations
export const getBatchData = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { types } = req.query;
    const requestedTypes = (types as string)?.split(',') || ['toolset', 'experiments', 'metrics'];
    
    const results: Record<string, any> = {};
    
    // Fetch requested data types in parallel
    const promises: Promise<void>[] = [];
    
    if (requestedTypes.includes('toolset')) {
      promises.push(
        contentService.getToolsetItems().then(data => {
          results.toolset = { data, count: data.length };
        })
      );
    }
    
    if (requestedTypes.includes('experiments')) {
      promises.push(
        contentService.getLabExperiments().then(data => {
          results.experiments = { data, count: data.length };
        })
      );
    }
    
    if (requestedTypes.includes('metrics')) {
      promises.push(
        contentService.getDashboardMetrics('dev-tenant').then(data => {
          results.metrics = { data, count: data.length };
        })
      );
    }
    
    if (requestedTypes.includes('posts')) {
      promises.push(
        contentService.getCommunityPosts().then(data => {
          results.posts = { data, count: data.length };
        })
      );
    }
    
    if (requestedTypes.includes('courses')) {
      promises.push(
        contentService.getEducationCourses().then(data => {
          results.courses = { data, count: data.length };
        })
      );
    }
    
    await Promise.all(promises);
    
    res.json({
      results,
      requestedTypes,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

// Statistics endpoint
export const getStatistics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Fetch all data types to generate statistics
    const [toolsetItems, experiments, metrics, posts, courses] = await Promise.all([
      contentService.getToolsetItems(),
      contentService.getLabExperiments(),
      contentService.getDashboardMetrics('dev-tenant'),
      contentService.getCommunityPosts(),
      contentService.getEducationCourses()
    ]);
    
    const statistics = {
      overview: {
        toolset_items: toolsetItems.length,
        lab_experiments: experiments.length,
        dashboard_metrics: metrics.length,
        community_posts: posts.length,
        education_courses: courses.length,
        total_records: toolsetItems.length + experiments.length + metrics.length + posts.length + courses.length
      },
      toolset: {
        total: toolsetItems.length,
        active: toolsetItems.filter(item => item.is_active).length,
        categories: [...new Set(toolsetItems.map(item => item.category))],
        by_category: toolsetItems.reduce((acc, item) => {
          acc[item.category] = (acc[item.category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      },
      experiments: {
        total: experiments.length,
        active: experiments.filter(exp => exp.status === 'active').length,
        completed: experiments.filter(exp => exp.status === 'completed').length,
        by_status: experiments.reduce((acc, exp) => {
          acc[exp.status] = (acc[exp.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      },
      community: {
        total: posts.length,
        published: posts.filter(post => post.is_published).length,
        categories: [...new Set(posts.map(post => post.category))],
        total_likes: posts.reduce((sum, post) => sum + post.likes_count, 0),
        total_comments: posts.reduce((sum, post) => sum + post.comments_count, 0)
      },
      education: {
        total: courses.length,
        published: courses.filter(course => course.is_published).length,
        difficulties: [...new Set(courses.map(course => course.difficulty_level))],
        average_rating: courses.reduce((sum, course) => sum + course.average_rating, 0) / courses.length,
        total_enrollments: courses.reduce((sum, course) => sum + course.enrollment_count, 0)
      }
    };
    
    res.json({
      statistics,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
};

// Export all route handlers
export const apiRoutes = {
  healthCheck,
  getToolsetItems,
  createToolsetItem,
  updateToolsetItem,
  getLabExperiments,
  createLabExperiment,
  getDashboardMetrics,
  getCommunityPosts,
  getEducationCourses,
  getBatchData,
  getStatistics,
  errorHandler
};