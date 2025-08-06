import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Shield, Users, Settings } from "lucide-react";

export default function Login() {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ name, pin }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      toast({
        title: "Welcome to NKF Portal",
        description: `Logged in as ${data.name}`,
      });

      // Invalidate auth queries to trigger re-fetch
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      // Small delay to ensure query refetch completes
      setTimeout(() => {
        setLocation("/");
      }, 100);
    } catch (error) {
      setError((error as Error).message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInitialize = async () => {
    try {
      const response = await fetch("/api/auth/initialize", {
        method: "POST",
        credentials: "include",
      });

      if (response.ok) {
        toast({
          title: "System Initialized",
          description: "Test data has been set up successfully",
        });
      }
    } catch (error) {
      // Silent fail for initialization in production
      if (process.env.NODE_ENV === 'development') {
        console.error("Initialization failed:", error);
      }
      toast({
        title: "Initialization Error",
        description: "Could not initialize system. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Main Login Card */}
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">NKF EXCO Portal</CardTitle>
            <CardDescription className="text-gray-600">
              Executive Committee Dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="pin">PIN</Label>
                <Input
                  id="pin"
                  type="password"
                  placeholder="Enter your PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  required
                  className="w-full"
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={isLoading}
              >
                {isLoading ? "Signing in..." : "Sign In to NKF Portal"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Test Account Info */}
        <Card className="shadow-lg bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Test Account:
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="font-medium">Test User</span>
                <Badge variant="outline">PIN: 1234</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Initialize System */}
        <Card className="shadow-lg bg-gray-50 border-gray-200">
          <CardContent className="pt-6">
            <Button 
              onClick={handleInitialize}
              variant="outline" 
              className="w-full"
            >
              <Settings className="w-4 h-4 mr-2" />
              Initialize System
            </Button>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Secure access for NKF executive committee members
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}