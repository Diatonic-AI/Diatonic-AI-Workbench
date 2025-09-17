/**
 * Express API Server for Local Development
 * Provides REST endpoints for the AI Nexus Workbench
 */

import express from 'express';
import cors from 'cors';
import { apiRoutes } from './routes';
import {
  createExpressAuthMiddleware,
  securityHeaders,
  rateLimit,
  securityLogging,
  sanitizeInput
} from './middleware/security';

const app = express();
const PORT = process.env.API_PORT || 3001;

// CORS configuration
app.use(cors({
  origin: ['http://localhost:8083', 'http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply authentication middleware (temporarily isolated for debugging)
const authMiddleware = createExpressAuthMiddleware();
app.use(authMiddleware);

// Health check route
app.get('/api/health', apiRoutes.healthCheck);

// Toolset Items routes
app.get('/api/toolset-items', apiRoutes.getToolsetItems);
app.post('/api/toolset-items', apiRoutes.createToolsetItem);
app.put('/api/toolset-items/:toolId', apiRoutes.updateToolsetItem);

// Lab Experiments routes
app.get('/api/lab-experiments', apiRoutes.getLabExperiments);
app.post('/api/lab-experiments', apiRoutes.createLabExperiment);

// Dashboard Metrics routes
app.get('/api/dashboard-metrics', apiRoutes.getDashboardMetrics);

// Community Posts routes
app.get('/api/community-posts', apiRoutes.getCommunityPosts);

// Education Courses routes
app.get('/api/education-courses', apiRoutes.getEducationCourses);

// Batch data route
app.get('/api/batch', apiRoutes.getBatchData);

// Statistics route
app.get('/api/statistics', apiRoutes.getStatistics);

// Root API info
app.get('/api', (req, res) => {
  res.json({
    name: 'AI Nexus Workbench API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      health: '/api/health',
      toolset: '/api/toolset-items',
      experiments: '/api/lab-experiments',
      metrics: '/api/dashboard-metrics',
      posts: '/api/community-posts',
      courses: '/api/education-courses',
      batch: '/api/batch?types=toolset,experiments,metrics',
      statistics: '/api/statistics'
    },
    database: {
      type: 'DynamoDB Local',
      endpoint: 'http://localhost:8002',
      tenant: 'dev-tenant'
    },
    timestamp: new Date().toISOString()
  });
});

// 404 handler - use catch-all middleware without route pattern
app.use((req, res, next) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
    status: 404,
    timestamp: new Date().toISOString()
  });
});

// Error handler (must be last)
app.use(apiRoutes.errorHandler);

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 AI Nexus Workbench API Server running on port ${PORT}`);
  console.log(`📍 API Base URL: http://localhost:${PORT}/api`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`📊 Statistics: http://localhost:${PORT}/api/statistics`);
  console.log('');
  console.log('📋 Available Endpoints:');
  console.log(`  GET  /api/health                - Service health check`);
  console.log(`  GET  /api/toolset-items         - List toolset items`);
  console.log(`  POST /api/toolset-items         - Create toolset item`);
  console.log(`  PUT  /api/toolset-items/:id     - Update toolset item`);
  console.log(`  GET  /api/lab-experiments       - List experiments`);
  console.log(`  POST /api/lab-experiments       - Create experiment`);
  console.log(`  GET  /api/dashboard-metrics     - List dashboard metrics`);
  console.log(`  GET  /api/community-posts       - List community posts`);
  console.log(`  GET  /api/education-courses     - List education courses`);
  console.log(`  GET  /api/batch                 - Batch data fetch`);
  console.log(`  GET  /api/statistics            - System statistics`);
  console.log('');
  console.log('🌐 CORS enabled for:');
  console.log('  - http://localhost:8083 (Vite dev server)');
  console.log('  - http://localhost:3000 (React dev server)');
  console.log('  - http://localhost:5173 (Vite alternate port)');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ API server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ API server closed');
    process.exit(0);
  });
});

export default app;