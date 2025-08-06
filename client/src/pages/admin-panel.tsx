import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/contexts/AdminContext";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { 
  Settings, 
  Edit3, 
  Palette, 
  Users, 
  Bell, 
  Save, 
  Upload,
  Home,
  Shield,
  AlertCircle,
  FileImage,
  Type,
  MessageSquare
} from "lucide-react";
import Header from "@/components/layout/header";

export default function AdminPanel() {
  const { user } = useAuth();
  const { isAdminMode } = useAdmin();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Interface Text Management
  const [interfaceTexts, setInterfaceTexts] = useState({
    dashboardTitle: "NKF EXCO Portal",
    welcomeMessage: "Welcome to the Executive Committee Dashboard",
    chatRoomsTitle: "Chat Rooms",
    financialTitle: "Financial Overview",
    calendarTitle: "Calendar & Events",
    footerText: "© 2025 Namibia Karate Federation"
  });

  // Theme Management
  const [themeSettings, setThemeSettings] = useState({
    primaryColor: "#10B981",
    secondaryColor: "#3B82F6",
    accentColor: "#F59E0B",
    logoUrl: "",
    bannerText: "Namibia Karate Federation - Executive Committee"
  });

  // Access Control Management
  const [userRoles, setUserRoles] = useState([
    { id: "1001", name: "David Mwandingi", role: "President", permissions: ["all"] },
    { id: "1002", name: "System Admin", role: "Administrator", permissions: ["all"] },
    { id: "1003", name: "Martin Jasper", role: "Vice President", permissions: ["chat", "calendar", "financial_view"] },
    { id: "1004", name: "Hilma Hausiku", role: "Secretary General", permissions: ["chat", "calendar", "financial_edit"] }
  ]);

  const [notificationSettings, setNotificationSettings] = useState({
    globalMute: false,
    autoMarkRead: false,
    resetAllBadges: false
  });

  // Redirect if not admin
  if (!isAdminMode) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto p-6">
          <Alert className="max-w-md mx-auto">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Admin mode is required to access this panel. Please enable admin mode from the header menu.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const handleSaveInterfaceTexts = async () => {
    try {
      const response = await fetch('/api/admin/interface-texts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(interfaceTexts)
      });

      if (response.ok) {
        toast({
          title: "Interface Texts Updated",
          description: "Changes will be reflected across the platform"
        });
      }
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Could not save interface text changes",
        variant: "destructive"
      });
    }
  };

  const handleSaveTheme = async () => {
    try {
      const response = await fetch('/api/admin/theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(themeSettings)
      });

      if (response.ok) {
        toast({
          title: "Theme Updated",
          description: "New branding applied successfully"
        });
      }
    } catch (error) {
      toast({
        title: "Theme Update Failed",
        description: "Could not apply theme changes",
        variant: "destructive"
      });
    }
  };

  const handleResetNotificationBadges = async () => {
    try {
      const response = await fetch('/api/admin/reset-badges', {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        toast({
          title: "Badges Reset",
          description: "All notification badges have been cleared"
        });
      }
    } catch (error) {
      toast({
        title: "Reset Failed",
        description: "Could not reset notification badges",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Home Button */}
            <Button
              variant="outline"
              size="sm"
              className="flex items-center transition-all duration-300 hover:bg-blue-50 border-blue-200"
              data-testid="button-home"
              title="Go to Dashboard"
              onClick={() => setLocation("/")}
            >
              <Home className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Dashboard</span>
              <span className="sm:hidden">Home</span>
            </Button>
            
            <div className="flex items-center space-x-2">
              <Settings className="h-6 w-6 text-blue-600" />
              <h1 className="text-2xl font-bold">Admin Panel</h1>
              <Badge variant="secondary" className="bg-red-100 text-red-800">
                <Shield className="h-3 w-3 mr-1" />
                Admin Mode
              </Badge>
            </div>
          </div>
        </div>

        <Tabs defaultValue="interface" className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl">
            <TabsTrigger value="interface" className="flex items-center space-x-2">
              <Edit3 className="h-4 w-4" />
              <span>Interface</span>
            </TabsTrigger>
            <TabsTrigger value="theme" className="flex items-center space-x-2">
              <Palette className="h-4 w-4" />
              <span>Theme</span>
            </TabsTrigger>
            <TabsTrigger value="access" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>Access</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center space-x-2">
              <Bell className="h-4 w-4" />
              <span>Notifications</span>
            </TabsTrigger>
          </TabsList>

          {/* Interface Text Management */}
          <TabsContent value="interface" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Type className="h-5 w-5" />
                  <span>Edit Interface Texts</span>
                </CardTitle>
                <CardDescription>
                  Customize labels, descriptions, and messaging across the platform
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dashboard-title">Dashboard Title</Label>
                    <Input
                      id="dashboard-title"
                      value={interfaceTexts.dashboardTitle}
                      onChange={(e) => setInterfaceTexts(prev => ({...prev, dashboardTitle: e.target.value}))}
                      data-testid="input-dashboard-title"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="chat-title">Chat Rooms Title</Label>
                    <Input
                      id="chat-title"
                      value={interfaceTexts.chatRoomsTitle}
                      onChange={(e) => setInterfaceTexts(prev => ({...prev, chatRoomsTitle: e.target.value}))}
                      data-testid="input-chat-title"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="financial-title">Financial Title</Label>
                    <Input
                      id="financial-title"
                      value={interfaceTexts.financialTitle}
                      onChange={(e) => setInterfaceTexts(prev => ({...prev, financialTitle: e.target.value}))}
                      data-testid="input-financial-title"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="calendar-title">Calendar Title</Label>
                    <Input
                      id="calendar-title"
                      value={interfaceTexts.calendarTitle}
                      onChange={(e) => setInterfaceTexts(prev => ({...prev, calendarTitle: e.target.value}))}
                      data-testid="input-calendar-title"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="welcome-message">Welcome Message</Label>
                  <Textarea
                    id="welcome-message"
                    value={interfaceTexts.welcomeMessage}
                    onChange={(e) => setInterfaceTexts(prev => ({...prev, welcomeMessage: e.target.value}))}
                    data-testid="textarea-welcome-message"
                    rows={3}
                  />
                </div>

                <Button onClick={handleSaveInterfaceTexts} className="w-full md:w-auto" data-testid="button-save-interface">
                  <Save className="h-4 w-4 mr-2" />
                  Save Interface Changes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Theme & Branding */}
          <TabsContent value="theme" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Palette className="h-5 w-5" />
                  <span>Theme & Branding Controls</span>
                </CardTitle>
                <CardDescription>
                  Upload federation logo, customize color palette, and banner settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="primary-color">Primary Color</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="primary-color"
                        type="color"
                        value={themeSettings.primaryColor}
                        onChange={(e) => setThemeSettings(prev => ({...prev, primaryColor: e.target.value}))}
                        className="w-16 h-10 p-1 border rounded"
                        data-testid="input-primary-color"
                      />
                      <Input
                        value={themeSettings.primaryColor}
                        onChange={(e) => setThemeSettings(prev => ({...prev, primaryColor: e.target.value}))}
                        data-testid="input-primary-color-text"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="secondary-color">Secondary Color</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="secondary-color"
                        type="color"
                        value={themeSettings.secondaryColor}
                        onChange={(e) => setThemeSettings(prev => ({...prev, secondaryColor: e.target.value}))}
                        className="w-16 h-10 p-1 border rounded"
                        data-testid="input-secondary-color"
                      />
                      <Input
                        value={themeSettings.secondaryColor}
                        onChange={(e) => setThemeSettings(prev => ({...prev, secondaryColor: e.target.value}))}
                        data-testid="input-secondary-color-text"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accent-color">Accent Color</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="accent-color"
                        type="color"
                        value={themeSettings.accentColor}
                        onChange={(e) => setThemeSettings(prev => ({...prev, accentColor: e.target.value}))}
                        className="w-16 h-10 p-1 border rounded"
                        data-testid="input-accent-color"
                      />
                      <Input
                        value={themeSettings.accentColor}
                        onChange={(e) => setThemeSettings(prev => ({...prev, accentColor: e.target.value}))}
                        data-testid="input-accent-color-text"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="banner-text">Banner Text</Label>
                  <Input
                    id="banner-text"
                    value={themeSettings.bannerText}
                    onChange={(e) => setThemeSettings(prev => ({...prev, bannerText: e.target.value}))}
                    placeholder="Organization banner text"
                    data-testid="input-banner-text"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Federation Logo</Label>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" data-testid="button-upload-logo">
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Logo
                    </Button>
                    <span className="text-sm text-gray-500">
                      {themeSettings.logoUrl ? "Logo uploaded" : "No logo uploaded"}
                    </span>
                  </div>
                </div>

                <Button onClick={handleSaveTheme} className="w-full md:w-auto" data-testid="button-save-theme">
                  <Save className="h-4 w-4 mr-2" />
                  Apply Theme Changes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Access Control */}
          <TabsContent value="access" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Access Control Management</span>
                </CardTitle>
                <CardDescription>
                  Manage user roles, permissions, and room access controls
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {userRoles.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Users className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-gray-500">{user.role}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {user.permissions.includes("all") ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            Full Access
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            Limited Access
                          </Badge>
                        )}
                        <Button variant="outline" size="sm" data-testid={`button-edit-user-${user.id}`}>
                          Edit
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notification Management */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bell className="h-5 w-5" />
                  <span>Notification Badge Editor</span>
                </CardTitle>
                <CardDescription>
                  Manage notification badges, mark messages as read/unread, and reset counts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium flex items-center">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Badge Controls
                    </h4>
                    
                    <Button 
                      onClick={handleResetNotificationBadges}
                      variant="outline"
                      className="w-full"
                      data-testid="button-reset-badges"
                    >
                      <Bell className="h-4 w-4 mr-2" />
                      Reset All Notification Badges
                    </Button>

                    <div className="flex items-center space-x-2">
                      <input 
                        type="checkbox"
                        id="auto-mark-read"
                        checked={notificationSettings.autoMarkRead}
                        onChange={(e) => setNotificationSettings(prev => ({...prev, autoMarkRead: e.target.checked}))}
                      />
                      <Label htmlFor="auto-mark-read" className="text-sm">
                        Auto-mark messages as read after 30 seconds
                      </Label>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Current Badge Status</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Jnr Development champs</span>
                        <Badge variant="secondary">3 unread</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Nationals</span>
                        <Badge variant="secondary">1 unread</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Region 5</span>
                        <span className="text-gray-500">No unread</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Trials</span>
                        <Badge variant="secondary">2 unread</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>UFAK</span>
                        <span className="text-gray-500">No unread</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}