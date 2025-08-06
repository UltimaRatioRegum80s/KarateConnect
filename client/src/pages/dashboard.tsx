import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, FileText, Calendar, Users, TrendingUp, Clock } from "lucide-react";
import { Link } from "wouter";
import type { User } from "@shared/schema";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth() as { 
    isAuthenticated: boolean; 
    isLoading: boolean; 
    user: User | undefined; 
  };

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);



  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-blue-600 mb-4"></i>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.name || "Admin"}
          </h2>
          <p className="text-gray-600">
            Access your EXCO rooms and manage federation activities.
          </p>
        </div>

        {/* Quick Actions Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Financial Overview</h3>
                    <p className="text-sm text-muted-foreground">View financial status and projections</p>
                  </div>
                </div>
                <Link href="/financial">
                  <Button variant="outline">View</Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                    <Calendar className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">NKF Calendar</h3>
                    <p className="text-sm text-muted-foreground">View events and competitions</p>
                  </div>
                </div>
                <Link href="/calendar">
                  <Button variant="outline">View</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
          
          {(user?.role === "admin" || user?.role === "president") && (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                      <FileText className="h-6 w-6 text-yellow-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Bank Statements</h3>
                      <p className="text-sm text-muted-foreground">Upload and analyze bank statements (Admin Only)</p>
                    </div>
                  </div>
                  <Link href="/bank-statements">
                    <Button variant="outline">Manage</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>



        {/* Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Recent Messages */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-blue-50 rounded-lg mr-3">
                  <i className="fas fa-message text-blue-600 text-lg"></i>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Recent Messages</h3>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {chatRooms ? chatRooms.reduce((total: number, room: any) => total + (room.messageCount || 0), 0) : 0}
                </div>
                <p className="text-sm text-gray-600">Total messages</p>
              </div>
            </CardContent>
          </Card>

          {/* Active Polls */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-green-50 rounded-lg mr-3">
                  <i className="fas fa-poll text-emerald-500 text-lg"></i>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Active Polls</h3>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900 mb-1">0</div>
                <p className="text-sm text-gray-600">No active polls</p>
              </div>
            </CardContent>
          </Card>

          {/* EXCO Members */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-purple-50 rounded-lg mr-3">
                  <i className="fas fa-users text-purple-500 text-lg"></i>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">EXCO Members</h3>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {chatRooms ? Math.max(...(chatRooms.map((room: any) => room.memberCount || 0).concat([1]))) : 1}
                </div>
                <p className="text-sm text-gray-600">Active members</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
