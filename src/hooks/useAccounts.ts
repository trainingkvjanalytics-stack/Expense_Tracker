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

      // Filter out archived accounts if includeArchived is false
      const filteredAccounts = allAccounts.filter((acc: Account) => {
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

      const txns = txnsData || [];

      // 3. Compute dynamic balance for each account using calculateAccountBalance
      const balanceMap: Record<string, number> = {};
      const accountsWithBalance = filteredAccounts.map((account: Account) => {
        const computedBalance = calculateAccountBalance(account, txns);
        balanceMap[account.id] = computedBalance;
        return {
          ...account,
          current_balance: computedBalance,
        };
      });

      setAccounts(accountsWithBalance);
      setBalances(balanceMap);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch accounts';
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
        const insertPayload: AccountInsert = {
          ...data,
          user_id: user.id,
          opening_balance: Number(data.opening_balance) || 0,
          current_balance: Number(data.opening_balance) || 0,
          currency: data.currency || 'INR',
          is_active: data.is_active ?? true,
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
        return created;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to create account';
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
        const updatePayload: AccountUpdate = {
          ...data,
          updated_at: new Date().toISOString(),
        };

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
        return updated;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to update account';
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
