import { useState, useEffect, useCallback } from 'react';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  calculateMonthlyTotals,
  calculateClosingBalance,
  groupExpensesByCategory,
  groupExpensesByWeek,
  round2,
  type CategoryExpense,
  type WeeklyExpense,
} from '@/lib/calculations';
import type { Transaction, Category } from '@/types/database';
import type { TransactionWithDetails } from '@/hooks/useTransactions';

export interface DashboardSummary {
  totalIncome: number;
  totalExpenses: number;
  totalInvestments: number;
  totalLent: number;
  totalRepayments: number;
  openingBalance: number;
  closingBalance: number;
  remainingBalance: number;
}

export interface UseDashboardParams {
  selectedMonth: Date;
}

export interface UseDashboardReturn {
  summary: DashboardSummary;
  categoryExpenses: CategoryExpense[];
  weeklyExpenses: WeeklyExpense[];
  recentActivities: TransactionWithDetails[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const DEFAULT_SUMMARY: DashboardSummary = {
  totalIncome: 0,
  totalExpenses: 0,
  totalInvestments: 0,
  totalLent: 0,
  totalRepayments: 0,
  openingBalance: 0,
  closingBalance: 0,
  remainingBalance: 0,
};

export function useDashboard(params: UseDashboardParams): UseDashboardReturn {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary>(DEFAULT_SUMMARY);
  const [categoryExpenses, setCategoryExpenses] = useState<CategoryExpense[]>([]);
  const [weeklyExpenses, setWeeklyExpenses] = useState<WeeklyExpense[]>([]);
  const [recentActivities, setRecentActivities] = useState<TransactionWithDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const monthISO = params.selectedMonth.toISOString();

  const fetchDashboardData = useCallback(async () => {
    if (!user?.id) {
      setSummary(DEFAULT_SUMMARY);
      setCategoryExpenses([]);
      setWeeklyExpenses([]);
      setRecentActivities([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const monthStart = format(startOfMonth(params.selectedMonth), 'yyyy-MM-dd');
      const monthEnd = format(endOfMonth(params.selectedMonth), 'yyyy-MM-dd');
      const year = params.selectedMonth.getFullYear();
      const monthIndex = params.selectedMonth.getMonth() + 1; // 1-indexed for calculations

      // 1. Fetch App settings
      const { data: settingsData } = await supabase
        .from('app_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      // Fallback: If initial_opening_balance not defined in settings, use sum of account opening balances
      let initialOpeningBalance = 0;
      if (settingsData && settingsData.initial_opening_balance !== undefined && settingsData.initial_opening_balance !== null) {
        initialOpeningBalance = Number(settingsData.initial_opening_balance);
      } else {
        const { data: accountsData } = await supabase
          .from('accounts')
          .select('initial_balance, account_name, account_type')
          .eq('user_id', user.id);

        initialOpeningBalance = (accountsData || []).reduce(
          (sum: number, acc: any) => sum + (Number(acc.initial_balance ?? acc.opening_balance) || 0),
          0
        );
      }

      // 2. Fetch all transactions for selected month
      const { data: monthTxnsData, error: monthTxnsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .gte('transaction_date', monthStart)
        .lte('transaction_date', monthEnd);

      if (monthTxnsError) {
        throw monthTxnsError;
      }

      const monthTxns: Transaction[] = ((monthTxnsData as any[]) || []).map((t) => ({
        ...t,
        type: t.transaction_type || t.type,
        to_account_id: t.destination_account_id || t.to_account_id,
      }));

      // 3. Fetch all transactions before the selected month to calculate opening balance
      const { data: prevTxnsData, error: prevTxnsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .lt('transaction_date', monthStart);

      if (prevTxnsError) {
        throw prevTxnsError;
      }

      const prevTxns: Transaction[] = ((prevTxnsData as any[]) || []).map((t) => ({
        ...t,
        type: t.transaction_type || t.type,
        to_account_id: t.destination_account_id || t.to_account_id,
      }));

      // Calculate opening balance
      let prevIncome = 0;
      let prevExpenses = 0;
      let prevInvestments = 0;
      let prevLent = 0;
      let prevRepayments = 0;

      for (const t of prevTxns) {
        const amount = Number(t.amount) || 0;
        switch (t.type) {
          case 'income':
            prevIncome += amount;
            break;
          case 'expense':
            prevExpenses += amount;
            break;
          case 'investment':
            prevInvestments += amount;
            break;
          case 'lent':
            prevLent += amount;
            break;
          case 'repayment':
            prevRepayments += amount;
            break;
        }
      }

      const openingBalance = round2(
        initialOpeningBalance +
          prevIncome +
          prevRepayments -
          prevExpenses -
          prevInvestments -
          prevLent
      );

      // Monthly totals
      const monthlyTotals = calculateMonthlyTotals(monthTxns);
      const closingBalance = calculateClosingBalance(openingBalance, monthlyTotals);
      const remainingBalance = closingBalance;

      // 4. Fetch categories for grouping
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', user.id);

      if (categoriesError) {
        throw categoriesError;
      }

      const categories: Category[] = ((categoriesData as any[]) || []).map((c) => ({
        ...c,
        type: c.transaction_type || c.type,
        is_system: Boolean(c.is_default || c.is_system),
      }));

      // Group categories and weeks
      const groupedCategories = groupExpensesByCategory(monthTxns, categories);
      const groupedWeeks = groupExpensesByWeek(monthTxns, year, monthIndex);

      // 5. Fetch recent 10 transactions across all types
      let recentRes = await supabase
        .from('transactions')
        .select(
          '*, categories(name, color, icon), subcategories(name), accounts!transactions_account_id_fkey(*)'
        )
        .eq('user_id', user.id)
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(10);

      if (recentRes.error && recentRes.error.message.includes('relationship')) {
        recentRes = await supabase
          .from('transactions')
          .select('*, categories(name, color, icon), subcategories(name)')
          .eq('user_id', user.id)
          .order('transaction_date', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(10);
      }

      const formattedActivities: TransactionWithDetails[] = (
        (recentRes.data as unknown as any[]) || []
      ).map((item) => {
        const mappedAcc = item.accounts
          ? {
              ...item.accounts,
              name: item.accounts.account_name || item.accounts.name || '',
              account_name: item.accounts.account_name || item.accounts.name || '',
              type: item.accounts.account_type || item.accounts.type,
              opening_balance: Number(item.accounts.initial_balance ?? item.accounts.opening_balance ?? 0),
            }
          : undefined;

        return {
          ...item,
          type: item.transaction_type || item.type,
          to_account_id: item.destination_account_id || item.to_account_id,
          accounts: mappedAcc,
        };
      });

      setSummary({
        totalIncome: monthlyTotals.income,
        totalExpenses: monthlyTotals.expenses,
        totalInvestments: monthlyTotals.investments,
        totalLent: monthlyTotals.lent,
        totalRepayments: monthlyTotals.repayments,
        openingBalance,
        closingBalance,
        remainingBalance,
      });

      setCategoryExpenses(groupedCategories);
      setWeeklyExpenses(groupedWeeks);
      setRecentActivities(formattedActivities);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to load dashboard data';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, monthISO]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return {
    summary,
    categoryExpenses,
    weeklyExpenses,
    recentActivities,
    loading,
    error,
    refetch: fetchDashboardData,
  };
}
