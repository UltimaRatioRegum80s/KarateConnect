import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AdminProvider } from "@/contexts/AdminContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import EnhancedDashboard from "@/pages/enhanced-dashboard";
import ChatRoom from "@/pages/chat-room";
import FinancialOverview from "@/pages/financial-overview";
import BankStatements from "@/pages/bank-statements";
import Calendar from "@/pages/calendar";
import AdminPanel from "@/pages/admin-panel";
import Decisions from "@/pages/decisions";
import Documents from "@/pages/documents";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <Route path="/" component={Login} />
      ) : (
        <>
          <Route path="/" component={EnhancedDashboard} />
          <Route path="/old-dashboard" component={Dashboard} />
          <Route path="/chat/:roomId" component={ChatRoom} />
          <Route path="/financial" component={FinancialOverview} />
          <Route path="/bank-statements" component={BankStatements} />
          <Route path="/calendar" component={Calendar} />
          <Route path="/admin" component={AdminPanel} />
          <Route path="/decisions" component={Decisions} />
          <Route path="/documents" component={Documents} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AdminProvider>
            <Router />
          </AdminProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
