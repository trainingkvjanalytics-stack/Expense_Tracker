import { format, isToday, isYesterday, parseISO, isValid } from 'date-fns';
import type {
  TransactionType,
  PaymentMode,
  AccountType,
  InvestmentType,
  InvestmentMethod,
  LentStatus,
} from '@/types/database';

/**
 * Format numeric value as Indian Rupees (INR) with Indian numbering format (e.g., ₹1,00,000.00).
 */
export function formatCurrency(
  amount: number | null | undefined,
  options: { showSign?: boolean; showDecimals?: boolean } = {}
): string {
  const { showSign = false, showDecimals = true } = options;

  if (amount === null || amount === undefined || Number.isNaN(amount)) {
    return '₹0.00';
  }

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  });

  // formatToParts allows exact, reliable control over spacing and currency symbol
  const formatted = formatter.format(absAmount).replace(/\u00A0|\u202F/g, ' ').trim();

  if (isNegative) {
    return `-${formatted}`;
  }

  if (showSign && amount > 0) {
    return `+${formatted}`;
  }

  return formatted;
}

/**
 * Helper to safely convert a string or Date object into a valid Date.
 */
function toValidDate(date: string | Date | null | undefined): Date | null {
  if (!date) return null;
  const parsed = typeof date === 'string' ? parseISO(date) : date;
  return isValid(parsed) ? parsed : null;
}

/**
 * Format date in full readable format (e.g. '19 Oct 2026').
 */
export function formatDate(
  date: string | Date | null | undefined,
  formatPattern: string = 'dd MMM yyyy'
): string {
  const validDate = toValidDate(date);
  if (!validDate) return '-';
  return format(validDate, formatPattern);
}

/**
 * Format short date (e.g. 'Oct 19').
 */
export function formatShortDate(date: string | Date | null | undefined): string {
  const validDate = toValidDate(date);
  if (!validDate) return '-';
  return format(validDate, 'MMM dd');
}

/**
 * Format date relatively: 'Today', 'Yesterday', or standard format.
 */
export function formatRelativeDate(date: string | Date | null | undefined): string {
  const validDate = toValidDate(date);
  if (!validDate) return '-';

  if (isToday(validDate)) {
    return 'Today';
  }

  if (isYesterday(validDate)) {
    return 'Yesterday';
  }

  return format(validDate, 'dd MMM yyyy');
}

/**
 * Get Tailwind CSS color class for transaction types and financial amounts.
 * Income / Positive: #287A55 (Green)
 * Expense / Negative: #B94F4F (Red)
 */
export function getTransactionTypeColor(type: TransactionType): string {
  switch (type) {
    case 'income':
      return 'text-[#287A55] dark:text-emerald-400';
    case 'expense':
      return 'text-[#B94F4F] dark:text-rose-400';
    case 'investment':
      return 'text-[#376DB5] dark:text-blue-400';
    case 'lent':
      return 'text-[#A8751B] dark:text-amber-400';
    case 'repayment':
      return 'text-[#287A55] dark:text-emerald-400';
    case 'transfer':
      return 'text-[#66758A] dark:text-slate-400';
    default:
      return 'text-foreground';
  }
}

/**
 * Get background pill & badge styling for transaction types.
 */
export function getTransactionTypeBadgeColor(type: TransactionType): string {
  switch (type) {
    case 'income':
      return 'bg-[#E7F3EB] text-[#287A55] border-[#287A55]/30 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
    case 'expense':
      return 'bg-[#F9EAEA] text-[#B94F4F] border-[#B94F4F]/30 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800';
    case 'investment':
      return 'bg-[#EAF1FC] text-[#376DB5] border-[#376DB5]/30 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800';
    case 'lent':
      return 'bg-[#FBF1DB] text-[#A8751B] border-[#A8751B]/30 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
    case 'repayment':
      return 'bg-[#E7F3EB] text-[#287A55] border-[#287A55]/30 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
    case 'transfer':
      return 'bg-[#EDF0F4] text-[#66758A] border-[#66758A]/30 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

/**
 * Get color class for balance/numeric values: green for positive, red for negative.
 */
export function getAmountColor(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) {
    return 'text-foreground';
  }
  if (amount > 0) {
    return 'text-[#287A55] dark:text-emerald-400';
  }
  if (amount < 0) {
    return 'text-[#B94F4F] dark:text-rose-400';
  }
  return 'text-foreground';
}

/**
 * Get user-friendly label for transaction types.
 */
export function getTransactionTypeLabel(type: TransactionType): string {
  switch (type) {
    case 'income':
      return 'Income';
    case 'expense':
      return 'Expense';
    case 'investment':
      return 'Investment';
    case 'lent':
      return 'Money Lent';
    case 'repayment':
      return 'Repayment';
    case 'transfer':
      return 'Transfer';
    default:
      return type;
  }
}

/**
 * Get user-friendly label for payment modes.
 */
export function getPaymentModeLabel(mode: PaymentMode): string {
  switch (mode) {
    case 'cash':
      return 'Cash';
    case 'card':
      return 'Card';
    case 'upi':
      return 'UPI';
    default:
      return mode;
  }
}

/**
 * Get user-friendly label for account types.
 */
export function getAccountTypeLabel(type: AccountType): string {
  switch (type) {
    case 'savings':
      return 'Savings Account';
    case 'current':
      return 'Current Account';
    case 'cash_wallet':
      return 'Cash Wallet';
    case 'other':
      return 'Other Account';
    default:
      return type;
  }
}

/**
 * Get user-friendly label for investment types.
 */
export function getInvestmentTypeLabel(type: InvestmentType): string {
  switch (type) {
    case 'mutual_fund':
      return 'Mutual Fund';
    case 'gold_fund':
      return 'Gold Fund';
    case 'stocks':
      return 'Stocks';
    case 'fixed_deposit':
      return 'Fixed Deposit';
    case 'other':
      return 'Other Investment';
    default:
      return type;
  }
}

/**
 * Get user-friendly label for investment methods.
 */
export function getInvestmentMethodLabel(method: InvestmentMethod): string {
  switch (method) {
    case 'sip':
      return 'SIP';
    case 'one_time':
      return 'One-time';
    default:
      return method;
  }
}

/**
 * Get Tailwind CSS badge / text color classes for lent status.
 */
export function getLentStatusColor(status: LentStatus): string {
  switch (status) {
    case 'active':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
    case 'overdue':
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800';
    case 'repaid':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}
