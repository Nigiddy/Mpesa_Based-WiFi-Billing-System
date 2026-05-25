import { ReactNode } from "react";
import { Bell, Menu, UserCircle } from "lucide-react"; 

interface AdminHeaderProps {
  children?: ReactNode;
  onMenuToggle?: () => void;
}

const AdminHeader = ({ children, onMenuToggle }: AdminHeaderProps) => (
  <header className="sticky top-0 z-50 w-full border-b border-neutral-200/50 bg-white/80 backdrop-blur-md transition-all duration-300 dark:border-neutral-800/60 dark:bg-black/80">
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex h-16 items-center justify-between">
        
        {/* Left Section: Mobile Menu & Brand */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          
          
          
        </div>

        {/* Right Section: Children & Actions */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {children} 
          
          <div className="flex items-center space-x-1 sm:space-x-2">
            {/* Notification Bell */}
            <button className="relative rounded-full p-2 text-neutral-500 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-900">
              <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-blue-500 ring-2 ring-white dark:ring-black"></span>
              <Bell className="h-5 w-5" />
            </button>

            {/* User Profile */}
            <button className="flex items-center space-x-2 rounded-full border border-neutral-200/50 bg-neutral-50 p-1 pr-3 transition-colors hover:bg-neutral-100 dark:border-neutral-800/60 dark:bg-neutral-900 dark:hover:bg-neutral-800">
              <UserCircle className="h-7 w-7 text-neutral-400" />
              <span className="hidden text-sm font-medium text-neutral-700 sm:block dark:text-neutral-200">
                Admin
              </span>
            </button>
          </div>
        </div>
        
      </div>
    </div>
  </header>
);

export default AdminHeader;