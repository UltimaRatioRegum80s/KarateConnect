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
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  DollarSign, 
  FileText, 
  Calendar, 
  Users, 
  TrendingUp, 
  BarChart3,
  Target,
  Upload,
  Settings,
  Eye,
  Move,
  Plus,
  MessageSquare,
  ChevronRight,
  ArrowRight
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
  
  useUnreadCounts();

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

  const totalUnreadMessages = chatRooms?.reduce((total: number, room: any) => total + (room.unreadCount || 0), 0) || 0;
  const totalMessages = chatRooms?.reduce((total: number, room: any) => total + (room.messageCount || 0), 0) || 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-6 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-6 w-1/3"></div>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
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
      
      <main className="container mx-auto px-6 py-8 space-y-6">
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

        {/* Main Accordion Dashboard Sections */}
        <Accordion type="multiple" defaultValue={["finances"]} className="space-y-4">
          
          {/* FINANCES SECTION */}
          <AccordionItem value="finances" className="border rounded-lg bg-white shadow-sm overflow-hidden">
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-gray-50" data-testid="accordion-finances">
              <div className="flex items-center space-x-4 w-full">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1 text-left">
                  <h2 className="text-lg font-semibold text-gray-900">Finances</h2>
                  <p className="text-sm text-gray-500">Financial overview, charts & projections</p>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  NAD 42,500
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <AdminEditOverlay editHint="Edit financial projections">
                <div className="relative">
                  <Link href="/financial">
                    <div className="cursor-pointer group">
                      <Card className="hover:shadow-md transition-shadow border-2 border-transparent hover:border-green-200">
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <div className="text-3xl font-bold text-green-600">NAD 42,500</div>
                              <p className="text-sm text-gray-500 mt-1">
                                +15.2% from last month
                              </p>
                            </div>
                            <Button variant="ghost" size="sm" className="group-hover:bg-green-100">
                              <span className="mr-2">View Charts</span>
                              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                            </Button>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-6 mt-4">
                            <div className="bg-green-50 rounded-lg p-4">
                              <div className="flex items-center space-x-2 mb-2">
                                <TrendingUp className="h-4 w-4 text-green-600" />
                                <span className="text-sm font-medium text-gray-700">Income</span>
                              </div>
                              <div className="text-xl font-bold text-green-600">+NAD 18,750</div>
                            </div>
                            <div className="bg-red-50 rounded-lg p-4">
                              <div className="flex items-center space-x-2 mb-2">
                                <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />
                                <span className="text-sm font-medium text-gray-700">Expenses</span>
                              </div>
                              <div className="text-xl font-bold text-red-600">-NAD 12,250</div>
                            </div>
                          </div>

                          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
                            <span>Click to view detailed financial charts and reports</span>
                            <ChevronRight className="h-4 w-4" />
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </Link>
                  
                  {isAdminMode && (
                    <DashboardAdminOverlay 
                      cardType="financial" 
                      cardTitle="Financial Overview"
                    />
                  )}
                </div>
              </AdminEditOverlay>
            </AccordionContent>
          </AccordionItem>

          {/* CALENDAR SECTION */}
          <AccordionItem value="calendar" className="border rounded-lg bg-white shadow-sm overflow-hidden">
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-gray-50" data-testid="accordion-calendar">
              <div className="flex items-center space-x-4 w-full">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1 text-left">
                  <h2 className="text-lg font-semibold text-gray-900">Calendar</h2>
                  <p className="text-sm text-gray-500">NKF events, meetings & schedules</p>
                </div>
                <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                  12 Events
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <AdminEditOverlay editHint="Manage calendar events">
                <div className="relative">
                  <Link href="/calendar">
                    <div className="cursor-pointer group">
                      <Card className="hover:shadow-md transition-shadow border-2 border-transparent hover:border-blue-200">
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <div className="text-3xl font-bold text-blue-600">12 Events</div>
                              <p className="text-sm text-gray-500 mt-1">
                                This month • 3 upcoming
                              </p>
                            </div>
                            <Button variant="ghost" size="sm" className="group-hover:bg-blue-100">
                              <span className="mr-2">Open Calendar</span>
                              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                            </Button>
                          </div>
                          
                          <div className="space-y-3 mt-4">
                            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                              <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                              <div className="flex-1">
                                <span className="font-medium text-gray-900">EXCO Meeting</span>
                                <span className="text-sm text-gray-500 ml-2">Tomorrow</span>
                              </div>
                            </div>
                            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                              <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                              <div className="flex-1">
                                <span className="font-medium text-gray-900">Training Camp</span>
                                <span className="text-sm text-gray-500 ml-2">Aug 15</span>
                              </div>
                            </div>
                            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                              <div className="w-3 h-3 bg-orange-500 rounded-full mr-3"></div>
                              <div className="flex-1">
                                <span className="font-medium text-gray-900">Competition</span>
                                <span className="text-sm text-gray-500 ml-2">Aug 20</span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
                            <span>Click to view full calendar with all NKF events</span>
                            <ChevronRight className="h-4 w-4" />
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </Link>
                  
                  {isAdminMode && (
                    <DashboardAdminOverlay 
                      cardType="calendar" 
                      cardTitle="NKF Calendar"
                    />
                  )}
                </div>
              </AdminEditOverlay>
            </AccordionContent>
          </AccordionItem>

          {/* STATEMENTS SECTION */}
          <AccordionItem value="statements" className="border rounded-lg bg-white shadow-sm overflow-hidden">
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-gray-50" data-testid="accordion-statements">
              <div className="flex items-center space-x-4 w-full">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <FileText className="h-6 w-6 text-purple-600" />
                </div>
                <div className="flex-1 text-left">
                  <h2 className="text-lg font-semibold text-gray-900">Statements</h2>
                  <p className="text-sm text-gray-500">Bank statement uploads & analysis</p>
                </div>
                <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                  3 Statements
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <AdminEditOverlay editHint="Upload & analyze statements">
                <div className="relative">
                  <Link href="/bank-statements">
                    <div className="cursor-pointer group">
                      <Card className="hover:shadow-md transition-shadow border-2 border-transparent hover:border-purple-200">
                        <CardContent className="p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <div className="text-3xl font-bold text-purple-600">3 Statements</div>
                              <p className="text-sm text-gray-500 mt-1">
                                Last processed: 2 days ago
                              </p>
                            </div>
                            <Button variant="ghost" size="sm" className="group-hover:bg-purple-100">
                              <span className="mr-2">View All</span>
                              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                            </Button>
                          </div>
                          
                          <div className="space-y-3 mt-4">
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <span className="font-medium text-gray-900">January 2025</span>
                              <Badge variant="secondary" className="bg-green-100 text-green-700">Processed</Badge>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <span className="font-medium text-gray-900">December 2024</span>
                              <Badge variant="secondary" className="bg-green-100 text-green-700">Processed</Badge>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <span className="font-medium text-gray-900">November 2024</span>
                              <Badge variant="outline" className="text-orange-600 border-orange-300">Pending</Badge>
                            </div>
                          </div>

                          {user?.role === 'admin' && (
                            <div className="mt-4 pt-4 border-t border-gray-100 flex space-x-3">
                              <Button size="sm" variant="outline" className="flex-1" onClick={(e) => e.preventDefault()}>
                                <Upload className="h-4 w-4 mr-2" />
                                Upload
                              </Button>
                              <Button size="sm" variant="outline" className="flex-1" onClick={(e) => e.preventDefault()}>
                                <BarChart3 className="h-4 w-4 mr-2" />
                                Analyze
                              </Button>
                            </div>
                          )}

                          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
                            <span>Click to manage bank statements and view analysis</span>
                            <ChevronRight className="h-4 w-4" />
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </Link>
                  
                  {isAdminMode && (
                    <DashboardAdminOverlay 
                      cardType="bank-statements" 
                      cardTitle="Bank Statements"
                    />
                  )}
                </div>
              </AdminEditOverlay>
            </AccordionContent>
          </AccordionItem>

          {/* COMMUNICATION CHANNELS SECTION */}
          <AccordionItem value="communication" className="border rounded-lg bg-white shadow-sm overflow-hidden">
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-gray-50" data-testid="accordion-communication">
              <div className="flex items-center space-x-4 w-full">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <MessageSquare className="h-6 w-6 text-orange-600" />
                </div>
                <div className="flex-1 text-left">
                  <h2 className="text-lg font-semibold text-gray-900">Communication Channels</h2>
                  <p className="text-sm text-gray-500">Chat rooms & team discussions</p>
                </div>
                <div className="flex items-center space-x-2">
                  {totalUnreadMessages > 0 && (
                    <Badge variant="destructive" className="animate-pulse">
                      {totalUnreadMessages} unread
                    </Badge>
                  )}
                  <Badge variant="secondary" className="bg-orange-100 text-orange-700">
                    {chatRooms?.length || 0} Rooms
                  </Badge>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              {roomsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center mb-4">
                <div className="p-2 bg-blue-50 rounded-lg mr-3">
                  <Users className="text-blue-600 h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Recent Messages</h3>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900 mb-1">{totalMessages}</div>
                <p className="text-sm text-gray-600">Total messages</p>
              </div>
            </CardContent>
          </Card>

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
