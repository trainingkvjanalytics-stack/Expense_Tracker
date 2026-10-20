import { useState, useEffect, useCallback } from 'react';
import { startOfMonth, endOfMonth, format, parseISO, isWithinInterval } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { round2 } from '@/lib/calculations';
import type {
  Investment,
  InvestmentInsert,
  InvestmentUpdate,
  InvestmentMethod,
  InvestmentType,
  PaymentMode,
  TransactionInsert,
  TransactionUpdate,
} from '@/types/database';

export interface InvestmentWithDetails extends Investment {
  accounts?: {
    id?: string;
    name?: string;
    account_name?: string;
  } | null;
}

export interface UseInvestmentsParams {
  month?: Date;
  method?: InvestmentMethod;
  type?: InvestmentType;
}

export interface UseInvestmentsReturn {
  investments: InvestmentWithDetails[];
  loading: boolean;
  error: string | null;
  totalMonthly: number;
  totalOverall: number;
  createInvestment: (
    data: Omit<InvestmentInsert, 'user_id'> & {
      payment_mode?: PaymentMode;
      user_id?: string;
    }
  ) => Promise<Investment | null>;
  updateInvestment: (
    id: string,
    data: InvestmentUpdate & { payment_mode?: PaymentMode }
  ) => Promise<Investment | null>;
  deleteInvestment: (id: string) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export function useInvestments(
  params?: UseInvestmentsParams
): UseInvestmentsReturn {
  const { user } = useAuth();
  const [investments, setInvestments] = useState<InvestmentWithDetails[]>([]);
  const [totalMonthly, setTotalMonthly] = useState<number>(0);
  const [totalOverall, setTotalOverall] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const monthParam = params?.month ? params.month.toISOString() : undefined;
  const methodParam = params?.method;
  const typeParam = params?.type;

  const fetchInvestments = useCallback(async () => {
    if (!user?.id) {
      setInvestments([]);
      setTotalMonthly(0);
      setTotalOverall(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('investments')
        .select('*, accounts(*)')
        .eq('user_id', user.id)
        .order('start_date', { ascending: false });

      if (methodParam) {
        query = query.eq('method', methodParam);
      }

      if (typeParam) {
        query = query.eq('investment_type', typeParam);
      }

      let { data, error: fetchError } = await query;

      // Fallback if join on accounts fails
      if (fetchError && fetchError.message.includes('relationship')) {
        const fallbackRes = await supabase
          .from('investments')
          .select('*')
          .eq('user_id', user.id)
          .order('start_date', { ascending: false });
        data = fallbackRes.data as unknown as typeof data;
        fetchError = fallbackRes.error;
      }

      if (fetchError) {
        throw fetchError;
      }

      const allList: InvestmentWithDetails[] = (data || []).map((item: any) => {
        const inv = item as unknown as InvestmentWithDetails;
        if (inv.accounts) {
          const accName = inv.accounts.name || inv.accounts.account_name || '';
          inv.accounts.name = accName;
          inv.accounts.account_name = accName;
        }
        return inv;
      });

      // Calculate totalOverall across all user's active investments
      let overall = 0;
      for (const item of allList) {
        if (item.is_active !== false) {
          overall += Number(item.current_value ?? item.amount) || 0;
        }
      }

      // Calculate totalMonthly for selected month or current month
      const targetMonth = params?.month || new Date();
      const monthStart = startOfMonth(targetMonth);
      const monthEnd = endOfMonth(targetMonth);

      let monthly = 0;
      for (const item of allList) {
        if (item.is_active === false) continue;

        if (item.method === 'sip') {
          // SIPs active during this month count towards monthly total
          const startDate = parseISO(item.start_date);
          const maturityDate = item.maturity_date ? parseISO(item.maturity_date) : null;
          const startedBeforeOrDuringMonth = startDate <= monthEnd;
          const maturesAfterOrDuringMonth = !maturityDate || maturityDate >= monthStart;

          if (startedBeforeOrDuringMonth && maturesAfterOrDuringMonth) {
            monthly += Number(item.amount) || 0;
          }
        } else {
          // One-time investments with start_date within this month
          try {
            const startDate = parseISO(item.start_date);
            if (isWithinInterval(startDate, { start: monthStart, end: monthEnd })) {
              monthly += Number(item.amount) || 0;
            }
          } catch {
            // Ignore malformed date
          }
        }
      }

      // Filter displayed investments if month is specified
      let displayList = allList;
      if (params?.month) {
        displayList = allList.filter((item) => {
          if (item.method === 'sip') {
            const startDate = parseISO(item.start_date);
            const maturityDate = item.maturity_date ? parseISO(item.maturity_date) : null;
            return startDate <= monthEnd && (!maturityDate || maturityDate >= monthStart);
          }
          try {
            const startDate = parseISO(item.start_date);
            return isWithinInterval(startDate, { start: monthStart, end: monthEnd });
          } catch {
            return false;
          }
        });
      }

      setInvestments(displayList);
      setTotalMonthly(round2(monthly));
      setTotalOverall(round2(overall));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch investments';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, monthParam, methodParam, typeParam]);

  useEffect(() => {
    fetchInvestments();
  }, [fetchInvestments]);

  const createInvestment = useCallback(
    async (
      data: Omit<InvestmentInsert, 'user_id'> & {
        payment_mode?: PaymentMode;
        user_id?: string;
      }
    ): Promise<Investment | null> => {
      if (!user?.id) {
        toast.error('You must be logged in to create an investment');
        return null;
      }

      try {
        const investmentPayload: InvestmentInsert = {
          ...data,
          user_id: user.id,
          amount: Number(data.amount) || 0,
          current_value:
            data.current_value !== undefined && data.current_value !== null
              ? Number(data.current_value)
              : Number(data.amount) || 0,
          is_active: data.is_active ?? true,
        };

        // 1. Insert into investments table
        const { data: created, error: createError } = await supabase
          .from('investments')
          .insert(investmentPayload)
          .select()
          .single();

        if (createError) {
          throw createError;
        }

        // 2. If an account is associated, create a matching 'investment' transaction
        if (created.account_id) {
          const transactionPayload: TransactionInsert = {
            user_id: user.id,
            account_id: created.account_id,
            type: 'investment',
            amount: created.amount,
            transaction_date: created.start_date || format(new Date(), 'yyyy-MM-dd'),
            payment_mode: data.payment_mode || 'upi',
            description: `Investment: ${created.name}`,
            notes: created.notes,
            related_investment_id: created.id,
          };

          const { error: txnError } = await supabase
            .from('transactions')
            .insert(transactionPayload);

          if (txnError) {
            console.error('Failed to create related transaction for investment:', txnError);
          }
        }

        toast.success('Investment saved successfully');
        await fetchInvestments();
        return created;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to create investment';
        toast.error(message);
        return null;
      }
    },
    [user?.id, fetchInvestments]
  );

  const updateInvestment = useCallback(
    async (
      id: string,
      data: InvestmentUpdate & { payment_mode?: PaymentMode }
    ): Promise<Investment | null> => {
      if (!user?.id) {
        toast.error('You must be logged in to update an investment');
        return null;
      }

      try {
        const updatePayload: InvestmentUpdate = {
          ...data,
          updated_at: new Date().toISOString(),
        };

        if (data.amount !== undefined) {
          updatePayload.amount = Number(data.amount) || 0;
        }
        if (data.current_value !== undefined && data.current_value !== null) {
          updatePayload.current_value = Number(data.current_value);
        }

        // 1. Update investments table
        const { data: updated, error: updateError } = await supabase
          .from('investments')
          .update(updatePayload)
          .eq('id', id)
          .eq('user_id', user.id)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        // 2. Update related transaction if it exists
        const txUpdate: TransactionUpdate = {
          updated_at: new Date().toISOString(),
        };
        if (data.amount !== undefined) txUpdate.amount = Number(data.amount) || 0;
        if (data.name !== undefined) txUpdate.description = `Investment: ${data.name}`;
        if (data.account_id !== undefined && data.account_id !== null) {
          txUpdate.account_id = data.account_id;
        }
        if (data.start_date !== undefined) txUpdate.transaction_date = data.start_date;
        if (data.payment_mode !== undefined) txUpdate.payment_mode = data.payment_mode;

        await supabase
          .from('transactions')
          .update(txUpdate)
          .eq('related_investment_id', id)
          .eq('user_id', user.id);

        toast.success('Investment updated successfully');
        await fetchInvestments();
        return updated;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to update investment';
        toast.error(message);
        return null;
      }
    },
    [user?.id, fetchInvestments]
  );

  const deleteInvestment = useCallback(
    async (id: string): Promise<boolean> => {
      if (!user?.id) {
        toast.error('You must be logged in to delete an investment');
        return false;
      }

      try {
        // 1. Delete related transaction first
        await supabase
          .from('transactions')
          .delete()
          .eq('related_investment_id', id)
          .eq('user_id', user.id);

        // 2. Delete investment
        const { error: deleteError } = await supabase
          .from('investments')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);

        if (deleteError) {
          throw deleteError;
        }

        toast.success('Investment deleted successfully');
        await fetchInvestments();
        return true;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to delete investment';
        toast.error(message);
        return false;
      }
    },
    [user?.id, fetchInvestments]
  );

  return {
    investments,
    loading,
    error,
    totalMonthly,
    totalOverall,
    createInvestment,
    updateInvestment,
    deleteInvestment,
    refetch: fetchInvestments,
  };
}
