import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { round2 } from '@/lib/calculations';
import type {
  LentRecord,
  LentRecordInsert,
  LentRecordUpdate,
  LentRepayment,
  PaymentMode,
  TransactionInsert,
} from '@/types/database';

export interface LentRecordWithDetails extends LentRecord {
  repayments: LentRepayment[];
  outstanding_amount: number;
}

export interface UseLentMoneyOptions {
  includeRepaid?: boolean;
}

export interface ProcessPartialRepaymentParams {
  lentRecordId: string;
  amount: number;
  repaymentDate?: string;
  expectedRemainingDate?: string | null;
  destinationAccountId: string;
  paymentMode?: PaymentMode;
  notes?: string;
}

export interface UseLentMoneyReturn {
  lentRecords: LentRecordWithDetails[];
  loading: boolean;
  error: string | null;
  createLentRecord: (
    data: Omit<LentRecordInsert, 'user_id'> & {
      account_id: string;
      payment_mode?: PaymentMode;
      user_id?: string;
    }
  ) => Promise<LentRecord | null>;
  processFullRepayment: (
    lentRecordId: string,
    destinationAccountId: string,
    paymentMode?: PaymentMode
  ) => Promise<boolean>;
  processPartialRepayment: (
    data: ProcessPartialRepaymentParams
  ) => Promise<boolean>;
  refetch: () => Promise<void>;
}

