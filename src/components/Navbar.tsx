
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
import { usePermissions } from "@/hooks/usePermissions";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, isAuthenticated, signOut } = useAuth();
  const { hasPermission } = usePermissions();

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
              <div className="flex items-center space-x-6">
                {/* Website Navigation Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center">
                    Services
                    <svg className="ml-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    <Link to="/services/toolset">
                      <DropdownMenuItem className="cursor-pointer">
                        <div>
                          <div className="font-medium">AI Toolset</div>
                          <div className="text-xs text-muted-foreground">Visual agent builder</div>
                        </div>
                      </DropdownMenuItem>
                    </Link>
                    <Link to="/services/lab">
                      <DropdownMenuItem className="cursor-pointer">
                        <div>
                          <div className="font-medium">AI Lab</div>
                          <div className="text-xs text-muted-foreground">Experimentation environment</div>
                        </div>
                      </DropdownMenuItem>
                    </Link>
                    <Link to="/services/observatory">
                      <DropdownMenuItem className="cursor-pointer">
                        <div>
                          <div className="font-medium">Observatory</div>
                          <div className="text-xs text-muted-foreground">Data visualization & analytics</div>
                        </div>
                      </DropdownMenuItem>
                    </Link>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <DropdownMenu>
                  <DropdownMenuTrigger className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center">
                    Features
                    <svg className="ml-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-64">
                    <DropdownMenuItem className="cursor-pointer">
                      <div>
                        <div className="font-medium">Visual Agent Builder</div>
                        <div className="text-xs text-muted-foreground">Drag-and-drop AI agent creation</div>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer">
                      <div>
                        <div className="font-medium">Cloud Experimentation</div>
                        <div className="text-xs text-muted-foreground">Secure AI model testing</div>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer">
                      <div>
                        <div className="font-medium">Real-time Collaboration</div>
                        <div className="text-xs text-muted-foreground">Team-based AI development</div>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer">
                      <div>
                        <div className="font-medium">Advanced Analytics</div>
                        <div className="text-xs text-muted-foreground">Performance insights & metrics</div>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                <Link to="/pricing" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
                  Pricing
                </Link>
                
                <Link to="/services/community" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
                  Community
                </Link>
                
                <Link to="/services/education" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">
                  Education
                </Link>
              </div>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="ml-4 flex items-center space-x-4">
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
              {isAuthenticated && (
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Bell className="h-5 w-5" />
                </Button>
              )}
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
                    </div>
                    <DropdownMenuSeparator />
                    <Link to="/dashboard">
                      <DropdownMenuItem className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        Profile
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
          <div className="md:hidden flex items-center">
            <Button variant="ghost" size="icon" onClick={toggleMenu}>
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-workbbench-dark-purple/95 backdrop-blur-md">
            {/* Website Navigation Menu - Mobile */}
            <div className="text-white font-medium px-3 py-2 text-sm">Services</div>
            <Link to="/toolset" className="text-gray-300 hover:text-white block px-6 py-2 rounded-md text-base font-medium">AI Toolset</Link>
            <Link to="/lab" className="text-gray-300 hover:text-white block px-6 py-2 rounded-md text-base font-medium">AI Lab</Link>
            <Link to="/observatory" className="text-gray-300 hover:text-white block px-6 py-2 rounded-md text-base font-medium">Observatory</Link>
            
            <Link to="/pricing" className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium">Pricing</Link>
            <Link to="/community" className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium">Community</Link>
            <Link to="/education" className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium">Education</Link>
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
                    </div>
                  </div>
                  <div className="mt-3 px-2 space-y-1">
                    <Link to="/dashboard" className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium">Profile</Link>
                    <Link to="/settings" className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium">Settings</Link>
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
                  <Link to="/auth/signin" className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium">Sign In</Link>
                  <Link to="/auth/signup" className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium">Sign Up</Link>
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
