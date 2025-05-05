
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  Layers, Code, BookOpen, Users, Search, 
  BarChart2, Play, Settings, User 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WorkbbenchLogo } from "@/components/WorkbbenchLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const location = useLocation();
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const navigationItems = [
    { label: "Homebase", path: "/dashboard", icon: Layers },
    { label: "Studio", path: "/toolset", icon: Code },
    { label: "Lab", path: "/lab", icon: Play },
    { label: "Academy", path: "/education", icon: BookOpen },
    { label: "Nexus", path: "/community", icon: Users },
    { label: "Observatory", path: "/observatory", icon: BarChart2 },
  ];

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
          <nav className="space-y-1">
            {navigationItems.map((item) => (
              <Link 
                key={item.path} 
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
            ))}
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
