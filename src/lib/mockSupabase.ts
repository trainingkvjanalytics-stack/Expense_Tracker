import type {
  Transaction,
  Account,
  Category,
  Subcategory,
  LentRecord,
  LentRepayment,
  Investment,
  AppSettings,
  Profile,
} from '@/types/database';

const STORAGE_KEY_PREFIX = 'mymoneytracker_demo_';

export const DEMO_USER_ID = 'demo-user-123e4567-e89b-12d3-a456-426614174000';

const DEFAULT_PROFILE: Profile = {
  id: DEMO_USER_ID,
  email: 'demo@mymoneytracker.app',
  full_name: 'Rahul Sharma',
  avatar_url: null,
  created_at: new Date('2026-01-01').toISOString(),
  updated_at: new Date('2026-01-01').toISOString(),
};

const DEFAULT_APP_SETTINGS: AppSettings = {
  id: 'settings-1',
  user_id: DEMO_USER_ID,
  currency: 'INR',
  date_format: 'dd/MM/yyyy',
  theme: 'system',
  email_notifications: false,
  budget_alerts: true,
  monthly_budget: 50000,
  initial_opening_balance: 110000,
  initial_balance_date: '2026-01-01',
  created_at: new Date('2026-01-01').toISOString(),
  updated_at: null,
};

