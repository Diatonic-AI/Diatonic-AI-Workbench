# Permission System Integration Examples

This document shows how to integrate the new permission system with the existing AI Nexus Workbench components.

## 1. Update App.tsx with Protected Routes

```tsx
// src/App.tsx - Updated with permission-based route protection
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute, DevRoute, OrgRoute } from "@/components/auth/ProtectedRoute";
import { PermissionDebug } from "@/components/permissions/PermissionGate";
import Index from "./pages/Index";
import Education from "./pages/Education";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import Toolset from "./pages/Toolset";
import Lab from "./pages/Lab";
import Community from "./pages/Community";
import Observatory from "./pages/Observatory";
import SignInForm from "./components/auth/SignInForm";
import SignUpForm from "./components/auth/SignUpForm";
import ConfirmSignUpForm from "./components/auth/ConfirmSignUpForm";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/education" element={<Education />} />
            <Route path="/auth/signin" element={<SignInForm />} />
            <Route path="/auth/signup" element={<SignUpForm />} />
            <Route path="/auth/confirm" element={<ConfirmSignUpForm />} />
            
            {/* Protected routes with authentication requirement */}
            <Route path="/dashboard" element={
              <ProtectedRoute requireAuth>
                <Dashboard />
              </ProtectedRoute>
            } />
            
            {/* Protected routes with permission requirements */}
            <Route path="/toolset" element={
              <ProtectedRoute requiredPermission="studio.create_project">
                <Toolset />
              </ProtectedRoute>
            } />
            
            <Route path="/lab" element={
              <ProtectedRoute requiredPermission="lab.run_experiments">
                <Lab />
              </ProtectedRoute>
            } />
            
            <Route path="/community" element={
              <ProtectedRoute requiredPermission="community.create_posts">
                <Community />
              </ProtectedRoute>
            } />
            
            {/* Routes with feature area protection */}
            <Route path="/observatory" element={
              <ProtectedRoute featureArea="OBSERVATORY">
                <Observatory />
              </ProtectedRoute>
            } />
            
            {/* Organization-only routes */}
            <Route path="/advanced/*" element={
              <OrgRoute>
                <Routes>
                  <Route path="analytics" element={<div>Advanced Analytics</div>} />
                  <Route path="tools" element={<div>Advanced Tools</div>} />
                </Routes>
              </OrgRoute>
            } />
            
            {/* Development-only routes */}
            <Route path="/dev/*" element={
              <DevRoute>
                <Routes>
                  <Route path="debug" element={<div>Debug Console</div>} />
                  <Route path="admin" element={<div>Admin Panel</div>} />
                </Routes>
              </DevRoute>
            } />
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          
          {/* Show permission debug panel for development/testing users */}
          <PermissionDebug />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
```

## 2. Update Navbar with Role-Based Navigation

