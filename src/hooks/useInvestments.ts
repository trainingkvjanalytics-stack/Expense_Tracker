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
        .order('investment_date', { ascending: false });

      if (methodParam) {
        query = query.eq('investment_method', methodParam);
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
          .order('investment_date', { ascending: false });
        data = fallbackRes.data as unknown as typeof data;
        fetchError = fallbackRes.error;
      }

      if (fetchError) {
        throw fetchError;
      }

      const allList: InvestmentWithDetails[] = (data || []).map((item: any) => {
        const inv: any = {
          ...item,
          name: item.investment_name || item.name || '',
          investment_name: item.investment_name || item.name || '',
          method: item.investment_method || item.method || 'sip',
          investment_method: item.investment_method || item.method || 'sip',
          type: item.investment_type || item.type || 'mutual_fund',
          investment_type: item.investment_type || item.type || 'mutual_fund',
          start_date: item.investment_date || item.start_date || new Date().toISOString().slice(0, 10),
          investment_date: item.investment_date || item.start_date || new Date().toISOString().slice(0, 10),
          current_value: Number(item.amount) || 0,
        };
        if (item.accounts) {
          const accName = item.accounts.name || item.accounts.account_name || '';
          inv.accounts = {
            ...item.accounts,
            name: accName,
            account_name: accName,
          };
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
      console.error('Failed to fetch investments:', err);
      const message =
        (err as any)?.message ||
        (err instanceof Error ? err.message : 'Failed to fetch investments');
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
        const investmentPayload: any = {
          user_id: user.id,
          investment_name: (data as any).investment_name || (data as any).name,
          amount: Number(data.amount) || 0,
          investment_method: (data as any).investment_method || (data as any).method || 'sip',
          investment_type: (data as any).investment_type || (data as any).type || 'mutual_fund',
          investment_date: (data as any).investment_date || (data as any).start_date || format(new Date(), 'yyyy-MM-dd'),
          account_id: data.account_id || null,
          payment_mode: data.payment_mode || 'upi',
          notes: data.notes || null,
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
          const transactionPayload: any = {
            user_id: user.id,
            account_id: created.account_id,
            transaction_type: 'investment',
            amount: created.amount,
            transaction_date: created.investment_date || (data as any).start_date || format(new Date(), 'yyyy-MM-dd'),
            payment_mode: data.payment_mode || 'upi',
            description: `Investment: ${created.investment_name || (data as any).name}`,
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
        return {
          ...created,
          name: created.investment_name || created.name,
          method: created.investment_method || created.method,
          type: created.investment_type || created.type,
          start_date: created.investment_date || created.start_date,
        };
      } catch (err: unknown) {
        console.error('Failed to create investment:', err);
        const message =
          (err as any)?.message ||
          (err instanceof Error ? err.message : 'Failed to create investment');
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
        const updatePayload: any = {
          updated_at: new Date().toISOString(),
        };

        if (data.amount !== undefined) {
          updatePayload.amount = Number(data.amount) || 0;
        }
        if ((data as any).investment_name !== undefined || (data as any).name !== undefined) {
          updatePayload.investment_name = (data as any).investment_name || (data as any).name;
        }
        if ((data as any).investment_method !== undefined || (data as any).method !== undefined) {
          updatePayload.investment_method = (data as any).investment_method || (data as any).method;
        }
        if ((data as any).investment_type !== undefined || (data as any).type !== undefined) {
          updatePayload.investment_type = (data as any).investment_type || (data as any).type;
        }
        if ((data as any).investment_date !== undefined || (data as any).start_date !== undefined) {
          updatePayload.investment_date = (data as any).investment_date || (data as any).start_date;
        }
        if (data.account_id !== undefined) {
          updatePayload.account_id = data.account_id;
        }
        if (data.payment_mode !== undefined) {
          updatePayload.payment_mode = data.payment_mode;
        }
        if (data.notes !== undefined) {
          updatePayload.notes = data.notes;
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
        const txUpdate: any = {
          updated_at: new Date().toISOString(),
        };
        if (data.amount !== undefined) txUpdate.amount = Number(data.amount) || 0;
        if ((data as any).name !== undefined || (data as any).investment_name !== undefined) {
          txUpdate.description = `Investment: ${(data as any).investment_name || (data as any).name}`;
        }
        if (data.account_id !== undefined && data.account_id !== null) {
          txUpdate.account_id = data.account_id;
        }
        if ((data as any).start_date !== undefined || (data as any).investment_date !== undefined) {
          txUpdate.transaction_date = (data as any).investment_date || (data as any).start_date;
        }
        if (data.payment_mode !== undefined) txUpdate.payment_mode = data.payment_mode;

        await supabase
          .from('transactions')
          .update(txUpdate)
          .eq('related_investment_id', id)
          .eq('user_id', user.id);

        toast.success('Investment updated successfully');
        await fetchInvestments();
        return {
          ...updated,
          name: updated.investment_name || updated.name,
          method: updated.investment_method || updated.method,
          type: updated.investment_type || updated.type,
          start_date: updated.investment_date || updated.start_date,
        };
      } catch (err: unknown) {
        console.error('Failed to update investment:', err);
        const message =
          (err as any)?.message ||
          (err instanceof Error ? err.message : 'Failed to update investment');
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
