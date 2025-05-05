
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Search, Menu, X, Bell, User } from "lucide-react";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { WorkbbenchLogo } from "./WorkbbenchLogo";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
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
                <Link to="/education" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Education</Link>
                <Link to="/toolset" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Toolset</Link>
                <Link to="/lab" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">AI Lab</Link>
                <Link to="/community" className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Community</Link>
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
              <Button variant="ghost" size="icon" className="rounded-full">
                <Bell className="h-5 w-5" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full bg-workbbench-purple/20">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem className="cursor-pointer">Profile</DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer">Settings</DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer">Sign out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
            <Link to="/education" className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium">Education</Link>
            <Link to="/toolset" className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium">Toolset</Link>
            <Link to="/lab" className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium">AI Lab</Link>
            <Link to="/community" className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium">Community</Link>
            <div className="pt-4 pb-3 border-t border-white/10">
              <div className="mt-3 px-2 space-y-1">
                <Link to="/profile" className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium">Profile</Link>
                <Link to="/settings" className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium">Settings</Link>
                <button className="text-gray-300 hover:text-white block w-full text-left px-3 py-2 rounded-md text-base font-medium">Sign out</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