const DEFAULT_ACCOUNTS: Account[] = [
  {
    id: 'acc-1',
    user_id: DEMO_USER_ID,
    name: 'HDFC Salary Account',
    account_name: 'HDFC Salary Account',
    type: 'savings',
    opening_balance: 75000,
    current_balance: 75000,
    currency: 'INR',
    is_active: true,
    is_archived: false,
    color: '#0284c7',
    icon: 'landmark',
    notes: 'Primary salary savings account',
    created_at: new Date('2026-01-01').toISOString(),
    updated_at: null,
  },
  {
    id: 'acc-2',
    user_id: DEMO_USER_ID,
    name: 'ICICI Emergency Fund',
    account_name: 'ICICI Emergency Fund',
    type: 'savings',
    opening_balance: 30000,
    current_balance: 30000,
    currency: 'INR',
    is_active: true,
    is_archived: false,
    color: '#059669',
    icon: 'shield',
    notes: 'Emergency reserves',
    created_at: new Date('2026-01-01').toISOString(),
    updated_at: null,
  },
  {
    id: 'acc-3',
    user_id: DEMO_USER_ID,
    name: 'Cash Wallet',
    account_name: 'Cash Wallet',
    type: 'cash_wallet',
    opening_balance: 5000,
    current_balance: 5000,
    currency: 'INR',
    is_active: true,
    is_archived: false,
    color: '#d97706',
    icon: 'wallet',
    notes: 'Physical cash at hand',
    created_at: new Date('2026-01-01').toISOString(),
    updated_at: null,
  },
];

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-inc-1', user_id: DEMO_USER_ID, name: 'Salary', type: 'income', icon: 'banknote', color: '#10b981', is_system: true, created_at: '2026-01-01', updated_at: null },
  { id: 'cat-inc-2', user_id: DEMO_USER_ID, name: 'Freelance Income', type: 'income', icon: 'laptop', color: '#06b6d4', is_system: true, created_at: '2026-01-01', updated_at: null },
  { id: 'cat-inc-3', user_id: DEMO_USER_ID, name: 'Business Income', type: 'income', icon: 'briefcase', color: '#84cc16', is_system: true, created_at: '2026-01-01', updated_at: null },
  { id: 'cat-inc-4', user_id: DEMO_USER_ID, name: 'Interest', type: 'income', icon: 'percent', color: '#f59e0b', is_system: true, created_at: '2026-01-01', updated_at: null },
  { id: 'cat-inc-5', user_id: DEMO_USER_ID, name: 'Rental Income', type: 'income', icon: 'building', color: '#f97316', is_system: true, created_at: '2026-01-01', updated_at: null },
  { id: 'cat-inc-6', user_id: DEMO_USER_ID, name: 'Refund', type: 'income', icon: 'undo', color: '#3b82f6', is_system: true, created_at: '2026-01-01', updated_at: null },
  { id: 'cat-inc-7', user_id: DEMO_USER_ID, name: 'Gift', type: 'income', icon: 'gift', color: '#ec4899', is_system: true, created_at: '2026-01-01', updated_at: null },
  { id: 'cat-inc-8', user_id: DEMO_USER_ID, name: 'Other', type: 'income', icon: 'more-horizontal', color: '#64748b', is_system: true, created_at: '2026-01-01', updated_at: null },

  { id: 'cat-exp-1', user_id: DEMO_USER_ID, name: 'Groceries', type: 'expense', icon: 'shopping-cart', color: '#3b82f6', is_system: true, created_at: '2026-01-01', updated_at: null },
  { id: 'cat-exp-2', user_id: DEMO_USER_ID, name: 'Food and Dining', type: 'expense', icon: 'utensils', color: '#ef4444', is_system: true, created_at: '2026-01-01', updated_at: null },
  { id: 'cat-exp-3', user_id: DEMO_USER_ID, name: 'Rent and Housing', type: 'expense', icon: 'home', color: '#8b5cf6', is_system: true, created_at: '2026-01-01', updated_at: null },
  { id: 'cat-exp-4', user_id: DEMO_USER_ID, name: 'Utilities', type: 'expense', icon: 'zap', color: '#f97316', is_system: true, created_at: '2026-01-01', updated_at: null },
  { id: 'cat-exp-5', user_id: DEMO_USER_ID, name: 'Transportation', type: 'expense', icon: 'bus', color: '#eab308', is_system: true, created_at: '2026-01-01', updated_at: null },
  { id: 'cat-exp-6', user_id: DEMO_USER_ID, name: 'Fuel', type: 'expense', icon: 'fuel', color: '#14b8a6', is_system: true, created_at: '2026-01-01', updated_at: null },
  { id: 'cat-exp-7', user_id: DEMO_USER_ID, name: 'Shopping', type: 'expense', icon: 'shopping-bag', color: '#ec4899', is_system: true, created_at: '2026-01-01', updated_at: null },
  { id: 'cat-exp-8', user_id: DEMO_USER_ID, name: 'Healthcare', type: 'expense', icon: 'heart-pulse', color: '#06b6d4', is_system: true, created_at: '2026-01-01', updated_at: null },
  { id: 'cat-exp-9', user_id: DEMO_USER_ID, name: 'Education', type: 'expense', icon: 'graduation-cap', color: '#6366f1', is_system: true, created_at: '2026-01-01', updated_at: null },
  { id: 'cat-exp-10', user_id: DEMO_USER_ID, name: 'Entertainment', type: 'expense', icon: 'film', color: '#f43f5e', is_system: true, created_at: '2026-01-01', updated_at: null },
  { id: 'cat-exp-11', user_id: DEMO_USER_ID, name: 'Travel', type: 'expense', icon: 'plane', color: '#0284c7', is_system: true, created_at: '2026-01-01', updated_at: null },
  { id: 'cat-exp-12', user_id: DEMO_USER_ID, name: 'Personal Care', type: 'expense', icon: 'sparkles', color: '#10b981', is_system: true, created_at: '2026-01-01', updated_at: null },
  { id: 'cat-exp-13', user_id: DEMO_USER_ID, name: 'Family', type: 'expense', icon: 'users', color: '#f97316', is_system: true, created_at: '2026-01-01', updated_at: null },
  { id: 'cat-exp-14', user_id: DEMO_USER_ID, name: 'Subscriptions', type: 'expense', icon: 'repeat', color: '#64748b', is_system: true, created_at: '2026-01-01', updated_at: null },
  { id: 'cat-exp-15', user_id: DEMO_USER_ID, name: 'Insurance', type: 'expense', icon: 'shield', color: '#78716c', is_system: true, created_at: '2026-01-01', updated_at: null },
  { id: 'cat-exp-16', user_id: DEMO_USER_ID, name: 'Other', type: 'expense', icon: 'more-horizontal', color: '#94a3b8', is_system: true, created_at: '2026-01-01', updated_at: null },
];

