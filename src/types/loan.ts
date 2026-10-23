import type { PaymentMode } from './database';

export type LoanType =
  | 'personal'
  | 'home'
  | 'car'
  | 'education'
  | 'gadget'
  | 'gold'
  | 'business'
  | 'other';

export type LoanStatus = 'active' | 'closed';

export interface Loan {
  id: string;
  user_id: string;
  name: string;
  loan_type: LoanType;
  principal_amount: number;
  interest_rate: number; // annual percentage rate (e.g. 10.5 for 10.5%, 0 for zero-interest EMI)
  tenure_months: number;
  start_date: string; // YYYY-MM-DD
  repayment_day: number; // 1-31 (day of the month)
  account_id: string; // linked bank account
  monthly_emi: number;
  status: LoanStatus;
  notes?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface LoanInsert {
  id?: string;
  user_id: string;
  name: string;
  loan_type?: LoanType;
  principal_amount: number;
  interest_rate: number;
  tenure_months: number;
  start_date: string;
  repayment_day: number;
  account_id: string;
  monthly_emi?: number;
  status?: LoanStatus;
  notes?: string | null;
  created_at?: string;
  updated_at?: string | null;
}

export interface LoanUpdate {
  id?: string;
  user_id?: string;
  name?: string;
  loan_type?: LoanType;
  principal_amount?: number;
  interest_rate?: number;
  tenure_months?: number;
  start_date?: string;
  repayment_day?: number;
  account_id?: string;
  monthly_emi?: number;
  status?: LoanStatus;
  notes?: string | null;
  created_at?: string;
  updated_at?: string | null;
}

export interface LoanPayment {
  id: string;
  loan_id: string;
  user_id: string;
  installment_number: number;
  scheduled_date: string;
  scheduled_amount: number;
  actual_amount_paid: number;
  payment_date: string;
  principal_paid: number;
  interest_paid: number;
  remaining_balance_after: number;
  account_id: string;
  transaction_id?: string | null;
  payment_mode: PaymentMode;
  status: 'paid';
  payment_type?: 'regular_emi' | 'extra_prepayment';
  is_extra?: boolean;
  notes?: string | null;
  created_at: string;
}

export interface LoanPaymentInsert {
  id?: string;
  loan_id: string;
  user_id: string;
  installment_number: number;
  scheduled_date: string;
  scheduled_amount: number;
  actual_amount_paid: number;
  payment_date: string;
  principal_paid: number;
  interest_paid: number;
  remaining_balance_after: number;
  account_id: string;
  transaction_id?: string | null;
  payment_mode: PaymentMode;
  status?: 'paid';
  payment_type?: 'regular_emi' | 'extra_prepayment';
  is_extra?: boolean;
  notes?: string | null;
  created_at?: string;
}

export interface EmiScheduleItem {
  id?: string;
  installment_number: number;
  dueDate: string;
  monthlyPayment: number;
  principalComponent: number;
  interestComponent: number;
  balanceAfterPayment: number;
  isPaid: boolean;
  isExtraPayment?: boolean;
  extraAmount?: number;
  paidDetails?: LoanPayment;
}

export interface PrepaymentInsight {
  extraAmount: number;
  currentRemainingTenureMonths: number;
  newRemainingTenureMonths: number;
  monthsSaved: number;
  currentRemainingInterest: number;
  newRemainingInterest: number;
  interestSaved: number;
  currentPayoffDate: string;
  newPayoffDate: string;
}

export interface LoanSummaryMetrics {
  totalLoans: number;
  activeLoans: number;
  closedLoans: number;
  totalPrincipalBorrowed: number;
  totalOutstandingBalance: number;
  totalMonthlyCommitment: number;
  totalPaidAmount: number;
  totalInterestPaid: number;
}
