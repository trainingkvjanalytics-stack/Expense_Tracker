import { useState, useEffect, useCallback } from 'react';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  calculateDailyExpenses,
  round2,
  type DailyExpense,
} from '@/lib/calculations';
import type { Transaction } from '@/types/database';

export interface UseCalendarParams {
  selectedMonth: Date;
}

export interface UseCalendarReturn {
  dailyExpenses: DailyExpense[];
  totalMonthlyExpense: number;
  highestSpendingDay: { date: string; amount: number } | null;
  averageDailyExpense: number;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useCalendar(params: UseCalendarParams): UseCalendarReturn {
  const { user } = useAuth();
  const [dailyExpenses, setDailyExpenses] = useState<DailyExpense[]>([]);
  const [totalMonthlyExpense, setTotalMonthlyExpense] = useState<number>(0);
  const [highestSpendingDay, setHighestSpendingDay] = useState<{
    date: string;
    amount: number;
  } | null>(null);
  const [averageDailyExpense, setAverageDailyExpense] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const monthISO = params.selectedMonth.toISOString();

  const fetchCalendarData = useCallback(async () => {
    if (!user?.id) {
      setDailyExpenses([]);
      setTotalMonthlyExpense(0);
      setHighestSpendingDay(null);
      setAverageDailyExpense(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const start = format(startOfMonth(params.selectedMonth), 'yyyy-MM-dd');
      const end = format(endOfMonth(params.selectedMonth), 'yyyy-MM-dd');
      const year = params.selectedMonth.getFullYear();
      const month = params.selectedMonth.getMonth() + 1; // 1-indexed

      // Fetch expense transactions for the month
      const { data, error: fetchError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'expense')
        .gte('transaction_date', start)
        .lte('transaction_date', end);

      if (fetchError) {
        throw fetchError;
      }

      const txns: Transaction[] = data || [];

      // Calculate daily expense array
      const calculatedDaily = calculateDailyExpenses(txns, year, month);

      // Compute statistics
      const totalExpense = round2(
        calculatedDaily.reduce((acc, curr) => acc + curr.amount, 0)
      );

      const daysCount = calculatedDaily.length;
      const avgExpense = daysCount > 0 ? round2(totalExpense / daysCount) : 0;

      let highestDay: { date: string; amount: number } | null = null;
      for (const day of calculatedDaily) {
        if (day.amount > 0 && (!highestDay || day.amount > highestDay.amount)) {
          highestDay = {
            date: day.date,
            amount: day.amount,
          };
        }
      }

      setDailyExpenses(calculatedDaily);
      setTotalMonthlyExpense(totalExpense);
      setAverageDailyExpense(avgExpense);
      setHighestSpendingDay(highestDay);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch calendar data';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, monthISO]);

  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

  return {
    dailyExpenses,
    totalMonthlyExpense,
    highestSpendingDay,
    averageDailyExpense,
    loading,
    error,
    refetch: fetchCalendarData,
  };
}
