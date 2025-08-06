import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/contexts/AdminContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, useLocation } from "wouter";
import { Home, Settings, ChevronDown, BarChart3, Database, Users } from "lucide-react";
import type { User } from "@shared/schema";

export default function Header() {
  const { user } = useAuth() as { user: User | undefined };
  const { isAdminMode, toggleAdminMode } = useAdmin();
  const [location] = useLocation();

  const handleInstallApp = () => {
    // PWA installation functionality for future implementation
    if ('serviceWorker' in navigator && 'BeforeInstallPromptEvent' in window) {
      // Future PWA installation logic would go here
      alert('Install app functionality would be implemented here');
    } else {
      alert('PWA installation not supported on this device');
    }
  };

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      try {
        await fetch("/api/logout", { method: "POST", credentials: "include" });
        window.location.reload();
      } catch (error) {
        console.error("Logout error:", error);
        window.location.reload();
      }
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Home Button */}
          <div className="flex items-center space-x-4">
            {/* Home Button - Always visible with glow effect on dashboard */}
            <Link href="/">
              <Button
                variant={location === "/" ? "default" : "outline"}
                size="sm"
                className={`relative flex items-center transition-all duration-300 ${
                  location === "/" 
                    ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200" 
                    : "hover:bg-blue-50 border-blue-200"
                }`}
                data-testid="button-home"
                title={location === "/" ? "Scroll to top" : "Go to Dashboard"}
                onClick={(e) => {
                  if (location === "/") {
                    e.preventDefault();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
              >
                <Home className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Dashboard</span>
                <span className="sm:hidden">Home</span>
                {location === "/" && (
                  <div className="absolute inset-0 rounded-md bg-blue-600 opacity-20 animate-pulse"></div>
                )}
              </Button>
            </Link>
            
            <div className="flex-shrink-0">
              <i className="fas fa-hand-fist text-blue-600 text-2xl"></i>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">NKF EXCO Portal</h1>
              <div className="flex items-center space-x-2">
                <p className="text-sm text-gray-600">Executive Committee Dashboard</p>
                {isAdminMode && (
                  <Badge variant="destructive" className="text-xs animate-pulse">
                    ADMIN MODE
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* User Info and Actions */}
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">
                {user?.name || "Admin"}
              </div>
              <div className="text-xs text-red-600 font-medium">
                {user?.title || "President"}
              </div>
            </div>
            
            {/* Admin Mode Toggle with Dropdown */}
            {isAdminMode ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex items-center animate-pulse"
                    data-testid="button-admin-dropdown"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Admin Mode
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => window.location.href = "/"}>
                    <Home className="h-4 w-4 mr-2" />
                    Return to Home
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => window.location.href = "/financial-overview"}>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Federation Stats
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => window.location.href = "/bank-statements"}>
                    <Database className="h-4 w-4 mr-2" />
                    Bank Statements
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={toggleAdminMode}>
                    <Settings className="h-4 w-4 mr-2" />
                    Exit Admin Mode
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={toggleAdminMode}
                className="flex items-center"
                data-testid="button-admin-toggle"
              >
                <Settings className="h-4 w-4 mr-2" />
                Admin Mode
              </Button>
            )}
            
            {/* Install App Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleInstallApp}
              className="hidden sm:flex items-center"
              data-testid="button-install-app"
            >
              <i className="fas fa-download mr-2"></i>
              Install App
            </Button>

            {/* Logout Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-gray-700 hover:text-gray-900"
              data-testid="button-logout"
            >
              <i className="fas fa-sign-out-alt mr-2"></i>
              Logout
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
