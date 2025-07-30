import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import type { User } from "@shared/schema";

export default function Header() {
  const { user } = useAuth() as { user: User | undefined };

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
          {/* Logo and Title */}
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <i className="fas fa-hand-fist text-blue-600 text-2xl"></i>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">NKF EXCO Portal</h1>
              <p className="text-sm text-gray-600">Executive Committee Dashboard</p>
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
            
            {/* Install App Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleInstallApp}
              className="hidden sm:flex items-center"
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