const DEFAULT_SUBCATEGORIES: Subcategory[] = [
  { id: 'sub-1', category_id: 'cat-exp-1', user_id: DEMO_USER_ID, name: 'Supermarket', created_at: '2026-01-01', updated_at: null },
  { id: 'sub-2', category_id: 'cat-exp-1', user_id: DEMO_USER_ID, name: 'Vegetables & Fruits', created_at: '2026-01-01', updated_at: null },
  { id: 'sub-3', category_id: 'cat-exp-2', user_id: DEMO_USER_ID, name: 'Restaurants', created_at: '2026-01-01', updated_at: null },
  { id: 'sub-4', category_id: 'cat-exp-2', user_id: DEMO_USER_ID, name: 'Coffee & Snacks', created_at: '2026-01-01', updated_at: null },
  { id: 'sub-5', category_id: 'cat-exp-4', user_id: DEMO_USER_ID, name: 'Electricity', created_at: '2026-01-01', updated_at: null },
  { id: 'sub-6', category_id: 'cat-exp-4', user_id: DEMO_USER_ID, name: 'Broadband', created_at: '2026-01-01', updated_at: null },
  { id: 'sub-7', category_id: 'cat-exp-6', user_id: DEMO_USER_ID, name: 'Petrol', created_at: '2026-01-01', updated_at: null },
  { id: 'sub-8', category_id: 'cat-inc-1', user_id: DEMO_USER_ID, name: 'Monthly Pay', created_at: '2026-01-01', updated_at: null },
];

function getISODate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().split('T')[0];
}

const DEFAULT_TRANSACTIONS: Transaction[] = [
  {
    id: 'txn-1',
    user_id: DEMO_USER_ID,
    account_id: 'acc-1',
    to_account_id: null,
    category_id: 'cat-inc-1',
    subcategory_id: 'sub-8',
    type: 'income',
    amount: 85000,
    transaction_date: getISODate(19),
    payment_mode: 'card',
    description: 'TechCorp Monthly Salary',
    notes: 'October salary credited',
    reference_number: null,
    tags: null,
    is_recurring: false,
    recurring_frequency: null,
    created_at: new Date(Date.now() - 19 * 86400000).toISOString(),
    updated_at: null,
  },
  {
    id: 'txn-2',
    user_id: DEMO_USER_ID,
    account_id: 'acc-1',
    to_account_id: null,
    category_id: 'cat-exp-3',
    subcategory_id: null,
    type: 'expense',
    amount: 22000,
    transaction_date: getISODate(18),
    payment_mode: 'upi',
    description: 'Apartment Rent',
    notes: 'Paid to landlord via UPI',
    reference_number: null,
    tags: null,
    is_recurring: false,
    recurring_frequency: null,
    created_at: new Date(Date.now() - 18 * 86400000).toISOString(),
    updated_at: null,
  },
  {
    id: 'txn-3',
    user_id: DEMO_USER_ID,
    account_id: 'acc-1',
    to_account_id: null,
    category_id: 'cat-exp-1',
    subcategory_id: 'sub-1',
    type: 'expense',
    amount: 4650,
    transaction_date: getISODate(14),
    payment_mode: 'card',
    description: 'Monthly Groceries at Nature Basket',
    notes: 'Pantry restocking',
    reference_number: null,
    tags: null,
    is_recurring: false,
    recurring_frequency: null,
    created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
    updated_at: null,
  },
  {
    id: 'txn-4',
    user_id: DEMO_USER_ID,
    account_id: 'acc-1',
    to_account_id: null,
    category_id: 'cat-exp-4',
    subcategory_id: 'sub-5',
    type: 'expense',
    amount: 2800,
    transaction_date: getISODate(12),
    payment_mode: 'upi',
    description: 'Electricity Bill',
    notes: 'BESCOM power bill',
    reference_number: null,
    tags: null,
    is_recurring: false,
    recurring_frequency: null,
    created_at: new Date(Date.now() - 12 * 86400000).toISOString(),
    updated_at: null,
  },
  {
    id: 'txn-5',
    user_id: DEMO_USER_ID,
    account_id: 'acc-1',
    to_account_id: null,
    category_id: 'cat-exp-6',
    subcategory_id: 'sub-7',
    type: 'expense',
    amount: 2500,
    transaction_date: getISODate(9),
    payment_mode: 'upi',
    description: 'Fuel Refill HPCL',
    notes: 'Car tank full',
    reference_number: null,
    tags: null,
    is_recurring: false,
    recurring_frequency: null,
    created_at: new Date(Date.now() - 9 * 86400000).toISOString(),
    updated_at: null,
  },
  {
    id: 'txn-6',
    user_id: DEMO_USER_ID,
    account_id: 'acc-1',
    to_account_id: null,
    category_id: 'cat-exp-2',
    subcategory_id: 'sub-3',
    type: 'expense',
    amount: 1850,
    transaction_date: getISODate(6),
    payment_mode: 'card',
    description: 'Weekend Dinner with Friends',
    notes: 'Italian bistro',
    reference_number: null,
    tags: null,
    is_recurring: false,
    recurring_frequency: null,
    created_at: new Date(Date.now() - 6 * 86400000).toISOString(),
    updated_at: null,
  },
  {
    id: 'txn-7',
    user_id: DEMO_USER_ID,
    account_id: 'acc-1',
    to_account_id: null,
    category_id: 'cat-inc-2',
    subcategory_id: null,
    type: 'income',
    amount: 15000,
    transaction_date: getISODate(5),
    payment_mode: 'upi',
    description: 'Freelance UI Design Project',
    notes: 'Milestone payment',
    reference_number: null,
    tags: null,
    is_recurring: false,
    recurring_frequency: null,
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    updated_at: null,
  },
  {
    id: 'txn-8',
    user_id: DEMO_USER_ID,
    account_id: 'acc-1',
    to_account_id: null,
    category_id: 'cat-exp-14',
    subcategory_id: null,
    type: 'expense',
    amount: 799,
    transaction_date: getISODate(3),
    payment_mode: 'card',
    description: 'Netflix & Spotify subscriptions',
    notes: 'Auto-debit',
    reference_number: null,
    tags: null,
    is_recurring: false,
    recurring_frequency: null,
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    updated_at: null,
  },
  {
    id: 'txn-9',
    user_id: DEMO_USER_ID,
    account_id: 'acc-3',
    to_account_id: null,
    category_id: 'cat-exp-2',
    subcategory_id: 'sub-4',
    type: 'expense',
    amount: 320,
    transaction_date: getISODate(1),
    payment_mode: 'cash',
    description: 'Morning Coffee & Croissant',
    notes: 'Bakery down the street',
    reference_number: null,
    tags: null,
    is_recurring: false,
    recurring_frequency: null,
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    updated_at: null,
  },
  {
    id: 'txn-10',
    user_id: DEMO_USER_ID,
    account_id: 'acc-1',
    to_account_id: null,
    category_id: null,
    subcategory_id: null,
    type: 'lent',
    amount: 10000,
    transaction_date: getISODate(15),
    payment_mode: 'upi',
    description: 'Lent to Amit Kumar',
    notes: 'Emergency medical advance',
    reference_number: null,
    tags: null,
    is_recurring: false,
    recurring_frequency: null,
    related_lent_id: 'lent-1',
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    updated_at: null,
  },
  {
    id: 'txn-11',
    user_id: DEMO_USER_ID,
    account_id: 'acc-1',
    to_account_id: null,
    category_id: null,
    subcategory_id: null,
    type: 'repayment',
    amount: 4000,
    transaction_date: getISODate(7),
    payment_mode: 'upi',
    description: 'Partial repayment from Amit Kumar',
    notes: 'First installment repaid',
    reference_number: null,
    tags: null,
    is_recurring: false,
    recurring_frequency: null,
    related_lent_id: 'lent-1',
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    updated_at: null,
  },
  {
    id: 'txn-12',
    user_id: DEMO_USER_ID,
    account_id: 'acc-1',
    to_account_id: null,
    category_id: null,
    subcategory_id: null,
    type: 'investment',
    amount: 7500,
    transaction_date: getISODate(10),
    payment_mode: 'upi',
    description: 'Investment: Parag Parikh Flexi Cap SIP',
    notes: 'Monthly SIP contribution',
    reference_number: null,
    tags: null,
    is_recurring: false,
    recurring_frequency: null,
    related_investment_id: 'inv-1',
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    updated_at: null,
  },
];

