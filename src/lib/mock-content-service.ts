// Mock Content Service for Development and Fallback Data
import type { LandingPage, Feature, Testimonial, SEOMetadata } from './dynamodb-config';

export class MockContentService {
  private static mockData = {
    landingPages: {
      'toolset': {
        pageId: 'toolset',
        tenantId: 'default',
        title: 'AI Toolset',
        subtitle: 'Visual Agent Builder for Everyone',
        description: 'Create powerful AI agents with our intuitive drag-and-drop interface. No coding required - just connect, configure, and deploy intelligent automation solutions in minutes.',
        ctaText: 'Start Building Agents',
        ctaUrl: '/toolset',
        status: 'published' as const,
        version: 1,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        createdBy: 'system',
        updatedBy: 'system',
      },
      'lab': {
        pageId: 'lab',
        tenantId: 'default',
        title: 'AI Lab',
        subtitle: 'Experiment with Confidence',
        description: 'Push the boundaries of AI innovation in our secure cloud environment. Test cutting-edge models, run complex experiments, and iterate quickly with enterprise-grade infrastructure.',
        ctaText: 'Start Experimenting',
        ctaUrl: '/lab',
        status: 'published' as const,
        version: 1,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        createdBy: 'system',
        updatedBy: 'system',
      },
      'observatory': {
        pageId: 'observatory',
        tenantId: 'default',
        title: 'Observatory',
        subtitle: 'Intelligence Through Insights',
        description: 'Transform data into actionable intelligence with advanced analytics and visualization tools. Monitor performance, track trends, and make data-driven decisions across your AI ecosystem.',
        ctaText: 'Explore Analytics',
        ctaUrl: '/observatory',
        status: 'published' as const,
        version: 1,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        createdBy: 'system',
        updatedBy: 'system',
      },
      'community': {
        pageId: 'community',
        tenantId: 'default',
        title: 'Community Hub',
        subtitle: 'Connect. Learn. Grow.',
        description: 'Join a vibrant ecosystem of AI developers, researchers, and innovators. Share knowledge, collaborate on projects, and accelerate your AI journey with our global community.',
        ctaText: 'Join Community',
        ctaUrl: '/community',
        status: 'published' as const,
        version: 1,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        createdBy: 'system',
        updatedBy: 'system',
      },
      'education': {
        pageId: 'education',
        tenantId: 'default',
        title: 'Education Hub',
        subtitle: 'Learn AI Development the Right Way',
        description: 'Master AI development with our comprehensive learning platform. From beginner tutorials to advanced courses, get hands-on experience with real-world projects and expert guidance.',
        ctaText: 'Start Learning',
        ctaUrl: '/education',
        status: 'published' as const,
        version: 1,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        createdBy: 'system',
        updatedBy: 'system',
      }
    },

    features: {
      'toolset': [
        {
          featureId: 'f1',
          pageId: 'toolset',
          tenantId: 'default',
          title: 'Drag & Drop Interface',
          description: 'Build complex AI workflows with our intuitive visual editor',
          icon: 'drag-drop',
          benefits: ['No coding required', 'Visual workflow design', 'Real-time preview'],
          category: 'usability',
          order: 1,
          isHighlighted: true,
          isVisible: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          featureId: 'f2',
          pageId: 'toolset',
          tenantId: 'default',
          title: 'Pre-built Templates',
          description: 'Start with proven AI agent templates for common use cases',
          icon: 'template',
          benefits: ['Quick start templates', 'Industry-specific solutions', 'Best practices included'],
          category: 'productivity',
          order: 2,
          isHighlighted: false,
          isVisible: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          featureId: 'f3',
          pageId: 'toolset',
          tenantId: 'default',
          title: 'One-Click Deployment',
          description: 'Deploy your AI agents to production with a single click',
          icon: 'deploy',
          benefits: ['Instant deployment', 'Auto-scaling', 'Monitoring included'],
          category: 'deployment',
          order: 3,
          isHighlighted: false,
          isVisible: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ],
      'lab': [
        {
          featureId: 'f4',
          pageId: 'lab',
          tenantId: 'default',
          title: 'Model Marketplace',
          description: 'Access hundreds of pre-trained models and datasets',
          icon: 'marketplace',
          benefits: ['Latest AI models', 'Curated datasets', 'Community contributions'],
          category: 'resources',
          order: 1,
          isHighlighted: true,
          isVisible: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          featureId: 'f5',
          pageId: 'lab',
          tenantId: 'default',
          title: 'Experiment Tracking',
          description: 'Track experiments, compare results, and manage versions',
          icon: 'tracking',
          benefits: ['Version control', 'Result comparison', 'Reproducible experiments'],
          category: 'management',
          order: 2,
          isHighlighted: false,
          isVisible: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          featureId: 'f6',
          pageId: 'lab',
          tenantId: 'default',
          title: 'Collaborative Notebooks',
          description: 'Work together on experiments with shared Jupyter notebooks',
          icon: 'collaboration',
          benefits: ['Real-time collaboration', 'Shared environments', 'Code review tools'],
          category: 'collaboration',
          order: 3,
          isHighlighted: false,
          isVisible: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ],
      'observatory': [
        {
          featureId: 'f7',
          pageId: 'observatory',
          tenantId: 'default',
          title: 'Real-time Dashboards',
          description: 'Monitor your AI systems with customizable dashboards',
          icon: 'dashboard',
          benefits: ['Live monitoring', 'Custom metrics', 'Alert system'],
          category: 'monitoring',
          order: 1,
          isHighlighted: true,
          isVisible: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          featureId: 'f8',
          pageId: 'observatory',
          tenantId: 'default',
          title: 'Performance Analytics',
          description: 'Deep insights into model performance and optimization opportunities',
          icon: 'analytics',
          benefits: ['Performance metrics', 'Optimization suggestions', 'Trend analysis'],
          category: 'analytics',
          order: 2,
          isHighlighted: false,
          isVisible: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        }
      ]
    },

    testimonials: {
      'toolset': [
        {
          testimonialId: 't1',
          pageId: 'toolset',
          tenantId: 'default',
          customerName: 'Sarah Chen',
          customerTitle: 'Lead AI Engineer',
          customerCompany: 'TechFlow Solutions',
          content: 'The visual agent builder has revolutionized our workflow. We can now build complex AI solutions in hours instead of weeks.',
          rating: 5,
          isVerified: true,
          isFeatured: true,
          order: 1,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          testimonialId: 't2',
          pageId: 'toolset',
          tenantId: 'default',
          customerName: 'Marcus Johnson',
          customerTitle: 'Senior Developer',
          customerCompany: 'StartupAI',
          content: 'As someone without deep AI expertise, the drag-and-drop interface made it possible for me to create powerful automation tools.',
          rating: 5,
          isVerified: true,
          isFeatured: false,
          order: 2,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        }
      ],
      'lab': [
        {
          testimonialId: 't3',
          pageId: 'lab',
          tenantId: 'default',
          customerName: 'Dr. Michael Rodriguez',
          customerTitle: 'Research Director',
          customerCompany: 'Innovation Labs',
          content: 'AI Lab has accelerated our research by 300%. The experiment tracking and model marketplace are game-changers.',
          rating: 5,
          isVerified: true,
          isFeatured: true,
          order: 1,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        }
      ],
      'observatory': [
        {
          testimonialId: 't4',
          pageId: 'observatory',
          tenantId: 'default',
          customerName: 'Jennifer Park',
          customerTitle: 'Data Science Manager',
          customerCompany: 'DataDriven Inc',
          content: 'The analytics dashboard gives us unprecedented visibility into our AI performance. Essential for enterprise deployments.',
          rating: 5,
          isVerified: true,
          isFeatured: true,
          order: 1,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        }
      ]
    },

    seoMetadata: {
      'toolset': {
        pageId: 'toolset',
        tenantId: 'default',
        metaTitle: 'AI Toolset - Visual Agent Builder | Diatonic AI',
        metaDescription: 'Build powerful AI agents with our drag-and-drop visual interface. No coding required. Deploy intelligent automation solutions in minutes.',
        metaKeywords: ['AI agent builder', 'visual AI development', 'no-code AI', 'automation platform', 'drag-and-drop AI'],
        canonicalUrl: 'https://diatonic-ai.com/services/toolset',
        ogTitle: 'AI Toolset - Visual Agent Builder',
        ogDescription: 'Create powerful AI agents with our intuitive drag-and-drop interface. No coding required.',
        ogImage: '/og-images/toolset.jpg',
        languageCode: 'en-US',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      'lab': {
        pageId: 'lab',
        tenantId: 'default',
        metaTitle: 'AI Lab - Cloud Experimentation Platform | Diatonic AI',
        metaDescription: 'Experiment with cutting-edge AI models in our secure cloud environment. Test, iterate, and innovate with enterprise-grade infrastructure.',
        metaKeywords: ['AI experimentation', 'cloud AI lab', 'model testing', 'AI research platform', 'ML experiments'],
        canonicalUrl: 'https://diatonic-ai.com/services/lab',
        ogTitle: 'AI Lab - Experiment with Confidence',
        ogDescription: 'Push the boundaries of AI innovation in our secure cloud environment.',
        ogImage: '/og-images/lab.jpg',
        languageCode: 'en-US',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      'observatory': {
        pageId: 'observatory',
        tenantId: 'default',
        metaTitle: 'Observatory - AI Analytics & Visualization | Diatonic AI',
        metaDescription: 'Transform data into actionable intelligence with advanced analytics and visualization tools. Monitor AI performance and track trends.',
        metaKeywords: ['AI analytics', 'data visualization', 'performance monitoring', 'AI insights', 'business intelligence'],
        canonicalUrl: 'https://diatonic-ai.com/services/observatory',
        ogTitle: 'Observatory - Intelligence Through Insights',
        ogDescription: 'Transform data into actionable intelligence with advanced analytics and visualization tools.',
        ogImage: '/og-images/observatory.jpg',
        languageCode: 'en-US',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      'community': {
        pageId: 'community',
        tenantId: 'default',
        metaTitle: 'Community Hub - AI Developer Network | Diatonic AI',
        metaDescription: 'Join a vibrant ecosystem of AI developers, researchers, and innovators. Share knowledge, collaborate, and accelerate your AI journey.',
        metaKeywords: ['AI community', 'developer network', 'AI collaboration', 'knowledge sharing', 'AI forum'],
        canonicalUrl: 'https://diatonic-ai.com/services/community',
        ogTitle: 'Community Hub - Connect. Learn. Grow.',
        ogDescription: 'Join a vibrant ecosystem of AI developers, researchers, and innovators.',
        ogImage: '/og-images/community.jpg',
        languageCode: 'en-US',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      'education': {
        pageId: 'education',
        tenantId: 'default',
        metaTitle: 'Education Hub - AI Development Learning | Diatonic AI',
        metaDescription: 'Master AI development with our comprehensive learning platform. From beginner tutorials to advanced courses with hands-on experience.',
        metaKeywords: ['AI education', 'machine learning courses', 'AI tutorials', 'developer training', 'hands-on AI learning'],
        canonicalUrl: 'https://diatonic-ai.com/services/education',
        ogTitle: 'Education Hub - Learn AI Development the Right Way',
        ogDescription: 'Master AI development with our comprehensive learning platform.',
        ogImage: '/og-images/education.jpg',
        languageCode: 'en-US',
        updatedAt: '2024-01-01T00:00:00Z',
      }
    }
  };

  static async getLandingPage(pageId: string, tenantId: string = 'default'): Promise<LandingPage | null> {
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 100));
    return this.mockData.landingPages[pageId as keyof typeof this.mockData.landingPages] || null;
  }
  
  static async getPageSections(pageId: string): Promise<unknown[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return []; // No sections in mock data for now
  }
  
  static async getSEOMetadata(pageId: string, tenantId: string = 'default'): Promise<SEOMetadata | null> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return this.mockData.seoMetadata[pageId as keyof typeof this.mockData.seoMetadata] || null;
  }
  
  static async getFeatures(pageId: string): Promise<Feature[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return this.mockData.features[pageId as keyof typeof this.mockData.features] || [];
  }
  
  static async getTestimonials(pageId: string): Promise<Testimonial[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return this.mockData.testimonials[pageId as keyof typeof this.mockData.testimonials] || [];
  }
}
