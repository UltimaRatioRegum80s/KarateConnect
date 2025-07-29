import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="mb-6">
                <i className="fas fa-hand-fist text-6xl text-blue-600 mb-4"></i>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">NKF EXCO Portal</h1>
                <p className="text-gray-600">Executive Committee Dashboard</p>
              </div>
              
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-3">Welcome to the Governance Portal</h2>
                <p className="text-gray-600 mb-4">
                  Access your EXCO rooms and manage federation activities. 
                  This portal is exclusively for Namibia Karate Federation executive committee members.
                </p>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center">
                    <i className="fas fa-info-circle text-blue-600 mr-3"></i>
                    <div className="text-left">
                      <p className="text-sm font-medium text-blue-800">Features Available:</p>
                      <ul className="text-sm text-blue-700 mt-1">
                        <li>• Topic-based discussion rooms</li>
                        <li>• Real-time messaging</li>
                        <li>• Member management</li>
                        <li>• Activity tracking</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              
              <Button 
                onClick={handleLogin}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                size="lg"
              >
                <i className="fas fa-sign-in-alt mr-2"></i>
                Sign In to NKF Portal
              </Button>
              
              <p className="text-xs text-gray-500 mt-4">
                Secure authentication powered by your federation credentials
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
