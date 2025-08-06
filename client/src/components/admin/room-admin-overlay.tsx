import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";

import { 
  Edit3, 
  Settings, 
  Users, 
  Pin, 
  Archive, 
  Lock,
  Volume2,
  VolumeX,
  Badge as BadgeIcon,
  Bot,
  Crown,
  Trash2,
  Plus,
  Save,
  MessageSquare,
  Star,
  Eye,
  EyeOff,
  Palette
} from "lucide-react";
import type { ChatRoom } from "@shared/schema";

interface RoomAdminOverlayProps {
  room: {
    id: string;
    name: string;
    description: string;
    isActive: boolean;
    memberCount: number;
    messageCount: number;
    unreadCount?: number;
  };
  onRoomUpdate?: (roomData: any) => void;
}

export function RoomAdminOverlay({ room, onRoomUpdate }: RoomAdminOverlayProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "members" | "settings" | "bot">("info");
  
  const [roomInfo, setRoomInfo] = useState({
    name: room.name,
    description: room.description || "",
    bannerColor: "#3B82F6",
    icon: "💬",
    featured: false,
    priority: "normal"
  });

  const [roomSettings, setRoomSettings] = useState({
    isLocked: false,
    isMuted: false,
    isArchived: false,
    allowBotMessages: true,
    autoModeration: false,
    memberLimit: 50
  });

  const [botMessage, setBotMessage] = useState({
    content: "",
    sender: "federation"
  });

  const [memberManagement, setMemberManagement] = useState({
    selectedUsers: [] as string[],
    moderators: [] as string[],
    pendingInvites: [] as string[]
  });

  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: "",
    description: "",
    action: () => {},
    variant: "default" as "default" | "destructive"
  });

  // Audit logging function
  const logAdminAction = async (action: string, details: any) => {
    try {
      await fetch('/api/admin/audit-log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          action,
          resourceType: 'chat_room',
          resourceId: room.id,
          details,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.warn('Failed to log admin action:', error);
    }
  };

  // Update room information
  const handleUpdateRoomInfo = async () => {
    try {
      const response = await fetch(`/api/admin/rooms/${room.id}/info`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(roomInfo)
      });

      if (response.ok) {
        await logAdminAction('UPDATE_ROOM_INFO', {
          roomName: roomInfo.name,
          changes: roomInfo
        });
        
        toast({
          title: "Room Updated",
          description: "Room information has been updated successfully"
        });
        onRoomUpdate?.(roomInfo);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update room information",
        variant: "destructive"
      });
    }
  };

  // Manage room settings with confirmation
  const confirmUpdateSettings = () => {
    const criticalChanges = [];
    if (roomSettings.isLocked) criticalChanges.push("Lock room");
    if (roomSettings.isArchived) criticalChanges.push("Archive room");
    if (roomSettings.isMuted) criticalChanges.push("Mute room");

    if (criticalChanges.length > 0) {
      setConfirmDialog({
        open: true,
        title: "Confirm Room Settings Changes",
        description: `You are about to: ${criticalChanges.join(", ")}. This will affect all room members. Continue?`,
        action: handleUpdateSettings,
        variant: "destructive"
      });
    } else {
      handleUpdateSettings();
    }
  };

  const handleUpdateSettings = async () => {
    try {
      const response = await fetch(`/api/admin/rooms/${room.id}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(roomSettings)
      });

      if (response.ok) {
        await logAdminAction('UPDATE_ROOM_SETTINGS', {
          roomName: room.name,
          settings: roomSettings
        });
        
        toast({
          title: "Settings Updated",
          description: "Room settings have been applied successfully"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update room settings",
        variant: "destructive"
      });
    }
  };

  // Reset room badges with confirmation
  const confirmResetBadges = () => {
    setConfirmDialog({
      open: true,
      title: "Reset Room Badges",
      description: `This will clear all unread message notifications for "${room.name}" for all members. This action cannot be undone.`,
      action: handleResetBadges,
      variant: "default"
    });
  };

  const handleResetBadges = async () => {
    try {
      const response = await fetch(`/api/admin/rooms/${room.id}/reset-badges`, {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        await logAdminAction('RESET_ROOM_BADGES', {
          roomName: room.name,
          previousUnreadCount: room.unreadCount || 0
        });
        
        toast({
          title: "Badges Reset",
          description: "All notification badges for this room have been cleared"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reset badges",
        variant: "destructive"
      });
    }
  };

  // Send bot message with confirmation
  const confirmSendBotMessage = () => {
    if (!botMessage.content.trim()) return;
    
    setConfirmDialog({
      open: true,
      title: "Send Official Message",
      description: `Send message as "${botMessage.sender === 'bot' ? 'Federation Bot' : 'NKF Federation'}" to all room members? This will appear as an official announcement.`,
      action: handleSendBotMessage,
      variant: "default"
    });
  };

  const handleSendBotMessage = async () => {
    if (!botMessage.content.trim()) return;

    try {
      const response = await fetch(`/api/admin/rooms/${room.id}/bot-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          content: botMessage.content,
          sender: botMessage.sender
        })
      });

      if (response.ok) {
        await logAdminAction('SEND_BOT_MESSAGE', {
          roomName: room.name,
          sender: botMessage.sender,
          messagePreview: botMessage.content.substring(0, 100)
        });
        
        toast({
          title: "Message Sent",
          description: `Message sent as ${botMessage.sender === 'bot' ? 'Federation Bot' : 'NKF Federation'}`
        });
        setBotMessage({ content: "", sender: "federation" });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send bot message",
        variant: "destructive"
      });
    }
  };

  // Room Info Tab
  const RoomInfoTab = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="room-name">Room Name</Label>
          <Input
            id="room-name"
            value={roomInfo.name}
            onChange={(e) => setRoomInfo(prev => ({...prev, name: e.target.value}))}
            data-testid="input-room-name"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="room-icon">Icon</Label>
          <Input
            id="room-icon"
            value={roomInfo.icon}
            onChange={(e) => setRoomInfo(prev => ({...prev, icon: e.target.value}))}
            placeholder="💬"
            data-testid="input-room-icon"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="banner-color">Banner Color</Label>
          <div className="flex space-x-2">
            <Input
              id="banner-color"
              type="color"
              value={roomInfo.bannerColor}
              onChange={(e) => setRoomInfo(prev => ({...prev, bannerColor: e.target.value}))}
              className="w-16 h-10"
              data-testid="input-banner-color"
            />
            <Input
              value={roomInfo.bannerColor}
              onChange={(e) => setRoomInfo(prev => ({...prev, bannerColor: e.target.value}))}
              placeholder="#3B82F6"
              className="flex-1"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="room-priority">Priority Level</Label>
          <Select 
            value={roomInfo.priority} 
            onValueChange={(value) => setRoomInfo(prev => ({...prev, priority: value}))}
          >
            <SelectTrigger data-testid="select-room-priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low Priority</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="high">High Priority</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="room-description">Description</Label>
        <Textarea
          id="room-description"
          value={roomInfo.description}
          onChange={(e) => setRoomInfo(prev => ({...prev, description: e.target.value}))}
          rows={3}
          placeholder="Enter room description..."
          data-testid="textarea-room-description"
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          checked={roomInfo.featured}
          onCheckedChange={(checked) => setRoomInfo(prev => ({...prev, featured: checked}))}
        />
        <Label>Feature this room (pin to top)</Label>
      </div>

      <div className="flex justify-end pt-4 border-t">
        <Button onClick={handleUpdateRoomInfo} data-testid="button-update-room-info">
          <Save className="h-4 w-4 mr-2" />
          Update Room Info
        </Button>
      </div>
    </div>
  );

  // Members Management Tab
  const MembersTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-medium">Current Members</h4>
        <Badge variant="outline">{room.memberCount} members</Badge>
      </div>

      <div className="space-y-2 max-h-40 overflow-y-auto">
        {/* Mock member list - in production, fetch from API */}
        {[
          { id: "1001", name: "David Mwandingi", role: "President", isModerator: true },
          { id: "1002", name: "Martin Jasper", role: "Vice President", isModerator: false },
          { id: "1003", name: "Hilma Hausiku", role: "Secretary General", isModerator: false }
        ].map(member => (
          <div key={member.id} className="flex items-center justify-between p-2 border rounded">
            <div>
              <span className="font-medium">{member.name}</span>
              <span className="text-sm text-gray-500 ml-2">({member.role})</span>
            </div>
            <div className="flex items-center space-x-2">
              {member.isModerator && <Crown className="h-4 w-4 text-yellow-500" />}
              <Button size="sm" variant="ghost" data-testid={`button-remove-member-${member.id}`}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Separator />

      <div className="space-y-2">
        <Label>Add New Members</Label>
        <div className="flex space-x-2">
          <Input placeholder="Enter username or email" className="flex-1" />
          <Button size="sm" data-testid="button-add-member">
            <Plus className="h-4 w-4 mr-2" />
            Add
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Promote to Moderator</Label>
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Select member to promote" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1002">Martin Jasper</SelectItem>
            <SelectItem value="1003">Hilma Hausiku</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  // Settings Tab
  const SettingsTab = () => (
    <div className="space-y-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label>Lock Room</Label>
            <p className="text-sm text-gray-500">Prevent new messages from being posted</p>
          </div>
          <Switch
            checked={roomSettings.isLocked}
            onCheckedChange={(checked) => setRoomSettings(prev => ({...prev, isLocked: checked}))}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Mute Room</Label>
            <p className="text-sm text-gray-500">Hide from active discussions</p>
          </div>
          <Switch
            checked={roomSettings.isMuted}
            onCheckedChange={(checked) => setRoomSettings(prev => ({...prev, isMuted: checked}))}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Archive Room</Label>
            <p className="text-sm text-gray-500">Move to archived rooms section</p>
          </div>
          <Switch
            checked={roomSettings.isArchived}
            onCheckedChange={(checked) => setRoomSettings(prev => ({...prev, isArchived: checked}))}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Allow Bot Messages</Label>
            <p className="text-sm text-gray-500">Enable Federation Bot posting</p>
          </div>
          <Switch
            checked={roomSettings.allowBotMessages}
            onCheckedChange={(checked) => setRoomSettings(prev => ({...prev, allowBotMessages: checked}))}
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label>Auto Moderation</Label>
            <p className="text-sm text-gray-500">Automatically filter inappropriate content</p>
          </div>
          <Switch
            checked={roomSettings.autoModeration}
            onCheckedChange={(checked) => setRoomSettings(prev => ({...prev, autoModeration: checked}))}
          />
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <Label htmlFor="member-limit">Member Limit</Label>
        <Input
          id="member-limit"
          type="number"
          value={roomSettings.memberLimit}
          onChange={(e) => setRoomSettings(prev => ({...prev, memberLimit: parseInt(e.target.value)}))}
          min="1"
          max="100"
          data-testid="input-member-limit"
        />
      </div>

      <div className="flex justify-between pt-4 border-t">
        <Button 
          variant="outline" 
          onClick={confirmResetBadges}
          data-testid="button-reset-room-badges"
        >
          <BadgeIcon className="h-4 w-4 mr-2" />
          Reset Badges
        </Button>
        
        <Button onClick={confirmUpdateSettings} data-testid="button-update-room-settings">
          <Save className="h-4 w-4 mr-2" />
          Apply Settings
        </Button>
      </div>
    </div>
  );

  // Bot Messages Tab
  const BotTab = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="bot-sender">Send As</Label>
        <Select 
          value={botMessage.sender} 
          onValueChange={(value) => setBotMessage(prev => ({...prev, sender: value}))}
        >
          <SelectTrigger data-testid="select-bot-sender">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="bot">
              <div className="flex items-center space-x-2">
                <Bot className="h-4 w-4" />
                <span>Federation Bot</span>
              </div>
            </SelectItem>
            <SelectItem value="federation">
              <div className="flex items-center space-x-2">
                <Crown className="h-4 w-4" />
                <span>NKF Federation</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bot-message">Message Content</Label>
        <Textarea
          id="bot-message"
          value={botMessage.content}
          onChange={(e) => setBotMessage(prev => ({...prev, content: e.target.value}))}
          rows={4}
          placeholder="Enter official announcement or message..."
          data-testid="textarea-bot-message"
        />
      </div>

      <div className="bg-blue-50 p-3 rounded-lg">
        <h5 className="font-medium text-blue-900 mb-2">Message Preview</h5>
        <div className="flex items-start space-x-2">
          <div className="flex-shrink-0">
            {botMessage.sender === 'bot' ? (
              <Bot className="h-6 w-6 text-blue-600" />
            ) : (
              <Crown className="h-6 w-6 text-yellow-600" />
            )}
          </div>
          <div className="flex-1">
            <div className="font-medium text-sm">
              {botMessage.sender === 'bot' ? 'Federation Bot' : 'NKF Federation'}
            </div>
            <div className="text-sm text-gray-700 mt-1">
              {botMessage.content || "Your message will appear here..."}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t">
        <Button 
          onClick={confirmSendBotMessage}
          disabled={!botMessage.content.trim()}
          data-testid="button-send-bot-message"
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Send Message
        </Button>
      </div>
    </div>
  );

  return (
    <div className="absolute top-2 right-2 z-10">
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="bg-red-50 hover:bg-red-100 border-red-200 text-red-700"
            data-testid={`button-admin-edit-room-${room.id}`}
          >
            <Settings className="h-3 w-3 mr-1" />
            <span className="text-xs">Admin</span>
          </Button>
        </DialogTrigger>
        
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Room Admin - {room.name}</span>
              <Badge variant="destructive" className="ml-2">ADMIN MODE</Badge>
            </DialogTitle>
            <DialogDescription>
              Manage room settings, members, and administrative functions
            </DialogDescription>
          </DialogHeader>
          
          {/* Tab Navigation */}
          <div className="flex space-x-1 border-b">
            {[
              { id: "info", label: "Room Info", icon: Edit3 },
              { id: "members", label: "Members", icon: Users },
              { id: "settings", label: "Settings", icon: Settings },
              { id: "bot", label: "Bot Messages", icon: Bot }
            ].map(tab => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab(tab.id as any)}
                className="flex items-center space-x-2"
                data-testid={`tab-${tab.id}`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </Button>
            ))}
          </div>
          
          {/* Tab Content */}
          <div className="py-4">
            {activeTab === "info" && <RoomInfoTab />}
            {activeTab === "members" && <MembersTab />}
            {activeTab === "settings" && <SettingsTab />}
            {activeTab === "bot" && <BotTab />}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog(prev => ({...prev, open}))}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant={confirmDialog.variant}
        onConfirm={confirmDialog.action}
      />
    </div>
  );
}