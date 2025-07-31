import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { CalendarEvent, InsertCalendarEvent, CalendarDocument } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Upload, 
  FileText,
  Clock,
  MapPin,
  Users,
  Trophy,
  BookOpen,
  AlertCircle,
  CheckCircle,
  Loader2,
  Grid3X3,
  Calendar1
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getYear, setYear } from "date-fns";

const eventFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  eventType: z.string().min(1, "Event type is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  location: z.string().optional(),
  isAllDay: z.string().default("false"),
});

type EventFormValues = z.infer<typeof eventFormSchema>;

export default function Calendar() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading, user } = useAuth();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"month" | "year">("month");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [isAddEventOpen, setIsAddEventOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // Redirect if not authenticated
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

  // Fetch calendar events
  const { data: events = [], isLoading: eventsLoading } = useQuery<CalendarEvent[]>({
    queryKey: ["/api/calendar/events", getYear(currentDate)],
    enabled: isAuthenticated,
  });

  // Fetch calendar documents
  const { data: documents = [], isLoading: documentsLoading } = useQuery<CalendarDocument[]>({
    queryKey: ["/api/calendar/documents"],
    enabled: isAuthenticated,
  });

  // Create event mutation
  const createEventMutation = useMutation({
    mutationFn: async (data: EventFormValues) => {
      return apiRequest("/api/calendar/events", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/events"] });
      setIsAddEventOpen(false);
      toast({
        title: "Success",
        description: "Event created successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to create event",
        variant: "destructive",
      });
    },
  });

  // Upload document mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/calendar/documents/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Upload failed");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Upload Successful",
        description: `Calendar document "${data.originalName}" uploaded. Events will be extracted automatically.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/documents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/calendar/events"] });
      setUploadFile(null);
      setIsUploadOpen(false);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to upload calendar document",
        variant: "destructive",
      });
    },
  });

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: "",
      description: "",
      eventType: "",
      startDate: "",
      endDate: "",
      location: "",
      isAllDay: "false",
    },
  });

  const onSubmit = (data: EventFormValues) => {
    createEventMutation.mutate(data);
  };

  const handleFileUpload = () => {
    if (!uploadFile) return;
    
    const formData = new FormData();
    formData.append("document", uploadFile);
    uploadMutation.mutate(formData);
  };

  // Get events for the current month view
  const getEventsForMonth = (month: number, year: number) => {
    return events.filter(event => {
      const eventDate = new Date(event.startDate);
      return eventDate.getMonth() + 1 === month && eventDate.getFullYear() === year;
    });
  };

  // Get events for a specific day
  const getEventsForDay = (date: Date) => {
    return events.filter(event => {
      const eventStart = new Date(event.startDate);
      return isSameDay(eventStart, date);
    });
  };

  // Calendar navigation
  const navigateMonth = (direction: "prev" | "next") => {
    if (direction === "prev") {
      setCurrentDate(subMonths(currentDate, 1));
    } else {
      setCurrentDate(addMonths(currentDate, 1));
    }
  };

  const navigateYear = (direction: "prev" | "next") => {
    const newYear = getYear(currentDate) + (direction === "prev" ? -1 : 1);
    setCurrentDate(setYear(currentDate, newYear));
  };

  // Generate calendar days for month view
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get event type icon and color
  const getEventTypeInfo = (type: string) => {
    switch (type) {
      case "competition":
        return { icon: Trophy, color: "bg-red-100 text-red-800" };
      case "training":
        return { icon: Users, color: "bg-blue-100 text-blue-800" };
      case "meeting":
        return { icon: BookOpen, color: "bg-purple-100 text-purple-800" };
      case "deadline":
        return { icon: AlertCircle, color: "bg-orange-100 text-orange-800" };
      default:
        return { icon: CalendarIcon, color: "bg-gray-100 text-gray-800" };
    }
  };

  // Get activity summary for selected month
  const selectedMonthEvents = getEventsForMonth(selectedMonth, getYear(currentDate));

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <CalendarIcon className="h-6 w-6 text-green-600" />
          <h1 className="text-2xl font-bold">NKF Calendar</h1>
          <Badge variant="outline">{getYear(currentDate)}</Badge>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* View Toggle */}
          <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "month" | "year")}>
            <TabsList>
              <TabsTrigger value="month" className="flex items-center space-x-1">
                <Calendar1 className="h-4 w-4" />
                <span>Month</span>
              </TabsTrigger>
              <TabsTrigger value="year" className="flex items-center space-x-1">
                <Grid3X3 className="h-4 w-4" />
                <span>Year</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Add Event Dialog */}
          <Dialog open={isAddEventOpen} onOpenChange={setIsAddEventOpen}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700">
                <Plus className="h-4 w-4 mr-2" />
                Add Event
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Event</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Event title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="eventType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Event Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select event type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="competition">Competition</SelectItem>
                            <SelectItem value="training">Training</SelectItem>
                            <SelectItem value="meeting">Meeting</SelectItem>
                            <SelectItem value="deadline">Deadline</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date (Optional)</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input placeholder="Event location" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Event description" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsAddEventOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      className="bg-green-600 hover:bg-green-700"
                      disabled={createEventMutation.isPending}
                    >
                      {createEventMutation.isPending && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      Create Event
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* Upload Document Dialog */}
          <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Upload Calendar
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Upload Calendar Document</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Upload a PDF or Word document containing the NKF calendar. 
                  Events will be automatically extracted and added to the calendar.
                </p>
                
                <Input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                />
                
                {uploadFile && (
                  <div className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                    <FileText className="h-4 w-4" />
                    <span className="text-sm">{uploadFile.name}</span>
                  </div>
                )}

                <div className="flex justify-end space-x-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setIsUploadOpen(false);
                      setUploadFile(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleFileUpload}
                    disabled={!uploadFile || uploadMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {uploadMutation.isPending && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Upload & Process
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar View */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <span>
                    {viewMode === "month" 
                      ? format(currentDate, "MMMM yyyy")
                      : getYear(currentDate)
                    }
                  </span>
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => viewMode === "month" ? navigateMonth("prev") : navigateYear("prev")}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => viewMode === "month" ? navigateMonth("next") : navigateYear("next")}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {viewMode === "month" ? (
                // Month View
                <div className="space-y-4">
                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-2">
                    {/* Day Headers */}
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                      <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                        {day}
                      </div>
                    ))}
                    
                    {/* Calendar Days */}
                    {Array.from({ length: monthStart.getDay() }, (_, i) => (
                      <div key={`empty-${i}`} className="p-2 h-20" />
                    ))}
                    
                    {calendarDays.map(day => {
                      const dayEvents = getEventsForDay(day);
                      const isToday = isSameDay(day, new Date());
                      
                      return (
                        <div 
                          key={day.toISOString()} 
                          className={`p-2 h-20 border rounded cursor-pointer hover:bg-gray-50 ${
                            isToday ? "bg-green-50 border-green-200" : "border-gray-200"
                          }`}
                        >
                          <div className={`text-sm font-medium ${
                            isToday ? "text-green-600" : "text-gray-900"
                          }`}>
                            {format(day, "d")}
                          </div>
                          <div className="space-y-1 mt-1">
                            {dayEvents.slice(0, 2).map(event => {
                              const { color } = getEventTypeInfo(event.eventType);
                              return (
                                <div 
                                  key={event.id}
                                  className={`text-xs p-1 rounded truncate ${color}`}
                                  title={event.title}
                                >
                                  {event.title}
                                </div>
                              );
                            })}
                            {dayEvents.length > 2 && (
                              <div className="text-xs text-muted-foreground">
                                +{dayEvents.length - 2} more
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                // Year View - Show months as grid
                <div className="grid grid-cols-3 gap-4">
                  {Array.from({ length: 12 }, (_, i) => {
                    const month = i + 1;
                    const monthEvents = getEventsForMonth(month, getYear(currentDate));
                    const monthName = format(new Date(getYear(currentDate), i), "MMM");
                    
                    return (
                      <Card 
                        key={month} 
                        className={`cursor-pointer hover:shadow-md transition-shadow ${
                          month === selectedMonth ? "ring-2 ring-green-500" : ""
                        }`}
                        onClick={() => setSelectedMonth(month)}
                      >
                        <CardContent className="p-4">
                          <div className="font-medium text-center">{monthName}</div>
                          <div className="text-center text-sm text-muted-foreground mt-1">
                            {monthEvents.length} events
                          </div>
                          <div className="mt-2 space-y-1">
                            {monthEvents.slice(0, 3).map(event => {
                              const { color } = getEventTypeInfo(event.eventType);
                              return (
                                <div 
                                  key={event.id}
                                  className={`text-xs p-1 rounded truncate ${color}`}
                                >
                                  {event.title}
                                </div>
                              );
                            })}
                            {monthEvents.length > 3 && (
                              <div className="text-xs text-muted-foreground">
                                +{monthEvents.length - 3} more
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Activity Summary Sidebar */}
        <div className="space-y-6">
          {/* Monthly Activity Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>
                  {format(new Date(getYear(currentDate), selectedMonth - 1), "MMMM")} Activities
                </span>
                <div className="flex space-x-1">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setSelectedMonth(selectedMonth === 1 ? 12 : selectedMonth - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setSelectedMonth(selectedMonth === 12 ? 1 : selectedMonth + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {selectedMonthEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No events scheduled for this month
                  </p>
                ) : (
                  selectedMonthEvents.map(event => {
                    const { icon: Icon, color } = getEventTypeInfo(event.eventType);
                    
                    return (
                      <div key={event.id} className="flex items-start space-x-3 p-3 rounded border">
                        <Icon className="h-4 w-4 mt-1 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{event.title}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="secondary" className={color}>
                              {event.eventType}
                            </Badge>
                          </div>
                          <div className="flex items-center text-xs text-muted-foreground mt-1">
                            <Clock className="h-3 w-3 mr-1" />
                            {format(new Date(event.startDate), "MMM d, HH:mm")}
                          </div>
                          {event.location && (
                            <div className="flex items-center text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3 mr-1" />
                              {event.location}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Document Upload Status */}
          <Card>
            <CardHeader>
              <CardTitle>Document Processing</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {documentsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : documents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No documents uploaded yet
                  </p>
                ) : (
                  documents.slice(0, 3).map(doc => (
                    <div key={doc.id} className="flex items-start space-x-3 p-3 rounded border">
                      <FileText className="h-4 w-4 mt-1" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{doc.originalName}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          {doc.status === "processed" ? (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Processed
                            </Badge>
                          ) : doc.status === "processing" ? (
                            <Badge className="bg-yellow-100 text-yellow-800">
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              Processing
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Failed
                            </Badge>
                          )}
                        </div>
                        {doc.status === "processed" && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {doc.extractedEventsCount} events extracted
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}