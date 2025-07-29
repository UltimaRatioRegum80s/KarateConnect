import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ChatRoomCardProps {
  room: {
    id: string;
    name: string;
    description: string;
    isActive: boolean;
    memberCount: number;
    messageCount: number;
  };
}

export default function ChatRoomCard({ room }: ChatRoomCardProps) {
  const [, setLocation] = useLocation();

  const handleClick = () => {
    setLocation(`/chat/${room.id}`);
  };

  return (
    <Card 
      className="hover:shadow-lg transition-shadow cursor-pointer group"
      onClick={handleClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
              <i className="fas fa-comments text-blue-600 text-xl"></i>
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
          <div className={room.messageCount > 0 ? "text-blue-600 font-medium" : "text-gray-600"}>
            {room.messageCount > 0 ? `${room.messageCount} messages` : "No new messages"}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
