import { describe, it, expect } from 'vitest';
import {
  calculateMonthlyTotals,
  calculateClosingBalance,
  calculateAccountBalance,
  groupExpensesByCategory,
  getHeatmapIntensity,
} from '../calculations';
import type { Transaction, Account, Category } from '@/types/database';

describe('Financial Calculations and Accounting Rules', () => {
  const dummyAccount1: Account = {
    id: 'acc-1',
    user_id: 'user-1',
    name: 'HDFC Savings',
    type: 'savings',
    opening_balance: 50000,
    current_balance: 50000,
    currency: 'INR',
    is_active: true,
    color: null,
    icon: null,
    notes: null,
    created_at: '2026-01-01',
    updated_at: null,
  };

  const dummyAccount2: Account = {
    id: 'acc-2',
    user_id: 'user-1',
    name: 'Cash Wallet',
    type: 'cash_wallet',
    opening_balance: 5000,
    current_balance: 5000,
    currency: 'INR',
    is_active: true,
    color: null,
    icon: null,
    notes: null,
    created_at: '2026-01-01',
    updated_at: null,
  };

  const dummyCategories: Category[] = [
    { id: 'cat-1', user_id: 'user-1', name: 'Groceries', type: 'expense', color: '#3b82f6', icon: null, is_system: true, created_at: '2026-01-01', updated_at: null },
    { id: 'cat-2', user_id: 'user-1', name: 'Food & Dining', type: 'expense', color: '#ef4444', icon: null, is_system: true, created_at: '2026-01-01', updated_at: null },
    { id: 'cat-3', user_id: 'user-1', name: 'Salary', type: 'income', color: '#10b981', icon: null, is_system: true, created_at: '2026-01-01', updated_at: null },
  ];

  it('calculates monthly totals with proper separation of investments and lent money', () => {
    const transactions: Transaction[] = [
      {
        id: 't1',
        user_id: 'user-1',
        account_id: 'acc-1',
        to_account_id: null,
        category_id: 'cat-3',
        subcategory_id: null,
        type: 'income',
        amount: 80000,
        transaction_date: '2026-10-01',
        payment_mode: 'card',
        description: 'Monthly Salary',
        notes: null,
        reference_number: null,
        tags: null,
        is_recurring: false,
        recurring_frequency: null,
        created_at: '2026-10-01',
        updated_at: null,
      },
      {
        id: 't2',
        user_id: 'user-1',
        account_id: 'acc-1',
        to_account_id: null,
        category_id: 'cat-1',
        subcategory_id: null,
        type: 'expense',
        amount: 15000,
        transaction_date: '2026-10-05',
        payment_mode: 'upi',
        description: 'Supermarket Groceries',
        notes: null,
        reference_number: null,
        tags: null,
        is_recurring: false,
        recurring_frequency: null,
        created_at: '2026-10-05',
        updated_at: null,
      },
      {
        id: 't3',
        user_id: 'user-1',
        account_id: 'acc-1',
        to_account_id: null,
        category_id: null,
        subcategory_id: null,
        type: 'investment',
        amount: 10000,
        transaction_date: '2026-10-10',
        payment_mode: 'upi',
        description: 'Parag Parikh SIP',
        notes: null,
        reference_number: null,
        tags: null,
        is_recurring: false,
        recurring_frequency: null,
        created_at: '2026-10-10',
        updated_at: null,
      },
      {
        id: 't4',
        user_id: 'user-1',
        account_id: 'acc-1',
        to_account_id: null,
        category_id: null,
        subcategory_id: null,
        type: 'lent',
        amount: 5000,
        transaction_date: '2026-10-12',
        payment_mode: 'upi',
        description: 'Lent to Friend',
        notes: null,
        reference_number: null,
        tags: null,
        is_recurring: false,
        recurring_frequency: null,
        created_at: '2026-10-12',
        updated_at: null,
      },
      {
        id: 't5',
        user_id: 'user-1',
        account_id: 'acc-1',
        to_account_id: null,
        category_id: null,
        subcategory_id: null,
        type: 'repayment',
        amount: 2000,
        transaction_date: '2026-10-20',
        payment_mode: 'upi',
        description: 'Partial Repayment Received',
        notes: null,
        reference_number: null,
        tags: null,
        is_recurring: false,
        recurring_frequency: null,
        created_at: '2026-10-20',
        updated_at: null,
      },
    ];

    const totals = calculateMonthlyTotals(transactions);

    expect(totals.income).toBe(80000);
    expect(totals.expenses).toBe(15000); // Only regular consumption expense
    expect(totals.investments).toBe(10000); // Tracked separately
    expect(totals.lent).toBe(5000); // Tracked separately
    expect(totals.repayments).toBe(2000); // Tracked separately

    // Net savings = Income + Repayments - Expenses - Investments - Lent
    // 80000 + 2000 - 15000 - 10000 - 5000 = 52000
    expect(totals.netSavings).toBe(52000);
  });

  it('ensures month rollover: closing balance of Month 1 becomes opening balance of Month 2', () => {
    const openingMonth1 = 20000;
    const totalsMonth1 = {
      income: 50000,
      expenses: 25000,
      investments: 5000,
      lent: 2000,
      repayments: 1000,
      netSavings: 19000,
    };

    const closingMonth1 = calculateClosingBalance(openingMonth1, totalsMonth1);
    // 20000 + 50000 + 1000 - 25000 - 5000 - 2000 = 39000
    expect(closingMonth1).toBe(39000);

    // Opening for Month 2 is Month 1 closing balance
    const openingMonth2 = closingMonth1;
    expect(openingMonth2).toBe(39000);

    const totalsMonth2 = {
      income: 60000,
      expenses: 30000,
      investments: 10000,
      lent: 0,
      repayments: 1000, // Remaining lent from Month 1 repaid
      netSavings: 21000,
    };

    const closingMonth2 = calculateClosingBalance(openingMonth2, totalsMonth2);
    // 39000 + 60000 + 1000 - 30000 - 10000 = 60000
    expect(closingMonth2).toBe(60000);
  });

  it('correctly calculates account balances across income, expense, and transfers', () => {
    const transactions: Transaction[] = [
      {
        id: 'tx-inc',
        user_id: 'user-1',
        account_id: 'acc-1',
        to_account_id: null,
        category_id: null,
        subcategory_id: null,
        type: 'income',
        amount: 20000,
        transaction_date: '2026-10-01',
        payment_mode: 'card',
        description: 'Income',
        notes: null,
        reference_number: null,
        tags: null,
        is_recurring: false,
        recurring_frequency: null,
        created_at: '2026-10-01',
        updated_at: null,
      },
      {
        id: 'tx-exp',
        user_id: 'user-1',
        account_id: 'acc-1',
        to_account_id: null,
        category_id: null,
        subcategory_id: null,
        type: 'expense',
        amount: 5000,
        transaction_date: '2026-10-02',
        payment_mode: 'upi',
        description: 'Expense',
        notes: null,
        reference_number: null,
        tags: null,
        is_recurring: false,
        recurring_frequency: null,
        created_at: '2026-10-02',
        updated_at: null,
      },
      {
        id: 'tx-trans',
        user_id: 'user-1',
        account_id: 'acc-1',
        to_account_id: 'acc-2',
        category_id: null,
        subcategory_id: null,
        type: 'transfer',
        amount: 10000,
        transaction_date: '2026-10-03',
        payment_mode: 'upi',
        description: 'ATM Cash Withdrawal',
        notes: null,
        reference_number: null,
        tags: null,
        is_recurring: false,
        recurring_frequency: null,
        created_at: '2026-10-03',
        updated_at: null,
      },
    ];

    // Initial balances: acc-1 = 50000, acc-2 = 5000 (total = 55000)
    const acc1Balance = calculateAccountBalance(dummyAccount1, transactions);
    // 50000 + 20000 (income) - 5000 (expense) - 10000 (transfer out) = 55000
    expect(acc1Balance).toBe(55000);

    const acc2Balance = calculateAccountBalance(dummyAccount2, transactions);
    // 5000 + 10000 (transfer in) = 15000
    expect(acc2Balance).toBe(15000);

    // Combined balance = 55000 + 15000 = 70000
    // Total income = 20000, total expense = 5000 -> net change = +15000
    // 55000 original + 15000 = 70000
    expect(acc1Balance + acc2Balance).toBe(70000);
  });

  it('groups expenses by category and calculates percentages correctly excluding non-expenses', () => {
    const transactions: Transaction[] = [
      {
        id: '1',
        user_id: 'user-1',
        account_id: 'acc-1',
        to_account_id: null,
        category_id: 'cat-1',
        subcategory_id: null,
        type: 'expense',
        amount: 3000,
        transaction_date: '2026-10-01',
        payment_mode: 'card',
        description: null,
        notes: null,
        reference_number: null,
        tags: null,
        is_recurring: false,
        recurring_frequency: null,
        created_at: '2026-10-01',
        updated_at: null,
      },
      {
        id: '2',
        user_id: 'user-1',
        account_id: 'acc-1',
        to_account_id: null,
        category_id: 'cat-2',
        subcategory_id: null,
        type: 'expense',
        amount: 1000,
        transaction_date: '2026-10-02',
        payment_mode: 'upi',
        description: null,
        notes: null,
        reference_number: null,
        tags: null,
        is_recurring: false,
        recurring_frequency: null,
        created_at: '2026-10-02',
        updated_at: null,
      },
      {
        id: '3',
        user_id: 'user-1',
        account_id: 'acc-1',
        to_account_id: null,
        category_id: null,
        subcategory_id: null,
        type: 'investment',
        amount: 50000, // Should NOT be in category expense chart
        transaction_date: '2026-10-03',
        payment_mode: 'upi',
        description: null,
        notes: null,
        reference_number: null,
        tags: null,
        is_recurring: false,
        recurring_frequency: null,
        created_at: '2026-10-03',
        updated_at: null,
      },
    ];

    const grouped = groupExpensesByCategory(transactions, dummyCategories);
    expect(grouped.length).toBe(2);
    expect(grouped[0].categoryName).toBe('Groceries');
    expect(grouped[0].amount).toBe(3000);
    expect(grouped[0].percentage).toBe(75);

    expect(grouped[1].categoryName).toBe('Food & Dining');
    expect(grouped[1].amount).toBe(1000);
    expect(grouped[1].percentage).toBe(25);
  });

  it('computes heatmap intensity buckets from 0 to 4 correctly', () => {
    const max = 1000;
    expect(getHeatmapIntensity(0, max)).toBe(0);
    expect(getHeatmapIntensity(200, max)).toBe(1); // 20% <= 25% -> 1
    expect(getHeatmapIntensity(400, max)).toBe(2); // 40% <= 50% -> 2
    expect(getHeatmapIntensity(700, max)).toBe(3); // 70% <= 75% -> 3
    expect(getHeatmapIntensity(950, max)).toBe(4); // 95% > 75% -> 4
    expect(getHeatmapIntensity(1500, max)).toBe(4); // above max -> 4
  });
});
