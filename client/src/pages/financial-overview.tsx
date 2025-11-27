import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAdmin } from "@/contexts/AdminContext";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
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
import { useLocation } from "wouter";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  PlusCircle, 
  Calendar,
  CalendarDays,
  Target,
  AlertCircle,
  Banknote,
  BarChart3,
  LineChart,
  Home
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

type QuarterType = 'Q1' | 'Q2' | 'Q3' | 'Q4';
type ViewModeType = 'yearly' | 'quarterly' | 'monthly';
type MonthType = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

const QUARTERS: { name: QuarterType; months: number[]; label: string }[] = [
  { name: 'Q1', months: [1, 2, 3], label: 'Jan - Mar' },
  { name: 'Q2', months: [4, 5, 6], label: 'Apr - Jun' },
  { name: 'Q3', months: [7, 8, 9], label: 'Jul - Sep' },
  { name: 'Q4', months: [10, 11, 12], label: 'Oct - Dec' }
];

const MONTHS: { num: MonthType; name: string; short: string }[] = [
  { num: 1, name: 'January', short: 'Jan' },
  { num: 2, name: 'February', short: 'Feb' },
  { num: 3, name: 'March', short: 'Mar' },
  { num: 4, name: 'April', short: 'Apr' },
  { num: 5, name: 'May', short: 'May' },
  { num: 6, name: 'June', short: 'Jun' },
  { num: 7, name: 'July', short: 'Jul' },
  { num: 8, name: 'August', short: 'Aug' },
  { num: 9, name: 'September', short: 'Sep' },
  { num: 10, name: 'October', short: 'Oct' },
  { num: 11, name: 'November', short: 'Nov' },
  { num: 12, name: 'December', short: 'Dec' }
];

interface ProjectedExpense {
  id: string;
  eventId: string | null;
  eventTitle: string | null;
  category: string;
  description: string;
  amount: string;
  currency: string;
  expenseDate: string;
  financialYear: string;
  month: number;
  quarter: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  startDate: string;
  endDate: string | null;
  eventType: string;
  location: string | null;
}

const EXPENSE_CATEGORIES = [
  { value: 'travel', label: 'Travel' },
  { value: 'accommodation', label: 'Accommodation' },
  { value: 'registration', label: 'Registration Fees' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'meals', label: 'Meals & Catering' },
  { value: 'transport', label: 'Transport' },
  { value: 'venue', label: 'Venue Rental' },
  { value: 'officials', label: 'Officials & Judges' },
  { value: 'marketing', label: 'Marketing & Promotion' },
  { value: 'admin', label: 'Administrative' },
  { value: 'other', label: 'Other' },
];

const projectedExpenseSchema = z.object({
  eventTitle: z.string().min(1, "Event name is required"),
  amount: z.string().min(1, "Amount is required"),
  expenseDate: z.string().min(1, "Due date is required"),
  financialYear: z.string(),
  month: z.number(),
  // Optional fields for compatibility
  category: z.string().optional(),
  description: z.string().optional(),
  eventId: z.string().optional(),
});

type ProjectedExpenseFormData = z.infer<typeof projectedExpenseSchema>;

