
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
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
            <Route path="/" element={<Index />} />
            <Route path="/education" element={<Education />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/toolset" element={<Toolset />} />
            <Route path="/lab" element={<Lab />} />
            <Route path="/community" element={<Community />} />
            <Route path="/observatory" element={<Observatory />} />
            <Route path="/auth/signin" element={<SignInForm />} />
            <Route path="/auth/signup" element={<SignUpForm />} />
            <Route path="/auth/confirm" element={<ConfirmSignUpForm />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
