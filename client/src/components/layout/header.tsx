import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/contexts/AdminContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";
import { Home, Settings } from "lucide-react";
import type { User } from "@shared/schema";

export default function Header() {
  const { user } = useAuth() as { user: User | undefined };
  const { isAdminMode, toggleAdminMode } = useAdmin();
  const [location] = useLocation();

  const handleInstallApp = () => {
    // TODO: Implement PWA installation prompt
    alert('Install app functionality would be implemented here');
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
          {/* Logo, Title, and Navigation */}
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <i className="fas fa-hand-fist text-blue-600 text-2xl"></i>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">NKF EXCO Portal</h1>
              <div className="flex items-center space-x-2">
                <p className="text-sm text-gray-600">Executive Committee Dashboard</p>
                {isAdminMode && (
                  <Badge variant="destructive" className="text-xs">
                    ADMIN MODE
                  </Badge>
                )}
              </div>
            </div>
            
            {/* Home Button - show on all pages except dashboard */}
            {location !== "/" && (
              <Link href="/">
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-4 flex items-center"
                  data-testid="button-home"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Home
                </Button>
              </Link>
            )}
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
            
            {/* Admin Mode Toggle */}
            <Button
              variant={isAdminMode ? "destructive" : "outline"}
              size="sm"
              onClick={toggleAdminMode}
              className="flex items-center"
              data-testid="button-admin-toggle"
            >
              <Settings className="h-4 w-4 mr-2" />
              {isAdminMode ? "Exit Admin" : "Admin Mode"}
            </Button>
            
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
