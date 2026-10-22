import { useState, useEffect, useCallback, useRef } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { TransactionType, PaymentMode } from '@/types/database';
import type { TransactionWithDetails } from '@/hooks/useTransactions';

export const ITEMS_PER_PAGE = 20;

export interface UseActivitiesParams {
  type?: TransactionType;
  categoryId?: string;
  dateRange?: {
    from?: Date;
    to?: Date;
  };
  paymentMode?: PaymentMode;
  accountId?: string;
  search?: string;
  page?: number;
}

export interface UseActivitiesReturn {
  activities: TransactionWithDetails[];
  loading: boolean;
  error: string | null;
  totalCount: number;
  hasMore: boolean;
  loadMore: () => void;
  refetch: () => Promise<void>;
}

export function useActivities(params?: UseActivitiesParams): UseActivitiesReturn {
  const { user } = useAuth();
  const [activities, setActivities] = useState<TransactionWithDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(params?.page ?? 1);

  const prevFiltersRef = useRef<string>('');

  const typeParam = params?.type;
  const categoryIdParam = params?.categoryId;
  const fromParam = params?.dateRange?.from ? params.dateRange.from.toISOString() : undefined;
  const toParam = params?.dateRange?.to ? params.dateRange.to.toISOString() : undefined;
  const paymentModeParam = params?.paymentMode;
  const accountIdParam = params?.accountId;
  const searchParam = params?.search?.trim();

  // Reset page when filters change
  const currentFiltersKey = `${typeParam}-${categoryIdParam}-${fromParam}-${toParam}-${paymentModeParam}-${accountIdParam}-${searchParam}`;
  useEffect(() => {
    if (prevFiltersRef.current !== currentFiltersKey) {
      prevFiltersRef.current = currentFiltersKey;
      setCurrentPage(1);
    }
  }, [currentFiltersKey]);

  const fetchActivities = useCallback(
    async (pageToFetch: number, isAppending: boolean = false) => {
      if (!user?.id) {
        setActivities([]);
        setTotalCount(0);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const offset = (pageToFetch - 1) * ITEMS_PER_PAGE;
        const limitOffset = offset + ITEMS_PER_PAGE - 1;

        let query = supabase
          .from('transactions')
          .select(
            '*, categories(name, color, icon), subcategories(name), accounts!transactions_account_id_fkey(*)',
            { count: 'exact' }
          )
          .eq('user_id', user.id);

        if (typeParam) {
          query = query.eq('transaction_type', typeParam);
        }

        if (categoryIdParam) {
          query = query.eq('category_id', categoryIdParam);
        }

        if (paymentModeParam) {
          query = query.eq('payment_mode', paymentModeParam);
        }

        if (accountIdParam) {
          query = query.or(
            `account_id.eq.${accountIdParam},destination_account_id.eq.${accountIdParam}`
          );
        }

        if (params?.dateRange?.from) {
          const fromStr = format(params.dateRange.from, 'yyyy-MM-dd');
          query = query.gte('transaction_date', fromStr);
        }

        if (params?.dateRange?.to) {
          const toStr = format(params.dateRange.to, 'yyyy-MM-dd');
          query = query.lte('transaction_date', toStr);
        }

        if (searchParam) {
          query = query.ilike('description', `%${searchParam}%`);
        }

        query = query
          .order('transaction_date', { ascending: false })
          .order('created_at', { ascending: false })
          .range(offset, limitOffset);

        let { data, count, error: fetchError } = await query;

        // Fallback if join syntax differs
        if (fetchError && fetchError.message.includes('relationship')) {
          let fallbackQuery = supabase
            .from('transactions')
            .select('*, categories(name, color, icon), subcategories(name)', {
              count: 'exact',
            })
            .eq('user_id', user.id);

          if (typeParam) fallbackQuery = fallbackQuery.eq('transaction_type', typeParam);
          if (categoryIdParam) fallbackQuery = fallbackQuery.eq('category_id', categoryIdParam);
          if (paymentModeParam) fallbackQuery = fallbackQuery.eq('payment_mode', paymentModeParam);
          if (accountIdParam) {
            fallbackQuery = fallbackQuery.or(
              `account_id.eq.${accountIdParam},destination_account_id.eq.${accountIdParam}`
            );
          }
          if (params?.dateRange?.from) {
            fallbackQuery = fallbackQuery.gte(
              'transaction_date',
              format(params.dateRange.from, 'yyyy-MM-dd')
            );
          }
          if (params?.dateRange?.to) {
            fallbackQuery = fallbackQuery.lte(
              'transaction_date',
              format(params.dateRange.to, 'yyyy-MM-dd')
            );
          }
          if (searchParam) {
            fallbackQuery = fallbackQuery.ilike('description', `%${searchParam}%`);
          }

          fallbackQuery = fallbackQuery
            .order('transaction_date', { ascending: false })
            .order('created_at', { ascending: false })
            .range(offset, limitOffset);

          const fallbackRes = await fallbackQuery;
          data = fallbackRes.data as unknown as typeof data;
          count = fallbackRes.count;
          fetchError = fallbackRes.error;
        }

        if (fetchError) {
          throw fetchError;
        }

        const formattedBatch: TransactionWithDetails[] = (
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

        setTotalCount(count ?? 0);
        if (isAppending) {
          setActivities((prev) => [...prev, ...formattedBatch]);
        } else {
          setActivities(formattedBatch);
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to fetch activities';
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [
      user?.id,
      typeParam,
      categoryIdParam,
      fromParam,
      toParam,
      paymentModeParam,
      accountIdParam,
      searchParam,
    ]
  );

  useEffect(() => {
    fetchActivities(currentPage, currentPage > 1);
  }, [fetchActivities, currentPage]);

  const loadMore = useCallback(() => {
    if (!loading && activities.length < totalCount) {
      setCurrentPage((prev) => prev + 1);
    }
  }, [loading, activities.length, totalCount]);

  const refetch = useCallback(async () => {
    setCurrentPage(1);
    await fetchActivities(1, false);
  }, [fetchActivities]);

  const hasMore = activities.length < totalCount;

  return {
    activities,
    loading,
    error,
    totalCount,
    hasMore,
    loadMore,
    refetch,
  };
}