const DEFAULT_LENT_RECORDS: LentRecord[] = [
  {
    id: 'lent-1',
    user_id: DEMO_USER_ID,
    borrower_name: 'Amit Kumar',
    borrower_contact: '+91 98765 43210',
    amount: 10000,
    original_amount: 10000,
    amount_repaid: 4000,
    outstanding_amount: 6000,
    account_id: 'acc-1',
    payment_mode: 'upi',
    lent_date: getISODate(15),
    due_date: getISODate(-15),
    status: 'active',
    interest_rate: null,
    notes: 'Medical emergency advance for Amit',
    transaction_id: 'txn-10',
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
  {
    id: 'lent-2',
    user_id: DEMO_USER_ID,
    borrower_name: 'Priya Sharma',
    borrower_contact: '+91 91234 56789',
    amount: 5000,
    original_amount: 5000,
    amount_repaid: 0,
    outstanding_amount: 5000,
    account_id: 'acc-1',
    payment_mode: 'upi',
    lent_date: getISODate(25),
    due_date: getISODate(5), // overdue by 5 days
    status: 'overdue',
    interest_rate: null,
    notes: 'Concert ticket booking advance',
    transaction_id: null,
    created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
    updated_at: null,
  },
];

const DEFAULT_LENT_REPAYMENTS: LentRepayment[] = [
  {
    id: 'rep-1',
    user_id: DEMO_USER_ID,
    lent_record_id: 'lent-1',
    account_id: 'acc-1',
    amount: 4000,
    repayment_date: getISODate(7),
    payment_mode: 'upi',
    notes: 'Partial settlement from Amit via GPay',
    transaction_id: 'txn-11',
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
];

const DEFAULT_INVESTMENTS: Investment[] = [
  {
    id: 'inv-1',
    user_id: DEMO_USER_ID,
    account_id: 'acc-1',
    name: 'Parag Parikh Flexi Cap Fund',
    investment_type: 'mutual_fund',
    method: 'sip',
    amount: 7500,
    current_value: 32000,
    units: 412.5,
    folio_number: 'PPF-902381',
    start_date: getISODate(10),
    maturity_date: null,
    sip_day_of_month: 10,
    payment_mode: 'upi',
    is_active: true,
    notes: 'Equity mutual fund SIP on 10th of each month',
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
    updated_at: null,
  },
  {
    id: 'inv-2',
    user_id: DEMO_USER_ID,
    account_id: 'acc-1',
    name: 'Sovereign Gold Bond 2026',
    investment_type: 'gold_fund',
    method: 'one_time',
    amount: 25000,
    current_value: 27500,
    units: 5,
    folio_number: 'SGB-2026-X',
    start_date: getISODate(40),
    maturity_date: '2034-01-01',
    sip_day_of_month: null,
    payment_mode: 'card',
    is_active: true,
    notes: 'RBI gold bond investment with 2.5% semi-annual interest',
    created_at: new Date(Date.now() - 40 * 86400000).toISOString(),
    updated_at: null,
  },
];

// Helper to get or set localStorage table data
function getTableData<T>(table: string, defaults: T[]): T[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${table}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error(`Error loading table ${table} from localStorage`, err);
  }
  // Initialize with defaults
  setTableData(table, defaults);
  return defaults;
}

function setTableData<T>(table: string, data: T[]): void {
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${table}`, JSON.stringify(data));
  } catch (err) {
    console.error(`Error saving table ${table} to localStorage`, err);
  }
}

// Reset / Seed Demo Database
export function resetDemoDatabase(): void {
  setTableData('profiles', [DEFAULT_PROFILE]);
  setTableData('app_settings', [DEFAULT_APP_SETTINGS]);
  setTableData('accounts', DEFAULT_ACCOUNTS);
  setTableData('categories', DEFAULT_CATEGORIES);
  setTableData('subcategories', DEFAULT_SUBCATEGORIES);
  setTableData('transactions', DEFAULT_TRANSACTIONS);
  setTableData('lent_records', DEFAULT_LENT_RECORDS);
  setTableData('lent_repayments', DEFAULT_LENT_REPAYMENTS);
  setTableData('investments', DEFAULT_INVESTMENTS);
  localStorage.setItem(`${STORAGE_KEY_PREFIX}auth_user`, JSON.stringify(DEFAULT_PROFILE));
}

// Query builder mock implementing Supabase chaining API
class MockQueryBuilder<T extends Record<string, any>> {
  private tableName: string;
  private filters: Array<(item: T) => boolean> = [];
  private orderField: string | null = null;
  private orderAscending: boolean = true;
  private limitCount: number | null = null;
  private rangeOffset: number = 0;
  private rangeLimit: number | null = null;
  private isSingle: boolean = false;
  private isMaybeSingle: boolean = false;
  private selectCount: boolean = false;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(_columns?: string, options?: { count?: 'exact' }) {
    if (options?.count === 'exact') {
      this.selectCount = true;
    }
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push((item: any) => {
      if (value === null) return item[column] === null || item[column] === undefined;
      return String(item[column]) === String(value);
    });
    return this;
  }

  neq(column: string, value: any) {
    this.filters.push((item: any) => String(item[column]) !== String(value));
    return this;
  }

  gte(column: string, value: any) {
    this.filters.push((item: any) => {
      const v = item[column];
      return v !== null && v !== undefined && String(v) >= String(value);
    });
    return this;
  }

  lte(column: string, value: any) {
    this.filters.push((item: any) => {
      const v = item[column];
      return v !== null && v !== undefined && String(v) <= String(value);
    });
    return this;
  }

  gt(column: string, value: any) {
    this.filters.push((item: any) => {
      const v = item[column];
      return v !== null && v !== undefined && String(v) > String(value);
    });
    return this;
  }

  lt(column: string, value: any) {
    this.filters.push((item: any) => {
      const v = item[column];
      return v !== null && v !== undefined && String(v) < String(value);
    });
    return this;
  }

  or(filterStr: string) {
    // Supports or conditions like 'user_id.eq.xxx,user_id.is.null,is_system.eq.true'
    // or 'account_id.eq.xxx,to_account_id.eq.xxx'
    const parts = filterStr.split(',').map((p) => p.trim());
    this.filters.push((item: any) => {
      return parts.some((part) => {
        const tokens = part.split('.');
        const field = tokens[0];
        const op = tokens[1];
        const val = tokens.slice(2).join('.');
        if (op === 'eq') return String(item[field]) === val;
        if (op === 'neq') return String(item[field]) !== val;
        if (op === 'is' && val === 'null') return item[field] === null || item[field] === undefined;
        if (op === 'ilike') {
          const pattern = val.replace(/%/g, '').toLowerCase();
          return String(item[field] || '').toLowerCase().includes(pattern);
        }
        return false;
      });
    });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderField = column;
    this.orderAscending = options?.ascending ?? true;
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  range(from: number, to: number) {
    this.rangeOffset = from;
    this.rangeLimit = to - from + 1;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    return this;
  }

  private getData(): T[] {
    switch (this.tableName) {
      case 'profiles':
        return getTableData('profiles', [DEFAULT_PROFILE]) as unknown as T[];
      case 'app_settings':
        return getTableData('app_settings', [DEFAULT_APP_SETTINGS]) as unknown as T[];
      case 'accounts':
        return getTableData('accounts', DEFAULT_ACCOUNTS) as unknown as T[];
      case 'categories':
        return getTableData('categories', DEFAULT_CATEGORIES) as unknown as T[];
      case 'subcategories':
        return getTableData('subcategories', DEFAULT_SUBCATEGORIES) as unknown as T[];
      case 'transactions':
        return getTableData('transactions', DEFAULT_TRANSACTIONS) as unknown as T[];
      case 'lent_records':
        return getTableData('lent_records', DEFAULT_LENT_RECORDS) as unknown as T[];
      case 'lent_repayments':
        return getTableData('lent_repayments', DEFAULT_LENT_REPAYMENTS) as unknown as T[];
      case 'investments':
        return getTableData('investments', DEFAULT_INVESTMENTS) as unknown as T[];
      default:
        return getTableData(this.tableName, []) as unknown as T[];
    }
  }

  private saveData(data: T[]) {
    setTableData(this.tableName, data);
  }

  // Execute query as Promise
  async then(resolve: (value: any) => void) {
    let items = this.getData();

    // Enrich relations if transactions, investments, or lent_records
    if (this.tableName === 'transactions') {
      const categories = getTableData<Category>('categories', DEFAULT_CATEGORIES);
      const subcategories = getTableData<Subcategory>('subcategories', DEFAULT_SUBCATEGORIES);
      const accounts = getTableData<Account>('accounts', DEFAULT_ACCOUNTS);

      items = items.map((t: any) => {
        const cat = categories.find((c) => c.id === t.category_id);
        const sub = subcategories.find((s) => s.id === t.subcategory_id);
        const acc = accounts.find((a) => a.id === t.account_id);
        return {
          ...t,
          categories: cat ? { name: cat.name, color: cat.color, icon: cat.icon } : null,
          subcategories: sub ? { name: sub.name } : null,
          accounts: acc ? { id: acc.id, name: acc.name, account_name: acc.name, type: acc.type, color: acc.color, icon: acc.icon } : null,
        };
      });
    } else if (this.tableName === 'investments') {
      const accounts = getTableData<Account>('accounts', DEFAULT_ACCOUNTS);
      items = items.map((inv: any) => {
        const acc = accounts.find((a) => a.id === inv.account_id);
        return {
          ...inv,
          accounts: acc ? { id: acc.id, name: acc.name, account_name: acc.name } : null,
        };
      });
    }

    // Apply filters
    for (const filter of this.filters) {
      items = items.filter(filter);
    }

    const totalCount = items.length;

    // Apply ordering
    if (this.orderField) {
      const col = this.orderField;
      const asc = this.orderAscending;
      items.sort((a: any, b: any) => {
        const valA = a[col] ?? '';
        const valB = b[col] ?? '';
        if (valA < valB) return asc ? -1 : 1;
        if (valA > valB) return asc ? 1 : -1;
        return 0;
      });
    }

    // Apply offset / range
    if (this.rangeOffset > 0) {
      items = items.slice(this.rangeOffset);
    }
    if (this.rangeLimit !== null && this.rangeLimit > 0) {
      items = items.slice(0, this.rangeLimit);
    } else if (this.limitCount !== null && this.limitCount > 0) {
      items = items.slice(0, this.limitCount);
    }

    if (this.isSingle) {
      if (items.length === 0) {
        resolve({ data: null, error: new Error('No rows found'), count: 0 });
        return;
      }
      resolve({ data: items[0], error: null, count: 1 });
      return;
    }

    if (this.isMaybeSingle) {
      resolve({ data: items[0] ?? null, error: null, count: items.length > 0 ? 1 : 0 });
      return;
    }

    resolve({
      data: items,
      error: null,
      count: this.selectCount ? totalCount : items.length,
    });
  }

  // Mutation: insert
  insert(payload: any | any[]) {
    const isArray = Array.isArray(payload);
    const toInsert = isArray ? payload : [payload];
    const existing = this.getData();

    const createdRows: any[] = [];
    for (const item of toInsert) {
      const newRow = {
        id: item.id || `${this.tableName.slice(0, 3)}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        created_at: new Date().toISOString(),
        updated_at: null,
        ...item,
      };
      createdRows.push(newRow);
      existing.push(newRow);
    }

    this.saveData(existing);

    return {
      select: () => ({
        single: async () => ({ data: createdRows[0], error: null }),
        maybeSingle: async () => ({ data: createdRows[0] ?? null, error: null }),
        then: async (resolve: any) => resolve({ data: isArray ? createdRows : createdRows[0], error: null }),
      }),
      then: async (resolve: any) => resolve({ data: isArray ? createdRows : createdRows[0], error: null }),
    };
  }

  // Mutation: upsert
  upsert(payload: any) {
    const existing = this.getData();
    let foundIndex = -1;
    if (payload.id) {
      foundIndex = existing.findIndex((e: any) => e.id === payload.id);
    } else if (payload.user_id && this.tableName === 'app_settings') {
      foundIndex = existing.findIndex((e: any) => e.user_id === payload.user_id);
    }

    let resultRow: any;
    if (foundIndex >= 0) {
      existing[foundIndex] = {
        ...existing[foundIndex],
        ...payload,
        updated_at: new Date().toISOString(),
      };
      resultRow = existing[foundIndex];
    } else {
      resultRow = {
        id: payload.id || `${this.tableName.slice(0, 3)}-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: null,
        ...payload,
      };
      existing.push(resultRow);
    }

    this.saveData(existing);

    return {
      select: () => ({
        single: async () => ({ data: resultRow, error: null }),
        maybeSingle: async () => ({ data: resultRow, error: null }),
        then: async (resolve: any) => resolve({ data: resultRow, error: null }),
      }),
      then: async (resolve: any) => resolve({ data: resultRow, error: null }),
    };
  }

  // Mutation: update
  update(payload: any) {
    const filters = this.filters;
    const existing = this.getData();
    let updatedRows: any[] = [];

    const newRows = existing.map((item) => {
      const match = filters.every((f) => f(item));
      if (match) {
        const updated = {
          ...item,
          ...payload,
          updated_at: new Date().toISOString(),
        };
        updatedRows.push(updated);
        return updated;
      }
      return item;
    });

    this.saveData(newRows);

    return {
      eq: (col: string, val: any) => {
        this.eq(col, val);
        return this.update(payload);
      },
      select: () => ({
        single: async () => ({ data: updatedRows[0] || null, error: null }),
        maybeSingle: async () => ({ data: updatedRows[0] || null, error: null }),
        then: async (resolve: any) => resolve({ data: updatedRows, error: null }),
      }),
      then: async (resolve: any) => resolve({ data: updatedRows, error: null }),
    };
  }

  // Mutation: delete
  delete() {
    const filters = this.filters;
    const existing = this.getData();
    const remaining = existing.filter((item) => !filters.every((f) => f(item)));
    this.saveData(remaining);

    return {
      eq: (col: string, val: any) => {
        this.eq(col, val);
        return this.delete();
      },
      then: async (resolve: any) => resolve({ data: null, error: null }),
    };
  }
}

// Mock auth client
class MockAuthClient {
  private listeners: Array<(_event: string, session: any) => void> = [];

  constructor() {
    // Check if initial user is configured in localStorage
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}auth_user`);
    if (!saved) {
      resetDemoDatabase();
    }
  }

  async getSession() {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}auth_user`);
    if (raw) {
      const user = JSON.parse(raw);
      return {
        data: {
          session: {
            user: {
              id: user.id,
              email: user.email,
              user_metadata: {
                full_name: user.full_name || 'Demo User',
              },
            },
            access_token: 'demo-mock-jwt-token',
          },
        },
        error: null,
      };
    }
    return { data: { session: null }, error: null };
  }

  onAuthStateChange(callback: (_event: string, session: any) => void) {
    this.listeners.push(callback);
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            this.listeners = this.listeners.filter((l) => l !== callback);
          },
        },
      },
    };
  }

  private notify(event: string, session: any) {
    for (const listener of this.listeners) {
      listener(event, session);
    }
  }

  async signInWithPassword({ email }: { email: string; password?: string }) {
    const user: Profile = {
      id: DEMO_USER_ID,
      email: email || 'demo@mymoneytracker.app',
      full_name: 'Rahul Sharma',
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: null,
    };
    localStorage.setItem(`${STORAGE_KEY_PREFIX}auth_user`, JSON.stringify(user));
    const session = {
      user: {
        id: user.id,
        email: user.email,
        user_metadata: { full_name: user.full_name },
      },
      access_token: 'demo-mock-jwt-token',
    };
    this.notify('SIGNED_IN', session);
    return { data: { user: session.user, session }, error: null };
  }

  async signUp({ email, options }: { email: string; password?: string; options?: any }) {
    const fullName = options?.data?.full_name || 'New User';
    const newUserId = `user-${Date.now()}`;
    const user: Profile = {
      id: newUserId,
      email,
      full_name: fullName,
      avatar_url: null,
      created_at: new Date().toISOString(),
      updated_at: null,
    };
    localStorage.setItem(`${STORAGE_KEY_PREFIX}auth_user`, JSON.stringify(user));
    const session = {
      user: {
        id: user.id,
        email: user.email,
        user_metadata: { full_name: user.full_name },
      },
      access_token: 'demo-mock-jwt-token',
    };
    this.notify('SIGNED_IN', session);
    return { data: { user: session.user, session }, error: null };
  }

  async signOut() {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}auth_user`);
    this.notify('SIGNED_OUT', null);
    return { error: null };
  }

  async resetPasswordForEmail(_email: string) {
    return { error: null };
  }

  async updateUser({ password: _ }: { password?: string }) {
    return { data: { user: { id: DEMO_USER_ID } }, error: null };
  }
}