export default function FinancialOverview() {
  const { toast } = useToast();
  const { isAdminMode } = useAdmin();
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  
  // Check if user can add projected expenses (admin or president)
  const canAddProjectedExpenses = user?.role === 'admin' || user?.role === 'president';
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isProjectedExpenseDialogOpen, setIsProjectedExpenseDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewModeType>('quarterly');
  const [selectedQuarter, setSelectedQuarter] = useState<QuarterType>('Q1');
  const [selectedMonth, setSelectedMonth] = useState<MonthType>(1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const currentYear = selectedYear.toString();

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
  const { data: summary, isLoading: summaryLoading, error: summaryError } = useQuery<FinancialSummary>({
    queryKey: ["/api/financial/summary", currentYear],
    refetchOnWindowFocus: true,
    throwOnError: false,
  });

  const { data: entries = [], isLoading: entriesLoading, error: entriesError } = useQuery<FinancialEntry[]>({
    queryKey: ["/api/financial/entries", currentYear],
    refetchOnWindowFocus: true,
    throwOnError: false,
  });

  // Check if data comes from bank statements
  const hasBankStatementData = entries.some(entry => entry.createdBy === 'bank-statement');

  // Fetch projected expenses for selected year
  const { data: projectedExpenses = [] } = useQuery<ProjectedExpense[]>({
    queryKey: ["/api/financial/projected-expenses", currentYear],
    refetchOnWindowFocus: true,
    throwOnError: false,
  });

  // Fetch calendar events for event selector (filter by selected year)
  const { data: calendarEvents = [] } = useQuery<CalendarEvent[]>({
    queryKey: ["/api/calendar/events", selectedYear],
    queryFn: async () => {
      const response = await fetch(`/api/calendar/events?year=${selectedYear}`, {
        credentials: "include"
      });
      if (!response.ok) return [];
      return response.json();
    },
    refetchOnWindowFocus: true,
    throwOnError: false,
  });

  // Projected expense form
  const projectedExpenseForm = useForm<ProjectedExpenseFormData>({
    resolver: zodResolver(projectedExpenseSchema),
    defaultValues: {
      eventTitle: "",
      amount: "",
      expenseDate: new Date().toISOString().split('T')[0],
      financialYear: currentYear,
      month: new Date().getMonth() + 1,
    },
  });

  // Year navigation functions
  const goToPreviousYear = () => {
    setSelectedYear(prev => prev - 1);
  };

  const goToNextYear = () => {
    setSelectedYear(prev => prev + 1);
  };

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

  // Create projected expense mutation
  const createProjectedExpenseMutation = useMutation({
    mutationFn: async (data: ProjectedExpenseFormData) => {
      return await apiRequest(`/api/financial/projected-expenses`, 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/financial/projected-expenses"] });
      setIsProjectedExpenseDialogOpen(false);
      projectedExpenseForm.reset();
      toast({
        title: "Projected expense added",
        description: "Projected expense has been created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create projected expense",
        variant: "destructive",
      });
    },
  });

  // Delete projected expense mutation
  const deleteProjectedExpenseMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/financial/projected-expenses/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/financial/projected-expenses"] });
      toast({
        title: "Expense deleted",
        description: "Projected expense has been removed",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete projected expense",
        variant: "destructive",
      });
    },
  });

  // Get projected expenses by view mode
  const getViewModeProjectedExpenses = () => {
    switch (viewMode) {
      case 'yearly':
        return projectedExpenses;
      case 'quarterly': {
        const quarterMonths = getQuarterMonths(selectedQuarter);
        return projectedExpenses.filter(e => quarterMonths.includes(e.month));
      }
      case 'monthly':
        return projectedExpenses.filter(e => e.month === selectedMonth);
      default:
        return projectedExpenses;
    }
  };

  // Calculate total projected expenses for current view
  const getTotalProjectedExpenses = () => {
    return getViewModeProjectedExpenses().reduce((sum, e) => sum + parseFloat(e.amount), 0);
  };

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

  // Get entries filtered by selected quarter
  const getQuarterMonths = (quarter: QuarterType) => {
    const q = QUARTERS.find(q => q.name === quarter);
    return q ? q.months : [];
  };

  const filterEntriesByQuarter = (entriesToFilter: FinancialEntry[], quarter: QuarterType) => {
    const months = getQuarterMonths(quarter);
    return entriesToFilter.filter(entry => {
      const entryMonth = new Date(entry.date).getMonth() + 1;
      return months.includes(entryMonth);
    });
  };

  const getQuarterIncomeEntries = () => filterEntriesByQuarter(getIncomeEntries(), selectedQuarter);
  const getQuarterExpenseEntries = () => filterEntriesByQuarter(getExpenseEntries(), selectedQuarter);

  // Monthly filtering
  const filterEntriesByMonth = (entriesToFilter: FinancialEntry[], month: MonthType) => {
    return entriesToFilter.filter(entry => {
      const entryMonth = new Date(entry.date).getMonth() + 1;
      return entryMonth === month;
    });
  };

  const getMonthIncomeEntries = () => filterEntriesByMonth(getIncomeEntries(), selectedMonth);
  const getMonthExpenseEntries = () => filterEntriesByMonth(getExpenseEntries(), selectedMonth);

  // Get entries based on current view mode
  const getViewModeIncomeEntries = () => {
    switch (viewMode) {
      case 'yearly': return getIncomeEntries();
      case 'quarterly': return getQuarterIncomeEntries();
      case 'monthly': return getMonthIncomeEntries();
      default: return getIncomeEntries();
    }
  };

  const getViewModeExpenseEntries = () => {
    switch (viewMode) {
      case 'yearly': return getExpenseEntries();
      case 'quarterly': return getQuarterExpenseEntries();
      case 'monthly': return getMonthExpenseEntries();
      default: return getExpenseEntries();
    }
  };

  const getViewModeProjectedEntries = () => {
    const projected = getProjectedEntries();
    switch (viewMode) {
      case 'yearly': return projected;
      case 'quarterly': return filterEntriesByQuarter(projected, selectedQuarter);
      case 'monthly': return filterEntriesByMonth(projected, selectedMonth);
      default: return projected;
    }
  };

  // Navigation functions for carousel
  const goToPreviousQuarter = () => {
    const currentIndex = QUARTERS.findIndex(q => q.name === selectedQuarter);
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : QUARTERS.length - 1;
    setSelectedQuarter(QUARTERS[prevIndex].name);
  };

  const goToNextQuarter = () => {
    const currentIndex = QUARTERS.findIndex(q => q.name === selectedQuarter);
    const nextIndex = currentIndex < QUARTERS.length - 1 ? currentIndex + 1 : 0;
    setSelectedQuarter(QUARTERS[nextIndex].name);
  };

  const goToPreviousMonth = () => {
    setSelectedMonth(prev => prev > 1 ? (prev - 1) as MonthType : 12);
  };

  const goToNextMonth = () => {
    setSelectedMonth(prev => prev < 12 ? (prev + 1) as MonthType : 1);
  };

  const getQuarterLabel = () => {
    const q = QUARTERS.find(q => q.name === selectedQuarter);
    return q ? q.label : '';
  };

  const getMonthLabel = () => {
    const m = MONTHS.find(m => m.num === selectedMonth);
    return m ? m.name : '';
  };

  const getMonthShort = () => {
    const m = MONTHS.find(m => m.num === selectedMonth);
    return m ? m.short : '';
  };

  // Get period label based on view mode
  const getPeriodLabel = () => {
    switch (viewMode) {
      case 'yearly': return `Full Year ${currentYear}`;
      case 'quarterly': return `${selectedQuarter} (${getQuarterLabel()})`;
      case 'monthly': return getMonthLabel();
      default: return '';
    }
  };

  // Get totals based on view mode
  const getViewModeTotals = () => {
    const incomeEntries = getViewModeIncomeEntries();
    const expenseEntries = getViewModeExpenseEntries();
    
    const income = incomeEntries.reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const expenses = expenseEntries.reduce((sum, e) => sum + parseFloat(e.amount), 0);
    
    return { income, expenses, net: income - expenses };
  };

  // Prepare chart data based on view mode
  const prepareViewModeChartData = () => {
    const allMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    let monthsToShow: number[];
    switch (viewMode) {
      case 'yearly':
        monthsToShow = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
        break;
      case 'quarterly':
        monthsToShow = getQuarterMonths(selectedQuarter);
        break;
      case 'monthly':
        monthsToShow = [selectedMonth];
        break;
      default:
        monthsToShow = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    }

    return monthsToShow.map(monthNum => {
      const month = allMonths[monthNum - 1];
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

  // Prepare category data based on view mode
  const prepareViewModeCategoryData = () => {
    const incomeEntries = getViewModeIncomeEntries();
    const expenseEntries = getViewModeExpenseEntries();
    
    const incomeByCategory: { [key: string]: number } = {};
    const expenseByCategory: { [key: string]: number } = {};

    incomeEntries.forEach(entry => {
      incomeByCategory[entry.category] = (incomeByCategory[entry.category] || 0) + parseFloat(entry.amount);
    });

    expenseEntries.forEach(entry => {
      expenseByCategory[entry.category] = (expenseByCategory[entry.category] || 0) + parseFloat(entry.amount);
    });

    return {
      income: Object.entries(incomeByCategory).map(([name, value]) => ({ name, value })),
      expenses: Object.entries(expenseByCategory).map(([name, value]) => ({ name, value }))
    };
  };

  // Prepare projection vs actual data based on view mode
  const prepareViewModeProjectionVsActualData = () => {
    const totals = getViewModeTotals();
    
    // Adjust projected amounts based on view mode
    let projectionDivisor = 1;
    switch (viewMode) {
      case 'yearly': projectionDivisor = 1; break;
      case 'quarterly': projectionDivisor = 4; break;
      case 'monthly': projectionDivisor = 12; break;
    }
    
    const projectedIncome = parseFloat(summary?.projectedIncome || '0') / projectionDivisor;
    const projectedExpenses = parseFloat(summary?.projectedExpenses || '0') / projectionDivisor;

    return [
      {
        category: 'Income',
        projected: projectedIncome,
        actual: totals.income
      },
      {
        category: 'Expenses', 
        projected: projectedExpenses,
        actual: totals.expenses
      }
    ];
  };

  // Calculate total projected event expenses
  const totalProjectedEventExpenses = projectedExpenses.reduce(
    (sum, pe) => sum + parseFloat(pe.amount), 0
  );

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

      // Add projected expenses from calendar events
      const monthProjectedExpenses = projectedExpenses
        .filter(pe => pe.month === monthNum)
        .reduce((sum, pe) => sum + parseFloat(pe.amount), 0);

      return {
        month,
        income,
        expenses,
        projectedEventExpenses: monthProjectedExpenses,
        balance: income - expenses
      };
    });
  };

  // Prepare quarterly chart data (only months in selected quarter)
  const prepareQuarterlyMonthlyTrendData = () => {
    const allMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const quarterMonths = getQuarterMonths(selectedQuarter);
    
    return quarterMonths.map(monthNum => {
      const month = allMonths[monthNum - 1];
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

      // Add projected expenses from calendar events
      const monthProjectedExpenses = projectedExpenses
        .filter(pe => pe.month === monthNum)
        .reduce((sum, pe) => sum + parseFloat(pe.amount), 0);

      return {
        month,
        income,
        expenses,
        projectedEventExpenses: monthProjectedExpenses,
        balance: income - expenses
      };
    });
  };

  // Prepare category data for selected quarter
  const prepareQuarterlyCategoryData = () => {
    const quarterEntries = filterEntriesByQuarter(entries, selectedQuarter);
    const incomeByCategory: { [key: string]: number } = {};
    const expenseByCategory: { [key: string]: number } = {};

    quarterEntries.forEach(entry => {
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

  // Prepare quarterly projection vs actual data
  const prepareQuarterlyProjectionVsActualData = () => {
    const quarterEntries = filterEntriesByQuarter(entries, selectedQuarter);
    const actualIncome = quarterEntries
      .filter(e => e.type === 'income')
      .reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const actualExpenses = quarterEntries
      .filter(e => e.type === 'expense')
      .reduce((sum, e) => sum + parseFloat(e.amount), 0);
    
    // Divide yearly projections by 4 for quarterly estimate
    const projectedIncome = parseFloat(summary?.projectedIncome || '0') / 4;
    const projectedExpenses = parseFloat(summary?.projectedExpenses || '0') / 4;

    return [
      {
        category: 'Income',
        projected: projectedIncome,
        actual: actualIncome
      },
      {
        category: 'Expenses', 
        projected: projectedExpenses,
        actual: actualExpenses
      }
    ];
  };

  // Get quarterly totals for header display
  const getQuarterlyTotals = () => {
    const quarterEntries = filterEntriesByQuarter(entries, selectedQuarter);
    const income = quarterEntries
      .filter(e => e.type === 'income')
      .reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const expenses = quarterEntries
      .filter(e => e.type === 'expense')
      .reduce((sum, e) => sum + parseFloat(e.amount), 0);
    return { income, expenses, net: income - expenses };
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

  // Calculate quarterly data from entries
  const prepareQuarterlyData = () => {
    const quarters = [
      { name: 'Q1', months: [1, 2, 3], label: 'Jan - Mar' },
      { name: 'Q2', months: [4, 5, 6], label: 'Apr - Jun' },
      { name: 'Q3', months: [7, 8, 9], label: 'Jul - Sep' },
      { name: 'Q4', months: [10, 11, 12], label: 'Oct - Dec' }
    ];

    return quarters.map(quarter => {
      const quarterEntries = entries.filter(entry => {
        const entryMonth = new Date(entry.date).getMonth() + 1;
        return quarter.months.includes(entryMonth);
      });

      const income = quarterEntries
        .filter(e => e.type === 'income')
        .reduce((sum, e) => sum + parseFloat(e.amount), 0);

      const expenses = quarterEntries
        .filter(e => e.type === 'expense')
        .reduce((sum, e) => sum + parseFloat(e.amount), 0);

      // Add projected expenses from calendar events for this quarter
      const quarterProjectedExpenses = projectedExpenses
        .filter(pe => quarter.months.includes(pe.month))
        .reduce((sum, pe) => sum + parseFloat(pe.amount), 0);

      return {
        quarter: quarter.name,
        label: quarter.label,
        income,
        expenses,
        projectedEventExpenses: quarterProjectedExpenses,
        net: income - expenses,
        transactionCount: quarterEntries.length
      };
    });
  };

  const quarterlyData = prepareQuarterlyData();
  const totalYearlyIncome = quarterlyData.reduce((sum, q) => sum + q.income, 0);
  const totalYearlyExpenses = quarterlyData.reduce((sum, q) => sum + q.expenses, 0);
  const totalYearlyNet = totalYearlyIncome - totalYearlyExpenses;

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
        <div className="flex items-center space-x-4">
          {/* Enhanced Home Button */}
          <Button
            variant="outline"
            size="sm"
            className="relative flex items-center transition-all duration-300 hover:bg-blue-50 border-blue-200"
            data-testid="button-home"
            title="Go to Dashboard"
            onClick={() => setLocation("/")}
          >
            <Home className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Dashboard</span>
            <span className="sm:hidden">Home</span>
          </Button>
          
          <div className="flex items-center space-x-2">
            <Banknote className="h-6 w-6 text-green-600" />
            <h1 className="text-2xl font-bold">Financial Overview</h1>
            
            {/* Year Navigation */}
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={goToPreviousYear}
                data-testid="button-prev-year"
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Badge variant="outline" className="text-lg px-3 py-1" data-testid="badge-current-year">
                {currentYear}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={goToNextYear}
                data-testid="button-next-year"
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            
            {hasBankStatementData && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                📊 Live Bank Data
              </Badge>
            )}
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center space-x-2 flex-wrap gap-2">
          {canAddProjectedExpenses && (
            <Dialog open={isProjectedExpenseDialogOpen} onOpenChange={setIsProjectedExpenseDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="bg-orange-50 border-orange-200 hover:bg-orange-100" data-testid="button-add-projected-expense">
                  <Target className="h-4 w-4 mr-2 text-orange-600" />
                  Add Projected Expense
                </Button>
              </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Add Projected Expense</DialogTitle>
                    <DialogDescription>
                      Enter a projected/expected expense for an upcoming event or period.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...projectedExpenseForm}>
                    <form onSubmit={projectedExpenseForm.handleSubmit(data => createProjectedExpenseMutation.mutate(data))} className="space-y-4">
                      {/* Event Name */}
                      <FormField
                        control={projectedExpenseForm.control}
                        name="eventTitle"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Event Name</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Commonwealth Championships, Regional Tournament" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Due Date */}
                      <FormField
                        control={projectedExpenseForm.control}
                        name="expenseDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Due Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} onChange={(e) => {
                                field.onChange(e);
                                const date = new Date(e.target.value);
                                projectedExpenseForm.setValue('month', date.getMonth() + 1);
                                projectedExpenseForm.setValue('financialYear', date.getFullYear().toString());
                              }} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Estimated Expense */}
                      <FormField
                        control={projectedExpenseForm.control}
                        name="amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Estimated Expense (NAD)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" placeholder="0.00" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white" disabled={createProjectedExpenseMutation.isPending}>
                        {createProjectedExpenseMutation.isPending ? "Adding..." : "Add Expense"}
                      </Button>
                    </form>
                  </Form>
                </DialogContent>
            </Dialog>
          )}
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            {isAdminMode && (
              <DialogTrigger asChild>
                <Button data-testid="button-add-entry">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Entry
                </Button>
              </DialogTrigger>
            )}
            {!isAdminMode && (
              <div className="text-sm text-gray-500 flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                Enable admin mode to add entries
              </div>
            )}
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
    </div>

      <Separator />

      {/* Summary Accordion with Quarterly Breakdown */}
      <Accordion type="single" collapsible defaultValue="summary" className="w-full">
        <AccordionItem value="summary" className="border rounded-lg bg-white dark:bg-gray-800 shadow-sm overflow-hidden dark:border-gray-700">
          <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-gray-50 dark:hover:bg-gray-700/50" data-testid="accordion-summary">
            <div className="flex items-center justify-between w-full pr-4">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="text-left">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Summary</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Quarterly financial breakdown for {currentYear}</p>
                </div>
              </div>
              <div className="flex items-center space-x-6 text-right">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Current Balance</p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                    {summary ? formatCurrency(summary.currentBalance, summary.currency) : "NAD 0.00"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Year Net</p>
                  <p className={`text-lg font-bold ${totalYearlyNet >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    NAD {totalYearlyNet.toLocaleString('en-NA', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            {/* Quarterly Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              {quarterlyData.map((quarter) => (
                <Card key={quarter.quarter} className="bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600" data-testid={`card-${quarter.quarter.toLowerCase()}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-semibold text-gray-900 dark:text-white">
                        {quarter.quarter}
                      </CardTitle>
                      <Badge variant="outline" className="text-xs dark:border-gray-500 dark:text-gray-300">
                        {quarter.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        <span className="text-sm text-gray-600 dark:text-gray-300">Income</span>
                      </div>
                      <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                        NAD {quarter.income.toLocaleString('en-NA', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <TrendingDown className="h-4 w-4 text-red-500" />
                        <span className="text-sm text-gray-600 dark:text-gray-300">Expenses</span>
                      </div>
                      <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                        NAD {quarter.expenses.toLocaleString('en-NA', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {quarter.projectedEventExpenses > 0 && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <CalendarDays className="h-4 w-4 text-orange-500" />
                          <span className="text-sm text-gray-600 dark:text-gray-300">Event Proj.</span>
                        </div>
                        <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                          NAD {quarter.projectedEventExpenses.toLocaleString('en-NA', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                    <Separator className="dark:bg-gray-600" />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Target className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Net</span>
                      </div>
                      <span className={`text-sm font-bold ${quarter.net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        NAD {quarter.net.toLocaleString('en-NA', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    {quarter.transactionCount > 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 text-center pt-1">
                        {quarter.transactionCount} transaction{quarter.transactionCount !== 1 ? 's' : ''}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Year Totals Row */}
            <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg border border-gray-200 dark:border-gray-600">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Current Balance</p>
                  <p className="text-xl font-bold text-green-600 dark:text-green-400">
                    {summary ? formatCurrency(summary.currentBalance, summary.currency) : "NAD 0.00"}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    As of {summary ? format(new Date(summary.lastUpdated), "MMM d, yyyy") : "today"}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Income</p>
                  <p className="text-xl font-bold text-green-600 dark:text-green-400">
                    NAD {totalYearlyIncome.toLocaleString('en-NA', { minimumFractionDigits: 2 })}
                  </p>
                  <div className="flex items-center justify-center text-xs text-gray-400 dark:text-gray-500">
                    <span>Projected: {summary ? formatCurrency(summary.projectedIncome, summary.currency) : "NAD 0.00"}</span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Expenses</p>
                  <p className="text-xl font-bold text-red-600 dark:text-red-400">
                    NAD {totalYearlyExpenses.toLocaleString('en-NA', { minimumFractionDigits: 2 })}
                  </p>
                  <div className="flex items-center justify-center text-xs text-gray-400 dark:text-gray-500">
                    <span>Projected: {summary ? formatCurrency(summary.projectedExpenses, summary.currency) : "NAD 0.00"}</span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Event Expenses</p>
                  <p className="text-xl font-bold text-orange-600 dark:text-orange-400">
                    NAD {totalProjectedEventExpenses.toLocaleString('en-NA', { minimumFractionDigits: 2 })}
                  </p>
                  <div className="flex items-center justify-center text-xs text-gray-400 dark:text-gray-500">
                    <span>{projectedExpenses.length} calendar events</span>
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Net Result</p>
                  <p className={`text-xl font-bold ${totalYearlyNet >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    NAD {totalYearlyNet.toLocaleString('en-NA', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {totalYearlyNet >= 0 ? 'Surplus' : 'Deficit'}
                  </p>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Projected Event Expenses Accordion */}
      {projectedExpenses.length > 0 && (
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="projected-expenses" className="border rounded-lg bg-white dark:bg-gray-800 shadow-sm overflow-hidden dark:border-gray-700">
            <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-gray-50 dark:hover:bg-gray-700/50" data-testid="accordion-projected-expenses">
              <div className="flex items-center justify-between w-full pr-4">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                    <CalendarDays className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="text-left">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Projected Event Expenses</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{projectedExpenses.length} events for {currentYear}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <Badge variant="secondary" className="bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300">
                    NAD {totalProjectedEventExpenses.toLocaleString('en-NA', { minimumFractionDigits: 2 })}
                  </Badge>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="space-y-3 mt-4">
                {projectedExpenses.map((expense) => (
                  <Card key={expense.id} className="bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600" data-testid={`projected-expense-${expense.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <CalendarDays className="h-4 w-4 text-orange-500" />
                            <span className="font-medium text-gray-900 dark:text-white">{expense.eventTitle || 'General Expense'}</span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{expense.description}</p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                            <span>Category: {expense.category}</span>
                            <span>Date: {format(new Date(expense.expenseDate), "MMM d, yyyy")}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                            NAD {parseFloat(expense.amount).toLocaleString('en-NA', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      {/* Detailed View - Collapsible Accordion with Time Period Navigation */}
      <Accordion type="single" collapsible defaultValue="details" className="w-full">
        <AccordionItem value="details" className="border rounded-lg bg-white dark:bg-gray-800 shadow-sm overflow-hidden dark:border-gray-700">
          <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-gray-50 dark:hover:bg-gray-700/50" data-testid="accordion-details">
            <div className="flex items-center justify-between w-full pr-4">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-left">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Financial Details</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Charts, categories & transactions</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                  {getPeriodLabel()}
                </Badge>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            {/* View Mode Selector */}
            <div className="flex items-center justify-center space-x-2 mb-4 mt-4">
              <Button
                variant={viewMode === 'yearly' ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode('yearly')}
                className={`min-w-[80px] ${
                  viewMode === 'yearly'
                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                    : 'dark:border-gray-600 dark:hover:bg-gray-700'
                }`}
                data-testid="button-view-yearly"
              >
                Yearly
              </Button>
              <Button
                variant={viewMode === 'quarterly' ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode('quarterly')}
                className={`min-w-[80px] ${
                  viewMode === 'quarterly'
                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                    : 'dark:border-gray-600 dark:hover:bg-gray-700'
                }`}
                data-testid="button-view-quarterly"
              >
                Quarterly
              </Button>
              <Button
                variant={viewMode === 'monthly' ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode('monthly')}
                className={`min-w-[80px] ${
                  viewMode === 'monthly'
                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                    : 'dark:border-gray-600 dark:hover:bg-gray-700'
                }`}
                data-testid="button-view-monthly"
              >
                Monthly
              </Button>
            </div>

            {/* Time Period Navigation - Conditional based on view mode */}
            {viewMode === 'quarterly' && (
              <div className="flex items-center justify-center space-x-4 mb-6">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={goToPreviousQuarter}
                  className="h-10 w-10 rounded-full dark:border-gray-600 dark:hover:bg-gray-700"
                  data-testid="button-prev-quarter"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                
                <div className="flex items-center space-x-2">
                  {QUARTERS.map((quarter) => (
                    <Button
                      key={quarter.name}
                      variant={selectedQuarter === quarter.name ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedQuarter(quarter.name)}
                      className={`min-w-[60px] ${
                        selectedQuarter === quarter.name 
                          ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                          : 'dark:border-gray-600 dark:hover:bg-gray-700'
                      }`}
                      data-testid={`button-${quarter.name.toLowerCase()}`}
                    >
                      {quarter.name}
                    </Button>
                  ))}
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={goToNextQuarter}
                  className="h-10 w-10 rounded-full dark:border-gray-600 dark:hover:bg-gray-700"
                  data-testid="button-next-quarter"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            )}

            {viewMode === 'monthly' && (
              <div className="flex items-center justify-center space-x-4 mb-6">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={goToPreviousMonth}
                  className="h-10 w-10 rounded-full dark:border-gray-600 dark:hover:bg-gray-700"
                  data-testid="button-prev-month"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                
                <div className="flex items-center space-x-1 flex-wrap justify-center">
                  {MONTHS.map((month) => (
                    <Button
                      key={month.num}
                      variant={selectedMonth === month.num ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedMonth(month.num)}
                      className={`min-w-[45px] px-2 ${
                        selectedMonth === month.num 
                          ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                          : 'dark:border-gray-600 dark:hover:bg-gray-700'
                      }`}
                      data-testid={`button-month-${month.num}`}
                    >
                      {month.short}
                    </Button>
                  ))}
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={goToNextMonth}
                  className="h-10 w-10 rounded-full dark:border-gray-600 dark:hover:bg-gray-700"
                  data-testid="button-next-month"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
            )}

            {viewMode === 'yearly' && (
              <div className="flex items-center justify-center mb-6">
                <Badge variant="outline" className="text-sm px-4 py-2 dark:border-gray-600 dark:text-gray-300">
                  Showing all 12 months of {currentYear}
                </Badge>
              </div>
            )}

            {/* Period Info Bar */}
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-lg border border-gray-200 dark:border-gray-600">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Period</p>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {viewMode === 'yearly' ? currentYear : viewMode === 'quarterly' ? selectedQuarter : getMonthShort()}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {viewMode === 'yearly' ? 'Full Year' : viewMode === 'quarterly' ? getQuarterLabel() : getMonthLabel()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Income</p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                    NAD {getViewModeTotals().income.toLocaleString('en-NA', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Expenses</p>
                  <p className="text-lg font-bold text-red-600 dark:text-red-400">
                    NAD {getViewModeTotals().expenses.toLocaleString('en-NA', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Net</p>
                  <p className={`text-lg font-bold ${getViewModeTotals().net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    NAD {getViewModeTotals().net.toLocaleString('en-NA', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>

            {/* Tabs for different views */}
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="dark:bg-gray-700">
                <TabsTrigger value="overview" className="dark:data-[state=active]:bg-gray-600">Overview</TabsTrigger>
                <TabsTrigger value="income" className="dark:data-[state=active]:bg-gray-600">Income</TabsTrigger>
                <TabsTrigger value="expenses" className="dark:data-[state=active]:bg-gray-600">Expenses</TabsTrigger>
                <TabsTrigger value="projections" className="dark:data-[state=active]:bg-gray-600">Projections</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                {/* Financial Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  {/* Trends Chart - adapts to view mode */}
                  <Card className="dark:bg-gray-700/50 dark:border-gray-600">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 dark:text-white">
                        <LineChart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        {viewMode === 'yearly' ? 'Annual' : viewMode === 'quarterly' ? selectedQuarter : getMonthShort()} Trends
                      </CardTitle>
                      <CardDescription className="dark:text-gray-400">
                        Income vs Expenses for {getPeriodLabel()}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {viewMode === 'monthly' ? (
                        <div className="h-[300px] flex items-center justify-center">
                          <div className="text-center">
                            <div className="grid grid-cols-3 gap-8">
                              <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Income</p>
                                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                  NAD {getViewModeTotals().income.toLocaleString('en-NA', { minimumFractionDigits: 2 })}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Expenses</p>
                                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                                  NAD {getViewModeTotals().expenses.toLocaleString('en-NA', { minimumFractionDigits: 2 })}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Net</p>
                                <p className={`text-2xl font-bold ${getViewModeTotals().net >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                  NAD {getViewModeTotals().net.toLocaleString('en-NA', { minimumFractionDigits: 2 })}
                                </p>
                              </div>
                            </div>
                            <p className="text-sm text-gray-400 dark:text-gray-500 mt-4">{getMonthLabel()} {currentYear}</p>
                          </div>
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height={300}>
                          <RechartsLineChart data={prepareViewModeChartData()}>
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
                      )}
                    </CardContent>
                  </Card>

                  {/* Projected vs Actual Comparison - adapts to view mode */}
                  <Card className="dark:bg-gray-700/50 dark:border-gray-600">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 dark:text-white">
                        <BarChart3 className="h-5 w-5 text-green-600 dark:text-green-400" />
                        {viewMode === 'yearly' ? 'Annual' : viewMode === 'quarterly' ? selectedQuarter : getMonthShort()} Projected vs Actual
                      </CardTitle>
                      <CardDescription className="dark:text-gray-400">
                        Performance against {viewMode === 'yearly' ? 'annual' : viewMode === 'quarterly' ? 'quarterly' : 'monthly'} projections
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={prepareViewModeProjectionVsActualData()}>
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

                {/* Category Breakdown Charts - adapts to view mode */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  {/* Income Categories */}
                  <Card className="dark:bg-gray-700/50 dark:border-gray-600">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 dark:text-white">
                        <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                        {viewMode === 'yearly' ? 'Annual' : viewMode === 'quarterly' ? selectedQuarter : getMonthShort()} Income by Category
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {prepareViewModeCategoryData().income.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie
                              data={prepareViewModeCategoryData().income}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {prepareViewModeCategoryData().income.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => [`NAD ${value.toLocaleString()}`, 'Amount']} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-[250px] text-gray-500 dark:text-gray-400">
                          No income data for {getPeriodLabel()}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Expense Categories */}
                  <Card className="dark:bg-gray-700/50 dark:border-gray-600">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 dark:text-white">
                        <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                        {viewMode === 'yearly' ? 'Annual' : viewMode === 'quarterly' ? selectedQuarter : getMonthShort()} Expenses by Category
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {prepareViewModeCategoryData().expenses.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                          <PieChart>
                            <Pie
                              data={prepareViewModeCategoryData().expenses}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {prepareViewModeCategoryData().expenses.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => [`NAD ${value.toLocaleString()}`, 'Amount']} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-[250px] text-gray-500 dark:text-gray-400">
                          No expense data for {getPeriodLabel()}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
                
                {/* Recent Income/Expenses - adapts to view mode */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="dark:bg-gray-700/50 dark:border-gray-600">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2 dark:text-white">
                        <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                        <span>{viewMode === 'yearly' ? 'Annual' : viewMode === 'quarterly' ? selectedQuarter : getMonthShort()} Income</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {getViewModeIncomeEntries().slice(0, 5).map((entry) => (
                          <div key={entry.id} className="flex justify-between items-center">
                            <div>
                              <p className="font-medium text-sm dark:text-white">{entry.description}</p>
                              <p className="text-xs text-muted-foreground dark:text-gray-400">{entry.category}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-green-600 dark:text-green-400">
                                {formatCurrency(entry.amount, entry.currency)}
                              </p>
                              <p className="text-xs text-muted-foreground dark:text-gray-400">
                                {format(new Date(entry.date), "MMM d")}
                              </p>
                            </div>
                          </div>
                        ))}
                        {getViewModeIncomeEntries().length === 0 && (
                          <p className="text-muted-foreground dark:text-gray-400 text-sm">No income entries for {getPeriodLabel()}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="dark:bg-gray-700/50 dark:border-gray-600">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2 dark:text-white">
                        <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                        <span>{viewMode === 'yearly' ? 'Annual' : viewMode === 'quarterly' ? selectedQuarter : getMonthShort()} Expenses</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {getViewModeExpenseEntries().slice(0, 5).map((entry) => (
                          <div key={entry.id} className="flex justify-between items-center">
                            <div>
                              <p className="font-medium text-sm dark:text-white">{entry.description}</p>
                              <p className="text-xs text-muted-foreground dark:text-gray-400">{entry.category}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-red-600 dark:text-red-400">
                                {formatCurrency(entry.amount, entry.currency)}
                              </p>
                              <p className="text-xs text-muted-foreground dark:text-gray-400">
                                {format(new Date(entry.date), "MMM d")}
                              </p>
                            </div>
                          </div>
                        ))}
                        {getViewModeExpenseEntries().length === 0 && (
                          <p className="text-muted-foreground dark:text-gray-400 text-sm">No expense entries for {getPeriodLabel()}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="income" className="space-y-4">
                <Card className="dark:bg-gray-700/50 dark:border-gray-600">
                  <CardHeader>
                    <CardTitle className="dark:text-white">{viewMode === 'yearly' ? 'Annual' : viewMode === 'quarterly' ? selectedQuarter : getMonthShort()} Income Entries</CardTitle>
                    <CardDescription className="dark:text-gray-400">Income transactions for {getPeriodLabel()}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {getViewModeIncomeEntries().map((entry) => (
                        <div key={entry.id} className="flex justify-between items-center p-3 border rounded-lg dark:border-gray-600 dark:bg-gray-800/50">
                          <div>
                            <p className="font-medium dark:text-white">{entry.description}</p>
                            <p className="text-sm text-muted-foreground dark:text-gray-400">{entry.category}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              <Calendar className="h-3 w-3 dark:text-gray-400" />
                              <span className="text-xs dark:text-gray-400">{format(new Date(entry.date), "MMM dd, yyyy")}</span>
                              {entry.isProjected === "true" && (
                                <Badge variant="outline" className="text-xs dark:border-gray-500">Projected</Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-600 dark:text-green-400">
                              {formatCurrency(entry.amount, entry.currency)}
                            </p>
                          </div>
                        </div>
                      ))}
                      {getViewModeIncomeEntries().length === 0 && (
                        <div className="text-center py-8">
                          <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground dark:text-gray-500 mb-2" />
                          <p className="text-muted-foreground dark:text-gray-400">No income entries for {getPeriodLabel()}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="expenses" className="space-y-4">
                <Card className="dark:bg-gray-700/50 dark:border-gray-600">
                  <CardHeader>
                    <CardTitle className="dark:text-white">{viewMode === 'yearly' ? 'Annual' : viewMode === 'quarterly' ? selectedQuarter : getMonthShort()} Expense Entries</CardTitle>
                    <CardDescription className="dark:text-gray-400">Expense transactions for {getPeriodLabel()}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {getViewModeExpenseEntries().map((entry) => (
                        <div key={entry.id} className="flex justify-between items-center p-3 border rounded-lg dark:border-gray-600 dark:bg-gray-800/50">
                          <div>
                            <p className="font-medium dark:text-white">{entry.description}</p>
                            <p className="text-sm text-muted-foreground dark:text-gray-400">{entry.category}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              <Calendar className="h-3 w-3 dark:text-gray-400" />
                              <span className="text-xs dark:text-gray-400">{format(new Date(entry.date), "MMM dd, yyyy")}</span>
                              {entry.isProjected === "true" && (
                                <Badge variant="outline" className="text-xs dark:border-gray-500">Projected</Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-red-600 dark:text-red-400">
                              {formatCurrency(entry.amount, entry.currency)}
                            </p>
                          </div>
                        </div>
                      ))}
                      {getViewModeExpenseEntries().length === 0 && (
                        <div className="text-center py-8">
                          <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground dark:text-gray-500 mb-2" />
                          <p className="text-muted-foreground dark:text-gray-400">No expense entries for {getPeriodLabel()}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="projections" className="space-y-4">
                <Card className="dark:bg-gray-700/50 dark:border-gray-600">
                  <CardHeader>
                    <CardTitle className="dark:text-white">{viewMode === 'yearly' ? 'Annual' : viewMode === 'quarterly' ? selectedQuarter : getMonthShort()} Financial Projections</CardTitle>
                    <CardDescription className="dark:text-gray-400">Projected income and expenses for {getPeriodLabel()}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {getViewModeProjectedEntries().map((entry) => (
                        <div key={entry.id} className="flex justify-between items-center p-3 border rounded-lg dark:border-gray-600 dark:bg-gray-800/50">
                          <div>
                            <p className="font-medium dark:text-white">{entry.description}</p>
                            <p className="text-sm text-muted-foreground dark:text-gray-400">{entry.category}</p>
                            <div className="flex items-center space-x-2 mt-1">
                              <Calendar className="h-3 w-3 dark:text-gray-400" />
                              <span className="text-xs dark:text-gray-400">{format(new Date(entry.date), "MMM dd, yyyy")}</span>
                              <Badge variant="outline" className="text-xs dark:border-gray-500">Projected</Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold ${
                              entry.type === "income" ? "text-blue-600 dark:text-blue-400" : "text-orange-600 dark:text-orange-400"
                            }`}>
                              {formatCurrency(entry.amount, entry.currency)}
                            </p>
                            <p className="text-xs capitalize text-muted-foreground dark:text-gray-400">{entry.type}</p>
                          </div>
                        </div>
                      ))}
                      {getViewModeProjectedEntries().length === 0 && (
                        <div className="text-center py-8">
                          <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground dark:text-gray-500 mb-2" />
                          <p className="text-muted-foreground dark:text-gray-400">No projected entries for {getPeriodLabel()}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}