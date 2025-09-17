
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  Search, Settings, User, FileText, Book, 
  Code, Server, DollarSign, Bot, Shield
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WorkbbenchLogo } from "@/components/WorkbbenchLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePermissions } from "@/hooks/usePermissions";
import { getGroupedNavItems, shouldShowGroup, type NavGroup, type NavItem } from "@/lib/navigation";
import { ProtectedNavItem } from "@/components/navigation/ProtectedNavItem";
import { NavigationPlanUtils } from "@/lib/navigation-plans";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation();
  const { hasPermission, isAuthenticated } = usePermissions();
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  // Get grouped navigation items based on permissions
  const groupedNavItems = getGroupedNavItems({
    context: 'sidebar',
    isAuthenticated,
    hasPermission
  });

  // Group order for rendering
  const groupOrder: NavGroup[] = ['workspaces', 'tools', 'admin', 'resources'];

  // Group display names
  const groupNames: Record<NavGroup, string> = {
    workspaces: 'Workspaces',
    tools: 'Tools',
    admin: 'Administration',
    resources: 'Resources'
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Navigation Bar */}
      <header className="border-b border-border/20 p-4 glass-morphism">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <WorkbbenchLogo />
            <div className="relative hidden md:flex items-center">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search..." 
                className="pl-10 w-64 bg-secondary/60"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full">
              <User className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Context Sidebar */}
        <aside className="w-[240px] border-r border-border/20 p-4 hidden md:block">
          <nav className="space-y-4">
            {groupOrder.map((groupKey) => {
              const groupItems = groupedNavItems[groupKey];
              
              // Don't render empty groups
              if (!shouldShowGroup(groupKey, groupItems)) {
                return null;
              }

              return (
                <div key={groupKey} className="space-y-1">
                  {/* Group Header */}
                  <div className="px-3 py-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {groupNames[groupKey]}
                    </h3>
                  </div>
                  
                  {/* Group Items */}
                  <div className="space-y-1">
                    {groupItems.map((item: NavItem) => {
                      // Check if this nav item requires a subscription upgrade
                      const planRequirement = NavigationPlanUtils.getNavPlanRequirement(item.key);
                      
                      // If plan requirement exists, use ProtectedNavItem
                      if (planRequirement) {
                        return (
                          <ProtectedNavItem
                            key={item.key}
                            item={item}
                            requiredPlan={planRequirement.requiredPlan}
                            feature={planRequirement.feature}
                            upgradeDescription={planRequirement.description}
                            benefits={planRequirement.benefits}
                          />
                        );
                      }
                      
                      // Otherwise, render normal nav item
                      return (
                        <Link 
                          key={item.key} 
                          to={item.path} 
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                            isActive(item.path) 
                              ? "bg-primary/20 text-primary"
                              : "hover:bg-secondary/60 text-foreground"
                          )}
                        >
                          <item.icon className="h-5 w-5" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>
        </aside>

        {/* Main Workspace */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>

      {/* Status Bar / Command Center */}
      <footer className="border-t border-border/20 p-2 glass-morphism">
        <div className="container mx-auto flex items-center justify-between text-xs text-muted-foreground">
          <div>Status: Connected</div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-secondary/60 rounded text-xs">
              Press / for commands
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