// Complete mock supabase client
export class MockSupabaseClient {
  auth = new MockAuthClient();

  from(tableName: string) {
    return new MockQueryBuilder(tableName);
  }

  async rpc(funcName: string, params: Record<string, any>) {
    if (funcName === 'process_lent_repayment') {
      const {
        p_lent_record_id,
        p_amount,
        p_repayment_date,
        p_destination_account_id,
        p_notes,
      } = params;

      const lentRecords = getTableData<LentRecord>('lent_records', DEFAULT_LENT_RECORDS);
      const record = lentRecords.find((r) => r.id === p_lent_record_id);
      if (!record) throw new Error('Record not found');

      const amount = Number(p_amount) || 0;
      const newRepaid = (record.amount_repaid || 0) + amount;
      const newOutstanding = Math.max(0, record.amount - newRepaid);
      record.amount_repaid = newRepaid;
      record.outstanding_amount = newOutstanding;
      record.status = newOutstanding <= 0 ? 'repaid' : 'active';
      setTableData('lent_records', lentRecords);

      // Add repayment
      const repayments = getTableData<LentRepayment>('lent_repayments', DEFAULT_LENT_REPAYMENTS);
      const repayment: LentRepayment = {
        id: `rep-${Date.now()}`,
        user_id: record.user_id,
        lent_record_id: record.id,
        account_id: p_destination_account_id,
        amount,
        repayment_date: p_repayment_date || new Date().toISOString().split('T')[0],
        payment_mode: 'upi',
        notes: p_notes || 'Repayment',
        transaction_id: null,
        created_at: new Date().toISOString(),
      };
      repayments.push(repayment);
      setTableData('lent_repayments', repayments);

      return { data: repayment, error: null };
    }

    return { data: null, error: null };
  }
}

export const mockSupabase = new MockSupabaseClient();
