
import React, { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute, ConditionalRoute } from "@/components/auth/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Skeleton } from "@/components/ui/skeleton";

// Immediately loaded components (critical path)
import Index from "./pages/Index";
import SignInForm from "./components/auth/SignInForm";
import SignUpForm from "./components/auth/SignUpForm";
import ConfirmSignUpForm from "./components/auth/ConfirmSignUpForm";
import NotFound from "./pages/NotFound";

// Lazy loaded components (secondary routes)
const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const Toolset = React.lazy(() => import("./pages/Toolset"));
const Lab = React.lazy(() => import("./pages/Lab"));
const Community = React.lazy(() => import("./pages/Community"));
const Observatory = React.lazy(() => import("./pages/Observatory"));
const Education = React.lazy(() => import("./pages/Education"));

// Documentation and resource pages
const Documentation = React.lazy(() => import("./pages/Documentation"));
const Tutorials = React.lazy(() => import("./pages/Tutorials"));
const APIReference = React.lazy(() => import("./pages/APIReference"));
const Status = React.lazy(() => import("./pages/Status"));

// Company and legal pages
const About = React.lazy(() => import("./pages/About"));
const Blog = React.lazy(() => import("./pages/Blog"));
const Careers = React.lazy(() => import("./pages/Careers"));
const Contact = React.lazy(() => import("./pages/Contact"));
const Terms = React.lazy(() => import("./pages/Terms"));
const Privacy = React.lazy(() => import("./pages/Privacy"));
const Cookies = React.lazy(() => import("./pages/Cookies"));
const Licenses = React.lazy(() => import("./pages/Licenses"));
const Pricing = React.lazy(() => import("./pages/Pricing"));

// Service Landing Pages
const ToolsetLanding = React.lazy(() => import("./pages/services/ToolsetLanding"));
const LabLanding = React.lazy(() => import("./pages/services/LabLanding"));
const ObservatoryLanding = React.lazy(() => import("./pages/services/ObservatoryLanding"));
const CommunityLanding = React.lazy(() => import("./pages/services/CommunityLanding"));
const EducationLanding = React.lazy(() => import("./pages/services/EducationLanding"));

// Admin Components
const AdminDashboard = React.lazy(() => import("./components/admin/AdminDashboard"));

// Loading fallback component
const PageSkeleton = () => (
  <div className="min-h-screen bg-background">
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-[300px]" />
            <Skeleton className="h-4 w-[500px]" />
          </div>
          <Skeleton className="h-10 w-[120px]" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-[200px] w-full rounded-lg" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-[80%]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
            <Suspense fallback={<PageSkeleton />}>
              <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            
            {/* Education Hub - Mixed access */}
            <Route path="/education" element={<Education />} />
            
            {/* Dashboard - Requires authentication */}
            <Route path="/dashboard" element={
              <ProtectedRoute requireAuth={true}>
                <Dashboard />
              </ProtectedRoute>
            } />
            
            {/* Studio/Toolset - Requires project creation permission */}
            <Route path="/toolset" element={
              <ProtectedRoute requiredPermission="studio.create_project">
                <Toolset />
              </ProtectedRoute>
            } />
            
            {/* Lab - Requires experiment running permission */}
            <Route path="/lab" element={
              <ProtectedRoute requiredPermission="lab.run_experiments">
                <Lab />
              </ProtectedRoute>
            } />
            
            {/* Community - Requires post creation permission */}
            <Route path="/community" element={
              <ProtectedRoute requiredPermission="community.create_posts">
                <Community />
              </ProtectedRoute>
            } />
            
            {/* Observatory - Requires analytics access */}
            <Route path="/observatory" element={
              <ProtectedRoute requiredPermission="observatory.personal_analytics">
                <Observatory />
              </ProtectedRoute>
            } />
            
            {/* Admin Dashboard - Requires admin permission */}
            <Route path="/admin" element={
              <ProtectedRoute requiredPermission="admin.content_management">
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/auth/signin" element={<SignInForm />} />
            <Route path="/auth/signup" element={<SignUpForm />} />
            <Route path="/auth/confirm" element={<ConfirmSignUpForm />} />
            
            {/* Service Landing Pages - Public Access */}
            <Route path="/services/toolset" element={<ToolsetLanding />} />
            <Route path="/services/lab" element={<LabLanding />} />
            <Route path="/services/observatory" element={<ObservatoryLanding />} />
            <Route path="/services/community" element={<CommunityLanding />} />
            <Route path="/services/education" element={<EducationLanding />} />
            
            {/* Pricing */}
            <Route path="/pricing" element={<Pricing />} />
            {/* Resources */}
            <Route path="/documentation" element={<Documentation />} />
            <Route path="/tutorials" element={<Tutorials />} />
            <Route path="/api-reference" element={<APIReference />} />
            <Route path="/status" element={<Status />} />
            {/* Company */}
            <Route path="/about" element={<About />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/careers" element={<Careers />} />
            <Route path="/contact" element={<Contact />} />
            {/* Legal */}
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/cookies" element={<Cookies />} />
            <Route path="/licenses" element={<Licenses />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
    </HelmetProvider>
  </ErrorBoundary>
);

export default App;
