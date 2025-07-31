import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import Header from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, 
  FileText, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  AlertCircle,
  CheckCircle,
  Download,
  Trash2
} from "lucide-react";
import type { User } from "@shared/schema";

interface BankStatement {
  id: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  bankName?: string;
  accountNumber?: string;
  statementPeriod?: string;
  totalIncome?: string;
  totalExpenses?: string;
  netAmount?: string;
  transactionCount: number;
  isProcessed: boolean;
  processingNotes?: string;
  createdAt: string;
  updatedAt: string;
}

interface AnalysisResult {
  totalIncome: string;
  totalExpenses: string;
  netAmount: string;
  transactionCount: number;
  topIncomeCategories: { category: string; amount: string }[];
  topExpenseCategories: { category: string; amount: string }[];
  monthlyTrends: { month: string; income: string; expenses: string }[];
}

export default function BankStatements() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading, user } = useAuth() as { 
    isAuthenticated: boolean; 
    isLoading: boolean; 
    user: User | undefined; 
  };
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  // Check if user is admin
  const isAdmin = user?.role === "admin" || user?.role === "president";

  // Redirect to home if not authenticated or not admin
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !isAdmin)) {
      toast({
        title: "Access Denied",
        description: "You must be an admin to access bank statements.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
      return;
    }
  }, [isAuthenticated, isLoading, isAdmin, toast]);

  const { data: statements, isLoading: statementsLoading } = useQuery({
    queryKey: ["/api/bank-statements"],
    enabled: isAuthenticated && isAdmin,
  }) as { data: BankStatement[] | undefined; isLoading: boolean };

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/bank-statements/upload", {
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
        description: `Bank statement "${data.originalName}" uploaded successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bank-statements"] });
      setUploadFile(null);
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
        title: "Upload Failed",
        description: error.message || "Failed to upload bank statement",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(`/api/bank-statements/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast({
        title: "Deleted",
        description: "Bank statement deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/bank-statements"] });
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
        title: "Delete Failed",
        description: "Failed to delete bank statement",
        variant: "destructive",
      });
    },
  });

  const analyzeStatements = () => {
    if (!statements || statements.length === 0) return;

    // Mock analysis - in real app, this would analyze the actual statement data
    const totalIncome = statements.reduce((sum, stmt) => {
      return sum + parseFloat(stmt.totalIncome || "0");
    }, 0);

    const totalExpenses = statements.reduce((sum, stmt) => {
      return sum + parseFloat(stmt.totalExpenses || "0");
    }, 0);

    const analysisResult: AnalysisResult = {
      totalIncome: totalIncome.toFixed(2),
      totalExpenses: totalExpenses.toFixed(2),
      netAmount: (totalIncome - totalExpenses).toFixed(2),
      transactionCount: statements.reduce((sum, stmt) => sum + stmt.transactionCount, 0),
      topIncomeCategories: [
        { category: "Membership Fees", amount: (totalIncome * 0.6).toFixed(2) },
        { category: "Tournament Entries", amount: (totalIncome * 0.3).toFixed(2) },
        { category: "Other", amount: (totalIncome * 0.1).toFixed(2) },
      ],
      topExpenseCategories: [
        { category: "Venue Rental", amount: (totalExpenses * 0.4).toFixed(2) },
        { category: "Equipment", amount: (totalExpenses * 0.3).toFixed(2) },
        { category: "Travel", amount: (totalExpenses * 0.2).toFixed(2) },
        { category: "Other", amount: (totalExpenses * 0.1).toFixed(2) },
      ],
      monthlyTrends: [
        { month: "Jan", income: (totalIncome * 0.15).toFixed(2), expenses: (totalExpenses * 0.12).toFixed(2) },
        { month: "Feb", income: (totalIncome * 0.18).toFixed(2), expenses: (totalExpenses * 0.16).toFixed(2) },
        { month: "Mar", income: (totalIncome * 0.22).toFixed(2), expenses: (totalExpenses * 0.19).toFixed(2) },
      ],
    };

    setAnalysis(analysisResult);
  };

  const handleFileUpload = () => {
    if (!uploadFile) return;

    const formData = new FormData();
    formData.append("statement", uploadFile);
    formData.append("bankName", "First National Bank");
    formData.append("statementPeriod", new Date().toISOString().substring(0, 7));

    uploadMutation.mutate(formData);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

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

  if (!isAuthenticated || !isAdmin) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} showLogout />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Bank Statement Management
          </h1>
          <p className="text-gray-600">
            Upload and analyze bank statements for financial oversight and governance decisions.
          </p>
        </div>

        <Tabs defaultValue="upload" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upload">Upload Statements</TabsTrigger>
            <TabsTrigger value="statements">View Statements</TabsTrigger>
            <TabsTrigger value="analysis">Financial Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="upload">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload Bank Statement
                </CardTitle>
                <CardDescription>
                  Upload PDF bank statements for analysis. Supported formats: PDF, CSV
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    id="statement-upload"
                    accept=".pdf,.csv"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <label htmlFor="statement-upload" className="cursor-pointer">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg font-medium text-gray-900 mb-2">
                      Click to upload bank statement
                    </p>
                    <p className="text-sm text-gray-500">
                      PDF or CSV files up to 10MB
                    </p>
                  </label>
                </div>

                {uploadFile && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="h-6 w-6 text-blue-600" />
                        <div>
                          <p className="font-medium text-blue-900">{uploadFile.name}</p>
                          <p className="text-sm text-blue-700">{formatFileSize(uploadFile.size)}</p>
                        </div>
                      </div>
                      <Button
                        onClick={handleFileUpload}
                        disabled={uploadMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {uploadMutation.isPending ? "Uploading..." : "Upload"}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="statements">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Uploaded Statements
                </CardTitle>
                <CardDescription>
                  View and manage uploaded bank statements
                </CardDescription>
              </CardHeader>
              <CardContent>
                {statementsLoading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="animate-pulse bg-gray-200 h-16 rounded"></div>
                    ))}
                  </div>
                ) : statements && statements.length > 0 ? (
                  <div className="space-y-4">
                    {statements.map((statement) => (
                      <div key={statement.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <FileText className="h-6 w-6 text-blue-600" />
                            <div>
                              <h3 className="font-medium">{statement.originalName}</h3>
                              <p className="text-sm text-gray-500">
                                {statement.bankName} • {statement.statementPeriod}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={statement.isProcessed ? "default" : "secondary"}>
                              {statement.isProcessed ? (
                                <><CheckCircle className="h-3 w-3 mr-1" /> Processed</>
                              ) : (
                                <><AlertCircle className="h-3 w-3 mr-1" /> Pending</>
                              )}
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteMutation.mutate(statement.id)}
                              disabled={deleteMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        {statement.isProcessed && (
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Income:</span>
                              <span className="ml-2 font-medium text-green-600">
                                NAD {statement.totalIncome}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Expenses:</span>
                              <span className="ml-2 font-medium text-red-600">
                                NAD {statement.totalExpenses}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Transactions:</span>
                              <span className="ml-2 font-medium">
                                {statement.transactionCount}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No bank statements uploaded yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analysis">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Financial Analysis
                  </CardTitle>
                  <CardDescription>
                    Analysis of uploaded bank statements for governance decisions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={analyzeStatements} className="mb-6">
                    Generate Analysis
                  </Button>

                  {analysis && (
                    <div className="space-y-6">
                      {/* Summary Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="bg-green-50">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2">
                              <TrendingUp className="h-5 w-5 text-green-600" />
                              <div>
                                <p className="text-sm text-green-700">Total Income</p>
                                <p className="text-xl font-bold text-green-900">
                                  NAD {analysis.totalIncome}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="bg-red-50">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2">
                              <TrendingDown className="h-5 w-5 text-red-600" />
                              <div>
                                <p className="text-sm text-red-700">Total Expenses</p>
                                <p className="text-xl font-bold text-red-900">
                                  NAD {analysis.totalExpenses}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="bg-blue-50">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-5 w-5 text-blue-600" />
                              <div>
                                <p className="text-sm text-blue-700">Net Amount</p>
                                <p className="text-xl font-bold text-blue-900">
                                  NAD {analysis.netAmount}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Categories */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Top Income Categories</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {analysis.topIncomeCategories.map((cat, index) => (
                              <div key={index} className="flex justify-between items-center">
                                <span className="text-sm">{cat.category}</span>
                                <span className="font-medium text-green-600">NAD {cat.amount}</span>
                              </div>
                            ))}
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Top Expense Categories</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {analysis.topExpenseCategories.map((cat, index) => (
                              <div key={index} className="flex justify-between items-center">
                                <span className="text-sm">{cat.category}</span>
                                <span className="font-medium text-red-600">NAD {cat.amount}</span>
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}