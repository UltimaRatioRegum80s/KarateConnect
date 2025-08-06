import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/contexts/AdminContext";
import { useToast } from "@/hooks/use-toast";
import { useUnreadCounts } from "@/hooks/useUnreadCounts";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import ChatRoomCard from "@/components/chat/chat-room-card";
import { DashboardAdminOverlay } from "@/components/admin/dashboard-admin-overlay";
import { AdminEditOverlay } from "@/components/admin/admin-edit-overlay";
import { QuickAccessToolbar } from "@/components/admin/quick-access-toolbar";
import { AdminAnalyticsWidget } from "@/components/admin/admin-analytics-widget";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  DollarSign, 
  FileText, 
  Calendar, 
  Users, 
  TrendingUp, 
  Clock, 
  BarChart3,
  Target,
  Upload,
  Download,
  Settings,
  Eye,
  Move,
  Plus
} from "lucide-react";
import { Link } from "wouter";
import type { User, ChatRoom } from "@shared/schema";

export default function EnhancedDashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth() as { 
    isAuthenticated: boolean; 
    isLoading: boolean; 
    user: User | undefined; 
  };
  
  const { isAdminMode } = useAdmin();
  const [welcomeMessage, setWelcomeMessage] = useState("Welcome to the Executive Committee Dashboard");
  
  // Initialize real-time unread count updates
  useUnreadCounts();

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

  const { data: chatRooms, isLoading: roomsLoading } = useQuery({
    queryKey: ["/api/chat-rooms"],
    enabled: isAuthenticated,
    refetchInterval: 5000,
    refetchIntervalInBackground: true,
  }) as { data: (ChatRoom & { memberCount: number; messageCount: number; unreadCount: number })[] | undefined; isLoading: boolean };

  // Custom welcome message based on user role
  const getPersonalizedWelcome = () => {
    if (!user) return welcomeMessage;
    
    const roleMessages = {
      "president": "Good day, Mr. President. Here's your executive overview.",
      "treasurer": "Welcome, Treasurer. Your financial dashboard awaits.",
      "secretary": "Hello, Secretary General. Today's organizational overview:",
      "admin": "Administrator Dashboard - Full System Access"
    };
    
    return roleMessages[user.role as keyof typeof roleMessages] || welcomeMessage;
  };

  const initializeRooms = async () => {
    try {
      const response = await fetch("/api/initialize", {
        method: "POST",
        credentials: "include",
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Default chat rooms have been initialized",
        });
        window.location.reload();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to initialize rooms",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-6 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-6 w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-6 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h1>
            <p className="text-gray-600">Please log in to access the dashboard.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="container mx-auto px-6 py-8 space-y-8">
        {/* Welcome Section with Admin Controls */}
        <AdminEditOverlay editHint="Edit welcome message">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white relative">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold mb-2" data-testid="text-welcome-title">
                  {getPersonalizedWelcome()}
                </h1>
                <p className="text-blue-100">
                  Current session: {user?.name} • {new Date().toLocaleDateString()}
                </p>
              </div>
              
              {user?.role === 'admin' && (
                <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                  System Administrator
                </Badge>
              )}
            </div>
            
            {isAdminMode && (
              <DashboardAdminOverlay 
                cardType="welcome" 
                cardTitle="Welcome Message"
                onUpdate={(data) => setWelcomeMessage(data.message)}
              />
            )}
          </div>
        </AdminEditOverlay>

        {/* Main Dashboard Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Financial Overview */}
          <AdminEditOverlay editHint="Edit financial projections">
            <Card className="relative">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Financial Overview</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">NAD 42,500</div>
                <p className="text-xs text-muted-foreground">
                  +15.2% from last month
                </p>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Income:</span>
                    <span className="text-green-600">+NAD 18,750</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Expenses:</span>
                    <span className="text-red-600">-NAD 12,250</span>
                  </div>
                </div>
                
                <div className="mt-4 flex space-x-2">
                  <Link href="/financial">
                    <Button size="sm" variant="outline" className="flex-1">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      View Charts
                    </Button>
                  </Link>
                </div>
              </CardContent>
              
              {isAdminMode && (
                <DashboardAdminOverlay 
                  cardType="financial" 
                  cardTitle="Financial Overview"
                />
              )}
            </Card>
          </AdminEditOverlay>

          {/* NKF Calendar */}
          <AdminEditOverlay editHint="Manage calendar events">
            <Card className="relative">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">NKF Calendar</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12 Events</div>
                <p className="text-xs text-muted-foreground">
                  This month • 3 upcoming
                </p>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center text-sm">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                    <span>EXCO Meeting - Tomorrow</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <span>Training Camp - Aug 15</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                    <span>Competition - Aug 20</span>
                  </div>
                </div>
                
                <div className="mt-4">
                  <Link href="/calendar">
                    <Button size="sm" variant="outline" className="w-full">
                      <Calendar className="h-4 w-4 mr-2" />
                      Open Calendar
                    </Button>
                  </Link>
                </div>
              </CardContent>
              
              {isAdminMode && (
                <DashboardAdminOverlay 
                  cardType="calendar" 
                  cardTitle="NKF Calendar"
                />
              )}
            </Card>
          </AdminEditOverlay>

          {/* Bank Statements */}
          <AdminEditOverlay editHint="Upload & analyze statements">
            <Link href="/bank-statements">
              <Card className="relative cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Bank Statements</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">3 Statements</div>
                  <p className="text-xs text-muted-foreground">
                    Last processed: 2 days ago
                  </p>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span>January 2025</span>
                      <Badge variant="secondary" className="text-xs">Processed</Badge>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span>December 2024</span>
                      <Badge variant="secondary" className="text-xs">Processed</Badge>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span>November 2024</span>
                      <Badge variant="outline" className="text-xs">Pending</Badge>
                    </div>
                  </div>
                  
                  {user?.role === 'admin' && (
                    <div className="mt-4 flex space-x-2">
                      <Button size="sm" variant="outline" className="flex-1" onClick={(e) => e.stopPropagation()}>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1" onClick={(e) => e.stopPropagation()}>
                        <FileText className="h-4 w-4 mr-2" />
                        Analyze
                      </Button>
                    </div>
                  )}
                </CardContent>
                
                {isAdminMode && (
                  <DashboardAdminOverlay 
                    cardType="bank-statements" 
                    cardTitle="Bank Statements"
                  />
                )}
              </Card>
            </Link>
          </AdminEditOverlay>
        </div>

        {/* Visual Editor Shortcuts (Admin Mode Only) */}
        {isAdminMode && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-red-700">
                <Settings className="h-5 w-5" />
                <span>Dashboard Visual Editor</span>
                <Badge variant="destructive">ADMIN MODE</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button 
                  variant="outline" 
                  className="flex items-center space-x-2"
                  data-testid="button-add-widget"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Widget</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="flex items-center space-x-2"
                  data-testid="button-rearrange-sections"
                >
                  <Move className="h-4 w-4" />
                  <span>Rearrange</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="flex items-center space-x-2"
                  data-testid="button-collapse-sections"
                >
                  <Eye className="h-4 w-4" />
                  <span>Visibility</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="flex items-center space-x-2"
                  data-testid="button-customize-welcome"
                >
                  <Target className="h-4 w-4" />
                  <span>Personalize</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Chat Rooms Section */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Communication Channels</h2>
            {chatRooms && chatRooms.length > 0 && (
              <Badge variant="outline" className="text-sm">
                {chatRooms.reduce((total: number, room: any) => total + (room.unreadCount || 0), 0)} unread messages
              </Badge>
            )}
          </div>

          {roomsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-gray-200 rounded mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : chatRooms && chatRooms.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {chatRooms.map((room: any) => (
                <ChatRoomCard key={room.id} room={room} />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Chat Rooms Available</h3>
                <p className="text-gray-600 mb-4">
                  Initialize the default chat rooms to get started with federation discussions.
                </p>
                <Button onClick={initializeRooms} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Initialize Default Rooms
                </Button>
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
                  <Users className="text-blue-600 h-5 w-5" />
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
                  <TrendingUp className="text-emerald-500 h-5 w-5" />
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
                <div className="p-2 bg-blue-50 rounded-lg mr-3">
                  <Users className="text-blue-600 h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">EXCO Members</h3>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {chatRooms ? Math.max(...(chatRooms.map((room: any) => room.memberCount || 0).concat([8]))) : 8}
                </div>
                <p className="text-sm text-gray-600">Active members</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Admin Components */}
        <QuickAccessToolbar />
        <AdminAnalyticsWidget />
      </main>
    </div>
  );
}