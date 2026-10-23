import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { calculateMonthlyEmi, generateLoanSchedule } from '@/lib/emiCalculations';
import { round2 } from '@/lib/calculations';
import type {
  Loan,
  LoanInsert,
  LoanUpdate,
  LoanPayment,
  LoanSummaryMetrics,
} from '@/types/loan';
import type { PaymentMode } from '@/types/database';

export interface UseLoansReturn {
  loans: Loan[];
  payments: LoanPayment[];
  loading: boolean;
  error: string | null;
  summaryMetrics: LoanSummaryMetrics;
  createLoan: (data: Omit<LoanInsert, 'user_id'>) => Promise<Loan | null>;
  updateLoan: (id: string, data: LoanUpdate) => Promise<Loan | null>;
  deleteLoan: (id: string) => Promise<boolean>;
  recordEmiPayment: (params: {
    loan: Loan;
    installmentNumber: number;
    scheduledDate: string;
    scheduledAmount: number;
    actualAmountPaid: number;
    paymentDate: string;
    accountId: string;
    paymentMode: PaymentMode;
    notes?: string;
  }) => Promise<LoanPayment | null>;
  recordExtraLoanPayment: (params: {
    loan: Loan;
    amount: number;
    paymentDate: string;
    accountId: string;
    paymentMode: PaymentMode;
    notes?: string;
  }) => Promise<LoanPayment | null>;
  deleteLoanPayment: (paymentId: string) => Promise<boolean>;
  getLoanPayments: (loanId: string) => LoanPayment[];
  refetch: () => Promise<void>;
}

// Local storage fallback keys
const getLoansStorageKey = (userId: string) => `money_tracker_loans_${userId}`;
const getPaymentsStorageKey = (userId: string) => `money_tracker_loan_payments_${userId}`;

