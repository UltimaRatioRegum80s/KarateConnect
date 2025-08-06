import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { useAdmin } from "@/contexts/AdminContext";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Users,
  MessageSquare,
  Calendar,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Zap,
  Shield
} from "lucide-react";

export function QuickAccessToolbar() {
  const { isAdminMode } = useAdmin();
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isAdminMode) return null;

  const quickActions = [
    {
      icon: MessageSquare,
      label: "New Room",
      action: () => toast({ title: "Quick Action", description: "Create new chat room" }),
      color: "bg-blue-500 hover:bg-blue-600"
    },
    {
      icon: Users,
      label: "Add User",
      action: () => toast({ title: "Quick Action", description: "Add new EXCO member" }),
      color: "bg-green-500 hover:bg-green-600"
    },
    {
      icon: Calendar,
      label: "New Event",
      action: () => toast({ title: "Quick Action", description: "Create calendar event" }),
      color: "bg-purple-500 hover:bg-purple-600"
    },
    {
      icon: FileText,
      label: "Upload Statement",
      action: () => toast({ title: "Quick Action", description: "Upload bank statement" }),
      color: "bg-orange-500 hover:bg-orange-600"
    },
    {
      icon: BarChart3,
      label: "Analytics",
      action: () => toast({ title: "Quick Action", description: "View analytics dashboard" }),
      color: "bg-indigo-500 hover:bg-indigo-600"
    },
    {
      icon: Settings,
      label: "System",
      action: () => toast({ title: "Quick Action", description: "System configuration" }),
      color: "bg-gray-500 hover:bg-gray-600"
    }
  ];

  return (
    <div className="fixed right-4 top-1/2 -translate-y-1/2 z-50">
      <Card className="shadow-lg border-red-200 bg-red-50/95 backdrop-blur-sm">
        <CardContent className="p-2">
          <div className="flex items-center space-x-2">
            {/* Admin Mode Indicator */}
            <div className="flex flex-col items-center space-y-1">
              <Badge variant="destructive" className="text-xs px-2 py-1">
                <Shield className="h-3 w-3 mr-1" />
                ADMIN
              </Badge>
              <div className="w-1 h-8 bg-red-500 rounded-full animate-pulse" />
            </div>

            {/* Expand/Collapse Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 p-0 border-red-300"
              data-testid="button-toggle-toolbar"
            >
              {isExpanded ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>

            {/* Quick Actions */}
            {isExpanded && (
              <div className="flex flex-col space-y-1">
                {quickActions.map((action, index) => (
                  <Tooltip key={index}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={action.action}
                        className={`h-8 w-8 p-0 ${action.color} border-white text-white hover:text-white transition-all duration-200`}
                        data-testid={`button-quick-${action.label.toLowerCase().replace(' ', '-')}`}
                      >
                        <action.icon className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left">
                      <p>{action.label}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
                
                {/* Quick Stats Button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 bg-yellow-500 hover:bg-yellow-600 border-white text-white hover:text-white"
                      data-testid="button-quick-stats"
                    >
                      <Zap className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p>Quick Stats</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}