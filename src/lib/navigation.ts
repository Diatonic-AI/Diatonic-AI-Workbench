/**
 * Centralized Navigation Configuration
 * 
 * This file defines a single source of truth for all navigation items
 * across the application. It provides:
 * 
 * - Consistent naming and paths
 * - Proper access control (auth/permissions)
 * - Grouping by section (workspaces, tools, admin, resources)
 * - Icon assignments
 * - Context awareness (sidebar vs navbar)
 * 
 * When adding new routes, they should be added here rather than
 * directly in components to maintain consistency.
 */

import {
  Layers, Code, Play, BookOpen, Users, BarChart2,
  Bot, WandSparkles, Shield, Settings,
  FileText, Book, Server, DollarSign
} from 'lucide-react';
import { PERMISSIONS, type Permission } from './permissions';
import type { LucideIcon } from 'lucide-react';

// Navigation item groups
export type NavGroup = 'workspaces' | 'tools' | 'admin' | 'resources';

// Navigation context (where the item appears)
export type NavContext = 'sidebar' | 'navbar';

// Navigation item type
export interface NavItem {
  key: string;
  label: string;
  path: string;
  icon: LucideIcon;
  group: NavGroup;
  order: number;
  requiresAuth?: boolean;
  requiredPermission?: Permission;
  allowAnonymous?: boolean;
  contexts: NavContext[];
  description?: string;
}

/**
 * Centralized navigation configuration
 * 
 * This array defines all navigation items across the application.
 * Items are filtered based on:
 * - Authentication status
 * - User permissions
 * - Context (sidebar vs navbar)
 */
export const NAV: NavItem[] = [
  // Group 1: Workspaces
  {
    key: 'homebase',
    label: 'Homebase',
    path: '/dashboard',
    icon: Layers,
    group: 'workspaces',
    order: 1,
    requiresAuth: true,
    contexts: ['sidebar', 'navbar'],
    description: 'Personal dashboard and overview'
  },
  {
    key: 'studio',
    label: 'Studio',
    path: '/toolset',
    icon: Code,
    group: 'workspaces',
    order: 2,
    requiredPermission: PERMISSIONS.STUDIO_CREATE_AGENTS,
    contexts: ['sidebar', 'navbar'],
    description: 'Agent development workspace'
  },
  {
    key: 'lab',
    label: 'Lab',
    path: '/lab',
    icon: Play,
    group: 'workspaces',
    order: 3,
    requiredPermission: PERMISSIONS.LAB_RUN_BASIC,
    contexts: ['sidebar', 'navbar'],
    description: 'AI experimentation environment'
  },
  {
    key: 'observatory',
    label: 'Observatory',
    path: '/observatory',
    icon: BarChart2,
    group: 'workspaces',
    order: 4,
    requiredPermission: PERMISSIONS.OBSERVATORY_BASIC_ANALYTICS,
    contexts: ['sidebar', 'navbar'],
    description: 'Analytics and monitoring'
  },
  {
    key: 'community',
    label: 'Community',
    path: '/community',
    icon: Users,
    group: 'workspaces',
    order: 5,
    allowAnonymous: true,
    contexts: ['sidebar', 'navbar'],
    description: 'Social and collaboration hub'
  },
  {
    key: 'academy',
    label: 'Academy',
    path: '/education',
    icon: BookOpen,
    group: 'workspaces',
    order: 6,
    allowAnonymous: true,
    contexts: ['sidebar', 'navbar'],
    description: 'Learning and educational content'
  },

  // Group 2: Tools
  {
    key: 'agent-builder',
    label: 'Agent Builder',
    path: '/toolset/agent-builder',
    icon: Bot,
    group: 'tools',
    order: 1,
    requiredPermission: PERMISSIONS.STUDIO_CREATE_AGENTS,
    contexts: ['sidebar'],
    description: 'Visual agent development interface'
  },

  // Group 3: Admin
  {
    key: 'admin-console',
    label: 'Admin Console',
    path: '/admin',
    icon: Shield,
    group: 'admin',
    order: 1,
    requiredPermission: 'internal.content_management' as Permission,
    contexts: ['sidebar'],
    description: 'System administration interface'
  },

  // Group 4: Resources
  {
    key: 'documentation',
    label: 'Documentation',
    path: '/documentation',
    icon: FileText,
    group: 'resources',
    order: 1,
    allowAnonymous: true,
    contexts: ['sidebar'],
    description: 'Product documentation'
  },
  {
    key: 'tutorials',
    label: 'Tutorials',
    path: '/tutorials',
    icon: Book,
    group: 'resources',
    order: 2,
    allowAnonymous: true,
    contexts: ['sidebar'],
    description: 'Step-by-step guides'
  },
  {
    key: 'api-reference',
    label: 'API Reference',
    path: '/api-reference',
    icon: Code,
    group: 'resources',
    order: 3,
    allowAnonymous: true,
    contexts: ['sidebar'],
    description: 'API documentation'
  },
  {
    key: 'status',
    label: 'Status',
    path: '/status',
    icon: Server,
    group: 'resources',
    order: 4,
    allowAnonymous: true,
    contexts: ['sidebar'],
    description: 'System status and health'
  },
  {
    key: 'pricing',
    label: 'Pricing',
    path: '/pricing',
    icon: DollarSign,
    group: 'resources',
    order: 5,
    allowAnonymous: true,
    contexts: ['sidebar', 'navbar'],
    description: 'Pricing information'
  }
];

/**
 * Helper function to get navigation items for a specific context
 * filtered by access control requirements
 */
export function getNavItems(options: {
  context: NavContext;
  isAuthenticated: boolean;
  hasPermission: (permission: Permission) => boolean;
}): NavItem[] {
  const { context, isAuthenticated, hasPermission } = options;
  
  return NAV.filter(item => {
    // Filter by context
    if (!item.contexts.includes(context)) return false;
    
    // Filter by authentication
    if (item.requiresAuth && !isAuthenticated) return false;
    
    // Filter by permission
    if (item.requiredPermission && !hasPermission(item.requiredPermission)) return false;
    
    // Always show items marked as anonymous
    if (item.allowAnonymous) return true;
    
    // Default behavior: show to authenticated users
    return isAuthenticated;
  });
}

/**
 * Helper function to get navigation items grouped by section
 */
export function getGroupedNavItems(options: {
  context: NavContext;
  isAuthenticated: boolean;
  hasPermission: (permission: Permission) => boolean;
}): Record<NavGroup, NavItem[]> {
  const items = getNavItems(options);
  
  const result: Record<NavGroup, NavItem[]> = {
    workspaces: [],
    tools: [],
    admin: [],
    resources: []
  };
  
  // Group items by section and sort by order
  items.forEach(item => {
    result[item.group].push(item);
  });
  
  // Sort each group by order
  Object.keys(result).forEach(group => {
    result[group as NavGroup].sort((a, b) => a.order - b.order);
  });
  
  return result;
}

/**
 * Helper function to check if a group should be shown
 */
export function shouldShowGroup(group: NavGroup, items: NavItem[]): boolean {
  return items.length > 0;
}

/**
 * Helper to get icon element for a navigation item
 */
export function getNavIcon(item: NavItem): LucideIcon {
  return item.icon;
}

export default NAV;