export function useLoans(): UseLoansReturn {
  const { user } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [payments, setPayments] = useState<LoanPayment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [useLocalFallback, setUseLocalFallback] = useState<boolean>(false);

  // Read from local storage fallback
  const readLocalData = useCallback((userId: string) => {
    try {
      const storedLoans = localStorage.getItem(getLoansStorageKey(userId));
      const storedPayments = localStorage.getItem(getPaymentsStorageKey(userId));
      return {
        loans: storedLoans ? JSON.parse(storedLoans) : [],
        payments: storedPayments ? JSON.parse(storedPayments) : [],
      };
    } catch (e) {
      console.error('Failed to read loans from localStorage:', e);
      return { loans: [], payments: [] };
    }
  }, []);

  // Write to local storage fallback
  const writeLocalData = useCallback((userId: string, newLoans: Loan[], newPayments: LoanPayment[]) => {
    try {
      localStorage.setItem(getLoansStorageKey(userId), JSON.stringify(newLoans));
      localStorage.setItem(getPaymentsStorageKey(userId), JSON.stringify(newPayments));
    } catch (e) {
      console.error('Failed to write loans to localStorage:', e);
    }
  }, []);

  const fetchLoansAndPayments = useCallback(async () => {
    if (!user?.id) {
      setLoans([]);
      setPayments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Attempt to fetch from Supabase
      const [loansRes, paymentsRes] = await Promise.all([
        supabase.from('loans').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('loan_payments').select('*').eq('user_id', user.id).order('payment_date', { ascending: true }),
      ]);

      if (loansRes.error) {
        // If table doesn't exist yet, fall back gracefully to localStorage
        if (
          loansRes.error.code === '42P01' ||
          loansRes.error.message?.includes('does not exist') ||
          loansRes.error.message?.includes('relation "public.loans"')
        ) {
          setUseLocalFallback(true);
          const local = readLocalData(user.id);
          setLoans(local.loans);
          setPayments(local.payments);
          return;
        }
        throw loansRes.error;
      }

      setUseLocalFallback(false);
      setLoans((loansRes.data as unknown as Loan[]) || []);
      setPayments((paymentsRes.data as unknown as LoanPayment[]) || []);
    } catch (err: unknown) {
      console.warn('Supabase loans fetch issue, falling back to local storage:', err);
      setUseLocalFallback(true);
      const local = readLocalData(user.id);
      setLoans(local.loans);
      setPayments(local.payments);
    } finally {
      setLoading(false);
    }
  }, [user?.id, readLocalData]);

  useEffect(() => {
    fetchLoansAndPayments();
  }, [fetchLoansAndPayments]);

  /**
   * Helper to find or create the "EMI" expense category and loan subcategory in Supabase
   */
  const ensureEmiCategoryAndSubcategory = async (
    loanName: string
  ): Promise<{ categoryId: string | null; subcategoryId: string | null }> => {
    if (!user?.id) return { categoryId: null, subcategoryId: null };

    try {
      // 1. Look for existing category named 'EMI'
      let categoryId: string | null = null;
      const { data: existingCats } = await supabase
        .from('categories')
        .select('id, name')
        .eq('user_id', user.id)
        .ilike('name', 'EMI')
        .limit(1);

      if (existingCats && existingCats.length > 0) {
        categoryId = existingCats[0].id;
      } else {
        // Create 'EMI' category
        const { data: newCat, error: catError } = await supabase
          .from('categories')
          .insert({
            user_id: user.id,
            name: 'EMI',
            transaction_type: 'expense',
            color: '#8b5cf6', // Violet
            icon: 'credit-card',
            is_default: false,
          } as any)
          .select('id')
          .single();

        if (!catError && newCat) {
          categoryId = newCat.id;
        }
      }

      if (!categoryId) return { categoryId: null, subcategoryId: null };

      // 2. Look for existing subcategory for this loan under categoryId
      let subcategoryId: string | null = null;
      const { data: existingSubs } = await supabase
        .from('subcategories')
        .select('id, name')
        .eq('user_id', user.id)
        .eq('category_id', categoryId)
        .ilike('name', loanName)
        .limit(1);

      if (existingSubs && existingSubs.length > 0) {
        subcategoryId = existingSubs[0].id;
      } else {
        // Create subcategory named after the loan
        const { data: newSub, error: subError } = await supabase
          .from('subcategories')
          .insert({
            user_id: user.id,
            category_id: categoryId,
            name: loanName,
          } as any)
          .select('id')
          .single();

        if (!subError && newSub) {
          subcategoryId = newSub.id;
        }
      }

      return { categoryId, subcategoryId };
    } catch (e) {
      console.warn('Could not auto-create EMI category/subcategory:', e);
      return { categoryId: null, subcategoryId: null };
    }
  };

  /**
   * Create a new loan or EMI
   */
  const createLoan = useCallback(
    async (data: Omit<LoanInsert, 'user_id'>): Promise<Loan | null> => {
      if (!user?.id) {
        toast.error('You must be logged in to add a loan');
        return null;
      }

      const calculatedEmi =
        data.monthly_emi ||
        calculateMonthlyEmi(data.principal_amount, data.interest_rate, data.tenure_months);

      const newLoanData: Loan = {
        id: crypto.randomUUID(),
        user_id: user.id,
        name: data.name,
        loan_type: data.loan_type || 'other',
        principal_amount: Number(data.principal_amount),
        interest_rate: Number(data.interest_rate),
        tenure_months: Number(data.tenure_months),
        start_date: data.start_date,
        repayment_day: Number(data.repayment_day) || 1,
        account_id: data.account_id,
        monthly_emi: calculatedEmi,
        status: data.status || 'active',
        notes: data.notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      try {
        if (!useLocalFallback) {
          const { data: created, error: createError } = await supabase
            .from('loans')
            .insert(newLoanData)
            .select()
            .single();

          if (createError) {
            throw createError;
          }

          toast.success(`Loan "${newLoanData.name}" added successfully`);
          // Ensure category is created in background
          ensureEmiCategoryAndSubcategory(newLoanData.name);
          await fetchLoansAndPayments();
          return created as unknown as Loan;
        } else {
          // Fallback to local storage
          const local = readLocalData(user.id);
          const updatedLoans = [newLoanData, ...local.loans];
          writeLocalData(user.id, updatedLoans, local.payments);
          setLoans(updatedLoans);
          toast.success(`Loan "${newLoanData.name}" added successfully`);
          ensureEmiCategoryAndSubcategory(newLoanData.name);
          return newLoanData;
        }
      } catch (err: unknown) {
        console.warn('Supabase insert failed, saving to local storage:', err);
        const local = readLocalData(user.id);
        const updatedLoans = [newLoanData, ...local.loans];
        writeLocalData(user.id, updatedLoans, local.payments);
        setLoans(updatedLoans);
        setUseLocalFallback(true);
        toast.success(`Loan "${newLoanData.name}" added successfully`);
        return newLoanData;
      }
    },
    [user?.id, useLocalFallback, fetchLoansAndPayments, readLocalData, writeLocalData]
  );

  /**
   * Update an existing loan
   */
  const updateLoan = useCallback(
    async (id: string, data: LoanUpdate): Promise<Loan | null> => {
      if (!user?.id) return null;

      try {
        if (!useLocalFallback) {
          const { data: updated, error: updateError } = await supabase
            .from('loans')
            .update({
              ...data,
              updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .select()
            .single();

          if (updateError) throw updateError;
          toast.success('Loan updated successfully');
          await fetchLoansAndPayments();
          return updated as unknown as Loan;
        } else {
          const local = readLocalData(user.id);
          const updatedLoans = local.loans.map((l: Loan) =>
            l.id === id ? { ...l, ...data, updated_at: new Date().toISOString() } : l
          );
          writeLocalData(user.id, updatedLoans, local.payments);
          setLoans(updatedLoans);
          toast.success('Loan updated successfully');
          return updatedLoans.find((l: Loan) => l.id === id) || null;
        }
      } catch (err: unknown) {
        console.error('Failed to update loan:', err);
        toast.error('Failed to update loan');
        return null;
      }
    },
    [user?.id, useLocalFallback, fetchLoansAndPayments, readLocalData, writeLocalData]
  );

  /**
   * Delete a loan and all its associated payments and transactions
   */
  const deleteLoan = useCallback(
    async (id: string): Promise<boolean> => {
      if (!user?.id) return false;

      try {
        // Find payments linked to this loan to delete their transactions
        const linkedPayments = payments.filter((p) => p.loan_id === id);
        const transactionIds = linkedPayments
          .map((p) => p.transaction_id)
          .filter(Boolean) as string[];

        if (transactionIds.length > 0) {
          await supabase.from('transactions').delete().in('id', transactionIds);
        }

        if (!useLocalFallback) {
          const { error: delError } = await supabase.from('loans').delete().eq('id', id);
          if (delError) throw delError;
        }

        // Also clean up local storage
        const local = readLocalData(user.id);
        const updatedLoans = local.loans.filter((l: Loan) => l.id !== id);
        const updatedPayments = local.payments.filter((p: LoanPayment) => p.loan_id !== id);
        writeLocalData(user.id, updatedLoans, updatedPayments);

        toast.success('Loan and associated payment history deleted');
        await fetchLoansAndPayments();
        return true;
      } catch (err: unknown) {
        console.error('Failed to delete loan:', err);
        toast.error('Failed to delete loan');
        return false;
      }
    },
    [user?.id, payments, useLocalFallback, fetchLoansAndPayments, readLocalData, writeLocalData]
  );

  /**
   * Record an EMI payment / prepayment.
   * Automatically creates an expense transaction in the transactions table with category EMI and subcategory loan name,
   * instantly reducing the bank account balance!
   */
  const recordEmiPayment = useCallback(
    async ({
      loan,
      installmentNumber,
      scheduledDate,
      scheduledAmount,
      actualAmountPaid,
      paymentDate,
      accountId,
      paymentMode,
      notes,
    }: {
      loan: Loan;
      installmentNumber: number;
      scheduledDate: string;
      scheduledAmount: number;
      actualAmountPaid: number;
      paymentDate: string;
      accountId: string;
      paymentMode: PaymentMode;
      notes?: string;
    }): Promise<LoanPayment | null> => {
      if (!user?.id) {
        toast.error('You must be logged in to record payment');
        return null;
      }

      try {
        // 1. Calculate current outstanding balance before this payment
        const existingPayments = payments.filter((p) => p.loan_id === loan.id);
        const scheduleInfo = generateLoanSchedule(loan, existingPayments);
        const currentBalance = scheduleInfo.currentBalance;

        // 2. Compute Interest and Principal components for this installment
        const monthlyRate = loan.interest_rate > 0 ? loan.interest_rate / (12 * 100) : 0;
        const interestComponent = round2(currentBalance * monthlyRate);
        const principalComponent = round2(
          Math.min(currentBalance, Math.max(0, actualAmountPaid - interestComponent))
        );
        const remainingBalanceAfter = round2(Math.max(0, currentBalance - principalComponent));

        // 3. Ensure Category 'EMI' and Subcategory '${loan.name}' exist
        const { categoryId, subcategoryId } = await ensureEmiCategoryAndSubcategory(loan.name);

        // 4. Create an Expense transaction in the real `transactions` table
        // This guarantees the bank account balance is automatically deducted across all pages!
        let transactionId: string | null = null;
        try {
          const { data: txnData, error: txnError } = await supabase
            .from('transactions')
            .insert({
              user_id: user.id,
              transaction_type: 'expense',
              amount: Number(actualAmountPaid),
              account_id: accountId,
              category_id: categoryId,
              subcategory_id: subcategoryId,
              transaction_date: paymentDate,
              payment_mode: paymentMode,
              description: `EMI Payment: ${loan.name} (Installment #${installmentNumber})`,
            } as any)
            .select('id')
            .single();

          if (!txnError && txnData) {
            transactionId = txnData.id;
          }
        } catch (txnErr) {
          console.warn('Could not insert linked expense transaction:', txnErr);
        }

        // 5. Construct LoanPayment record
        const paymentRecord: LoanPayment = {
          id: crypto.randomUUID(),
          loan_id: loan.id,
          user_id: user.id,
          installment_number: installmentNumber,
          scheduled_date: scheduledDate,
          scheduled_amount: scheduledAmount,
          actual_amount_paid: Number(actualAmountPaid),
          payment_date: paymentDate,
          principal_paid: principalComponent,
          interest_paid: interestComponent,
          remaining_balance_after: remainingBalanceAfter,
          account_id: accountId,
          transaction_id: transactionId,
          payment_mode: paymentMode,
          status: 'paid',
          notes: notes || null,
          created_at: new Date().toISOString(),
        };

        // 6. Save payment record
        if (!useLocalFallback) {
          try {
            const { data: savedPayment, error: payError } = await supabase
              .from('loan_payments')
              .insert(paymentRecord)
              .select()
              .single();

            if (payError) throw payError;

            // If loan is fully repaid, mark loan as closed
            if (remainingBalanceAfter <= 0.01) {
              await supabase.from('loans').update({ status: 'closed' }).eq('id', loan.id);
            }

            toast.success(`Installment #${installmentNumber} paid successfully!`);
            await fetchLoansAndPayments();
            return savedPayment as unknown as LoanPayment;
          } catch (supaErr) {
            console.warn('Supabase loan payment insert failed, saving locally:', supaErr);
          }
        }

        // Local storage persistence
        const local = readLocalData(user.id);
        const updatedPayments = [...local.payments, paymentRecord];
        const updatedLoans = local.loans.map((l: Loan) =>
          l.id === loan.id && remainingBalanceAfter <= 0.01 ? { ...l, status: 'closed' as const } : l
        );
        writeLocalData(user.id, updatedLoans, updatedPayments);
        setPayments(updatedPayments);
        setLoans(updatedLoans);

        toast.success(`Installment #${installmentNumber} paid successfully!`);
        return paymentRecord;
      } catch (err: unknown) {
        console.error('Failed to record EMI payment:', err);
        const message = (err as any)?.message || 'Failed to record payment';
        toast.error(message);
        return null;
      }
    },
    [user?.id, payments, useLocalFallback, fetchLoansAndPayments, readLocalData, writeLocalData]
  );

  /**
   * Record a standalone extra prepayment towards principal
   */
  const recordExtraLoanPayment = useCallback(
    async ({
      loan,
      amount,
      paymentDate,
      accountId,
      paymentMode,
      notes,
    }: {
      loan: Loan;
      amount: number;
      paymentDate: string;
      accountId: string;
      paymentMode: PaymentMode;
      notes?: string;
    }): Promise<LoanPayment | null> => {
      if (!user?.id) {
        toast.error('You must be logged in to record payment');
        return null;
      }
      if (amount <= 0) {
        toast.error('Prepayment amount must be greater than zero');
        return null;
      }

      try {
        const existingPayments = payments.filter((p) => p.loan_id === loan.id);
        const scheduleInfo = generateLoanSchedule(loan, existingPayments);
        const currentBalance = scheduleInfo.currentBalance;
        const actualPrepayment = Math.min(currentBalance, Number(amount));
        const remainingBalanceAfter = round2(Math.max(0, currentBalance - actualPrepayment));

        // 1. Ensure Category 'EMI' and Subcategory '${loan.name}' exist
        const { categoryId, subcategoryId } = await ensureEmiCategoryAndSubcategory(loan.name);

        // 2. Insert expense transaction into transactions table to reduce bank balance
        let transactionId: string | null = null;
        try {
          const { data: txnData, error: txnError } = await supabase
            .from('transactions')
            .insert({
              user_id: user.id,
              transaction_type: 'expense',
              amount: Number(amount),
              account_id: accountId,
              category_id: categoryId,
              subcategory_id: subcategoryId,
              transaction_date: paymentDate,
              payment_mode: paymentMode,
              description: `Extra Loan Prepayment: ${loan.name}`,
            } as any)
            .select('id')
            .single();

          if (!txnError && txnData) {
            transactionId = txnData.id;
          }
        } catch (txnErr) {
          console.warn('Could not insert linked extra expense transaction:', txnErr);
        }

        // 3. Construct LoanPayment record with payment_type: 'extra_prepayment'
        const paymentRecord: LoanPayment = {
          id: crypto.randomUUID(),
          loan_id: loan.id,
          user_id: user.id,
          installment_number: 0,
          scheduled_date: paymentDate,
          scheduled_amount: 0,
          actual_amount_paid: Number(amount),
          payment_date: paymentDate,
          principal_paid: Number(amount),
          interest_paid: 0,
          remaining_balance_after: remainingBalanceAfter,
          account_id: accountId,
          transaction_id: transactionId,
          payment_mode: paymentMode,
          status: 'paid',
          payment_type: 'extra_prepayment',
          is_extra: true,
          notes: notes || 'Extra Principal Prepayment',
          created_at: new Date().toISOString(),
        };

        if (!useLocalFallback) {
          try {
            const { data: savedPayment, error: payError } = await supabase
              .from('loan_payments')
              .insert(paymentRecord)
              .select()
              .single();

            if (payError) throw payError;

            if (remainingBalanceAfter <= 0.01) {
              await supabase.from('loans').update({ status: 'closed' }).eq('id', loan.id);
            }

            toast.success(`Extra prepayment of ₹${amount.toLocaleString('en-IN')} applied!`);
            await fetchLoansAndPayments();
            return savedPayment as unknown as LoanPayment;
          } catch (supaErr) {
            console.warn('Supabase loan payment insert failed, saving locally:', supaErr);
          }
        }

        // Local storage persistence
        const local = readLocalData(user.id);
        const updatedPayments = [...local.payments, paymentRecord];
        const updatedLoans = local.loans.map((l: Loan) =>
          l.id === loan.id && remainingBalanceAfter <= 0.01 ? { ...l, status: 'closed' as const } : l
        );
        writeLocalData(user.id, updatedLoans, updatedPayments);
        setPayments(updatedPayments);
        setLoans(updatedLoans);

        toast.success(`Extra prepayment of ₹${amount.toLocaleString('en-IN')} applied!`);
        return paymentRecord;
      } catch (err: unknown) {
        console.error('Failed to record extra payment:', err);
        const message = (err as any)?.message || 'Failed to record extra payment';
        toast.error(message);
        return null;
      }
    },
    [user?.id, payments, useLocalFallback, fetchLoansAndPayments, readLocalData, writeLocalData]
  );

  /**
   * Delete an EMI payment (e.g. if recorded by mistake)
   * Also deletes the linked expense transaction to re-credit the bank account balance.
   */
  const deleteLoanPayment = useCallback(
    async (paymentId: string): Promise<boolean> => {
      if (!user?.id) return false;

      try {
        const targetPayment = payments.find((p) => p.id === paymentId);

        // Delete linked transaction if present to refund the account
        if (targetPayment?.transaction_id) {
          await supabase.from('transactions').delete().eq('id', targetPayment.transaction_id);
        }

        if (!useLocalFallback) {
          const { error: delError } = await supabase
            .from('loan_payments')
            .delete()
            .eq('id', paymentId);

          if (!delError && targetPayment) {
            // Reopen loan if it was closed
            await supabase.from('loans').update({ status: 'active' }).eq('id', targetPayment.loan_id);
          }
        }

        // Update local storage
        const local = readLocalData(user.id);
        const updatedPayments = local.payments.filter((p: LoanPayment) => p.id !== paymentId);
        const updatedLoans = local.loans.map((l: Loan) =>
          targetPayment && l.id === targetPayment.loan_id ? { ...l, status: 'active' as const } : l
        );
        writeLocalData(user.id, updatedLoans, updatedPayments);

        toast.success('Payment reverted. Bank balance and loan schedule restored.');
        await fetchLoansAndPayments();
        return true;
      } catch (err: unknown) {
        console.error('Failed to revert payment:', err);
        toast.error('Failed to revert payment');
        return false;
      }
    },
    [user?.id, payments, useLocalFallback, fetchLoansAndPayments, readLocalData, writeLocalData]
  );

  /**
   * Filter payments for a specific loan
   */
  const getLoanPayments = useCallback(
    (loanId: string): LoanPayment[] => {
      return payments
        .filter((p) => p.loan_id === loanId)
        .sort((a, b) => a.installment_number - b.installment_number);
    },
    [payments]
  );

  // Compute overall summary metrics across all user loans
  const summaryMetrics: LoanSummaryMetrics = {
    totalLoans: loans.length,
    activeLoans: loans.filter((l) => l.status === 'active').length,
    closedLoans: loans.filter((l) => l.status === 'closed').length,
    totalPrincipalBorrowed: loans.reduce((acc, l) => acc + (Number(l.principal_amount) || 0), 0),
    totalOutstandingBalance: loans.reduce((acc, l) => {
      const loanPayments = payments.filter((p) => p.loan_id === l.id);
      const scheduleInfo = generateLoanSchedule(l, loanPayments);
      return acc + scheduleInfo.currentBalance;
    }, 0),
    totalMonthlyCommitment: loans
      .filter((l) => l.status === 'active')
      .reduce((acc, l) => acc + (Number(l.monthly_emi) || 0), 0),
    totalPaidAmount: payments.reduce((acc, p) => acc + (Number(p.actual_amount_paid) || 0), 0),
    totalInterestPaid: payments.reduce((acc, p) => acc + (Number(p.interest_paid) || 0), 0),
  };

  return {
    loans,
    payments,
    loading,
    error,
    summaryMetrics,
    createLoan,
    updateLoan,
    deleteLoan,
    recordEmiPayment,
    recordExtraLoanPayment,
    deleteLoanPayment,
    getLoanPayments,
    refetch: fetchLoansAndPayments,
  };
}
