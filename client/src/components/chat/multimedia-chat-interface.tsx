import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  Send, 
  User, 
  Mic, 
  MicOff, 
  Image, 
  FileText, 
  Play, 
  Pause, 
  Download,
  Paperclip,
  X,
  BarChart3,
  Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import PollComponent from "./poll-component";
import PollCreator from "./poll-creator";

interface Message {
  id: string;
  content: string;
  type: "text" | "voice" | "image" | "document" | "poll";
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  duration?: number;
  poll?: {
    id: string;
    question: string;
    allowMultiple: boolean;
    is_active: boolean;
    options: Array<{
      id: string;
      text: string;
      voteCount: number;
      userVotes: string[];
    }>;
  };
  createdAt: string;
  user: {
    id: string;
    name: string;
    title?: string;
  };
}

interface ChatInterfaceProps {
  roomId: string;
}

export default function MultimediaChatInterface({ roomId }: ChatInterfaceProps) {
  const { user } = useAuth() as { user: { id: string; name: string; role?: string } | undefined };
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showPollCreator, setShowPollCreator] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Fetch initial messages
  const { data: initialMessages } = useQuery({
    queryKey: ["/api/chat-rooms", roomId, "messages"],
    enabled: !!roomId,
  }) as { data: Message[] | undefined };

  useEffect(() => {
    if (initialMessages) {
      setMessages(initialMessages);
    }
  }, [initialMessages]);

  // Set up WebSocket connection
  useEffect(() => {
    if (!user || !roomId) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'auth',
        userId: user.id,
        roomId: roomId
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'message') {
        setMessages(prev => [...prev, data.message]);
      }
    };

    ws.onclose = () => {
      console.log("WebSocket connection closed");
    };

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, [user, roomId]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageData: any) => {
      const formData = new FormData();
      formData.append('content', messageData.content);
      formData.append('type', messageData.type);
      
      if (messageData.file) {
        formData.append('file', messageData.file);
      }
      if (messageData.duration) {
        formData.append('duration', messageData.duration.toString());
      }

      return await fetch(`/api/chat-rooms/${roomId}/messages`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      }).then(res => {
        if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
        return res.json();
      });
    },
    onSuccess: (data) => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'message',
          message: data
        }));
      }
      queryClient.invalidateQueries({ queryKey: ["/api/chat-rooms", roomId, "messages"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    },
  });

  // Create poll mutation
  const createPollMutation = useMutation({
    mutationFn: async (pollData: { question: string; options: string[]; allowMultiple: boolean }) => {
      return await apiRequest(`/api/chat-rooms/${roomId}/polls`, 'POST', pollData);
    },
    onSuccess: (data: any) => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'message',
          message: { ...data.message, poll: data.poll }
        }));
      }
      queryClient.invalidateQueries({ queryKey: ["/api/chat-rooms", roomId, "messages"] });
      setShowPollCreator(false);
      toast({
        title: "Poll created",
        description: "Your poll has been created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create poll",
        variant: "destructive",
      });
    },
  });

  // Admin delete message mutation
  const deleteMessageMutation = useMutation({
    mutationFn: async (messageId: string) => {
      return await apiRequest(`/api/messages/${messageId}`, 'DELETE');
    },
    onSuccess: (data, messageId) => {
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      queryClient.invalidateQueries({ queryKey: ["/api/chat-rooms", roomId, "messages"] });
      toast({
        title: "Message Deleted",
        description: "Message has been removed successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: "Failed to delete message. Admin access required.",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !selectedFile) return;

    const messageData: any = {
      content: newMessage || (selectedFile ? selectedFile.name : ""),
      type: selectedFile ? getFileType(selectedFile) : "text"
    };

    if (selectedFile) {
      messageData.file = selectedFile;
    }

    sendMessageMutation.mutate(messageData);
    setNewMessage("");
    setSelectedFile(null);
  };

  const getFileType = (file: File): "image" | "document" => {
    if (file.type.startsWith('image/')) return "image";
    return "document";
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
        
        // Calculate duration (approximate)
        const duration = Math.round((Date.now() - recordStartTime) / 1000);
        
        sendMessageMutation.mutate({
          content: "Voice message",
          type: "voice",
          file,
          duration
        });

        stream.getTracks().forEach(track => track.stop());
      };

      const recordStartTime = Date.now();
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not access microphone",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select a file smaller than 10MB",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const playAudio = (messageId: string, audioUrl: string) => {
    if (playingAudio === messageId) {
      audioRef.current?.pause();
      setPlayingAudio(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
        setPlayingAudio(messageId);
        audioRef.current.onended = () => setPlayingAudio(null);
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderMessage = (message: Message) => {
    const isOwnMessage = message.user.id === user?.id;

    return (
      <div
        key={message.id}
        className={cn(
          "flex mb-4",
          isOwnMessage ? "justify-end" : "justify-start"
        )}
      >
        <div className={cn(
          "flex max-w-[70%]",
          isOwnMessage ? "flex-row-reverse" : "flex-row"
        )}>
          <Avatar className="w-8 h-8 mx-2">
            <AvatarFallback>
              <User className="w-4 h-4" />
            </AvatarFallback>
          </Avatar>
          
          <div className={cn(
            "rounded-lg p-3",
            isOwnMessage 
              ? "bg-blue-500 text-white" 
              : "bg-gray-100 dark:bg-gray-800"
          )}>
            <div className="text-xs mb-1 opacity-70">
              {message.user.name} {message.user.title && `(${message.user.title})`}
            </div>
            
            {message.type === "text" && (
              <div>{message.content}</div>
            )}
            
            {message.type === "voice" && (
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => playAudio(message.id, `/api/files/${message.id}`)}
                  className="p-1"
                >
                  {playingAudio === message.id ? 
                    <Pause className="w-4 h-4" /> : 
                    <Play className="w-4 h-4" />
                  }
                </Button>
                <span className="text-sm">
                  Voice message {message.duration && `(${formatDuration(message.duration)})`}
                </span>
              </div>
            )}
            
            {message.type === "image" && (
              <div>
                <img 
                  src={`/api/files/${message.id}`}
                  alt={message.fileName || "Image"}
                  className="max-w-full h-auto rounded"
                  style={{ maxHeight: '200px' }}
                />
                {message.fileName && (
                  <div className="text-xs mt-1 opacity-70">{message.fileName}</div>
                )}
              </div>
            )}
            
            {message.type === "document" && (
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4" />
                <div>
                  <div className="text-sm font-medium">{message.fileName}</div>
                  {message.fileSize && (
                    <div className="text-xs opacity-70">{formatFileSize(message.fileSize)}</div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(`/api/files/${message.id}`, '_blank')}
                  className="p-1"
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            )}
            
            {message.type === "poll" && message.poll && (
              <div className="max-w-none w-full">
                <PollComponent
                  messageId={message.id}
                  pollData={message.poll}
                  createdAt={message.createdAt}
                  userName={message.user.name}
                  userTitle={message.user.title}
                  isOwnMessage={isOwnMessage}
                />
              </div>
            )}
            
            <div className="flex items-center justify-between mt-1">
              <div className="text-xs opacity-70">
                {new Date(message.createdAt).toLocaleTimeString()}
              </div>
              {user?.role === 'admin' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteMessageMutation.mutate(message.id)}
                  className="p-1 h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                  title="Delete message (Admin only)"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!user) {
    return <div>Please log in to participate in the chat.</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <audio ref={audioRef} />
      
      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {messages.map(renderMessage)}
        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* File preview */}
      {selectedFile && (
        <div className="p-3 border-t bg-gray-50 dark:bg-gray-800 flex items-center space-x-2">
          <div className="flex items-center space-x-2 flex-1">
            {selectedFile.type.startsWith('image/') ? (
              <Image className="w-4 h-4" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            <span className="text-sm">{selectedFile.name}</span>
            <span className="text-xs text-gray-500">({formatFileSize(selectedFile.size)})</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedFile(null)}
            className="p-1"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Poll Creator */}
      {showPollCreator && (
        <div className="p-4 border-t bg-gray-50 dark:bg-gray-800">
          <PollCreator
            onCreatePoll={(pollData) => createPollMutation.mutate(pollData)}
            onCancel={() => setShowPollCreator(false)}
            isCreating={createPollMutation.isPending}
          />
        </div>
      )}

      {/* Input area */}
      <div className="p-4 border-t">
        <div className="flex items-center space-x-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={selectedFile ? "Add a caption..." : "Type a message..."}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            className="flex-1"
          />
          
          {/* File upload */}
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            accept="image/*,.pdf,.doc,.docx,.txt"
            className="hidden"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            title="Attach file"
          >
            <Paperclip className="w-4 h-4" />
          </Button>
          
          {/* Voice recording */}
          <Button
            variant="ghost"
            size="sm"
            onClick={isRecording ? stopRecording : startRecording}
            title={isRecording ? "Stop recording" : "Record voice message"}
            className={cn(isRecording && "text-red-500")}
          >
            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>
          
          {/* Poll creation */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPollCreator(!showPollCreator)}
            title="Create poll"
            className={cn(showPollCreator && "text-green-500")}
          >
            <BarChart3 className="w-4 h-4" />
          </Button>
          
          {/* Send button */}
          <Button 
            onClick={handleSendMessage}
            disabled={(!newMessage.trim() && !selectedFile) || sendMessageMutation.isPending}
            size="sm"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}