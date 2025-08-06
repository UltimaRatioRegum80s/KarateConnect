import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { 
  Edit3, 
  Settings, 
  Download, 
  Upload, 
  FileSpreadsheet, 
  Calendar as CalendarIcon,
  FileText, 
  Eye,
  EyeOff,
  Move,
  Trash2,
  Plus,
  Save,
  BarChart3,
  Target,
  TrendingUp
} from "lucide-react";

interface DashboardAdminOverlayProps {
  cardType: "financial" | "calendar" | "bank-statements" | "welcome";
  cardTitle: string;
  onUpdate?: (data: any) => void;
}

export function DashboardAdminOverlay({ cardType, cardTitle, onUpdate }: DashboardAdminOverlayProps) {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: "",
    description: "",
    action: () => {},
    variant: "default" as "default" | "destructive"
  });

  // Financial Overview Admin Features
  const FinancialAdminControls = () => {
    const [projectionData, setProjectionData] = useState({
      targetRevenue: "75000",
      budgetAllocation: "60000",
      riskLevel: "medium",
      quarterlyGoal: "18750"
    });

    const handleExportExcel = () => {
      // In production, this would generate an actual Excel export
      toast({
        title: "Excel Export",
        description: "Financial report exported successfully"
      });
    };

    const confirmUpdateProjections = () => {
      setConfirmDialog({
        open: true,
        title: "Update Financial Projections",
        description: "This will update the financial forecasts and budget allocations visible to all EXCO members. Continue?",
        action: handleUpdateProjections,
        variant: "default"
      });
    };

    const handleUpdateProjections = () => {
      console.log("Updated financial projections:", projectionData);
      toast({
        title: "Projections Updated",
        description: "Financial forecasts have been saved"
      });
      onUpdate?.(projectionData);
    };

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="target-revenue">Target Revenue (NAD)</Label>
            <Input
              id="target-revenue"
              type="number"
              value={projectionData.targetRevenue}
              onChange={(e) => setProjectionData(prev => ({...prev, targetRevenue: e.target.value}))}
              data-testid="input-target-revenue"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="budget-allocation">Budget Allocation (NAD)</Label>
            <Input
              id="budget-allocation"
              type="number"
              value={projectionData.budgetAllocation}
              onChange={(e) => setProjectionData(prev => ({...prev, budgetAllocation: e.target.value}))}
              data-testid="input-budget-allocation"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="risk-level">Risk Assessment</Label>
            <Select 
              value={projectionData.riskLevel} 
              onValueChange={(value) => setProjectionData(prev => ({...prev, riskLevel: value}))}
            >
              <SelectTrigger data-testid="select-risk-level">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low Risk</SelectItem>
                <SelectItem value="medium">Medium Risk</SelectItem>
                <SelectItem value="high">High Risk</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quarterly-goal">Quarterly Goal (NAD)</Label>
            <Input
              id="quarterly-goal"
              type="number"
              value={projectionData.quarterlyGoal}
              onChange={(e) => setProjectionData(prev => ({...prev, quarterlyGoal: e.target.value}))}
              data-testid="input-quarterly-goal"
            />
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={handleExportExcel}
            className="flex items-center space-x-2"
            data-testid="button-export-excel"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Export Excel Report</span>
          </Button>
          
          <Button 
            onClick={confirmUpdateProjections}
            className="flex items-center space-x-2"
            data-testid="button-update-projections"
          >
            <Target className="h-4 w-4" />
            <span>Update Projections</span>
          </Button>
        </div>
      </div>
    );
  };

  // Calendar Admin Features
  const CalendarAdminControls = () => {
    const [eventData, setEventData] = useState({
      title: "",
      date: "",
      type: "meeting",
      visibility: "public"
    });

    const handleImportData = (type: "ical" | "csv") => {
      toast({
        title: `${type.toUpperCase()} Import`,
        description: `Calendar data import from ${type} file initiated`
      });
    };

    const handleQuickAddEvent = () => {
      console.log("Quick add event:", eventData);
      toast({
        title: "Event Added",
        description: `${eventData.title} has been added to the calendar`
      });
      setEventData({ title: "", date: "", type: "meeting", visibility: "public" });
    };

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="event-title">Event Title</Label>
            <Input
              id="event-title"
              value={eventData.title}
              onChange={(e) => setEventData(prev => ({...prev, title: e.target.value}))}
              placeholder="Enter event title"
              data-testid="input-event-title"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="event-date">Date</Label>
            <Input
              id="event-date"
              type="date"
              value={eventData.date}
              onChange={(e) => setEventData(prev => ({...prev, date: e.target.value}))}
              data-testid="input-event-date"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-type">Event Type</Label>
            <Select 
              value={eventData.type} 
              onValueChange={(value) => setEventData(prev => ({...prev, type: value}))}
            >
              <SelectTrigger data-testid="select-event-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="meeting">EXCO Meeting</SelectItem>
                <SelectItem value="competition">Competition</SelectItem>
                <SelectItem value="training">Training Camp</SelectItem>
                <SelectItem value="workshop">Workshop</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-visibility">Visibility</Label>
            <Select 
              value={eventData.visibility} 
              onValueChange={(value) => setEventData(prev => ({...prev, visibility: value}))}
            >
              <SelectTrigger data-testid="select-event-visibility">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="exco-only">EXCO Only</SelectItem>
                <SelectItem value="admin-only">Admin Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleImportData("ical")}
              data-testid="button-import-ical"
            >
              <Upload className="h-4 w-4 mr-2" />
              Import iCal
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleImportData("csv")}
              data-testid="button-import-csv"
            >
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
            </Button>
          </div>
          
          <Button 
            onClick={handleQuickAddEvent}
            disabled={!eventData.title || !eventData.date}
            data-testid="button-add-event"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Event
          </Button>
        </div>
      </div>
    );
  };

  // Bank Statements Admin Features
  const BankStatementsAdminControls = () => {
    const [uploadStatus, setUploadStatus] = useState<string | null>(null);
    const [tagData, setTagData] = useState({
      category: "general",
      tags: "",
      autoAnalysis: true
    });

    const handleFileUpload = () => {
      setUploadStatus("uploading");
      // Simulate file upload
      setTimeout(() => {
        setUploadStatus("completed");
        toast({
          title: "Statement Uploaded",
          description: "Bank statement processed and categorized successfully"
        });
      }, 2000);
    };

    const handleAutoAnalysis = () => {
      toast({
        title: "Analysis Triggered",
        description: "Automated bank statement analysis has been initiated"
      });
    };

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="statement-category">Category</Label>
            <Select 
              value={tagData.category} 
              onValueChange={(value) => setTagData(prev => ({...prev, category: value}))}
            >
              <SelectTrigger data-testid="select-statement-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="competition">Competition</SelectItem>
                <SelectItem value="membership">Membership</SelectItem>
                <SelectItem value="operational">Operational</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="statement-tags">Tags (comma-separated)</Label>
            <Input
              id="statement-tags"
              value={tagData.tags}
              onChange={(e) => setTagData(prev => ({...prev, tags: e.target.value}))}
              placeholder="e.g. monthly, expenses, revenue"
              data-testid="input-statement-tags"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="auto-analysis"
            checked={tagData.autoAnalysis}
            onChange={(e) => setTagData(prev => ({...prev, autoAnalysis: e.target.checked}))}
          />
          <Label htmlFor="auto-analysis">Enable automatic analysis</Label>
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={handleFileUpload}
            disabled={uploadStatus === "uploading"}
            className="flex items-center space-x-2"
            data-testid="button-upload-statement"
          >
            <Upload className="h-4 w-4" />
            <span>{uploadStatus === "uploading" ? "Uploading..." : "Upload PDF"}</span>
          </Button>
          
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={handleAutoAnalysis}
              data-testid="button-trigger-analysis"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Trigger Analysis
            </Button>
            <Button variant="outline" data-testid="button-link-accounting">
              <FileText className="h-4 w-4 mr-2" />
              Link to Accounting
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // Welcome Message Admin Features
  const WelcomeAdminControls = () => {
    const [welcomeData, setWelcomeData] = useState({
      message: "Welcome to the Executive Committee Dashboard",
      userType: "general",
      showStats: true,
      priority: "medium"
    });

    const handleUpdateWelcome = () => {
      console.log("Updated welcome message:", welcomeData);
      toast({
        title: "Welcome Message Updated",
        description: "Dashboard welcome message has been customized"
      });
      onUpdate?.(welcomeData);
    };

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="welcome-message">Welcome Message</Label>
          <Textarea
            id="welcome-message"
            value={welcomeData.message}
            onChange={(e) => setWelcomeData(prev => ({...prev, message: e.target.value}))}
            rows={3}
            data-testid="textarea-welcome-message"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="user-type">Target User Type</Label>
            <Select 
              value={welcomeData.userType} 
              onValueChange={(value) => setWelcomeData(prev => ({...prev, userType: value}))}
            >
              <SelectTrigger data-testid="select-user-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">General EXCO</SelectItem>
                <SelectItem value="treasurer">Treasurer Focus</SelectItem>
                <SelectItem value="president">President Focus</SelectItem>
                <SelectItem value="secretary">Secretary Focus</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority-level">Priority Level</Label>
            <Select 
              value={welcomeData.priority} 
              onValueChange={(value) => setWelcomeData(prev => ({...prev, priority: value}))}
            >
              <SelectTrigger data-testid="select-priority-level">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low Priority</SelectItem>
                <SelectItem value="medium">Medium Priority</SelectItem>
                <SelectItem value="high">High Priority</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="show-stats"
            checked={welcomeData.showStats}
            onChange={(e) => setWelcomeData(prev => ({...prev, showStats: e.target.checked}))}
          />
          <Label htmlFor="show-stats">Show dashboard statistics</Label>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleUpdateWelcome} data-testid="button-update-welcome">
            <Save className="h-4 w-4 mr-2" />
            Update Welcome Message
          </Button>
        </div>
      </div>
    );
  };

  const renderAdminControls = () => {
    switch (cardType) {
      case "financial":
        return <FinancialAdminControls />;
      case "calendar":
        return <CalendarAdminControls />;
      case "bank-statements":
        return <BankStatementsAdminControls />;
      case "welcome":
        return <WelcomeAdminControls />;
      default:
        return <div>Admin controls for {cardType} coming soon...</div>;
    }
  };

  return (
    <div className="absolute top-2 right-2 z-10">
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="bg-red-50 hover:bg-red-100 border-red-200 text-red-700"
            data-testid={`button-admin-edit-${cardType}`}
          >
            <Edit3 className="h-3 w-3 mr-1" />
            <span className="text-xs">Admin Edit</span>
          </Button>
        </DialogTrigger>
        
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Admin Controls - {cardTitle}</span>
              <Badge variant="destructive" className="ml-2">ADMIN MODE</Badge>
            </DialogTitle>
            <DialogDescription>
              Configure and manage {cardType} dashboard functionality
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {renderAdminControls()}
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