```tsx
// src/components/Navbar.tsx - Updated with permission gates
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Search, Menu, X, Bell, User, LogOut, Settings } from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { WorkbbenchLogo } from "./WorkbbenchLogo";
import { useAuth } from "@/contexts/AuthContext";
import { PermissionGate, AuthGate } from "@/components/permissions/PermissionGate";
import { useRoleBasedContent } from "@/hooks/usePermissions";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, isAuthenticated, signOut } = useAuth();
  const { roleDisplayName, isDevelopmentUser, isTestingUser } = useRoleBasedContent();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-workbbench-dark-purple/80 backdrop-blur-md border-b border-white/10">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0">
              <WorkbbenchLogo className="h-8 w-auto" />
            </Link>
            <div className="hidden md:block ml-10 flex-grow">
              <div className="flex items-center space-x-4">
                {/* Education - Always visible */}
                <Link to="/education" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
                  Education
                </Link>
                
                {/* Toolset - Requires permission */}
                <PermissionGate 
                  permission="studio.create_project"
                  fallback={
                    <span className="text-gray-500 px-3 py-2 rounded-md text-sm font-medium cursor-not-allowed">
                      Toolset
                    </span>
                  }
                >
                  <Link to="/toolset" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
                    Toolset
                  </Link>
                </PermissionGate>
                
                {/* AI Lab - Requires permission */}
                <PermissionGate permission="lab.run_experiments">
                  <Link to="/lab" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
                    AI Lab
                  </Link>
                </PermissionGate>
                
                {/* Community - Requires permission */}
                <PermissionGate permission="community.create_posts">
                  <Link to="/community" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
                    Community
                  </Link>
                </PermissionGate>
                
                {/* Observatory - Different versions based on role */}
                <PermissionGate 
                  permission="observatory.personal_analytics"
                  fallback={
                    <PermissionGate 
                      permission="observatory.personal_analytics"
                      showUpgradePrompt={false}
                      fallback={
                        <span className="text-gray-500 px-3 py-2 rounded-md text-sm font-medium cursor-not-allowed">
                          Observatory
                        </span>
                      }
                    >
                      <Link to="/observatory" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
                        Observatory
                      </Link>
                    </PermissionGate>
                  }
                >
                  <Link to="/observatory" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
                    {(isDevelopmentUser || isTestingUser) ? "Observatory (Full)" : "Observatory"}
                  </Link>
                </PermissionGate>
              </div>
            </div>
          </div>
          
          <div className="hidden md:block">
            <div className="ml-4 flex items-center space-x-4">
              {/* Search - Always visible */}
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="bg-secondary/60 border border-white/10 text-white block w-full pl-10 pr-3 py-2 rounded-md text-sm"
                  placeholder="Search..."
                />
              </div>
              
              {/* Notifications - Authenticated users only */}
              <AuthGate>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Bell className="h-5 w-5" />
                </Button>
              </AuthGate>
              
              {/* User menu or sign in/up buttons */}
              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full bg-workbbench-purple/20">
                      {user?.avatar ? (
                        <img 
                          src={user.avatar} 
                          alt={user.name || user.username} 
                          className="h-5 w-5 rounded-full" 
                        />
                      ) : (
                        <User className="h-5 w-5" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      <div className="font-medium">{user?.name || user?.username}</div>
                      <div className="text-xs">{user?.email}</div>
                      <div className="text-xs text-primary">{roleDisplayName}</div>
                    </div>
                    <DropdownMenuSeparator />
                    <Link to="/dashboard">
                      <DropdownMenuItem className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        Dashboard
                      </DropdownMenuItem>
                    </Link>
                    <DropdownMenuItem className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="cursor-pointer" onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex space-x-2">
                  <Link to="/auth/signin">
                    <Button variant="ghost" size="sm">
                      Sign In
                    </Button>
                  </Link>
                  <Link to="/auth/signup">
                    <Button size="sm">
                      Sign Up
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
          
          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <Button variant="ghost" size="icon" onClick={toggleMenu}>
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-workbbench-dark-purple/95 backdrop-blur-md">
            <Link to="/education" className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium">
              Education
            </Link>
            
            <PermissionGate permission="studio.create_project">
              <Link to="/toolset" className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium">
                Toolset
              </Link>
            </PermissionGate>
            
            <PermissionGate permission="lab.run_experiments">
              <Link to="/lab" className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium">
                AI Lab
              </Link>
            </PermissionGate>
            
            <PermissionGate permission="community.create_posts">
              <Link to="/community" className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium">
                Community
              </Link>
            </PermissionGate>
            
            {/* User section */}
            <div className="pt-4 pb-3 border-t border-white/10">
              {isAuthenticated ? (
                <>
                  <div className="flex items-center px-5">
                    <div className="flex-shrink-0">
                      {user?.avatar ? (
                        <img 
                          src={user.avatar} 
                          alt={user.name || user.username} 
                          className="h-10 w-10 rounded-full" 
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-workbbench-purple/20 flex items-center justify-center">
                          <User className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    <div className="ml-3">
                      <div className="text-base font-medium text-white">{user?.name || user?.username}</div>
                      <div className="text-sm font-medium text-gray-400">{user?.email}</div>
                      <div className="text-xs font-medium text-primary">{roleDisplayName}</div>
                    </div>
                  </div>
                  <div className="mt-3 px-2 space-y-1">
                    <Link to="/dashboard" className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium">
                      Dashboard
                    </Link>
                    <Link to="/settings" className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium">
                      Settings
                    </Link>
                    <button 
                      onClick={handleSignOut}
                      className="text-gray-300 hover:text-white block w-full text-left px-3 py-2 rounded-md text-base font-medium"
                    >
                      Sign out
                    </button>
                  </div>
                </>
              ) : (
                <div className="mt-3 px-2 space-y-1">
                  <Link to="/auth/signin" className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium">
                    Sign In
                  </Link>
                  <Link to="/auth/signup" className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium">
                    Sign Up
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
```

