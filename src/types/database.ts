export type TransactionType = 'income' | 'expense' | 'investment' | 'lent' | 'repayment' | 'transfer';
export type PaymentMode = 'cash' | 'card' | 'upi';
export type AccountType = 'savings' | 'current' | 'cash_wallet' | 'other';
export type LentStatus = 'active' | 'overdue' | 'repaid';
export type InvestmentMethod = 'sip' | 'one_time';
export type InvestmentType = 'mutual_fund' | 'gold_fund' | 'stocks' | 'fixed_deposit' | 'other';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface ProfileInsert {
  id: string;
  email: string;
  full_name?: string | null;
  avatar_url?: string | null;
  created_at?: string;
  updated_at?: string | null;
}

export interface ProfileUpdate {
  id?: string;
  email?: string;
  full_name?: string | null;
  avatar_url?: string | null;
  created_at?: string;
  updated_at?: string | null;
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  account_name?: string;
  bank_name?: string | null;
  type: AccountType;
  opening_balance: number;
  opening_date?: string | null;
  current_balance: number;
  currency: string;
  is_active: boolean;
  is_archived?: boolean;
  color: string | null;
  icon: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface AccountInsert {
  id?: string;
  user_id: string;
  name: string;
  account_name?: string;
  bank_name?: string | null;
  type: AccountType;
  opening_balance?: number;
  opening_date?: string | null;
  current_balance?: number;
  currency?: string;
  is_active?: boolean;
  is_archived?: boolean;
  color?: string | null;
  icon?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string | null;
}

export interface AccountUpdate {
  id?: string;
  user_id?: string;
  name?: string;
  account_name?: string;
  bank_name?: string | null;
  type?: AccountType;
  opening_balance?: number;
  opening_date?: string | null;
  current_balance?: number;
  currency?: string;
  is_active?: boolean;
  is_archived?: boolean;
  color?: string | null;
  icon?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string | null;
}

export interface Category {
  id: string;
  user_id: string | null;
  name: string;
  type: 'income' | 'expense' | 'investment';
  icon: string | null;
  color: string | null;
  is_system: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface CategoryInsert {
  id?: string;
  user_id?: string | null;
  name: string;
  type: 'income' | 'expense' | 'investment';
  icon?: string | null;
  color?: string | null;
  is_system?: boolean;
  created_at?: string;
  updated_at?: string | null;
}

export interface CategoryUpdate {
  id?: string;
  user_id?: string | null;
  name?: string;
  type?: 'income' | 'expense' | 'investment';
  icon?: string | null;
  color?: string | null;
  is_system?: boolean;
  created_at?: string;
  updated_at?: string | null;
}

export interface Subcategory {
  id: string;
  category_id: string;
  user_id: string | null;
  name: string;
  created_at: string;
  updated_at: string | null;
}

export interface SubcategoryInsert {
  id?: string;
  category_id: string;
  user_id?: string | null;
  name: string;
  created_at?: string;
  updated_at?: string | null;
}

export interface SubcategoryUpdate {
  id?: string;
  category_id?: string;
  user_id?: string | null;
  name?: string;
  created_at?: string;
  updated_at?: string | null;
}

export interface Transaction {
  id: string;
  user_id: string;
  account_id: string;
  to_account_id: string | null;
  category_id: string | null;
  subcategory_id: string | null;
  type: TransactionType;
  amount: number;
  transaction_date: string;
  payment_mode: PaymentMode;
  description: string | null;
  notes: string | null;
  reference_number: string | null;
  tags: string[] | null;
  is_recurring: boolean;
  recurring_frequency: string | null;
  related_investment_id?: string | null;
  related_lent_id?: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface TransactionInsert {
  id?: string;
  user_id: string;
  account_id: string;
  to_account_id?: string | null;
  category_id?: string | null;
  subcategory_id?: string | null;
  type: TransactionType;
  amount: number;
  transaction_date: string;
  payment_mode: PaymentMode;
  description?: string | null;
  notes?: string | null;
  reference_number?: string | null;
  tags?: string[] | null;
  is_recurring?: boolean;
  recurring_frequency?: string | null;
  related_investment_id?: string | null;
  related_lent_id?: string | null;
  created_at?: string;
  updated_at?: string | null;
}

export interface TransactionUpdate {
  id?: string;
  user_id?: string;
  account_id?: string;
  to_account_id?: string | null;
  category_id?: string | null;
  subcategory_id?: string | null;
  type?: TransactionType;
  amount?: number;
  transaction_date?: string;
  payment_mode?: PaymentMode;
  description?: string | null;
  notes?: string | null;
  reference_number?: string | null;
  tags?: string[] | null;
  is_recurring?: boolean;
  recurring_frequency?: string | null;
  related_investment_id?: string | null;
  related_lent_id?: string | null;
  created_at?: string;
  updated_at?: string | null;
}

export interface LentRecord {
  id: string;
  user_id: string;
  borrower_name: string;
  borrower_contact: string | null;
  amount: number;
  original_amount?: number;
  amount_repaid: number;
  outstanding_amount?: number;
  account_id?: string | null;
  payment_mode?: PaymentMode;
  lent_date: string;
  due_date: string | null;
  status: LentStatus;
  interest_rate: number | null;
  notes: string | null;
  transaction_id: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface LentRecordInsert {
  id?: string;
  user_id: string;
  borrower_name: string;
  borrower_contact?: string | null;
  amount: number;
  original_amount?: number;
  amount_repaid?: number;
  outstanding_amount?: number;
  account_id?: string | null;
  payment_mode?: PaymentMode;
  lent_date: string;
  due_date?: string | null;
  status?: LentStatus;
  interest_rate?: number | null;
  notes?: string | null;
  transaction_id?: string | null;
  created_at?: string;
  updated_at?: string | null;
}

export interface LentRecordUpdate {
  id?: string;
  user_id?: string;
  borrower_name?: string;
  borrower_contact?: string | null;
  amount?: number;
  original_amount?: number;
  amount_repaid?: number;
  outstanding_amount?: number;
  account_id?: string | null;
  payment_mode?: PaymentMode;
  lent_date?: string;
  due_date?: string | null;
  status?: LentStatus;
  interest_rate?: number | null;
  notes?: string | null;
  transaction_id?: string | null;
  created_at?: string;
  updated_at?: string | null;
}

export interface LentRepayment {
  id: string;
  lent_record_id: string;
  user_id: string;
  account_id: string;
  amount: number;
  repayment_date: string;
  payment_mode: PaymentMode;
  notes: string | null;
  transaction_id: string | null;
  created_at: string;
}

export interface LentRepaymentInsert {
  id?: string;
  lent_record_id: string;
  user_id: string;
  account_id: string;
  amount: number;
  repayment_date: string;
  payment_mode: PaymentMode;
  notes?: string | null;
  transaction_id?: string | null;
  created_at?: string;
}

export interface LentRepaymentUpdate {
  id?: string;
  lent_record_id?: string;
  user_id?: string;
  account_id?: string;
  amount?: number;
  repayment_date?: string;
  payment_mode?: PaymentMode;
  notes?: string | null;
  transaction_id?: string | null;
  created_at?: string;
}

export interface Investment {
  id: string;
  user_id: string;
  account_id: string | null;
  name: string;
  investment_type: InvestmentType;
  method: InvestmentMethod;
  amount: number;
  current_value: number | null;
  units: number | null;
  folio_number: string | null;
  start_date: string;
  maturity_date: string | null;
  sip_day_of_month: number | null;
  payment_mode?: PaymentMode;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface InvestmentInsert {
  id?: string;
  user_id: string;
  account_id?: string | null;
  name: string;
  investment_type: InvestmentType;
  method: InvestmentMethod;
  amount: number;
  current_value?: number | null;
  units?: number | null;
  folio_number?: string | null;
  start_date: string;
  maturity_date?: string | null;
  sip_day_of_month?: number | null;
  payment_mode?: PaymentMode;
  is_active?: boolean;
  notes?: string | null;
  created_at?: string;
  updated_at?: string | null;
}

export interface InvestmentUpdate {
  id?: string;
  user_id?: string;
  account_id?: string | null;
  name?: string;
  investment_type?: InvestmentType;
  method?: InvestmentMethod;
  amount?: number;
  current_value?: number | null;
  units?: number | null;
  folio_number?: string | null;
  start_date?: string;
  maturity_date?: string | null;
  sip_day_of_month?: number | null;
  payment_mode?: PaymentMode;
  is_active?: boolean;
  notes?: string | null;
  created_at?: string;
  updated_at?: string | null;
}

export interface AppSettings {
  id: string;
  user_id: string;
  currency: string;
  date_format: string;
  theme: string;
  email_notifications: boolean;
  budget_alerts: boolean;
  monthly_budget: number | null;
  initial_opening_balance?: number;
  initial_balance_date?: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface AppSettingsInsert {
  id?: string;
  user_id: string;
  currency?: string;
  date_format?: string;
  theme?: string;
  email_notifications?: boolean;
  budget_alerts?: boolean;
  monthly_budget?: number | null;
  initial_opening_balance?: number;
  initial_balance_date?: string | null;
  created_at?: string;
  updated_at?: string | null;
}

export interface AppSettingsUpdate {
  id?: string;
  user_id?: string;
  currency?: string;
  date_format?: string;
  theme?: string;
  email_notifications?: boolean;
  budget_alerts?: boolean;
  monthly_budget?: number | null;
  initial_opening_balance?: number;
  initial_balance_date?: string | null;
  created_at?: string;
  updated_at?: string | null;
}

export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: ProfileInsert; Update: ProfileUpdate; Relationships: [] };
      accounts: { Row: Account; Insert: AccountInsert; Update: AccountUpdate; Relationships: [] };
      categories: { Row: Category; Insert: CategoryInsert; Update: CategoryUpdate; Relationships: [] };
      subcategories: { Row: Subcategory; Insert: SubcategoryInsert; Update: SubcategoryUpdate; Relationships: [] };
      transactions: { Row: Transaction; Insert: TransactionInsert; Update: TransactionUpdate; Relationships: [] };
      lent_records: { Row: LentRecord; Insert: LentRecordInsert; Update: LentRecordUpdate; Relationships: [] };
      lent_repayments: { Row: LentRepayment; Insert: LentRepaymentInsert; Update: LentRepaymentUpdate; Relationships: [] };
      investments: { Row: Investment; Insert: InvestmentInsert; Update: InvestmentUpdate; Relationships: [] };
      app_settings: { Row: AppSettings; Insert: AppSettingsInsert; Update: AppSettingsUpdate; Relationships: [] };
    };
    Views: Record<string, never>;
    Functions: {
      process_lent_repayment: {
        Args: {
          p_lent_record_id: string;
          p_destination_account_id: string;
          p_payment_mode: PaymentMode | string;
        };
        Returns: unknown;
      };
      get_monthly_summary: {
        Args: {
          p_user_id: string;
          p_year: number;
          p_month: number;
        };
        Returns: unknown;
      };
      [key: string]: {
        Args: Record<string, unknown>;
        Returns: unknown;
      };
    };
    Enums: {
      transaction_type: TransactionType;
      payment_mode: PaymentMode;
      account_type: AccountType;
      lent_status: LentStatus;
      investment_method: InvestmentMethod;
      investment_type: InvestmentType;
    };
  };
};
