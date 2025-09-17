/**
 * Navigation Plans Configuration
 * 
 * Defines which subscription plan is required for each navigation item
 * and provides upgrade prompts with specific benefits.
 */

import { NavItem } from './navigation';
import { PlanId } from './pricing';

// Enhanced navigation item with plan requirements
export interface NavPlanConfig {
  navKey: string;
  requiredPlan: PlanId;
  feature: string;
  description: string;
  benefits: string[];
  upgradeReason: string;
}

/**
 * Navigation plan requirements configuration
 * 
 * This maps navigation items to their required subscription plans
 * and provides context for upgrade prompts.
 */
export const NAV_PLAN_REQUIREMENTS: NavPlanConfig[] = [
  // Studio (Toolset) - Basic Plan Required
  {
    navKey: 'studio',
    requiredPlan: 'basic',
    feature: 'AI Studio',
    description: 'Access the visual AI agent builder with advanced templates and export capabilities.',
    benefits: [
      '25 AI agents per month',
      'Advanced visual builder',
      'Premium templates library',
      'Private projects',
      'Export functionality'
    ],
    upgradeReason: 'Build professional AI agents with our advanced studio tools'
  },
  
  // Lab - Pro Plan Required
  {
    navKey: 'lab',
    requiredPlan: 'pro',
    feature: 'AI Laboratory',
    description: 'Run advanced AI experiments with custom model training and comprehensive analytics.',
    benefits: [
      '100 AI agents per month',
      'Advanced experiments & A/B testing',
      'Custom model training',
      'Maximum execution time',
      'Advanced analytics & insights'
    ],
    upgradeReason: 'Unlock powerful experimentation capabilities with unlimited testing'
  },
  
  // Observatory - Pro Plan Required
  {
    navKey: 'observatory',
    requiredPlan: 'pro',
    feature: 'Analytics Observatory',
    description: 'Monitor your AI agents with real-time analytics and advanced reporting.',
    benefits: [
      'Advanced analytics & insights',
      'Multi-format export capabilities',
      'Custom dashboards',
      'Real-time monitoring',
      'Advanced debugging tools'
    ],
    upgradeReason: 'Get deep insights into your AI agent performance and usage'
  },
  
  // Agent Builder - Basic Plan Required
  {
    navKey: 'agent-builder',
    requiredPlan: 'basic',
    feature: 'Agent Builder',
    description: 'Create sophisticated AI agents with our drag-and-drop visual interface.',
    benefits: [
      'Advanced visual builder',
      'Premium templates library',
      'Save and export agents',
      'Private project sharing',
      'Email support'
    ],
    upgradeReason: 'Build complex AI workflows with professional tools'
  },
  
  // Admin Console - Internal Only
  {
    navKey: 'admin-console',
    requiredPlan: 'enterprise',
    feature: 'Admin Console',
    description: 'Access administrative tools and system management features.',
    benefits: [
      'Complete system administration',
      'User management tools',
      'Advanced security controls',
      'Custom configurations',
      'Dedicated support team'
    ],
    upgradeReason: 'Get enterprise-level administrative control'
  }
];

/**
 * Feature-specific upgrade configurations
 * 
 * These are more granular feature gates within pages
 * that can have different plan requirements than the page itself.
 */
export interface FeaturePlanConfig {
  featureKey: string;
  requiredPlan: PlanId;
  feature: string;
  description: string;
  benefits: string[];
  context?: string; // Where this feature appears
}

