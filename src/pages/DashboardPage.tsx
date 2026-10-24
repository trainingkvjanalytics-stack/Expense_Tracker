import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  LineChart as LucideLineChart,
  HandCoins,
  PlusCircle,
  MinusCircle,
  Calendar,
  Landmark,
  Sparkles,
} from 'lucide-react';
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  subYears,
  isWithinInterval,
  parseISO,
  format,
  startOfWeek,
} from 'date-fns';
import { useMonth } from '@/components/layout/AppLayout';
import MonthSelector from '@/components/shared/MonthSelector';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useDashboard } from '@/hooks/useDashboard';
import { useTransactions } from '@/hooks/useTransactions';
import { useLoans } from '@/hooks/useLoans';
import { useInvestments } from '@/hooks/useInvestments';
import { useCategories } from '@/hooks/useCategories';
import { formatCurrency, formatDate } from '@/lib/formatters';
import {
  groupExpensesByCategory,
  groupExpensesByWeek,
  round2,
  type CategoryExpense,
  type WeeklyExpense,
} from '@/lib/calculations';

type RangeOption = 'last_6_months' | 'last_year' | 'all_time';
type TrendGrain = 'weekly' | 'monthly' | 'yearly';

export const DashboardPage: React.FC = () => {
  const { selectedMonth, setSelectedMonth } = useMonth();
  const navigate = useNavigate();

  // Time-window control state
  // Default is "This Month" = true
  const [isThisMonth, setIsThisMonth] = useState<boolean>(true);
  const [rangeOption, setRangeOption] = useState<RangeOption>('last_6_months');

  // Line chart grain filter state: 'weekly' | 'monthly' | 'yearly'
  const [trendGrain, setTrendGrain] = useState<TrendGrain>('monthly');

  // Hooks
  const {
    summary: monthlySummary,
    categoryExpenses: monthlyCategoryExpenses,
    weeklyExpenses: monthlyWeeklyExpenses,
  } = useDashboard({ selectedMonth });

  const { transactions } = useTransactions();
  const { categories } = useCategories();
  const { summaryMetrics: loanMetrics } = useLoans();
  const { investments } = useInvestments();

  // Dialog inspection state
  const [selectedCategory, setSelectedCategory] = useState<CategoryExpense | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<WeeklyExpense | null>(null);

  // =========================================================================
  // 1. DYNAMIC RANGE FILTERING (This Month vs Last 6M / Last Year / All Time)
  // =========================================================================
  const activeTransactions = useMemo(() => {
    if (isThisMonth) {
      const start = startOfMonth(selectedMonth);
      const end = endOfMonth(selectedMonth);
      return transactions.filter((t) => {
        try {
          const d = parseISO(t.transaction_date);
          return isWithinInterval(d, { start, end });
        } catch {
          return false;
        }
      });
    }

    const now = new Date();
    if (rangeOption === 'last_6_months') {
      const start = subMonths(now, 6);
      return transactions.filter((t) => {
        try {
          const d = parseISO(t.transaction_date);
          return isWithinInterval(d, { start, end: now });
        } catch {
          return false;
        }
      });
    }

    if (rangeOption === 'last_year') {
      const start = subYears(now, 1);
      return transactions.filter((t) => {
        try {
          const d = parseISO(t.transaction_date);
          return isWithinInterval(d, { start, end: now });
        } catch {
          return false;
        }
      });
    }

    // 'all_time'
    return transactions;
  }, [isThisMonth, rangeOption, selectedMonth, transactions]);

  // Active expenses
  const activeExpenseTransactions = useMemo(() => {
    return activeTransactions.filter((t) => t.type === 'expense');
  }, [activeTransactions]);

  const totalExpenseAmount = useMemo(() => {
    return round2(
      activeExpenseTransactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0)
    );
  }, [activeExpenseTransactions]);

  // Compute Summary numbers for the active range
  const displaySummary = useMemo(() => {
    if (isThisMonth) {
      return {
        totalIncome: monthlySummary.totalIncome,
        totalExpenses: monthlySummary.totalExpenses,
        remainingBalance: monthlySummary.remainingBalance,
        totalInvestments: monthlySummary.totalInvestments,
        openingBalance: monthlySummary.openingBalance,
        closingBalance: monthlySummary.closingBalance,
        totalLent: monthlySummary.totalLent,
        totalRepayments: monthlySummary.totalRepayments,
        netSavings: monthlySummary.totalIncome - monthlySummary.totalExpenses,
      };
    }

    let income = 0;
    let expenses = 0;
    let investmentsAmt = 0;
    let lent = 0;
    let repayments = 0;

    activeTransactions.forEach((t) => {
      const amt = Number(t.amount) || 0;
      if (t.type === 'income') income += amt;
      else if (t.type === 'expense') expenses += amt;
      else if (t.type === 'investment') investmentsAmt += amt;
      else if (t.type === 'lent') lent += amt;
      else if (t.type === 'repayment') repayments += amt;
    });

    return {
      totalIncome: round2(income),
      totalExpenses: round2(expenses),
      remainingBalance: round2(income - expenses),
      totalInvestments: round2(investmentsAmt),
      openingBalance: 0,
      closingBalance: round2(income - expenses),
      totalLent: round2(lent),
      totalRepayments: round2(repayments),
      netSavings: round2(income - expenses),
    };
  }, [isThisMonth, monthlySummary, activeTransactions]);

  // =========================================================================
  // 2. TOTAL MONTHLY COMMITMENTS (EMI + SIP FOR THIS MONTH)
  // =========================================================================
  const totalEmiThisMonth = loanMetrics.totalMonthlyCommitment;

  const totalSipThisMonth = useMemo(() => {
    return investments
      .filter((inv) => (inv as any).investment_method === 'sip' || inv.method === 'sip')
      .reduce((sum, inv) => sum + (Number(inv.amount) || 0), 0);
  }, [investments]);

  const totalMonthlyCommitment = round2(totalEmiThisMonth + totalSipThisMonth);

  // =========================================================================
  // 3. EXPENSE LINE CHART DATA (Weekly, Monthly, Yearly)
  // =========================================================================
  const lineChartData = useMemo(() => {
    if (trendGrain === 'weekly') {
      if (isThisMonth) {
        // Group by weeks of the selected month
        const weeks = groupExpensesByWeek(
          activeExpenseTransactions,
          selectedMonth.getFullYear(),
          selectedMonth.getMonth() + 1
        );
        return weeks.map((w) => ({
          label: `Wk ${w.weekNumber}`,
          expense: w.amount,
          count: w.count,
          periodText: w.weekLabel,
        }));
      }

      // Multi-month range: group by calendar week
      const weekMap = new Map<
        string,
        { label: string; expense: number; count: number; date: Date }
      >();

      activeExpenseTransactions.forEach((t) => {
        try {
          const d = parseISO(t.transaction_date);
          const weekStart = startOfWeek(d, { weekStartsOn: 1 });
          const key = format(weekStart, 'yyyy-MM-dd');
          const label = format(weekStart, 'dd MMM');
          const existing = weekMap.get(key);
          const amt = Number(t.amount) || 0;

          if (existing) {
            existing.expense += amt;
            existing.count += 1;
          } else {
            weekMap.set(key, { label, expense: amt, count: 1, date: weekStart });
          }
        } catch {
          // ignore invalid dates
        }
      });

      return Array.from(weekMap.values())
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .map((item) => ({
          label: item.label,
          expense: round2(item.expense),
          count: item.count,
          periodText: `Week of ${format(item.date, 'dd MMM yyyy')}`,
        }));
    }

    if (trendGrain === 'monthly') {
      const monthMap = new Map<
        string,
        { label: string; expense: number; count: number; date: Date }
      >();

      // In "This Month" mode, include last 6 months so the user sees month-over-month trajectory
      const sourceList = isThisMonth
        ? transactions.filter((t) => {
            try {
              const d = parseISO(t.transaction_date);
              return (
                t.type === 'expense' &&
                isWithinInterval(d, {
                  start: subMonths(selectedMonth, 5),
                  end: endOfMonth(selectedMonth),
                })
              );
            } catch {
              return false;
            }
          })
        : activeExpenseTransactions;

      sourceList.forEach((t) => {
        try {
          const d = parseISO(t.transaction_date);
          const key = format(d, 'yyyy-MM');
          const label = format(d, 'MMM yy');
          const existing = monthMap.get(key);
          const amt = Number(t.amount) || 0;

          if (existing) {
            existing.expense += amt;
            existing.count += 1;
          } else {
            monthMap.set(key, { label, expense: amt, count: 1, date: d });
          }
        } catch {
          // ignore
        }
      });

      return Array.from(monthMap.values())
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .map((item) => ({
          label: item.label,
          expense: round2(item.expense),
          count: item.count,
          periodText: format(item.date, 'MMMM yyyy'),
        }));
    }

    // Yearly grain
    const yearMap = new Map<
      string,
      { label: string; expense: number; count: number; year: number }
    >();

    transactions
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        try {
          const d = parseISO(t.transaction_date);
          const year = d.getFullYear();
          const key = String(year);
          const existing = yearMap.get(key);
          const amt = Number(t.amount) || 0;

          if (existing) {
            existing.expense += amt;
            existing.count += 1;
          } else {
            yearMap.set(key, { label: key, expense: amt, count: 1, year });
          }
        } catch {
          // ignore
        }
      });

    return Array.from(yearMap.values())
      .sort((a, b) => a.year - b.year)
      .map((item) => ({
        label: item.label,
        expense: round2(item.expense),
        count: item.count,
        periodText: `Year ${item.year}`,
      }));
  }, [
    trendGrain,
    isThisMonth,
    activeExpenseTransactions,
    selectedMonth,
    transactions,
  ]);

  // =========================================================================
  // 4. SUBCATEGORY-WISE EXPENSE COLUMN CHART
  // =========================================================================
  const subcategoryExpenses = useMemo(() => {
    const map = new Map<
      string,
      { name: string; categoryName: string; amount: number; count: number }
    >();

    activeExpenseTransactions.forEach((t) => {
      const subName =
        t.subcategories?.name ||
        (t.categories?.name ? `${t.categories.name} (General)` : 'Uncategorized');
      const catName = t.categories?.name || 'General';
      const amt = Number(t.amount) || 0;

      const existing = map.get(subName);
      if (existing) {
        existing.amount += amt;
        existing.count += 1;
      } else {
        map.set(subName, {
          name: subName,
          categoryName: catName,
          amount: amt,
          count: 1,
        });
      }
    });

    return Array.from(map.values())
      .map((item) => ({
        ...item,
        amount: round2(item.amount),
        percentage:
          totalExpenseAmount > 0
            ? Math.round((item.amount / totalExpenseAmount) * 100)
            : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10); // Show top 10 subcategories
  }, [activeExpenseTransactions, totalExpenseAmount]);

  // =========================================================================
  // 5. CATEGORY DISTRIBUTION DONUT CHART
  // =========================================================================
  const categoryExpenses = useMemo(() => {
    if (isThisMonth) {
      return monthlyCategoryExpenses;
    }
    return groupExpensesByCategory(activeExpenseTransactions, categories);
  }, [isThisMonth, monthlyCategoryExpenses, activeExpenseTransactions, categories]);

  // Filter transactions for category modal
  const categoryTxns = useMemo(() => {
    if (!selectedCategory) return [];
    return activeExpenseTransactions.filter(
      (t) =>
        t.category_id === selectedCategory.categoryId ||
        selectedCategory.categoryId === 'uncategorized'
    );
  }, [selectedCategory, activeExpenseTransactions]);

  // Tooltip renderers
  const renderLineTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-xl border border-border bg-popover/95 p-3 shadow-lg backdrop-blur-md">
          <p className="text-xs font-semibold text-foreground">
            {data.periodText || data.label}
          </p>
          <p className="mt-1 text-sm font-bold text-rose-600 dark:text-rose-400">
            {formatCurrency(data.expense)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {data.count} expense transaction{data.count !== 1 ? 's' : ''}
          </p>
        </div>
      );
    }
    return null;
  };

  const renderSubcategoryTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="rounded-xl border border-border bg-popover/95 p-3 shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-foreground">{data.name}</span>
            <Badge variant="outline" className="text-[10px] py-0 px-1 font-medium">
              {data.categoryName}
            </Badge>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-sm font-bold text-violet-600 dark:text-violet-400">
              {formatCurrency(data.amount)}
            </span>
            <span className="text-xs text-muted-foreground">({data.percentage}%)</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {data.count} transaction{data.count !== 1 ? 's' : ''}
          </p>
        </div>
      );
    }
    return null;
  };

  const renderDonutTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: CategoryExpense = payload[0].payload;
      return (
        <div className="rounded-xl border border-border bg-popover/95 p-3 shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: data.color }}
            />
            <span className="text-xs font-semibold text-foreground">
              {data.categoryName}
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-sm font-bold text-foreground">
              {formatCurrency(data.amount)}
            </span>
            <span className="text-xs text-muted-foreground font-medium">
              ({data.percentage}%)
            </span>
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {data.count} transaction{data.count > 1 ? 's' : ''}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Top Bar with Dynamic Date Filter Toggle */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {isThisMonth
              ? `Monthly cash flows, spending analytics, and balances for ${format(selectedMonth, 'MMMM yyyy')}`
              : `Aggregate spending and analytics across ${
                  rangeOption === 'last_6_months'
                    ? 'Last 6 Months'
                    : rangeOption === 'last_year'
                    ? 'Last 12 Months'
                    : 'All Time'
                }`}
          </p>
        </div>

        {/* Date / Range Switcher Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* "This Month" Toggle Button */}
          <Button
            type="button"
            size="sm"
            variant={isThisMonth ? 'default' : 'outline'}
            onClick={() => setIsThisMonth(!isThisMonth)}
            className={`h-9 px-3 text-xs font-semibold rounded-xl gap-1.5 transition-all shadow-2xs ${
              isThisMonth
                ? 'bg-primary text-primary-foreground'
                : 'border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>This Month</span>
            <span
              className={`ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                isThisMonth
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {isThisMonth ? 'ON' : 'OFF'}
            </span>
          </Button>

          {/* When This Month is ON: Show MonthSelector */}
          {isThisMonth ? (
            <MonthSelector selectedMonth={selectedMonth} onChange={setSelectedMonth} />
          ) : (
            /* When This Month is OFF: Show Range Options (Last 6 Months, Last Year, All Time) */
            <div className="flex items-center rounded-xl bg-muted p-1 text-xs border border-border/60 shadow-2xs">
              <button
                type="button"
                onClick={() => setRangeOption('last_6_months')}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                  rangeOption === 'last_6_months'
                    ? 'bg-card text-foreground shadow-2xs font-bold'
                    : 'text-muted-foreground hover:text-foreground font-medium'
                }`}
              >
                Last 6 Months
              </button>
              <button
                type="button"
                onClick={() => setRangeOption('last_year')}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                  rangeOption === 'last_year'
                    ? 'bg-card text-foreground shadow-2xs font-bold'
                    : 'text-muted-foreground hover:text-foreground font-medium'
                }`}
              >
                Last Year
              </button>
              <button
                type="button"
                onClick={() => setRangeOption('all_time')}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                  rangeOption === 'all_time'
                    ? 'bg-card text-foreground shadow-2xs font-bold'
                    : 'text-muted-foreground hover:text-foreground font-medium'
                }`}
              >
                All Time
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
        <Button
          variant="outline"
          className="h-auto py-2.5 px-3 flex items-center justify-start gap-2.5 rounded-xl border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 transition-all active:scale-98"
          onClick={() => navigate('/transaction/new/income')}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <PlusCircle className="h-4 w-4" />
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold leading-tight">+ Income</p>
            <p className="text-[10px] text-muted-foreground">Salary, gig, refund</p>
          </div>
        </Button>

        <Button
          variant="outline"
          className="h-auto py-2.5 px-3 flex items-center justify-start gap-2.5 rounded-xl border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 text-rose-700 dark:text-rose-300 transition-all active:scale-98"
          onClick={() => navigate('/transaction/new/expense')}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400">
            <MinusCircle className="h-4 w-4" />
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold leading-tight">- Expense</p>
            <p className="text-[10px] text-muted-foreground">Bills, food, fuel</p>
          </div>
        </Button>

        <Button
          variant="outline"
          className="h-auto py-2.5 px-3 flex items-center justify-start gap-2.5 rounded-xl border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 text-amber-700 dark:text-amber-300 transition-all active:scale-98"
          onClick={() => navigate('/transaction/new/lent')}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <HandCoins className="h-4 w-4" />
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold leading-tight">🤝 Lent Money</p>
            <p className="text-[10px] text-muted-foreground">Loans to friends</p>
          </div>
        </Button>

        <Button
          variant="outline"
          className="h-auto py-2.5 px-3 flex items-center justify-start gap-2.5 rounded-xl border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 text-purple-700 dark:text-purple-300 transition-all active:scale-98"
          onClick={() => navigate('/transaction/new/investment')}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400">
            <LucideLineChart className="h-4 w-4" />
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold leading-tight">📈 Investment</p>
            <p className="text-[10px] text-muted-foreground">SIP, mutual funds</p>
          </div>
        </Button>
      </div>

      {/* 5 Financial Summary Cards (Including Total EMI + SIP Card) */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        {/* Total Income */}
        <Card className="p-4 relative overflow-hidden border-border/80 shadow-xs">
          <div className="flex items-center justify-between pb-1.5">
            <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Total Income
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-bold text-[#287A55] dark:text-emerald-400">
            {formatCurrency(displaySummary.totalIncome)}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{isThisMonth ? 'This month' : 'In selected range'}</span>
            {displaySummary.totalRepayments > 0 && (
              <span className="text-[#287A55] dark:text-emerald-400 font-semibold">
                +{formatCurrency(displaySummary.totalRepayments)} repaid
              </span>
            )}
          </div>
        </Card>

        {/* Total Expenses */}
        <Card className="p-4 relative overflow-hidden border-border/80 shadow-xs">
          <div className="flex items-center justify-between pb-1.5">
            <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Total Expenses
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/10 text-[#B94F4F] dark:text-rose-400">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-bold text-[#B94F4F] dark:text-rose-400">
            {formatCurrency(displaySummary.totalExpenses)}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Consumption spend</span>
            <span className="text-xs">{categoryExpenses.length} categories</span>
          </div>
        </Card>

        {/* Remaining Balance / Net Savings */}
        <Card className="p-4 relative overflow-hidden border-border/80 shadow-xs bg-card/90">
          <div className="flex items-center justify-between pb-1.5">
            <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              {isThisMonth ? 'Remaining Balance' : 'Net Savings'}
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div
            className={`text-lg sm:text-2xl font-bold ${
              displaySummary.remainingBalance >= 0
                ? 'text-[#287A55] dark:text-emerald-400'
                : 'text-[#B94F4F] dark:text-rose-400'
            }`}
          >
            {formatCurrency(displaySummary.remainingBalance)}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{isThisMonth ? 'Closing available' : 'Income minus expense'}</span>
            {isThisMonth && (
              <span className="font-medium text-foreground/80">
                Op: {formatCurrency(displaySummary.openingBalance, { showDecimals: false })}
              </span>
            )}
          </div>
        </Card>

        {/* Total Investments */}
        <Card className="p-4 relative overflow-hidden border-border/80 shadow-xs">
          <div className="flex items-center justify-between pb-1.5">
            <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Total Investments
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <LucideLineChart className="h-4 w-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-bold text-purple-600 dark:text-purple-400">
            {formatCurrency(displaySummary.totalInvestments)}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>SIP & lumpsum</span>
            <span className="text-purple-600 dark:text-purple-400">Wealth building</span>
          </div>
        </Card>

        {/* ========================================================================= */}
        {/* TOTAL EMI & SIP DUE THIS MONTH (USER REQUIREMENT)                         */}
        {/* ========================================================================= */}
        <Card
          onClick={() => navigate('/emi-loan')}
          className="p-4 relative overflow-hidden border-amber-500/20 bg-gradient-to-br from-card via-card to-amber-500/[0.06] shadow-xs cursor-pointer hover:border-amber-500/40 transition-colors col-span-2 sm:col-span-1"
        >
          <div className="flex items-center justify-between pb-1.5">
            <span className="text-[11px] font-semibold tracking-wider text-amber-700 dark:text-amber-400 uppercase">
              EMI & SIP This Month
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Landmark className="h-4 w-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-bold text-amber-600 dark:text-amber-400">
            {formatCurrency(totalMonthlyCommitment)}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>
              EMI: <strong>{formatCurrency(totalEmiThisMonth, { showDecimals: false })}</strong>
            </span>
            <span>•</span>
            <span>
              SIP: <strong>{formatCurrency(totalSipThisMonth, { showDecimals: false })}</strong>
            </span>
          </div>
        </Card>
      </div>

      {/* Rollover & Summary Bar (When This Month is active) */}
      {isThisMonth && (
        <Card className="p-3.5 bg-muted/40 border-dashed border-border/80">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="text-muted-foreground">
                Opening Balance:{' '}
                <strong className="text-foreground">
                  {formatCurrency(displaySummary.openingBalance)}
                </strong>
              </span>
              <span className="text-muted-foreground">
                Net Monthly Savings:{' '}
                <strong
                  className={
                    displaySummary.netSavings >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }
                >
                  {formatCurrency(displaySummary.netSavings, { showSign: true })}
                </strong>
              </span>
              {displaySummary.totalLent > 0 && (
                <span className="text-muted-foreground">
                  Lent:{' '}
                  <strong className="text-amber-600 dark:text-amber-400">
                    {formatCurrency(displaySummary.totalLent)}
                  </strong>
                </span>
              )}
              <span className="text-muted-foreground">
                Closing Rollover:{' '}
                <strong
                  className={
                    displaySummary.closingBalance >= 0
                      ? 'text-[#287A55] dark:text-emerald-400'
                      : 'text-[#B94F4F] dark:text-rose-400'
                  }
                >
                  {formatCurrency(displaySummary.closingBalance)}
                </strong>
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-primary" />
              Closing balance automatically rolls over to next month's opening balance
            </div>
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* CHARTS ROW 1: EXPENSE LINE CHART + SUBCATEGORY COLUMN CHART               */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 1. EXPENSE LINE CHART WITH MONTHLY, YEARLY, AND WEEKLY FILTER */}
        <Card className="flex flex-col shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <LucideLineChart className="h-4 w-4 text-rose-500" />
                  <span>Expense Trajectory</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Line chart of spending filtered by {trendGrain}
                </CardDescription>
              </div>

              {/* Time Grain Filters: Monthly, Yearly, Weekly */}
              <div className="flex items-center rounded-lg bg-muted p-0.5 text-xs self-start sm:self-auto border border-border/50">
                <button
                  type="button"
                  onClick={() => setTrendGrain('weekly')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                    trendGrain === 'weekly'
                      ? 'bg-card text-foreground shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Weekly
                </button>
                <button
                  type="button"
                  onClick={() => setTrendGrain('monthly')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                    trendGrain === 'monthly'
                      ? 'bg-card text-foreground shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setTrendGrain('yearly')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                    trendGrain === 'yearly'
                      ? 'bg-card text-foreground shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Yearly
                </button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col justify-center pt-2">
            {lineChartData.length === 0 || lineChartData.every((d) => d.expense === 0) ? (
              <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border/70 p-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-2">
                  <TrendingDown className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold">No expense trend data</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  Expenses in this period will plot here automatically.
                </p>
              </div>
            ) : (
              <div className="h-64 w-full pt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsLineChart
                    data={lineChartData}
                    margin={{ top: 10, right: 15, left: -15, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="hsl(var(--border))"
                    />
                    <XAxis
                      dataKey="label"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(val) =>
                        `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`
                      }
                    />
                    <Tooltip content={renderLineTooltip} />
                    <Line
                      type="monotone"
                      dataKey="expense"
                      stroke="#f43f5e"
                      strokeWidth={2.5}
                      dot={{
                        r: 4,
                        fill: '#f43f5e',
                        strokeWidth: 2,
                        stroke: 'hsl(var(--card))',
                      }}
                      activeDot={{
                        r: 6,
                        fill: '#f43f5e',
                        stroke: '#ffffff',
                        strokeWidth: 2,
                      }}
                    />
                  </RechartsLineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 2. SUBCATEGORY-WISE EXPENSE COLUMN CHART */}
        <Card className="flex flex-col shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-violet-600" />
                  <span>Subcategory Expenses</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Vertical column chart of spending by specific subcategory
                </CardDescription>
              </div>
              <Badge variant="secondary" className="text-xs">
                {subcategoryExpenses.length} Subcategories
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col justify-center pt-2">
            {subcategoryExpenses.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border/70 p-6 text-center">
                <p className="text-sm font-semibold">No subcategory expenses recorded</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  Add expenses with subcategories to see the granular column breakdown.
                </p>
                <Button
                  size="sm"
                  className="mt-4"
                  onClick={() => navigate('/transaction/new/expense')}
                >
                  Record Expense
                </Button>
              </div>
            ) : (
              <div className="h-64 w-full pt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={subcategoryExpenses}
                    margin={{ top: 10, right: 10, left: -15, bottom: 35 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="hsl(var(--border))"
                    />
                    <XAxis
                      dataKey="name"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={10}
                      tickLine={false}
                      interval={0}
                      angle={-25}
                      textAnchor="end"
                      tickFormatter={(val) =>
                        val.length > 12 ? `${val.slice(0, 10)}...` : val
                      }
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(val) =>
                        `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`
                      }
                    />
                    <Tooltip content={renderSubcategoryTooltip} />
                    <Bar
                      dataKey="amount"
                      fill="#8b5cf6"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* CHARTS ROW 2: CATEGORY DONUT CHART + WEEKLY SPENDING BAR CHART            */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Category Expense Donut Chart */}
        <Card className="flex flex-col shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">Category Distribution</CardTitle>
                <CardDescription className="text-xs">
                  Where your money went (tap category to filter)
                </CardDescription>
              </div>
              <Badge variant="secondary" className="text-xs">
                {categoryExpenses.length} Categories
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center pt-2">
            {categoryExpenses.length === 0 ? (
              <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border/70 p-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-2">
                  <TrendingDown className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold">No expenses recorded</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  Add an expense transaction to view category distribution and breakdown.
                </p>
                <Button
                  size="sm"
                  className="mt-4"
                  onClick={() => navigate('/transaction/new/expense')}
                >
                  Add First Expense
                </Button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-4">
                {/* Donut Chart with Center Total */}
                <div className="relative h-60 w-60 shrink-0 mx-auto">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip content={renderDonutTooltip} />
                      <Pie
                        data={categoryExpenses}
                        dataKey="amount"
                        nameKey="categoryName"
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={95}
                        paddingAngle={3}
                        cursor="pointer"
                        onClick={(entry: any) =>
                          setSelectedCategory(entry?.payload || entry)
                        }
                      >
                        {categoryExpenses.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color || '#3b82f6'}
                            stroke="hsl(var(--card))"
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center Text */}
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Total Expense
                    </span>
                    <span className="text-sm sm:text-base font-extrabold text-[#B94F4F] dark:text-rose-400 px-2">
                      {formatCurrency(totalExpenseAmount, { showDecimals: false })}
                    </span>
                  </div>
                </div>

                {/* Legend list */}
                <div className="w-full flex-1 max-h-60 overflow-y-auto space-y-1.5 pr-1">
                  {categoryExpenses.map((cat) => (
                    <button
                      key={cat.categoryId}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className="w-full flex items-center justify-between p-1.5 rounded-lg hover:bg-muted/60 transition-colors text-left group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="text-xs font-medium truncate group-hover:text-primary transition-colors">
                          {cat.categoryName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="text-xs font-bold text-[#B94F4F] dark:text-rose-400">
                          {formatCurrency(cat.amount, { showDecimals: false })}
                        </span>
                        <span className="text-[10px] font-medium text-muted-foreground w-8 text-right">
                          {cat.percentage}%
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Weekly Expense Column Chart */}
        <Card className="flex flex-col shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">Weekly Spending Cycle</CardTitle>
                <CardDescription className="text-xs">
                  Breakdown by calendar week (tap a bar to inspect)
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center pt-2">
            {monthlyWeeklyExpenses.every((w) => w.amount === 0) ? (
              <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-border/70 p-6 text-center">
                <p className="text-sm font-semibold">No weekly activity</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  Expenses for this month will be grouped into calendar weeks.
                </p>
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={monthlyWeeklyExpenses}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="hsl(var(--border))"
                    />
                    <XAxis
                      dataKey="weekNumber"
                      tickFormatter={(val) => `Wk ${val}`}
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(val) =>
                        `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`
                      }
                    />
                    <Tooltip
                      formatter={(val: any) => [formatCurrency(Number(val) || 0), 'Amount']}
                    />
                    <Bar
                      dataKey="amount"
                      fill="#f43f5e"
                      radius={[6, 6, 0, 0]}
                      cursor="pointer"
                      onClick={(entry: any) =>
                        setSelectedWeek(entry?.payload || (entry as unknown as WeeklyExpense))
                      }
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Category Detail Modal */}
      <Dialog
        open={Boolean(selectedCategory)}
        onOpenChange={(open) => !open && setSelectedCategory(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span
                className="h-3.5 w-3.5 rounded-full"
                style={{ backgroundColor: selectedCategory?.color }}
              />
              {selectedCategory?.categoryName} Expenses
            </DialogTitle>
            <DialogDescription>
              Total of {formatCurrency(selectedCategory?.amount)} (
              {selectedCategory?.percentage}% of period spending)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 max-h-72 overflow-y-auto pt-2">
            {categoryTxns.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                No transactions found for this category.
              </p>
            ) : (
              categoryTxns.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border/70 text-xs"
                >
                  <div>
                    <p className="font-semibold">{t.description || 'Expense'}</p>
                    <p className="text-muted-foreground text-[11px]">
                      {formatDate(t.transaction_date)}
                    </p>
                  </div>
                  <span className="font-bold text-rose-600 dark:text-rose-400">
                    -{formatCurrency(t.amount)}
                  </span>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Week Detail Modal */}
      <Dialog
        open={Boolean(selectedWeek)}
        onOpenChange={(open) => !open && setSelectedWeek(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedWeek?.weekLabel}</DialogTitle>
            <DialogDescription>
              Total expenses: {formatCurrency(selectedWeek?.amount)} ({selectedWeek?.count}{' '}
              transactions)
            </DialogDescription>
          </DialogHeader>
          <div className="pt-2">
            <Button
              className="w-full"
              variant="outline"
              onClick={() => {
                setSelectedWeek(null);
                navigate('/activities');
              }}
            >
              View in Activities Ledger
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DashboardPage;

