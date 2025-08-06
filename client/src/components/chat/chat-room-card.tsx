import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAdmin } from "@/contexts/AdminContext";
import { RoomAdminOverlay } from "@/components/admin/room-admin-overlay";

interface ChatRoomCardProps {
  room: {
    id: string;
    name: string;
    description: string;
    isActive: boolean;
    memberCount: number;
    messageCount: number;
    unreadCount?: number;
  };
}

export default function ChatRoomCard({ room }: ChatRoomCardProps) {
  const [, setLocation] = useLocation();
  const { isAdminMode } = useAdmin();

  const handleClick = () => {
    setLocation(`/chat/${room.id}`);
  };

  return (
    <Card 
      className="hover:shadow-lg transition-shadow cursor-pointer group relative"
      onClick={handleClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors relative">
              <i className="fas fa-comments text-blue-600 text-xl"></i>
              {(room.unreadCount ?? 0) > 0 && (
                <Badge 
                  className="absolute -top-2 -right-2 h-6 w-6 p-0 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white text-xs rounded-full shadow-lg animate-pulse border-2 border-white transition-all duration-300 transform hover:scale-110"
                  data-testid={`badge-unread-${room.id}`}
                >
                  {room.unreadCount! > 99 ? '99+' : room.unreadCount}
                </Badge>
              )}
            </div>
            <div>
              {room.isActive && (
                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                  Active
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
          {room.name}
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          {room.description}
        </p>
        
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-1">
            <i className="fas fa-users"></i>
            <span>{room.memberCount} members</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className={room.messageCount > 0 ? "text-blue-600 font-medium" : "text-gray-600"}>
              {room.messageCount > 0 ? `${room.messageCount} messages` : "No messages"}
            </div>
            {(room.unreadCount ?? 0) > 0 && (
              <div className="text-red-600 font-medium text-sm animate-pulse">
                ({room.unreadCount} unread)
              </div>
            )}
          </div>
        </div>
        
        {/* Admin Overlay */}
        {isAdminMode && (
          <div onClick={(e) => e.stopPropagation()}>
            <RoomAdminOverlay room={room} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