## 3. Update Education Page with Content Gating

```tsx
// src/pages/Education.tsx - Updated with premium content gating
import { useState } from 'react';
import Navbar from '@/components/Navbar';
import { Button } from "@/components/ui/button";
import { BookOpen, Code, Brain, Star, Clock, ChevronRight, Search, Filter, Crown } from 'lucide-react';
import { PermissionGate, AuthGate } from '@/components/permissions/PermissionGate';
import { useRoleBasedContent } from '@/hooks/usePermissions';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

const Education = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const { isAnonymous, getUpgradeMessage } = useRoleBasedContent();

  // Separate courses by access level
  const freeCourses = [
    {
      id: 1,
      title: 'AI Fundamentals',
      description: 'Learn the core concepts and terminology of artificial intelligence.',
      level: 'Beginner',
      duration: '2 hours',
      rating: 4.8,
      category: 'fundamentals',
      image: '/api/placeholder/400/240',
      isFree: true
    },
    {
      id: 6,
      title: 'AI Ethics and Responsibility',
      description: 'Understand the ethical considerations and responsible use of AI.',
      level: 'All Levels',
      duration: '3 hours',
      rating: 4.7,
      category: 'fundamentals',
      image: '/api/placeholder/400/240',
      isFree: true
    },
  ];

  const premiumCourses = [
    {
      id: 2,
      title: 'Machine Learning Basics',
      description: 'Understand the principles of machine learning algorithms and applications.',
      level: 'Beginner',
      duration: '4 hours',
      rating: 4.5,
      category: 'machine-learning',
      image: '/api/placeholder/400/240',
      isFree: false
    },
    {
      id: 3,
      title: 'Building LLM Applications',
      description: 'Create powerful applications with large language models.',
      level: 'Intermediate',
      duration: '6 hours',
      rating: 4.9,
      category: 'llm',
      image: '/api/placeholder/400/240',
      isFree: false
    },
    {
      id: 4,
      title: 'Advanced Neural Networks',
      description: 'Dive deep into neural network architectures and optimization techniques.',
      level: 'Advanced',
      duration: '8 hours',
      rating: 4.7,
      category: 'machine-learning',
      image: '/api/placeholder/400/240',
      isFree: false
    },
    {
      id: 5,
      title: 'Agent Building Workshop',
      description: 'Learn how to build, test, and deploy AI agents using Workbbench tools.',
      level: 'Intermediate',
      duration: '5 hours',
      rating: 4.6,
      category: 'agent-modeling',
      image: '/api/placeholder/400/240',
      isFree: false
    },
  ];

  const orgOnlyCourses = [
    {
      id: 7,
      title: 'Enterprise AI Strategy',
      description: 'Strategic approaches to implementing AI in enterprise environments.',
      level: 'Advanced',
      duration: '4 hours',
      rating: 4.9,
      category: 'strategy',
      image: '/api/placeholder/400/240',
      isOrgOnly: true
    },
    {
      id: 8,
      title: 'Team Collaboration in AI Projects',
      description: 'Best practices for managing AI teams and collaborative development.',
      level: 'Intermediate',
      duration: '3 hours',
      rating: 4.8,
      category: 'collaboration',
      image: '/api/placeholder/400/240',
      isOrgOnly: true
    },
  ];

  const CourseCard = ({ course, locked = false }: { course: any, locked?: boolean }) => (
    <Card className={`bg-secondary/50 border-white/10 hover:border-white/20 transition-all ${locked ? 'opacity-75' : ''}`}>
      <div className="h-40 bg-muted rounded-t-lg overflow-hidden relative">
        <img 
          src={course.image} 
          alt={course.title}
          className="w-full h-full object-cover"
        />
        {locked && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Crown className="h-8 w-8 text-yellow-500" />
          </div>
        )}
      </div>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              {course.title}
              {locked && <Crown className="h-4 w-4 text-yellow-500" />}
            </CardTitle>
            <CardDescription className="text-gray-400 mt-1">{course.description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center text-sm text-gray-400 mb-2">
          <div className="flex items-center mr-4">
            <Clock className="h-4 w-4 mr-1" />
            <span>{course.duration}</span>
          </div>
          <div className="flex items-center">
            <Star className="h-4 w-4 mr-1 text-yellow-500" />
            <span>{course.rating}</span>
          </div>
        </div>
        <span className="inline-block px-2 py-1 rounded-full text-xs bg-workbbench-purple/20 text-workbbench-purple">
          {course.level}
        </span>
      </CardContent>
      <CardFooter>
        <Button className="w-full" disabled={locked}>
          {locked ? "Upgrade to Access" : "Enroll Now"}
        </Button>
      </CardFooter>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-workbbench-dark-purple to-black text-white">
      <Navbar />
      
      {/* Hero Section */}
      <section className="py-12 bg-gradient-to-r from-workbbench-purple/20 via-workbbench-blue/20 to-workbbench-orange/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="text-gradient bg-gradient-to-r from-workbbench-purple to-workbbench-blue">AI Education Hub</span>
            </h1>
            <p className="text-xl text-gray-300 mb-8">
              Master AI concepts through interactive courses, guided learning paths, and bite-sized video tutorials.
            </p>
            <div className="relative max-w-xl mx-auto">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="bg-secondary/60 border border-white/10 text-white block w-full pl-10 pr-3 py-3 rounded-md"
                placeholder="Search for courses, tutorials, or topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </section>
      
      {/* Learning Paths */}
      <section className="py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold mb-8">Learning Paths</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Free Learning Path */}
            <div className="glass-morphism rounded-xl p-6 border-l-4 border-workbbench-purple">
              <div className="flex items-center mb-4">
                <div className="p-2 rounded-lg bg-workbbench-purple/20 mr-4">
                  <BookOpen className="h-6 w-6 text-workbbench-purple" />
                </div>
                <h3 className="text-xl font-semibold">AI Fundamentals</h3>
              </div>
              <p className="text-gray-300 mb-4">
                Start your AI journey with the fundamental concepts, terminology, and applications.
              </p>
              <div className="flex items-center text-sm text-gray-400 mb-4">
                <div className="flex items-center mr-4">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>5 hours</span>
                </div>
                <div className="flex items-center">
                  <BookOpen className="h-4 w-4 mr-1" />
                  <span>2 courses</span>
                </div>
              </div>
              <Button variant="ghost" className="w-full justify-between">
                Start Learning
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Premium Learning Path */}
            <PermissionGate 
              permission="education.view_premium"
              showUpgradePrompt
              upgradePromptVariant="card"
              fallback={
                <div className="glass-morphism rounded-xl p-6 border-l-4 border-workbbench-blue opacity-75 relative">
                  <div className="absolute top-4 right-4">
                    <Crown className="h-6 w-6 text-yellow-500" />
                  </div>
                  <div className="flex items-center mb-4">
                    <div className="p-2 rounded-lg bg-workbbench-blue/20 mr-4">
                      <Code className="h-6 w-6 text-workbbench-blue" />
                    </div>
                    <h3 className="text-xl font-semibold">Machine Learning</h3>
                  </div>
                  <p className="text-gray-300 mb-4">
                    Learn machine learning algorithms, data preparation, and model training techniques.
                  </p>
                  <div className="flex items-center text-sm text-gray-400 mb-4">
                    <div className="flex items-center mr-4">
                      <Clock className="h-4 w-4 mr-1" />
                      <span>20 hours</span>
                    </div>
                    <div className="flex items-center">
                      <BookOpen className="h-4 w-4 mr-1" />
                      <span>8 courses</span>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full justify-between" disabled>
                    Upgrade to Access
                    <Crown className="h-4 w-4" />
                  </Button>
                </div>
              }
            >
              <div className="glass-morphism rounded-xl p-6 border-l-4 border-workbbench-blue">
                <div className="flex items-center mb-4">
                  <div className="p-2 rounded-lg bg-workbbench-blue/20 mr-4">
                    <Code className="h-6 w-6 text-workbbench-blue" />
                  </div>
                  <h3 className="text-xl font-semibold">Machine Learning</h3>
                </div>
                <p className="text-gray-300 mb-4">
                  Learn machine learning algorithms, data preparation, and model training techniques.
                </p>
                <div className="flex items-center text-sm text-gray-400 mb-4">
                  <div className="flex items-center mr-4">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>20 hours</span>
                  </div>
                  <div className="flex items-center">
                    <BookOpen className="h-4 w-4 mr-1" />
                    <span>8 courses</span>
                  </div>
                </div>
                <Button variant="ghost" className="w-full justify-between">
                  Start Learning
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </PermissionGate>
            
            {/* Organization Learning Path */}
            <PermissionGate permission="education.org_courses">
              <div className="glass-morphism rounded-xl p-6 border-l-4 border-workbbench-orange">
                <div className="flex items-center mb-4">
                  <div className="p-2 rounded-lg bg-workbbench-orange/20 mr-4">
                    <Brain className="h-6 w-6 text-workbbench-orange" />
                  </div>
                  <h3 className="text-xl font-semibold">Enterprise AI</h3>
                </div>
                <p className="text-gray-300 mb-4">
                  Advanced AI strategies, team collaboration, and enterprise deployment patterns.
                </p>
                <div className="flex items-center text-sm text-gray-400 mb-4">
                  <div className="flex items-center mr-4">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>15 hours</span>
                  </div>
                  <div className="flex items-center">
                    <BookOpen className="h-4 w-4 mr-1" />
                    <span>6 courses</span>
                  </div>
                </div>
                <Button variant="ghost" className="w-full justify-between">
                  Start Learning
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </PermissionGate>
          </div>
        </div>
      </section>
      
      {/* Courses Section */}
      <section className="py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center mb-8">
            <h2 className="text-3xl font-bold">Courses & Tutorials</h2>
            <div className="flex items-center mt-4 md:mt-0">
              <Button variant="outline" size="sm" className="mr-2">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
              <Button variant="outline" size="sm">
                Sort by: Popular
              </Button>
            </div>
          </div>
          
          <Tabs defaultValue="free" className="mb-8">
            <TabsList className="bg-secondary/50 mb-6">
              <TabsTrigger value="free">Free Courses</TabsTrigger>
              <TabsTrigger value="premium">Premium Courses</TabsTrigger>
              <TabsTrigger value="organization">Organization</TabsTrigger>
            </TabsList>
            
            {/* Free Courses Tab */}
            <TabsContent value="free">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {freeCourses.map((course) => (
                  <CourseCard key={course.id} course={course} />
                ))}
              </div>
            </TabsContent>
            
            {/* Premium Courses Tab */}
            <TabsContent value="premium">
              <AuthGate 
                showUpgradePrompt
                upgradePromptVariant="card"
                fallback={
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {premiumCourses.map((course) => (
                      <CourseCard key={course.id} course={course} locked />
                    ))}
                  </div>
                }
              >
                <PermissionGate 
                  permission="education.view_premium"
                  showUpgradePrompt
                  upgradePromptVariant="card"
                  fallback={
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {premiumCourses.map((course) => (
                        <CourseCard key={course.id} course={course} locked />
                      ))}
                    </div>
                  }
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {premiumCourses.map((course) => (
                      <CourseCard key={course.id} course={course} />
                    ))}
                  </div>
                </PermissionGate>
              </AuthGate>
            </TabsContent>
            
            {/* Organization Courses Tab */}
            <TabsContent value="organization">
              <PermissionGate 
                permission="education.org_courses"
                showUpgradePrompt
                upgradePromptVariant="card"
                fallback={
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {orgOnlyCourses.map((course) => (
                      <CourseCard key={course.id} course={course} locked />
                    ))}
                  </div>
                }
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {orgOnlyCourses.map((course) => (
                    <CourseCard key={course.id} course={course} />
                  ))}
                </div>
              </PermissionGate>
            </TabsContent>
          </Tabs>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="py-8 bg-workbbench-dark-purple border-t border-white/10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">© 2025 Workbbench. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Education;
```

