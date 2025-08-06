import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import MultimediaChatInterface from "@/components/chat/multimedia-chat-interface";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function ChatRoom() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const { roomId } = useParams<{ roomId: string }>();
  const [, setLocation] = useLocation();

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

  const { data: room, isLoading: roomLoading } = useQuery({
    queryKey: ["/api/chat-rooms", roomId],
    enabled: isAuthenticated && !!roomId,
  }) as { data: { name: string; description?: string } | undefined; isLoading: boolean };

  // Mark room as read when entering (in addition to server-side marking)
  useEffect(() => {
    if (roomId && isAuthenticated) {
      // This helps ensure immediate UI updates
      fetch(`/api/chat-rooms/${roomId}/mark-read`, {
        method: 'POST',
        credentials: 'include',
      }).catch(error => console.warn('Could not mark room as read:', error));
    }
  }, [roomId, isAuthenticated]);

  if (isLoading || roomLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-blue-600 mb-4"></i>
          <p className="text-gray-600">Loading chat room...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <i className="fas fa-exclamation-triangle text-4xl text-red-500 mb-4"></i>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Chat Room Not Found</h2>
            <p className="text-gray-600 mb-4">The requested chat room could not be found.</p>
            <Button onClick={() => setLocation("/")} className="bg-blue-600 hover:bg-blue-700">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => setLocation("/")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <i className="fas fa-comments text-blue-600 text-xl"></i>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{room.name}</h1>
              <p className="text-gray-600">{room.description}</p>
            </div>
          </div>
        </div>

        <MultimediaChatInterface roomId={roomId!} />
      </main>
    </div>
  );
}
