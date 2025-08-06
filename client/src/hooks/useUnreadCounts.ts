import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export function useUnreadCounts() {
  const queryClient = useQueryClient();
  const [socket, setSocket] = useState<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected for unread counts');
      setSocket(ws);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle new message events to trigger unread count refresh
        if (data.type === 'message') {
          // Invalidate chat rooms query to refresh unread counts
          queryClient.invalidateQueries({ queryKey: ["/api/chat-rooms"] });
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setSocket(null);
    };

    return () => {
      ws.close();
    };
  }, [queryClient]);

  return socket;
}