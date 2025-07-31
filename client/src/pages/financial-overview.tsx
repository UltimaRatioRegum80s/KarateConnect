import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  PlusCircle, 
  Calendar,
  Target,
  AlertCircle,
  Banknote,
  BarChart3,
  LineChart
} from "lucide-react";
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

interface FinancialSummary {
  id: string;
  financialYear: string;
  currentBalance: string;
  projectedIncome: string;
  projectedExpenses: string;
  actualIncome: string;
  actualExpenses: string;
  currency: string;
  lastUpdated: string;
  updatedBy: string;
}

interface FinancialEntry {
  id: string;
  type: "income" | "expense" | "balance";
  category: string;
  description: string;
  amount: string;
  currency: string;
  date: string;
  isProjected: "true" | "false";
  financialYear: string;
  createdBy: string;
  createdAt: string;
}

const entrySchema = z.object({
  type: z.enum(["income", "expense", "balance"]),
  category: z.string().min(1, "Category is required"),
  description: z.string().min(1, "Description is required"),
  amount: z.string().min(1, "Amount is required"),
  currency: z.string().default("NAD"),
  date: z.string().min(1, "Date is required"),
  isProjected: z.enum(["true", "false"]).default("false"),
  financialYear: z.string().default("2025"),
});

type EntryFormData = z.infer<typeof entrySchema>;

