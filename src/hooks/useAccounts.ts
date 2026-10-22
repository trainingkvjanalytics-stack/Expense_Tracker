import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { calculateAccountBalance } from '@/lib/calculations';
import type { Account, AccountInsert, AccountUpdate } from '@/types/database';

export interface UseAccountsOptions {
  includeArchived?: boolean;
}

export interface UseAccountsReturn {
  accounts: Account[];
  loading: boolean;
  error: string | null;
  createAccount: (data: Omit<AccountInsert, 'user_id'> & { user_id?: string }) => Promise<Account | null>;
  updateAccount: (id: string, data: AccountUpdate) => Promise<Account | null>;
  archiveAccount: (id: string) => Promise<boolean>;
  getAccountBalance: (accountId: string) => number;
  refetch: () => Promise<void>;
}

export function useAccounts(options?: UseAccountsOptions): UseAccountsReturn {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const includeArchived = options?.includeArchived ?? false;

  const fetchAccounts = useCallback(async () => {
    if (!user?.id) {
      setAccounts([]);
      setBalances({});
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Fetch user accounts ordered by created_at
      const { data: accountsData, error: accountsError } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (accountsError) {
        throw accountsError;
      }

      const allAccounts = accountsData || [];

      // Map accounts to include frontend expected field names and filter out archived
      const filteredAccounts: Account[] = (allAccounts as any[]).map((acc) => ({
        ...acc,
        name: acc.account_name || acc.name || '',
        account_name: acc.account_name || acc.name || '',
        type: acc.account_type || acc.type || 'savings',
        account_type: acc.account_type || acc.type || 'savings',
        opening_balance: Number(acc.initial_balance ?? acc.opening_balance ?? 0),
        initial_balance: Number(acc.initial_balance ?? acc.opening_balance ?? 0),
        is_active: !acc.is_archived,
        currency: acc.currency || 'INR',
      })).filter((acc) => {
        if (includeArchived) return true;
        return acc.is_active !== false && !acc.is_archived;
      });

      // 2. Fetch all user transactions to accurately compute current balances
      const { data: txnsData, error: txnsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id);

      if (txnsError) {
        throw txnsError;
      }

      const txns = ((txnsData as any[]) || []).map((t) => ({
        ...t,
        type: t.transaction_type || t.type,
        to_account_id: t.destination_account_id || t.to_account_id,
      }));

      // 3. Compute dynamic balance for each account using calculateAccountBalance
      const balanceMap: Record<string, number> = {};
      const accountsWithBalance = filteredAccounts.map((account: Account) => {
        const computedBalance = calculateAccountBalance(account, txns as any);
        balanceMap[account.id] = computedBalance;
        return {
          ...account,
          current_balance: computedBalance,
        };
      });

      setAccounts(accountsWithBalance);
      setBalances(balanceMap);
    } catch (err: unknown) {
      console.error('Failed to fetch accounts:', err);
      const message =
        (err as any)?.message ||
        (err instanceof Error ? err.message : 'Failed to fetch accounts');
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [user?.id, includeArchived]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const createAccount = useCallback(
    async (data: Omit<AccountInsert, 'user_id'> & { user_id?: string }): Promise<Account | null> => {
      if (!user?.id) {
        toast.error('You must be logged in to create an account');
        return null;
      }

      try {
        const insertPayload: any = {
          user_id: user.id,
          account_name: (data as any).account_name || data.name,
          bank_name: data.bank_name || null,
          account_type: (data as any).account_type || data.type || 'savings',
          initial_balance: Number((data as any).initial_balance ?? data.opening_balance ?? 0),
          opening_date: data.opening_date || new Date().toISOString().slice(0, 10),
          notes: data.notes || null,
          is_archived: false,
        };

        const { data: created, error: createError } = await supabase
          .from('accounts')
          .insert(insertPayload)
          .select()
          .single();

        if (createError) {
          throw createError;
        }

        toast.success('Account created successfully');
        await fetchAccounts();
        return {
          ...created,
          name: created.account_name || created.name,
          type: created.account_type || created.type,
          opening_balance: Number(created.initial_balance ?? created.opening_balance ?? 0),
          is_active: !created.is_archived,
        };
      } catch (err: unknown) {
        console.error('Failed to create account:', err);
        const message =
          (err as any)?.message ||
          (err instanceof Error ? err.message : 'Failed to create account');
        toast.error(message);
        return null;
      }
    },
    [user?.id, fetchAccounts]
  );

  const updateAccount = useCallback(
    async (id: string, data: AccountUpdate): Promise<Account | null> => {
      if (!user?.id) {
        toast.error('You must be logged in to update an account');
        return null;
      }

      try {
        const updatePayload: any = {
          updated_at: new Date().toISOString(),
        };

        if (data.name !== undefined || (data as any).account_name !== undefined) {
          updatePayload.account_name = (data as any).account_name || data.name;
        }
        if (data.type !== undefined || (data as any).account_type !== undefined) {
          updatePayload.account_type = (data as any).account_type || data.type;
        }
        if (data.opening_balance !== undefined || (data as any).initial_balance !== undefined) {
          updatePayload.initial_balance = Number((data as any).initial_balance ?? data.opening_balance ?? 0);
        }
        if (data.bank_name !== undefined) {
          updatePayload.bank_name = data.bank_name;
        }
        if (data.opening_date !== undefined) {
          updatePayload.opening_date = data.opening_date;
        }
        if (data.notes !== undefined) {
          updatePayload.notes = data.notes;
        }
        if (data.is_archived !== undefined) {
          updatePayload.is_archived = data.is_archived;
        } else if (data.is_active !== undefined) {
          updatePayload.is_archived = !data.is_active;
        }

        const { data: updated, error: updateError } = await supabase
          .from('accounts')
          .update(updatePayload)
          .eq('id', id)
          .eq('user_id', user.id)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        toast.success('Account updated successfully');
        await fetchAccounts();
        return {
          ...updated,
          name: updated.account_name || updated.name,
          type: updated.account_type || updated.type,
          opening_balance: Number(updated.initial_balance ?? updated.opening_balance ?? 0),
          is_active: !updated.is_archived,
        };
      } catch (err: unknown) {
        console.error('Failed to update account:', err);
        const message =
          (err as any)?.message ||
          (err instanceof Error ? err.message : 'Failed to update account');
        toast.error(message);
        return null;
      }
    },
    [user?.id, fetchAccounts]
  );

  const archiveAccount = useCallback(
    async (id: string): Promise<boolean> => {
      if (!user?.id) {
        toast.error('You must be logged in to archive an account');
        return false;
      }

      try {
        const updatePayload: AccountUpdate = {
          is_archived: true,
          is_active: false,
          updated_at: new Date().toISOString(),
        };

        const { error: archiveError } = await supabase
          .from('accounts')
          .update(updatePayload)
          .eq('id', id)
          .eq('user_id', user.id);

        if (archiveError) {
          throw archiveError;
        }

        toast.success('Account archived successfully');
        await fetchAccounts();
        return true;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to archive account';
        toast.error(message);
        return false;
      }
    },
    [user?.id, fetchAccounts]
  );

  const getAccountBalance = useCallback(
    (accountId: string): number => {
      if (balances[accountId] !== undefined) {
        return balances[accountId];
      }
      const acc = accounts.find((a) => a.id === accountId);
      return acc?.current_balance ?? acc?.opening_balance ?? 0;
    },
    [accounts, balances]
  );

  return {
    accounts,
    loading,
    error,
    createAccount,
    updateAccount,
    archiveAccount,
    getAccountBalance,
    refetch: fetchAccounts,
  };
}
