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
 * Get Tailwind CSS color class for transaction types.
 */
export function getTransactionTypeColor(type: TransactionType): string {
  switch (type) {
    case 'income':
      return 'text-emerald-600 dark:text-emerald-400';
    case 'expense':
      return 'text-rose-600 dark:text-rose-400';
    case 'investment':
      return 'text-purple-600 dark:text-purple-400';
    case 'lent':
      return 'text-amber-600 dark:text-amber-400';
    case 'repayment':
      return 'text-blue-600 dark:text-blue-400';
    case 'transfer':
      return 'text-slate-600 dark:text-slate-400';
    default:
      return 'text-foreground';
  }
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
