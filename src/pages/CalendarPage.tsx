import React, { useState, useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
} from 'date-fns';
import {
  CalendarDays,
  TrendingDown,
  Award,
  BarChart2,
  Plus,
  Flame,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
import { useCalendar } from '@/hooks/useCalendar';
import { useTransactions } from '@/hooks/useTransactions';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { getHeatmapIntensity, type DailyExpense } from '@/lib/calculations';

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const CalendarPage: React.FC = () => {
  const { selectedMonth, setSelectedMonth } = useMonth();
  const navigate = useNavigate();

  const {
    dailyExpenses,
    totalMonthlyExpense,
    highestSpendingDay,
    averageDailyExpense,
  } = useCalendar({ selectedMonth });

  // Fetch month transactions for day inspector
  const { transactions } = useTransactions({ month: selectedMonth, type: 'expense' });

  // Selected date state for day transactions drawer
  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null);

  // Maximum daily expense in month for heatmap scale
  const maxExpense = useMemo(() => {
    return Math.max(...dailyExpenses.map((d) => d.amount), 0);
  }, [dailyExpenses]);

  // Daily expense lookup map: YYYY-MM-DD -> DailyExpense
  const dailyMap = useMemo(() => {
    const map = new Map<string, DailyExpense>();
    for (const d of dailyExpenses) {
      map.set(d.date, d);
    }
    return map;
  }, [dailyExpenses]);

  // Calendar matrix days including padded days from previous/next months
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(selectedMonth);
    const monthEnd = endOfMonth(selectedMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [selectedMonth]);

  // Filter transactions for clicked day
  const dayTransactions = useMemo(() => {
    if (!selectedDayDate) return [];
    return transactions.filter(
      (t) => t.type === 'expense' && t.transaction_date.slice(0, 10) === selectedDayDate
    );
  }, [selectedDayDate, transactions]);

  // Heatmap styling per intensity level
  const getIntensityStyles = (intensity: number, inMonth: boolean) => {
    if (!inMonth) {
      return 'bg-muted/15 text-muted-foreground/40 border-border/20';
    }
    switch (intensity) {
      case 0:
        return 'bg-card text-foreground hover:bg-muted/60 border-border/50';
      case 1:
        return 'bg-rose-50 text-rose-950 dark:bg-rose-950/25 dark:text-rose-200 border-rose-200/50 dark:border-rose-900/40 font-medium hover:ring-1 hover:ring-rose-400';
      case 2:
        return 'bg-rose-100 text-rose-950 dark:bg-rose-900/40 dark:text-rose-100 border-rose-300 dark:border-rose-800 font-semibold hover:ring-1 hover:ring-rose-400';
      case 3:
        return 'bg-rose-200 text-rose-950 dark:bg-rose-800/60 dark:text-white border-rose-400 dark:border-rose-700 font-bold hover:ring-2 hover:ring-rose-500';
      case 4:
        return 'bg-rose-500 text-white dark:bg-rose-600 dark:text-white border-rose-600 font-extrabold shadow-xs hover:ring-2 hover:ring-rose-400';
      default:
        return 'bg-card text-foreground border-border/50';
    }
  };

  const getIntensityLabel = (intensity: number) => {
    switch (intensity) {
      case 0:
        return 'Zero spending';
      case 1:
        return 'Low spending';
      case 2:
        return 'Moderate spending';
      case 3:
        return 'High spending';
      case 4:
        return 'Peak spending';
      default:
        return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Expense Calendar Heatmap</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Day-by-day spending intensity to identify high-spending habits
          </p>
        </div>
        <MonthSelector selectedMonth={selectedMonth} onChange={setSelectedMonth} />
      </div>

      {/* KPI Stats Banner */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {/* Total Monthly Expense */}
        <Card className="p-4 shadow-xs border-border/80">
          <div className="flex items-center justify-between pb-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Total Monthly Expense
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-rose-600 dark:text-rose-400">
            {formatCurrency(totalMonthlyExpense)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Excludes lent & investments</p>
        </Card>

        {/* Highest Spending Day */}
        <Card className="p-4 shadow-xs border-border/80">
          <div className="flex items-center justify-between pb-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Highest Spending Day
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-foreground">
            {highestSpendingDay ? formatCurrency(highestSpendingDay.amount) : '₹0.00'}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            {highestSpendingDay ? formatDate(highestSpendingDay.date) : 'No expenses'}
          </p>
        </Card>

        {/* Daily Average Expense */}
        <Card className="p-4 shadow-xs border-border/80">
          <div className="flex items-center justify-between pb-1">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Average Daily Expense
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <BarChart2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-foreground">
            {formatCurrency(averageDailyExpense)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Per day across this month</p>
        </Card>
      </div>

      {/* Main Heatmap Calendar Card */}
      <Card className="shadow-xs overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/60">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-base font-bold">
                  {format(selectedMonth, 'MMMM yyyy')}
                </CardTitle>
                <CardDescription className="text-xs">
                  Tap any day cell to view individual expenses
                </CardDescription>
              </div>
            </div>

            {/* Heatmap Intensity Legend */}
            <div className="flex items-center gap-1.5 self-start sm:self-auto text-[11px] text-muted-foreground">
              <span>Less</span>
              <div className="flex items-center gap-1">
                <span className="h-3 w-3 rounded-xs bg-card border border-border" title="Zero" />
                <span className="h-3 w-3 rounded-xs bg-rose-50 dark:bg-rose-950/30 border border-rose-200" title="Low" />
                <span className="h-3 w-3 rounded-xs bg-rose-100 dark:bg-rose-900/50 border border-rose-300" title="Med" />
                <span className="h-3 w-3 rounded-xs bg-rose-200 dark:bg-rose-800 border border-rose-400" title="High" />
                <span className="h-3 w-3 rounded-xs bg-rose-500 border border-rose-600" title="Peak" />
              </div>
              <span>More</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-2 sm:p-4">
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-1.5 text-center">
            {WEEK_DAYS.map((day) => (
              <div
                key={day}
                className="text-[11px] font-bold text-muted-foreground py-1 uppercase tracking-wider"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid Cells */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {calendarDays.map((day) => {
              const dayStr = format(day, 'yyyy-MM-dd');
              const inMonth = isSameMonth(day, selectedMonth);
              const dayData = dailyMap.get(dayStr);
              const amount = inMonth && dayData ? dayData.amount : 0;
              const intensity = inMonth ? getHeatmapIntensity(amount, maxExpense) : 0;
              const currentDay = isToday(day);

              return (
                <button
                  key={dayStr}
                  type="button"
                  disabled={!inMonth}
                  onClick={() => inMonth && setSelectedDayDate(dayStr)}
                  aria-label={`${format(day, 'dd MMMM yyyy')}: ${formatCurrency(amount)}, ${getIntensityLabel(intensity)}`}
                  className={`min-h-[58px] sm:min-h-[76px] p-1.5 sm:p-2 rounded-xl border flex flex-col justify-between text-left transition-all relative ${getIntensityStyles(
                    intensity,
                    inMonth
                  )} ${currentDay ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                >
                  {/* Day Number and Today Indicator */}
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-xs sm:text-sm font-bold ${
                        currentDay
                          ? 'flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px]'
                          : ''
                      }`}
                    >
                      {format(day, 'd')}
                    </span>
                    {amount > 0 && intensity >= 3 && (
                      <Flame className="h-3 w-3 opacity-90" />
                    )}
                  </div>

                  {/* Daily Expense Amount */}
                  {inMonth && (
                    <div className="w-full truncate text-right">
                      {amount > 0 ? (
                        <span className="text-[10px] sm:text-xs font-bold leading-tight truncate block">
                          ₹{amount >= 1000 ? `${(amount / 1000).toFixed(1)}k` : amount}
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted-foreground/60 hidden sm:inline">-</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Day Inspector Modal */}
      <Dialog open={Boolean(selectedDayDate)} onOpenChange={(open) => !open && setSelectedDayDate(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedDayDate && formatDate(selectedDayDate)}</span>
              {selectedDayDate && dailyMap.get(selectedDayDate) && (
                <Badge variant="outline" className="text-rose-600 dark:text-rose-400 font-bold text-sm">
                  Total: {formatCurrency(dailyMap.get(selectedDayDate)?.amount)}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              All expenses incurred on this date
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2 max-h-72 overflow-y-auto">
            {dayTransactions.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-xs border border-dashed rounded-lg">
                No expense transactions recorded on this day.
              </div>
            ) : (
              dayTransactions.map((txn) => (
                <div
                  key={txn.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/70 text-xs"
                >
                  <div>
                    <p className="font-semibold text-foreground text-sm leading-tight">
                      {txn.description || txn.categories?.name || 'Expense'}
                    </p>
                    <p className="text-muted-foreground text-[11px] mt-0.5">
                      {txn.categories?.name} • <span className="capitalize">{txn.payment_mode}</span>
                      {txn.accounts?.account_name && ` • ${txn.accounts.account_name}`}
                    </p>
                  </div>
                  <span className="font-bold text-rose-600 dark:text-rose-400 text-sm">
                    -{formatCurrency(txn.amount)}
                  </span>
                </div>
              ))
            )}
          </div>

          <div className="pt-2 flex gap-2">
            <Button
              className="w-full gap-1.5"
              onClick={() => {
                const date = selectedDayDate;
                setSelectedDayDate(null);
                navigate(`/transaction/new/expense?date=${date}`);
              }}
            >
              <Plus className="h-4 w-4" />
              Add Expense for this Day
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CalendarPage;