export const FEATURE_PLAN_REQUIREMENTS: FeaturePlanConfig[] = [
  // Studio Features
  {
    featureKey: 'studio.premium-templates',
    requiredPlan: 'pro',
    feature: 'Premium Templates',
    description: 'Access our library of professionally designed AI agent templates.',
    benefits: [
      'Advanced workflow templates',
      'Industry-specific agents',
      'Custom template creation',
      'Template version control'
    ],
    context: 'Studio template library'
  },
  
  {
    featureKey: 'studio.team-collaboration',
    requiredPlan: 'pro',
    feature: 'Team Collaboration',
    description: 'Collaborate with your team on AI agent development projects.',
    benefits: [
      'Team workspaces (5 members)',
      'Real-time collaboration',
      'Version control & history',
      'Shared template library'
    ],
    context: 'Studio collaboration features'
  },
  
  {
    featureKey: 'studio.git-integration',
    requiredPlan: 'extreme',
    feature: 'Git Integration',
    description: 'Connect your agents to Git repositories for advanced version control.',
    benefits: [
      'Direct Git repository integration',
      'Automated versioning',
      'Branch-based development',
      'CI/CD pipeline support'
    ],
    context: 'Studio version control'
  },
  
  // Lab Features
  {
    featureKey: 'lab.custom-models',
    requiredPlan: 'extreme',
    feature: 'Custom Model Training',
    description: 'Train your own AI models with our dedicated training infrastructure.',
    benefits: [
      'Dedicated training resources',
      'Custom dataset support',
      'Advanced hyperparameter tuning',
      'Model deployment pipeline'
    ],
    context: 'Lab model training'
  },
  
  {
    featureKey: 'lab.ab-testing',
    requiredPlan: 'extreme',
    feature: 'A/B Testing Suite',
    description: 'Run sophisticated A/B tests on your AI agents and workflows.',
    benefits: [
      'Multi-variant testing',
      'Statistical significance analysis',
      'Automated traffic splitting',
      'Performance comparison tools'
    ],
    context: 'Lab experimentation'
  },
  
  // Observatory Features
  {
    featureKey: 'observatory.custom-dashboards',
    requiredPlan: 'extreme',
    feature: 'Custom Dashboards',
    description: 'Create personalized analytics dashboards for your specific needs.',
    benefits: [
      'Drag-and-drop dashboard builder',
      'Custom metrics and KPIs',
      'Real-time data visualization',
      'Shareable dashboard links'
    ],
    context: 'Observatory dashboards'
  },
  
  {
    featureKey: 'observatory.advanced-reporting',
    requiredPlan: 'pro',
    feature: 'Advanced Reporting',
    description: 'Generate comprehensive reports with detailed analytics and insights.',
    benefits: [
      'Scheduled report generation',
      'Multi-format exports (PDF, Excel)',
      'Custom report templates',
      'Email delivery automation'
    ],
    context: 'Observatory reporting'
  },
  
  // API Access Features
  {
    featureKey: 'api.unlimited-access',
    requiredPlan: 'extreme',
    feature: 'Unlimited API Access',
    description: 'Get unlimited API calls and advanced integration capabilities.',
    benefits: [
      'Unlimited API requests',
      'Advanced rate limiting controls',
      'Webhook integrations',
      'Custom API endpoints'
    ],
    context: 'API access controls'
  },
  
  // Support Features
  {
    featureKey: 'support.priority',
    requiredPlan: 'pro',
    feature: 'Priority Support',
    description: 'Get faster response times and priority handling for your support requests.',
    benefits: [
      '24-hour response time',
      'Priority queue placement',
      'Screen sharing sessions',
      'Dedicated support team'
    ],
    context: 'Support channels'
  },
  
  {
    featureKey: 'support.dedicated-team',
    requiredPlan: 'extreme',
    feature: 'Dedicated Support Team',
    description: 'Work with a dedicated support team that knows your specific use case.',
    benefits: [
      'Named support team members',
      'Proactive monitoring',
      'Custom training sessions',
      'Architecture review calls'
    ],
    context: 'Enterprise support'
  }
];

/**
 * Helper functions for plan requirements
 */
export class NavigationPlanUtils {
  /**
   * Get plan requirement for a navigation item
   */
  static getNavPlanRequirement(navKey: string): NavPlanConfig | null {
    return NAV_PLAN_REQUIREMENTS.find(req => req.navKey === navKey) || null;
  }
  
  /**
   * Get plan requirement for a specific feature
   */
  static getFeaturePlanRequirement(featureKey: string): FeaturePlanConfig | null {
    return FEATURE_PLAN_REQUIREMENTS.find(req => req.featureKey === featureKey) || null;
  }
  
  /**
   * Check if a navigation item requires a plan upgrade
   */
  static requiresPlanUpgrade(navKey: string): boolean {
    return NAV_PLAN_REQUIREMENTS.some(req => req.navKey === navKey);
  }
  
  /**
   * Check if a feature requires a plan upgrade
   */
  static featureRequiresPlanUpgrade(featureKey: string): boolean {
    return FEATURE_PLAN_REQUIREMENTS.some(req => req.featureKey === featureKey);
  }
  
  /**
   * Get all features for a specific plan
   */
  static getFeaturesForPlan(planId: PlanId): FeaturePlanConfig[] {
    return FEATURE_PLAN_REQUIREMENTS.filter(req => req.requiredPlan === planId);
  }
  
  /**
   * Get plan-gated navigation items
   */
  static getPlanGatedNavItems(): NavPlanConfig[] {
    return NAV_PLAN_REQUIREMENTS;
  }
}

export default NavigationPlanUtils;