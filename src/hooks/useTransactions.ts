import { useState, useEffect, useCallback } from 'react';
import { startOfMonth, endOfMonth, format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type {
  Transaction,
  TransactionInsert,
  TransactionUpdate,
  TransactionType,
} from '@/types/database';

export interface TransactionWithDetails extends Transaction {
  categories?: {
    name: string;
    color: string | null;
    icon: string | null;
  } | null;
  subcategories?: {
    name: string;
  } | null;
  accounts?: {
    id?: string;
    name?: string;
    account_name?: string;
    type?: string;
    color?: string | null;
    icon?: string | null;
  } | null;
}

export interface UseTransactionsParams {
  month?: Date;
  type?: TransactionType;
  accountId?: string;
  categoryId?: string;
  limit?: number;
}

export interface UseTransactionsReturn {
  transactions: TransactionWithDetails[];
  loading: boolean;
  error: string | null;
  createTransaction: (
    data: Omit<TransactionInsert, 'user_id'> & { user_id?: string }
  ) => Promise<Transaction | null>;
  updateTransaction: (
    id: string,
    data: TransactionUpdate
  ) => Promise<Transaction | null>;
  deleteTransaction: (id: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export function useTransactions(
  params?: UseTransactionsParams
): UseTransactionsReturn {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const monthParam = params?.month ? params.month.toISOString() : undefined;
  const typeParam = params?.type;
  const accountIdParam = params?.accountId;
  const categoryIdParam = params?.categoryId;
  const limitParam = params?.limit;

  const fetchTransactions = useCallback(async () => {
    if (!user?.id) {
      setTransactions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('transactions')
        .select(
          '*, categories(name, color, icon), subcategories(name), accounts!transactions_account_id_fkey(*)'
        )
        .eq('user_id', user.id);

      // Month filter
      if (params?.month) {
        const start = format(startOfMonth(params.month), 'yyyy-MM-dd');
        const end = format(endOfMonth(params.month), 'yyyy-MM-dd');
        query = query.gte('transaction_date', start).lte('transaction_date', end);
      }

      // Type filter (using real DB column transaction_type)
      if (typeParam) {
        query = query.eq('transaction_type', typeParam);
      }

      // Account filter (matches account_id or destination_account_id)
      if (accountIdParam) {
        query = query.or(
          `account_id.eq.${accountIdParam},destination_account_id.eq.${accountIdParam}`
        );
      }

      // Category filter
      if (categoryIdParam) {
        query = query.eq('category_id', categoryIdParam);
      }

      // Order by transaction_date DESC, created_at DESC
      query = query
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false });

      // Limit filter
      if (limitParam && limitParam > 0) {
        query = query.limit(limitParam);
      }

      let { data, error: fetchError } = await query;

      // Graceful fallback if foreign key alias accounts!transactions_account_id_fkey differs
      if (fetchError && fetchError.message.includes('relationship')) {
        let fallbackQuery = supabase
          .from('transactions')
          .select('*, categories(name, color, icon), subcategories(name)')
          .eq('user_id', user.id);

        if (params?.month) {
          const start = format(startOfMonth(params.month), 'yyyy-MM-dd');
          const end = format(endOfMonth(params.month), 'yyyy-MM-dd');
          fallbackQuery = fallbackQuery
            .gte('transaction_date', start)
            .lte('transaction_date', end);
        }
        if (typeParam) {
          fallbackQuery = fallbackQuery.eq('transaction_type', typeParam);
        }
        if (accountIdParam) {
          fallbackQuery = fallbackQuery.or(
            `account_id.eq.${accountIdParam},destination_account_id.eq.${accountIdParam}`
          );
        }
        if (categoryIdParam) {
          fallbackQuery = fallbackQuery.eq('category_id', categoryIdParam);
        }
        fallbackQuery = fallbackQuery
          .order('transaction_date', { ascending: false })
          .order('created_at', { ascending: false });
        if (limitParam && limitParam > 0) {
          fallbackQuery = fallbackQuery.limit(limitParam);
        }

        const fallbackRes = await fallbackQuery;
        data = fallbackRes.data as unknown as typeof data;
        fetchError = fallbackRes.error;
      }

      if (fetchError) {
        throw fetchError;
      }

      const formatted: TransactionWithDetails[] = (
        (data as unknown as any[]) || []
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

      setTransactions(formatted);
    } catch (err: unknown) {
      console.error('Failed to fetch transactions:', err);
      const message =
        (err as any)?.message ||
        (err instanceof Error ? err.message : 'Failed to fetch transactions');
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, monthParam, typeParam, accountIdParam, categoryIdParam, limitParam]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const createTransaction = useCallback(
    async (
      data: Omit<TransactionInsert, 'user_id'> & { user_id?: string; destination_account_id?: string | null; transaction_type?: any }
    ): Promise<Transaction | null> => {
      if (!user?.id) {
        toast.error('You must be logged in to create a transaction');
        return null;
      }

      try {
        const payload: any = {
          user_id: user.id,
          transaction_type: data.transaction_type || data.type,
          amount: Number(data.amount) || 0,
          transaction_date: data.transaction_date || format(new Date(), 'yyyy-MM-dd'),
          payment_mode: data.payment_mode || 'upi',
          account_id: data.account_id || null,
          destination_account_id: data.destination_account_id || data.to_account_id || null,
          category_id: data.category_id || null,
          subcategory_id: data.subcategory_id || null,
          description: data.description || (data as any).notes || null,
          related_lent_id: data.related_lent_id || null,
          related_investment_id: data.related_investment_id || null,
        };

        const { data: created, error: createError } = await supabase
          .from('transactions')
          .insert(payload)
          .select()
          .single();

        if (createError) {
          throw createError;
        }

        toast.success('Transaction saved');
        await fetchTransactions();
        return created;
      } catch (err: unknown) {
        console.error('Failed to save transaction:', err);
        const message =
          (err as any)?.message ||
          (err instanceof Error ? err.message : 'Failed to save transaction');
        toast.error(message);
        return null;
      }
    },
    [user?.id, fetchTransactions]
  );

  const updateTransaction = useCallback(
    async (
      id: string,
      data: TransactionUpdate & { destination_account_id?: string | null; transaction_type?: any }
    ): Promise<Transaction | null> => {
      if (!user?.id) {
        toast.error('You must be logged in to update a transaction');
        return null;
      }

      try {
        const payload: any = {
          updated_at: new Date().toISOString(),
        };

        if (data.type !== undefined || data.transaction_type !== undefined) {
          payload.transaction_type = data.transaction_type || data.type;
        }
        if (data.amount !== undefined) {
          payload.amount = Number(data.amount) || 0;
        }
        if (data.transaction_date !== undefined) {
          payload.transaction_date = data.transaction_date;
        }
        if (data.payment_mode !== undefined) {
          payload.payment_mode = data.payment_mode;
        }
        if (data.account_id !== undefined) {
          payload.account_id = data.account_id;
        }
        if (data.destination_account_id !== undefined || data.to_account_id !== undefined) {
          payload.destination_account_id = data.destination_account_id || data.to_account_id;
        }
        if (data.category_id !== undefined) {
          payload.category_id = data.category_id;
        }
        if (data.subcategory_id !== undefined) {
          payload.subcategory_id = data.subcategory_id;
        }
        if (data.description !== undefined || (data as any).notes !== undefined) {
          payload.description = data.description || (data as any).notes;
        }

        const { data: updated, error: updateError } = await supabase
          .from('transactions')
          .update(payload)
          .eq('id', id)
          .eq('user_id', user.id)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        toast.success('Transaction updated');
        await fetchTransactions();
        return updated;
      } catch (err: unknown) {
        console.error('Failed to update transaction:', err);
        const message =
          (err as any)?.message ||
          (err instanceof Error ? err.message : 'Failed to update transaction');
        toast.error(message);
        return null;
      }
    },
    [user?.id, fetchTransactions]
  );

  const deleteTransaction = useCallback(
    async (id: string): Promise<boolean> => {
      if (!user?.id) {
        toast.error('You must be logged in to delete a transaction');
        return false;
      }

      try {
        const { error: deleteError } = await supabase
          .from('transactions')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);

        if (deleteError) {
          throw deleteError;
        }

        toast.success('Transaction deleted');
        await fetchTransactions();
        return true;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to delete transaction';
        toast.error(message);
        return false;
      }
    },
    [user?.id, fetchTransactions]
  );

  return {
    transactions,
    loading,
    error,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    refetch: fetchTransactions,
  };
}