## 4. Update Community Page with Organization Features

```tsx
// src/pages/Community.tsx - Updated with organization-based content isolation
import React from "react";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, ThumbsUp, ThumbsDown, User, Users, Plus, Shield, Settings } from "lucide-react";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { usePermissions } from "@/hooks/usePermissions";

const Community = () => {
  const { isDevelopmentUser, isTestingUser } = usePermissions();

  // Mock data for posts (would be filtered by user role in real app)
  const POSTS = [
    {
      id: 1,
      author: "Maria Chen",
      role: "AI Researcher",
      content: "Just published my new tutorial on fine-tuning LLMs for domain-specific tasks. Check it out and let me know what you think!",
      time: "2 hours ago",
      likes: 24,
      comments: 5,
      isPublic: true
    },
    {
      id: 2,
      author: "Alex Johnson",
      role: "Data Scientist",
      content: "Has anyone experimented with the new OpenAI embeddings? I'm seeing some interesting results when combined with traditional clustering algorithms.",
      time: "5 hours ago",
      likes: 13,
      comments: 7,
      isPublic: true
    },
  ];

  const ORG_POSTS = [
    {
      id: 3,
      author: "Sarah Wilson",
      role: "Team Lead",
      content: "Our Q4 AI model performance metrics are looking great! Let's discuss deployment strategies for the new customer sentiment analysis model.",
      time: "3 hours ago",
      likes: 8,
      comments: 3,
      isOrgOnly: true
    },
    {
      id: 4,
      author: "David Kim",
      role: "ML Engineer",  
      content: "Internal note: The new GPU cluster is ready for testing. Who wants to run some experiments this week?",
      time: "6 hours ago",
      likes: 12,
      comments: 5,
      isOrgOnly: true
    },
  ];

  // Mock data for community groups
  const GROUPS = [
    {
      id: 1,
      name: "NLP Enthusiasts",
      members: 1243,
      posts: 56,
      joined: true,
      isPublic: true
    },
    {
      id: 2,
      name: "Computer Vision Research",
      members: 879,
      posts: 32,
      joined: false,
      isPublic: true
    },
    {
      id: 3,
      name: "Beginner AI Study Group",
      members: 2567,
      posts: 128,
      joined: false,
      isPublic: true
    },
  ];

  const ORG_GROUPS = [
    {
      id: 4,
      name: "Internal AI Strategy",
      members: 45,
      posts: 89,
      joined: true,
      isOrgOnly: true
    },
    {
      id: 5,
      name: "Product Team AI Integration",
      members: 23,
      posts: 156,
      joined: false,
      isOrgOnly: true
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Nexus</h1>
            <p className="text-muted-foreground">
              Connect with the AI community
            </p>
          </div>
          <PermissionGate permission="community.create_posts">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Post
            </Button>
          </PermissionGate>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            {/* Public Community Feed */}
            <Card>
              <CardHeader>
                <CardTitle>Community Feed</CardTitle>
                <CardDescription>
                  See what others are sharing and discussing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {POSTS.map((post) => (
                  <div key={post.id} className="border-b border-border/20 pb-4 last:border-0">
                    <div className="flex items-start gap-3 mb-2">
                      <div className="bg-secondary h-10 w-10 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{post.author}</p>
                          <span className="text-xs text-muted-foreground">• {post.role}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{post.time}</p>
                      </div>
                    </div>
                    <p className="mb-3">{post.content}</p>
                    <div className="flex items-center gap-4">
                      <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                        <ThumbsUp className="h-4 w-4" />
                        <span>{post.likes}</span>
                      </button>
                      <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                        <ThumbsDown className="h-4 w-4" />
                      </button>
                      <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                        <MessageSquare className="h-4 w-4" />
                        <span>{post.comments} comments</span>
                      </button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Organization-Only Feed */}
            <PermissionGate permission="community.org_content">
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Organization Feed
                  </CardTitle>
                  <CardDescription>
                    Private discussions for organization members
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {ORG_POSTS.map((post) => (
                    <div key={post.id} className="border-b border-border/20 pb-4 last:border-0">
                      <div className="flex items-start gap-3 mb-2">
                        <div className="bg-primary/20 h-10 w-10 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{post.author}</p>
                            <span className="text-xs text-muted-foreground">• {post.role}</span>
                            <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                              Org Only
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">{post.time}</p>
                        </div>
                      </div>
                      <p className="mb-3">{post.content}</p>
                      <div className="flex items-center gap-4">
                        <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                          <ThumbsUp className="h-4 w-4" />
                          <span>{post.likes}</span>
                        </button>
                        <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                          <ThumbsDown className="h-4 w-4" />
                        </button>
                        <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
                          <MessageSquare className="h-4 w-4" />
                          <span>{post.comments} comments</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </PermissionGate>
          </div>

          <div className="space-y-6">
            {/* Public Community Groups */}
            <Card>
              <CardHeader>
                <CardTitle>Community Groups</CardTitle>
                <CardDescription>
                  Join groups to connect with like-minded people
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {GROUPS.map((group) => (
                  <div key={group.id} className="p-3 border border-border/20 rounded-md hover:border-border transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        {group.name}
                      </h3>
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                      <span>{group.members} members</span>
                      <span>{group.posts} posts</span>
                    </div>
                    <PermissionGate 
                      permission="community.join_public_groups"
                      fallback={
                        <Button variant="outline" className="w-full text-sm h-8" disabled>
                          Sign In to Join
                        </Button>
                      }
                    >
                      <Button 
                        variant={group.joined ? "outline" : "default"} 
                        className="w-full text-sm h-8"
                      >
                        {group.joined ? "Joined" : "Join Group"}
                      </Button>
                    </PermissionGate>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Organization Groups */}
            <PermissionGate permission="community.org_content">
              <Card className="border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Organization Groups
                  </CardTitle>
                  <CardDescription>
                    Private groups for organization members
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {ORG_GROUPS.map((group) => (
                    <div key={group.id} className="p-3 border border-primary/20 rounded-md hover:border-primary/40 transition-colors bg-primary/5">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium flex items-center gap-2">
                          <Users className="h-4 w-4 text-primary" />
                          {group.name}
                        </h3>
                      </div>
                      <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                        <span>{group.members} members</span>
                        <span>{group.posts} posts</span>
                      </div>
                      <PermissionGate permission="community.join_private_groups">
                        <Button 
                          variant={group.joined ? "outline" : "default"} 
                          className="w-full text-sm h-8"
                        >
                          {group.joined ? "Joined" : "Join Group"}
                        </Button>
                      </PermissionGate>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </PermissionGate>

            {/* Moderation Tools for Dev/Testing */}
            {(isDevelopmentUser || isTestingUser) && (
              <Card className="border-amber-500/20 bg-amber-500/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-amber-600">
                    <Settings className="h-5 w-5" />
                    Moderation Tools
                  </CardTitle>
                  <CardDescription>
                    Administrative tools for community management
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Shield className="mr-2 h-4 w-4" />
                    Review Flagged Content
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Users className="mr-2 h-4 w-4" />
                    Manage User Roles
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Settings className="mr-2 h-4 w-4" />
                    Community Settings
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Trending Topics */}
            <Card>
              <CardHeader>
                <CardTitle>Trending Topics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {["#LLMFinetuning", "#ComputerVision", "#AIEthics", "#PromptEngineering", "#NeuralNetworks"].map((topic, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <span className="text-primary hover:underline cursor-pointer">{topic}</span>
                      <span className="text-xs text-muted-foreground">{Math.floor(Math.random() * 100) + 10} posts</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Community;
```

## 5. Testing the Implementation

Create test scenarios to verify the permission system works correctly:

### Testing Script (for manual testing)
```bash
# Test different user scenarios
echo "Testing Permission System Implementation"

# 1. Test with anonymous user
echo "1. Testing anonymous user (no authentication)"
# - Should see public content only
# - Should see sign-up prompts for premium features
# - Navigation should show limited options

# 2. Test with basic user
echo "2. Testing basic user"
# - Create user in Cognito with "BasicUsers" group
# - Should access education premium, studio, lab basic features
# - Should not see organization content

# 3. Test with org user  
echo "3. Testing organization user"
# - Create user in Cognito with "OrgUsers" group
# - Should see all basic features plus organization content
# - Should see private groups and advanced tools

# 4. Test with development user
echo "4. Testing development user"
# - Create user in Cognito with "Development" group
# - Should see all features including debug tools
# - Should see moderation tools in community

# 5. Test with testing user
echo "5. Testing testing user"
# - Create user in Cognito with "Testing" group
# - Should have full access to all features
# - Should see PermissionDebug component
```

This implementation provides a complete permission system foundation that can be gradually rolled out across the application. The system is flexible, type-safe, and provides good user experience with appropriate upgrade prompts and fallbacks.
