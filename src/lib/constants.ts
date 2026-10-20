import type {
  TransactionType,
  PaymentMode,
  AccountType,
  InvestmentType,
  InvestmentMethod,
  LentStatus,
} from '@/types/database';

export const APP_NAME = 'My Money Tracker';
export const DEFAULT_CURRENCY = 'INR';
export const CURRENCY_SYMBOL = '₹';
export const ITEMS_PER_PAGE = 20;
export const RECENT_ACTIVITIES_COUNT = 10;

export const TRANSACTION_TYPE_CONFIG: Record<
  TransactionType,
  {
    label: string;
    color: string;
    bgColor: string;
    icon: string;
  }
> = {
  income: {
    label: 'Income',
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
    icon: 'TrendingUp',
  },
  expense: {
    label: 'Expense',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950/40',
    icon: 'TrendingDown',
  },
  investment: {
    label: 'Investment',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-950/40',
    icon: 'LineChart',
  },
  lent: {
    label: 'Money Lent',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-950/40',
    icon: 'HandCoins',
  },
  repayment: {
    label: 'Repayment',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/40',
    icon: 'ArrowDownToLine',
  },
  transfer: {
    label: 'Transfer',
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-50 dark:bg-gray-900/40',
    icon: 'ArrowLeftRight',
  },
};

export const PAYMENT_MODES: { value: PaymentMode; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'upi', label: 'UPI' },
];

export const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: 'savings', label: 'Savings' },
  { value: 'current', label: 'Current' },
  { value: 'cash_wallet', label: 'Cash Wallet' },
  { value: 'other', label: 'Other' },
];

export const INVESTMENT_TYPES: { value: InvestmentType; label: string }[] = [
  { value: 'mutual_fund', label: 'Mutual Fund' },
  { value: 'gold_fund', label: 'Gold Fund' },
  { value: 'stocks', label: 'Stocks' },
  { value: 'fixed_deposit', label: 'Fixed Deposit' },
  { value: 'other', label: 'Other' },
];

export const INVESTMENT_METHODS: { value: InvestmentMethod; label: string }[] = [
  { value: 'sip', label: 'SIP' },
  { value: 'one_time', label: 'One-time' },
];

export const LENT_STATUSES: { value: LentStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'repaid', label: 'Repaid' },
];

export const DATE_FORMAT_OPTIONS = [
  { value: 'dd MMM yyyy', label: '19 Oct 2026' },
  { value: 'yyyy-MM-dd', label: '2026-10-19' },
  { value: 'dd/MM/yyyy', label: '19/10/2026' },
  { value: 'MM/dd/yyyy', label: '10/19/2026' },
];
