import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  LineChart,
  HandCoins,
  ArrowUpRight,
  PlusCircle,
  MinusCircle,
} from 'lucide-react';
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
import { formatCurrency, formatDate, getTransactionTypeColor } from '@/lib/formatters';
import type { CategoryExpense, WeeklyExpense } from '@/lib/calculations';
import type { TransactionWithDetails } from '@/hooks/useTransactions';

export const DashboardPage: React.FC = () => {
  const { selectedMonth, setSelectedMonth } = useMonth();
  const navigate = useNavigate();

  const {
    summary,
    categoryExpenses,
    weeklyExpenses,
    recentActivities,
  } = useDashboard({ selectedMonth });

  // Filter dialog state for tapping a category or week
  const [selectedCategory, setSelectedCategory] = useState<CategoryExpense | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<WeeklyExpense | null>(null);
  const [selectedTxn, setSelectedTxn] = useState<TransactionWithDetails | null>(null);

  // Filter transactions for category modal
  const categoryTxns = React.useMemo(() => {
    if (!selectedCategory) return [];
    return recentActivities.filter(
      (t) => t.type === 'expense' && (t.category_id === selectedCategory.categoryId || selectedCategory.categoryId === 'uncategorized')
    );
  }, [selectedCategory, recentActivities]);

  // Total expenses for the donut chart center
  const totalExpenseAmount = summary.totalExpenses;

  // Donut chart custom tooltip
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

  // Bar chart custom tooltip
  const renderBarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: WeeklyExpense = payload[0].payload;
      return (
        <div className="rounded-xl border border-border bg-popover/95 p-3 shadow-lg backdrop-blur-md">
          <p className="text-xs font-semibold text-foreground">{data.weekLabel}</p>
          <p className="mt-1 text-sm font-bold text-rose-600 dark:text-rose-400">
            {formatCurrency(data.amount)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {data.count} expense{data.count > 1 ? 's' : ''}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Monthly cash flows, spending analytics, and balances
          </p>
        </div>
        <MonthSelector selectedMonth={selectedMonth} onChange={setSelectedMonth} />
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
            <LineChart className="h-4 w-4" />
          </div>
          <div className="text-left">
            <p className="text-xs font-semibold leading-tight">📈 Investment</p>
            <p className="text-[10px] text-muted-foreground">SIP, mutual funds</p>
          </div>
        </Button>
      </div>

      {/* 4 Monthly Financial Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
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
          <div className="text-lg sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(summary.totalIncome)}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>This month</span>
            {summary.totalRepayments > 0 && (
              <span className="text-blue-600 dark:text-blue-400">
                +{formatCurrency(summary.totalRepayments)} repaid
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
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-bold text-rose-600 dark:text-rose-400">
            {formatCurrency(summary.totalExpenses)}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Regular consumption</span>
            <span className="text-xs">
              {categoryExpenses.length} categories
            </span>
          </div>
        </Card>

        {/* Remaining Balance */}
        <Card className="p-4 relative overflow-hidden border-border/80 shadow-xs bg-card/90">
          <div className="flex items-center justify-between pb-1.5">
            <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Remaining Balance
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-bold text-foreground">
            {formatCurrency(summary.remainingBalance)}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Closing available</span>
            <span className="font-medium text-foreground/80">
              Op: {formatCurrency(summary.openingBalance, { showDecimals: false })}
            </span>
          </div>
        </Card>

        {/* Total Investments */}
        <Card className="p-4 relative overflow-hidden border-border/80 shadow-xs">
          <div className="flex items-center justify-between pb-1.5">
            <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Total Investments
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <LineChart className="h-4 w-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-bold text-purple-600 dark:text-purple-400">
            {formatCurrency(summary.totalInvestments)}
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>SIP & lumpsum</span>
            <span className="text-purple-600 dark:text-purple-400">Not an expense</span>
          </div>
        </Card>
      </div>

      {/* Rollover & Available Funds Bar */}
      <Card className="p-3.5 bg-muted/40 border-dashed border-border/80">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="text-muted-foreground">
              Opening Balance:{' '}
              <strong className="text-foreground">{formatCurrency(summary.openingBalance)}</strong>
            </span>
            <span className="text-muted-foreground">
              Net Savings:{' '}
              <strong
                className={
                  summary.totalIncome - summary.totalExpenses >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }
              >
                {formatCurrency(summary.totalIncome - summary.totalExpenses, { showSign: true })}
              </strong>
            </span>
            {summary.totalLent > 0 && (
              <span className="text-muted-foreground">
                Lent:{' '}
                <strong className="text-amber-600 dark:text-amber-400">
                  {formatCurrency(summary.totalLent)}
                </strong>
              </span>
            )}
            <span className="text-muted-foreground">
              Closing Rollover:{' '}
              <strong className="text-foreground">{formatCurrency(summary.closingBalance)}</strong>
            </span>
          </div>
          <div className="text-[11px] text-muted-foreground">
            *Closing balance automatically rolls over to next month's opening balance
          </div>
        </div>
      </Card>

      {/* Charts Section: Donut Chart + Weekly Column Chart */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Category Expense Donut Chart */}
        <Card className="flex flex-col shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold">Category Distribution</CardTitle>
                <CardDescription className="text-xs">
                  Where your money went this month (tap to filter)
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
                        onClick={(entry: any) => setSelectedCategory(entry?.payload || entry)}
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
                    <span className="text-sm sm:text-base font-extrabold text-foreground px-2">
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
                        <span className="text-xs font-bold text-foreground">
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
                <CardTitle className="text-base font-bold">Weekly Spending Trend</CardTitle>
                <CardDescription className="text-xs">
                  Breakdown by calendar week (tap a bar to inspect)
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center pt-2">
            {weeklyExpenses.every((w) => w.amount === 0) ? (
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
                    data={weeklyExpenses}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
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
                      tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                    />
                    <Tooltip content={renderBarTooltip} />
                    <Bar
                      dataKey="amount"
                      fill="#ef4444"
                      radius={[6, 6, 0, 0]}
                      cursor="pointer"
                      onClick={(entry: any) => setSelectedWeek(entry?.payload || (entry as unknown as WeeklyExpense))}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities Section */}
      <Card className="shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="text-base font-bold">Recent Activities</CardTitle>
            <CardDescription className="text-xs">
              Latest transactions across all accounts
            </CardDescription>
          </div>
          <Link to="/activities">
            <Button variant="ghost" size="sm" className="gap-1 text-xs">
              View all
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentActivities.length === 0 ? (
            <div className="flex h-36 flex-col items-center justify-center text-center">
              <p className="text-sm font-medium text-muted-foreground">
                No recent transactions recorded yet.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 gap-1.5"
                onClick={() => navigate('/transaction/new/expense')}
              >
                <PlusCircle className="h-3.5 w-3.5" />
                Add Transaction
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {recentActivities.slice(0, 7).map((txn) => {
                const colorClass = getTransactionTypeColor(txn.type);
                const isPositive = txn.type === 'income' || txn.type === 'repayment';

                return (
                  <div
                    key={txn.id}
                    onClick={() => setSelectedTxn(txn)}
                    className="flex items-center justify-between py-3 hover:bg-muted/40 px-2 rounded-lg cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold ${
                          txn.type === 'income'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : txn.type === 'expense'
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                            : txn.type === 'lent'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                            : txn.type === 'investment'
                            ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                            : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                        }`}
                      >
                        {txn.type === 'income' ? '↓' : txn.type === 'expense' ? '↑' : '•'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate leading-tight">
                          {txn.description || txn.categories?.name || 'Transaction'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {formatDate(txn.transaction_date)} •{' '}
                          <span className="capitalize">{txn.payment_mode || 'UPI'}</span>
                          {txn.accounts?.account_name && ` • ${txn.accounts.account_name}`}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-3">
                      <p className={`text-sm font-bold ${colorClass}`}>
                        {isPositive ? '+' : '-'}
                        {formatCurrency(txn.amount)}
                      </p>
                      <Badge
                        variant="outline"
                        className="text-[10px] uppercase font-bold tracking-wider py-0 px-1.5"
                      >
                        {txn.type}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category Detail Modal */}
      <Dialog open={Boolean(selectedCategory)} onOpenChange={(open) => !open && setSelectedCategory(null)}>
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
              Total of {formatCurrency(selectedCategory?.amount)} ({selectedCategory?.percentage}% of monthly spending)
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 max-h-72 overflow-y-auto pt-2">
            {categoryTxns.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                No recent transactions found for this category.
              </p>
            ) : (
              categoryTxns.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-2.5 rounded-lg border border-border/70 text-xs">
                  <div>
                    <p className="font-semibold">{t.description || 'Expense'}</p>
                    <p className="text-muted-foreground text-[11px]">{formatDate(t.transaction_date)}</p>
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
      <Dialog open={Boolean(selectedWeek)} onOpenChange={(open) => !open && setSelectedWeek(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedWeek?.weekLabel}</DialogTitle>
            <DialogDescription>
              Total expenses: {formatCurrency(selectedWeek?.amount)} ({selectedWeek?.count} transactions)
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

      {/* Transaction Details Modal */}
      <Dialog open={Boolean(selectedTxn)} onOpenChange={(open) => !open && setSelectedTxn(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="capitalize">
              {selectedTxn?.type} Details
            </DialogTitle>
            <DialogDescription>
              Recorded on {formatDate(selectedTxn?.transaction_date)}
            </DialogDescription>
          </DialogHeader>

          {selectedTxn && (
            <div className="space-y-3 pt-2 text-sm">
              <div className="flex justify-between py-1.5 border-b border-border/60">
                <span className="text-muted-foreground">Amount</span>
                <span className={`font-bold ${getTransactionTypeColor(selectedTxn.type)}`}>
                  {formatCurrency(selectedTxn.amount)}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/60">
                <span className="text-muted-foreground">Description</span>
                <span className="font-medium">{selectedTxn.description || '-'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/60">
                <span className="text-muted-foreground">Category</span>
                <span className="font-medium">{selectedTxn.categories?.name || 'Uncategorized'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/60">
                <span className="text-muted-foreground">Payment Mode</span>
                <span className="capitalize font-medium">{selectedTxn.payment_mode || 'UPI'}</span>
              </div>
              {selectedTxn.notes && (
                <div className="py-1.5">
                  <span className="text-muted-foreground block text-xs">Notes</span>
                  <p className="text-xs mt-1 text-foreground">{selectedTxn.notes}</p>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  className="flex-1"
                  variant="outline"
                  onClick={() => {
                    setSelectedTxn(null);
                    navigate(`/transaction/edit/${selectedTxn.id}`);
                  }}
                >
                  Edit Transaction
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => setSelectedTxn(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DashboardPage;
