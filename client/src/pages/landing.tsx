import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Landing() {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const loginMutation = useMutation({
    mutationFn: async (credentials: { name: string; pin: string }) => {
      return apiRequest("/api/login", {
        method: "POST",
        body: JSON.stringify(credentials),
        headers: {
          "Content-Type": "application/json",
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Success",
        description: "Welcome to NKF EXCO Portal!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid credentials. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !pin.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter both name and PIN.",
        variant: "destructive",
      });
      return;
    }
    loginMutation.mutate({ name: name.trim(), pin: pin.trim() });
  };

  const handleInitialize = async () => {
    try {
      const response = await fetch("/api/initialize", {
        method: "POST",
      });
      
      if (response.ok) {
        toast({
          title: "Setup Complete",
          description: "Default users and rooms have been created. You can now log in!",
        });
      }
    } catch (error) {
      toast({
        title: "Setup Error",
        description: "Failed to initialize the system.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        <Card>
          <CardHeader className="text-center">
            <div className="mb-4">
              <i className="fas fa-hand-fist text-6xl text-blue-600 mb-4"></i>
              <CardTitle className="text-3xl font-bold text-gray-900">NKF EXCO Portal</CardTitle>
              <p className="text-gray-600">Executive Committee Dashboard</p>
            </div>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loginMutation.isPending}
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
                  disabled={loginMutation.isPending}
                  maxLength={6}
                />
              </div>

              <Button 
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                size="lg"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Signing In...
                  </>
                ) : (
                  <>
                    <i className="fas fa-sign-in-alt mr-2"></i>
                    Sign In to NKF Portal
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="text-center">
                  <p className="text-sm font-medium text-blue-800 mb-2">Default Test Accounts:</p>
                  <div className="text-xs text-blue-700 space-y-1">
                    <div>Admin President / PIN: 1234</div>
                    <div>Vice President / PIN: 5678</div>
                    <div>Secretary / PIN: 9012</div>
                  </div>
                </div>
              </div>
              
              <Button 
                onClick={handleInitialize}
                variant="outline"
                className="w-full"
                size="sm"
              >
                <i className="fas fa-cog mr-2"></i>
                Initialize System
              </Button>
            </div>
            
            <p className="text-xs text-gray-500 mt-4 text-center">
              Secure access for NKF executive committee members
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
