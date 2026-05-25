"use client"

import { ReactNode } from "react";
import { Bell, Menu, UserCircle, LogOut } from "lucide-react"; 
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface AdminHeaderProps {
  children?: ReactNode;
  onMenuToggle?: () => void;
}

const AdminHeader = ({ children, onMenuToggle }: AdminHeaderProps) => {
  const { admin, logout } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md transition-all duration-300">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          
          {/* Left Section: Mobile Menu & Brand */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            {onMenuToggle && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="md:hidden" 
                onClick={onMenuToggle}
                aria-label="Toggle Menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}
            <div className="flex items-center">
            </div>
          </div>

          {/* Right Section: Actions & Profile */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {children} 
            
            <div className="flex items-center space-x-1 sm:space-x-2">
              {/* Notification Bell */}
              <button 
                className="relative rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                aria-label="Notifications"
              >
                <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-blue-500 ring-2 ring-background"></span>
                <Bell className="h-5 w-5" />
              </button>

              {/* User Profile Dropdown */}
              {admin && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center space-x-2 rounded-full border border-border/50 bg-background p-1 pr-3 transition-colors hover:bg-accent hover:text-accent-foreground">
                      <UserCircle className="h-7 w-7 text-muted-foreground" />
                      <span className="hidden text-sm font-medium text-foreground sm:block">
                        Admin
                      </span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">Admin Account</p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {admin.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer" onClick={logout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
          
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;