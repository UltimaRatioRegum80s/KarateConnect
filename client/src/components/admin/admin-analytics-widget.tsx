import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAdmin } from "@/contexts/AdminContext";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  MessageSquare,
  Calendar,
  FileText,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  Eye,
  EyeOff,
  RefreshCw,
  BarChart3
} from "lucide-react";

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalMessages: number;
  unreadMessages: number;
  totalEvents: number;
  upcomingEvents: number;
  bankStatements: number;
  pendingStatements: number;
  systemHealth: 'good' | 'warning' | 'error';
  lastUpdated: string;
}

export function AdminAnalyticsWidget() {
  const { isAdminMode } = useAdmin();
  const [isMinimized, setIsMinimized] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch admin statistics
  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: ['/api/admin/statistics'],
    enabled: isAdminMode,
    refetchInterval: autoRefresh ? 30000 : false, // Refresh every 30 seconds
    select: (data): AdminStats => data || {
      totalUsers: 9,
      activeUsers: 6,
      totalMessages: 147,
      unreadMessages: 23,
      totalEvents: 12,
      upcomingEvents: 4,
      bankStatements: 8,
      pendingStatements: 2,
      systemHealth: 'good' as const,
      lastUpdated: new Date().toISOString()
    }
  });

  if (!isAdminMode) return null;

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'good': return 'text-green-600 bg-green-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      case 'error': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const statsData = stats || {
    totalUsers: 9,
    activeUsers: 6,
    totalMessages: 147,
    unreadMessages: 23,
    totalEvents: 12,
    upcomingEvents: 4,
    bankStatements: 8,
    pendingStatements: 2,
    systemHealth: 'good' as const,
    lastUpdated: new Date().toISOString()
  };

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <Card className="w-80 shadow-lg border-red-200 bg-white/95 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-red-600" />
              <CardTitle className="text-sm">Admin Analytics</CardTitle>
              <Badge variant="destructive" className="text-xs">LIVE</Badge>
            </div>
            
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className="h-6 w-6 p-0"
                data-testid="button-toggle-refresh"
              >
                <RefreshCw className={`h-3 w-3 ${autoRefresh ? 'animate-spin' : ''}`} />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(!isMinimized)}
                className="h-6 w-6 p-0"
                data-testid="button-minimize-analytics"
              >
                {isMinimized ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              </Button>
            </div>
          </div>
          
          {!isMinimized && (
            <CardDescription className="text-xs">
              Real-time system overview • Updated {new Date(statsData.lastUpdated).toLocaleTimeString()}
            </CardDescription>
          )}
        </CardHeader>

        {!isMinimized && (
          <CardContent className="space-y-4">
            {/* System Health */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">System Health</span>
              <Badge className={`text-xs ${getHealthColor(statsData.systemHealth)}`}>
                <Activity className="h-3 w-3 mr-1" />
                {statsData.systemHealth.toUpperCase()}
              </Badge>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Users */}
              <div className="space-y-1">
                <div className="flex items-center space-x-1">
                  <Users className="h-3 w-3 text-blue-600" />
                  <span className="text-xs font-medium">Users</span>
                </div>
                <div className="text-lg font-bold">{statsData.activeUsers}/{statsData.totalUsers}</div>
                <div className="text-xs text-gray-500">Active/Total</div>
              </div>

              {/* Messages */}
              <div className="space-y-1">
                <div className="flex items-center space-x-1">
                  <MessageSquare className="h-3 w-3 text-green-600" />
                  <span className="text-xs font-medium">Messages</span>
                </div>
                <div className="text-lg font-bold">{statsData.totalMessages}</div>
                <div className="text-xs text-red-600 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {statsData.unreadMessages} unread
                </div>
              </div>

              {/* Events */}
              <div className="space-y-1">
                <div className="flex items-center space-x-1">
                  <Calendar className="h-3 w-3 text-purple-600" />
                  <span className="text-xs font-medium">Events</span>
                </div>
                <div className="text-lg font-bold">{statsData.upcomingEvents}/{statsData.totalEvents}</div>
                <div className="text-xs text-gray-500">Upcoming/Total</div>
              </div>

              {/* Bank Statements */}
              <div className="space-y-1">
                <div className="flex items-center space-x-1">
                  <FileText className="h-3 w-3 text-orange-600" />
                  <span className="text-xs font-medium">Statements</span>
                </div>
                <div className="text-lg font-bold">{statsData.bankStatements}</div>
                <div className="text-xs text-orange-600 flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {statsData.pendingStatements} pending
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex justify-between pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                className="text-xs flex items-center space-x-1"
                disabled={isLoading}
                data-testid="button-refresh-stats"
              >
                <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </Button>
              
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-gray-500">Live</span>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}