export function useLentMoney(
  options?: UseLentMoneyOptions
): UseLentMoneyReturn {
  const { user } = useAuth();
  const [lentRecords, setLentRecords] = useState<LentRecordWithDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const includeRepaid = options?.includeRepaid ?? false;

  const fetchLentRecords = useCallback(async () => {
    if (!user?.id) {
      setLentRecords([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Fetch lent records
      let query = supabase
        .from('lent_records')
        .select('*')
        .eq('user_id', user.id)
        .order('lent_date', { ascending: false });

      if (!includeRepaid) {
        query = query.neq('status', 'repaid');
      }

      const { data: recordsData, error: recordsError } = await query;

      if (recordsError) {
        throw recordsError;
      }

      // 2. Fetch all repayments for current user
      const { data: repaymentsData, error: repaymentsError } = await supabase
        .from('lent_repayments')
        .select('*')
        .eq('user_id', user.id)
        .order('repayment_date', { ascending: false });

      if (repaymentsError) {
        throw repaymentsError;
      }

      const allRepayments = repaymentsData || [];

      // 3. Combine repayment history and calculate accurate outstanding amount
      const combined: LentRecordWithDetails[] = (recordsData || []).map((rec: any) => {
        const itemRepayments = allRepayments.filter(
          (r: any) => r.lent_record_id === rec.id
        );
        const originalAmount = Number(rec.amount) || 0;
        const repaidAmount = Number(rec.amount_repaid) || 0;
        const outstanding =
          rec.outstanding_amount !== undefined && rec.outstanding_amount !== null
            ? Number(rec.outstanding_amount)
            : Math.max(0, round2(originalAmount - repaidAmount));

        return {
          ...rec,
          amount: originalAmount,
          amount_repaid: repaidAmount,
          outstanding_amount: outstanding,
          repayments: itemRepayments,
        };
      });

      setLentRecords(combined);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch lent records';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [user?.id, includeRepaid]);

  useEffect(() => {
    fetchLentRecords();
  }, [fetchLentRecords]);

  const createLentRecord = useCallback(
    async (
      data: Omit<LentRecordInsert, 'user_id'> & {
        account_id: string;
        payment_mode?: PaymentMode;
        user_id?: string;
      }
    ): Promise<LentRecord | null> => {
      if (!user?.id) {
        toast.error('You must be logged in to create a lent record');
        return null;
      }

      try {
        const principalAmount = Number(data.amount) || 0;
        const lentPayload: LentRecordInsert = {
          ...data,
          user_id: user.id,
          amount: principalAmount,
          original_amount: principalAmount,
          amount_repaid: 0,
          outstanding_amount: principalAmount,
          status: 'active',
        };

        // 1. Insert lent record
        const { data: createdRecord, error: recordError } = await supabase
          .from('lent_records')
          .insert(lentPayload)
          .select()
          .single();

        if (recordError) {
          throw recordError;
        }

        // 2. Insert transaction with type 'lent'
        const txnPayload: TransactionInsert = {
          user_id: user.id,
          account_id: data.account_id,
          type: 'lent',
          amount: principalAmount,
          transaction_date:
            data.lent_date || format(new Date(), 'yyyy-MM-dd'),
          payment_mode: data.payment_mode || 'upi',
          description: `Lent to ${data.borrower_name}`,
          notes: data.notes,
          related_lent_id: createdRecord.id,
        };

        const { data: createdTxn, error: txnError } = await supabase
          .from('transactions')
          .insert(txnPayload)
          .select()
          .single();

        if (txnError) {
          console.error('Failed to create related transaction for lent record:', txnError);
        } else if (createdTxn) {
          // Link transaction ID back to lent record
          await supabase
            .from('lent_records')
            .update({ transaction_id: createdTxn.id })
            .eq('id', createdRecord.id);
        }

        toast.success('Lent record created successfully');
        await fetchLentRecords();
        return createdRecord;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to create lent record';
        toast.error(message);
        return null;
      }
    },
    [user?.id, fetchLentRecords]
  );

  const processFullRepayment = useCallback(
    async (
      lentRecordId: string,
      destinationAccountId: string,
      paymentMode: PaymentMode = 'upi'
    ): Promise<boolean> => {
      if (!user?.id) {
        toast.error('You must be logged in to process a repayment');
        return false;
      }

      try {
        // Try calling custom RPC process_lent_repayment if available on Supabase
        const { error: rpcError } = await supabase.rpc(
          'process_lent_repayment',
          {
            p_lent_record_id: lentRecordId,
            p_destination_account_id: destinationAccountId,
            p_payment_mode: paymentMode,
          }
        );

        if (!rpcError) {
          toast.success('Full repayment processed successfully');
          await fetchLentRecords();
          return true;
        }

        // Fallback to manual sequential processing
        const record = lentRecords.find((r) => r.id === lentRecordId);
        if (!record) {
          throw new Error('Lent record not found');
        }

        const outstanding =
          record.outstanding_amount !== undefined
            ? record.outstanding_amount
            : round2(record.amount - (record.amount_repaid || 0));

        if (outstanding <= 0) {
          toast.error('Record is already fully repaid');
          return false;
        }

        const repaymentDate = format(new Date(), 'yyyy-MM-dd');

        // 1. Create repayment transaction
        const { data: txn, error: txnError } = await supabase
          .from('transactions')
          .insert({
            user_id: user.id,
            account_id: destinationAccountId,
            type: 'repayment',
            amount: outstanding,
            transaction_date: repaymentDate,
            payment_mode: paymentMode,
            description: `Repayment from ${record.borrower_name}`,
            related_lent_id: lentRecordId,
          })
          .select()
          .single();

        if (txnError) {
          throw txnError;
        }

        // 2. Create lent_repayment record
        const { error: repError } = await supabase
          .from('lent_repayments')
          .insert({
            user_id: user.id,
            lent_record_id: lentRecordId,
            account_id: destinationAccountId,
            amount: outstanding,
            repayment_date: repaymentDate,
            payment_mode: paymentMode,
            notes: 'Full settlement',
            transaction_id: txn?.id || null,
          });

        if (repError) {
          throw repError;
        }

        // 3. Update lent_record
        const { error: updateError } = await supabase
          .from('lent_records')
          .update({
            amount_repaid: record.amount,
            outstanding_amount: 0,
            status: 'repaid',
            updated_at: new Date().toISOString(),
          } as LentRecordUpdate)
          .eq('id', lentRecordId)
          .eq('user_id', user.id);

        if (updateError) {
          throw updateError;
        }

        toast.success('Full repayment processed successfully');
        await fetchLentRecords();
        return true;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to process repayment';
        toast.error(message);
        return false;
      }
    },
    [user?.id, lentRecords, fetchLentRecords]
  );

  const processPartialRepayment = useCallback(
    async (params: ProcessPartialRepaymentParams): Promise<boolean> => {
      if (!user?.id) {
        toast.error('You must be logged in to process a repayment');
        return false;
      }

      const {
        lentRecordId,
        amount,
        repaymentDate = format(new Date(), 'yyyy-MM-dd'),
        expectedRemainingDate,
        destinationAccountId,
        paymentMode = 'upi',
        notes,
      } = params;

      try {
        const record = lentRecords.find((r) => r.id === lentRecordId);
        if (!record) {
          throw new Error('Lent record not found');
        }

        const currentOutstanding =
          record.outstanding_amount !== undefined
            ? record.outstanding_amount
            : round2(record.amount - (record.amount_repaid || 0));

        if (amount <= 0) {
          toast.error('Repayment amount must be greater than zero');
          return false;
        }

        if (amount > currentOutstanding) {
          toast.error(
            `Repayment amount (₹${amount}) cannot exceed outstanding amount (₹${currentOutstanding})`
          );
          return false;
        }

        const newRepaid = round2((record.amount_repaid || 0) + amount);
        const newOutstanding = round2(currentOutstanding - amount);
        const newStatus = newOutstanding <= 0 ? 'repaid' : 'active';

        // 1. Create repayment transaction
        const { data: txn, error: txnError } = await supabase
          .from('transactions')
          .insert({
            user_id: user.id,
            account_id: destinationAccountId,
            type: 'repayment',
            amount,
            transaction_date: repaymentDate,
            payment_mode: paymentMode,
            description: `Partial repayment from ${record.borrower_name}`,
            notes,
            related_lent_id: lentRecordId,
          })
          .select()
          .single();

        if (txnError) {
          throw txnError;
        }

        // 2. Create lent_repayment record
        const { error: repError } = await supabase
          .from('lent_repayments')
          .insert({
            user_id: user.id,
            lent_record_id: lentRecordId,
            account_id: destinationAccountId,
            amount,
            repayment_date: repaymentDate,
            payment_mode: paymentMode,
            notes: notes || 'Partial repayment',
            transaction_id: txn?.id || null,
          });

        if (repError) {
          throw repError;
        }

        // 3. Update lent_record
        const updatePayload: LentRecordUpdate = {
          amount_repaid: newRepaid,
          outstanding_amount: newOutstanding,
          status: newStatus,
          updated_at: new Date().toISOString(),
        };

        if (expectedRemainingDate !== undefined) {
          updatePayload.due_date = expectedRemainingDate;
        }

        const { error: updateError } = await supabase
          .from('lent_records')
          .update(updatePayload)
          .eq('id', lentRecordId)
          .eq('user_id', user.id);

        if (updateError) {
          throw updateError;
        }

        toast.success('Repayment recorded successfully');
        await fetchLentRecords();
        return true;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Failed to record repayment';
        toast.error(message);
        return false;
      }
    },
    [user?.id, lentRecords, fetchLentRecords]
  );

  return {
    lentRecords,
    loading,
    error,
    createLentRecord,
    processFullRepayment,
    processPartialRepayment,
    refetch: fetchLentRecords,
  };
}