export default function FinancialOverview() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const currentYear = new Date().getFullYear().toString();

  const form = useForm<EntryFormData>({
    resolver: zodResolver(entrySchema),
    defaultValues: {
      type: "income",
      category: "",
      description: "",
      amount: "",
      currency: "NAD",
      date: new Date().toISOString().split('T')[0],
      isProjected: "false",
      financialYear: currentYear,
    },
  });

  // Fetch financial data
  const { data: summary, isLoading: summaryLoading } = useQuery<FinancialSummary>({
    queryKey: ["/api/financial/summary", currentYear],
    refetchOnWindowFocus: true,
  });

  const { data: entries = [], isLoading: entriesLoading } = useQuery<FinancialEntry[]>({
    queryKey: ["/api/financial/entries", currentYear],
    refetchOnWindowFocus: true,
  });

  // Check if data comes from bank statements
  const hasBankStatementData = entries.some(entry => entry.createdBy === 'bank-statement');

  // Create entry mutation
  const createEntryMutation = useMutation({
    mutationFn: async (data: EntryFormData) => {
      return await apiRequest(`/api/financial/entries`, 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/financial"] });
      setIsAddDialogOpen(false);
      form.reset();
      toast({
        title: "Entry added",
        description: "Financial entry has been created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create financial entry",
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (amount: string, currency = "NAD") => {
    const num = parseFloat(amount);
    return `${currency} ${num.toLocaleString('en-NA', { minimumFractionDigits: 2 })}`;
  };

  const calculateProgressPercentage = (actual: string, projected: string) => {
    const actualNum = parseFloat(actual) || 0;
    const projectedNum = parseFloat(projected) || 1;
    return Math.min((actualNum / projectedNum) * 100, 100);
  };

  const getIncomeEntries = () => entries.filter(e => e.type === "income");
  const getExpenseEntries = () => entries.filter(e => e.type === "expense");
  const getProjectedEntries = () => entries.filter(e => e.isProjected === "true");
  const getActualEntries = () => entries.filter(e => e.isProjected === "false");

  // Prepare chart data
  const prepareMonthlyTrendData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.map((month, index) => {
      const monthNum = index + 1;
      const monthEntries = entries.filter(entry => {
        const entryMonth = new Date(entry.date).getMonth() + 1;
        return entryMonth === monthNum;
      });
      
      const income = monthEntries
        .filter(e => e.type === 'income')
        .reduce((sum, e) => sum + parseFloat(e.amount), 0);
      
      const expenses = monthEntries
        .filter(e => e.type === 'expense')
        .reduce((sum, e) => sum + parseFloat(e.amount), 0);

      return {
        month,
        income,
        expenses,
        balance: income - expenses
      };
    });
  };

  const prepareCategoryData = () => {
    const incomeByCategory: { [key: string]: number } = {};
    const expenseByCategory: { [key: string]: number } = {};

    entries.forEach(entry => {
      if (entry.type === 'income') {
        incomeByCategory[entry.category] = (incomeByCategory[entry.category] || 0) + parseFloat(entry.amount);
      } else if (entry.type === 'expense') {
        expenseByCategory[entry.category] = (expenseByCategory[entry.category] || 0) + parseFloat(entry.amount);
      }
    });

    return {
      income: Object.entries(incomeByCategory).map(([name, value]) => ({ name, value })),
      expenses: Object.entries(expenseByCategory).map(([name, value]) => ({ name, value }))
    };
  };

  const prepareProjectionVsActualData = () => {
    return [
      {
        category: 'Income',
        projected: parseFloat(summary?.projectedIncome || '0'),
        actual: parseFloat(summary?.actualIncome || '0')
      },
      {
        category: 'Expenses', 
        projected: parseFloat(summary?.projectedExpenses || '0'),
        actual: parseFloat(summary?.actualExpenses || '0')
      }
    ];
  };

  const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316'];

  if (summaryLoading || entriesLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Banknote className="h-6 w-6 text-green-600" />
          <h1 className="text-2xl font-bold">Financial Overview</h1>
        </div>
        <div className="grid gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Banknote className="h-6 w-6 text-green-600" />
          <h1 className="text-2xl font-bold">Financial Overview</h1>
          <Badge variant="outline">{currentYear}</Badge>
          {hasBankStatementData && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              📊 Live Bank Data
            </Badge>
          )}
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Entry
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Financial Entry</DialogTitle>
              <DialogDescription>
                Add a new income, expense, or balance entry to the financial records.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(data => createEntryMutation.mutate(data))} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="income">Income</SelectItem>
                            <SelectItem value="expense">Expense</SelectItem>
                            <SelectItem value="balance">Balance Update</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="isProjected"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="false">Actual</SelectItem>
                            <SelectItem value="true">Projected</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Membership Fees, Equipment, Venue Rental" {...field} />
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
                        <Textarea placeholder="Detailed description of the financial entry" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="0.00" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createEntryMutation.isPending}>
                    {createEntryMutation.isPending ? "Adding..." : "Add Entry"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Separator />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {summary ? formatCurrency(summary.currentBalance, summary.currency) : "NAD 0.00"}
            </div>
            <p className="text-xs text-muted-foreground">
              As of {summary ? format(new Date(summary.lastUpdated), "MMM d, yyyy") : "today"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projected Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {summary ? formatCurrency(summary.projectedIncome, summary.currency) : "NAD 0.00"}
            </div>
            <div className="mt-2">
              <div className="text-xs text-muted-foreground mb-1">
                Actual: {summary ? formatCurrency(summary.actualIncome, summary.currency) : "NAD 0.00"}
              </div>
              <Progress 
                value={summary ? calculateProgressPercentage(summary.actualIncome, summary.projectedIncome) : 0} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projected Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {summary ? formatCurrency(summary.projectedExpenses, summary.currency) : "NAD 0.00"}
            </div>
            <div className="mt-2">
              <div className="text-xs text-muted-foreground mb-1">
                Actual: {summary ? formatCurrency(summary.actualExpenses, summary.currency) : "NAD 0.00"}
              </div>
              <Progress 
                value={summary ? calculateProgressPercentage(summary.actualExpenses, summary.projectedExpenses) : 0} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Projection</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              summary && (parseFloat(summary.projectedIncome) - parseFloat(summary.projectedExpenses)) >= 0 
                ? "text-green-600" 
                : "text-red-600"
            }`}>
              {summary 
                ? formatCurrency(
                    (parseFloat(summary.projectedIncome) - parseFloat(summary.projectedExpenses)).toString(), 
                    summary.currency
                  )
                : "NAD 0.00"
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Projected income minus expenses
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed View */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="income">Income</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="projections">Projections</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Financial Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Monthly Trends Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="h-5 w-5 text-blue-600" />
                  Monthly Financial Trends
                </CardTitle>
                <CardDescription>
                  Income vs Expenses trend throughout the year
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsLineChart data={prepareMonthlyTrendData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`NAD ${value.toLocaleString()}`, '']} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="income" 
                      stroke="#10B981" 
                      strokeWidth={3}
                      name="Income"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="expenses" 
                      stroke="#EF4444" 
                      strokeWidth={3}
                      name="Expenses"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="balance" 
                      stroke="#3B82F6" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name="Net Balance"
                    />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Projected vs Actual Comparison */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-green-600" />
                  Projected vs Actual
                </CardTitle>
                <CardDescription>
                  How we're performing against projections
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={prepareProjectionVsActualData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`NAD ${value.toLocaleString()}`, '']} />
                    <Legend />
                    <Bar dataKey="projected" fill="#94A3B8" name="Projected" />
                    <Bar dataKey="actual" fill="#10B981" name="Actual" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Category Breakdown Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Income Categories */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Income by Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={prepareCategoryData().income}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {prepareCategoryData().income.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`NAD ${value.toLocaleString()}`, 'Amount']} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Expense Categories */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                  Expenses by Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={prepareCategoryData().expenses}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {prepareCategoryData().expenses.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`NAD ${value.toLocaleString()}`, 'Amount']} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <span>Recent Income</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {getIncomeEntries().slice(0, 5).map((entry) => (
                    <div key={entry.id} className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-sm">{entry.description}</p>
                        <p className="text-xs text-muted-foreground">{entry.category}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-green-600">
                          {formatCurrency(entry.amount, entry.currency)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(entry.date), "MMM d")}
                        </p>
                      </div>
                    </div>
                  ))}
                  {getIncomeEntries().length === 0 && (
                    <p className="text-muted-foreground text-sm">No income entries yet</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                  <span>Recent Expenses</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {getExpenseEntries().slice(0, 5).map((entry) => (
                    <div key={entry.id} className="flex justify-between items-center">
                      <div>
                        <p className="font-medium text-sm">{entry.description}</p>
                        <p className="text-xs text-muted-foreground">{entry.category}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-red-600">
                          {formatCurrency(entry.amount, entry.currency)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(entry.date), "MMM d")}
                        </p>
                      </div>
                    </div>
                  ))}
                  {getExpenseEntries().length === 0 && (
                    <p className="text-muted-foreground text-sm">No expense entries yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="income" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Income Entries</CardTitle>
              <CardDescription>All income transactions for {currentYear}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {getIncomeEntries().map((entry) => (
                  <div key={entry.id} className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{entry.description}</p>
                      <p className="text-sm text-muted-foreground">{entry.category}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Calendar className="h-3 w-3" />
                        <span className="text-xs">{format(new Date(entry.date), "MMM dd, yyyy")}</span>
                        {entry.isProjected === "true" && (
                          <Badge variant="outline" className="text-xs">Projected</Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">
                        {formatCurrency(entry.amount, entry.currency)}
                      </p>
                    </div>
                  </div>
                ))}
                {getIncomeEntries().length === 0 && (
                  <div className="text-center py-8">
                    <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No income entries found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Expense Entries</CardTitle>
              <CardDescription>All expense transactions for {currentYear}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {getExpenseEntries().map((entry) => (
                  <div key={entry.id} className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{entry.description}</p>
                      <p className="text-sm text-muted-foreground">{entry.category}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Calendar className="h-3 w-3" />
                        <span className="text-xs">{format(new Date(entry.date), "MMM dd, yyyy")}</span>
                        {entry.isProjected === "true" && (
                          <Badge variant="outline" className="text-xs">Projected</Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-600">
                        {formatCurrency(entry.amount, entry.currency)}
                      </p>
                    </div>
                  </div>
                ))}
                {getExpenseEntries().length === 0 && (
                  <div className="text-center py-8">
                    <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No expense entries found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projections" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Financial Projections</CardTitle>
              <CardDescription>Projected income and expenses for the remainder of {currentYear}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {getProjectedEntries().map((entry) => (
                  <div key={entry.id} className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{entry.description}</p>
                      <p className="text-sm text-muted-foreground">{entry.category}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Calendar className="h-3 w-3" />
                        <span className="text-xs">{format(new Date(entry.date), "MMM dd, yyyy")}</span>
                        <Badge variant="outline" className="text-xs">Projected</Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${
                        entry.type === "income" ? "text-blue-600" : "text-orange-600"
                      }`}>
                        {formatCurrency(entry.amount, entry.currency)}
                      </p>
                      <p className="text-xs capitalize text-muted-foreground">{entry.type}</p>
                    </div>
                  </div>
                ))}
                {getProjectedEntries().length === 0 && (
                  <div className="text-center py-8">
                    <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No projected entries found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}