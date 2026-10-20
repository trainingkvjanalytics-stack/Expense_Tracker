import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  endOfWeek,
  eachWeekOfInterval,
  format,
  parseISO,
  isWithinInterval,
} from 'date-fns';
import type { Transaction, Account, Category } from '@/types/database';

export interface MonthlyTotals {
  income: number;
  expenses: number;
  investments: number;
  lent: number;
  repayments: number;
  netSavings: number;
}

export interface CategoryExpense {
  categoryId: string;
  categoryName: string;
  color: string;
  icon: string | null;
  amount: number;
  percentage: number;
  count: number;
}

export interface WeeklyExpense {
  weekNumber: number;
  weekLabel: string;
  startDate: string;
  endDate: string;
  amount: number;
  count: number;
}

export interface DailyExpense {
  date: string;
  dayOfMonth: number;
  amount: number;
  transactionCount: number;
}

/**
 * Rounds a number to two decimal places safely.
 */
export function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Calculate totals for a given list of transactions (typically monthly).
 */
export function calculateMonthlyTotals(transactions: Transaction[]): MonthlyTotals {
  let income = 0;
  let expenses = 0;
  let investments = 0;
  let lent = 0;
  let repayments = 0;

  for (const t of transactions) {
    const amount = Number(t.amount) || 0;
    switch (t.type) {
      case 'income':
        income += amount;
        break;
      case 'expense':
        expenses += amount;
        break;
      case 'investment':
        investments += amount;
        break;
      case 'lent':
        lent += amount;
        break;
      case 'repayment':
        repayments += amount;
        break;
      case 'transfer':
        // Transfers are account-to-account moves, do not change total net worth
        break;
    }
  }

  income = round2(income);
  expenses = round2(expenses);
  investments = round2(investments);
  lent = round2(lent);
  repayments = round2(repayments);

  const netSavings = round2(income + repayments - expenses - investments - lent);

  return {
    income,
    expenses,
    investments,
    lent,
    repayments,
    netSavings,
  };
}

/**
 * Calculate closing balance from opening balance and monthly totals.
 */
export function calculateClosingBalance(openingBalance: number, totals: MonthlyTotals): number {
  const opening = Number(openingBalance) || 0;
  return round2(opening + totals.income + totals.repayments - totals.expenses - totals.investments - totals.lent);
}

/**
 * Calculate current balance of an account from opening balance and all associated transactions.
 */
export function calculateAccountBalance(account: Account, transactions: Transaction[]): number {
  let balance = Number(account.opening_balance) || 0;

  for (const t of transactions) {
    const amount = Number(t.amount) || 0;

    if (t.account_id === account.id) {
      if (t.type === 'income' || t.type === 'repayment') {
        balance += amount;
      } else if (
        t.type === 'expense' ||
        t.type === 'investment' ||
        t.type === 'lent' ||
        t.type === 'transfer'
      ) {
        balance -= amount;
      }
    }

    // If account is the recipient of a transfer
    if (t.to_account_id === account.id && t.type === 'transfer') {
      balance += amount;
    }
  }

  return round2(balance);
}

/**
 * Group expenses by category and compute percentage of total expense.
 */
export function groupExpensesByCategory(
  transactions: Transaction[],
  categories: Category[]
): CategoryExpense[] {
  const expenseTransactions = transactions.filter((t) => t.type === 'expense');
  const totalExpense = expenseTransactions.reduce(
    (sum, t) => sum + (Number(t.amount) || 0),
    0
  );

  const categoryMap = new Map<string, Category>();
  for (const cat of categories) {
    categoryMap.set(cat.id, cat);
  }

  const grouped = new Map<
    string,
    { categoryId: string; categoryName: string; color: string; icon: string | null; amount: number; count: number }
  >();

  for (const t of expenseTransactions) {
    const catId = t.category_id || 'uncategorized';
    const cat = t.category_id ? categoryMap.get(t.category_id) : undefined;
    const catName = cat?.name || (t.category_id ? 'Unknown Category' : 'Uncategorized');
    const catColor = cat?.color || '#94a3b8';
    const catIcon = cat?.icon || null;
    const amount = Number(t.amount) || 0;

    const existing = grouped.get(catId);
    if (existing) {
      existing.amount += amount;
      existing.count += 1;
    } else {
      grouped.set(catId, {
        categoryId: catId,
        categoryName: catName,
        color: catColor,
        icon: catIcon,
        amount,
        count: 1,
      });
    }
  }

  const result: CategoryExpense[] = [];
  for (const item of grouped.values()) {
    const roundedAmount = round2(item.amount);
    const percentage =
      totalExpense > 0 ? round2((roundedAmount / totalExpense) * 100) : 0;

    result.push({
      categoryId: item.categoryId,
      categoryName: item.categoryName,
      color: item.color,
      icon: item.icon,
      amount: roundedAmount,
      percentage,
      count: item.count,
    });
  }

  // Sort descending by amount
  return result.sort((a, b) => b.amount - a.amount);
}

/**
 * Group expenses by week for a specific year and month (1-indexed month 1-12).
 */
export function groupExpensesByWeek(
  transactions: Transaction[],
  year: number,
  month: number
): WeeklyExpense[] {
  // Normalize month to 0-indexed Date constructor
  const monthIndex = month >= 1 && month <= 12 ? month - 1 : month;
  const monthStart = startOfMonth(new Date(year, monthIndex, 1));
  const monthEnd = endOfMonth(monthStart);

  const weekStarts = eachWeekOfInterval(
    { start: monthStart, end: monthEnd },
    { weekStartsOn: 1 } // Monday
  );

  const expenseTransactions = transactions.filter((t) => t.type === 'expense');

  return weekStarts.map((wStart, idx) => {
    const wEnd = endOfWeek(wStart, { weekStartsOn: 1 });
    // Clamp to month start/end
    const actualStart = wStart < monthStart ? monthStart : wStart;
    const actualEnd = wEnd > monthEnd ? monthEnd : wEnd;

    let amount = 0;
    let count = 0;

    for (const t of expenseTransactions) {
      const date = parseISO(t.transaction_date);
      if (isWithinInterval(date, { start: actualStart, end: actualEnd })) {
        amount += Number(t.amount) || 0;
        count += 1;
      }
    }

    return {
      weekNumber: idx + 1,
      weekLabel: `Week ${idx + 1} (${format(actualStart, 'dd MMM')} - ${format(actualEnd, 'dd MMM')})`,
      startDate: format(actualStart, 'yyyy-MM-dd'),
      endDate: format(actualEnd, 'yyyy-MM-dd'),
      amount: round2(amount),
      count,
    };
  });
}

/**
 * Calculate daily expense amounts for each day in a month (1-indexed month 1-12).
 */
export function calculateDailyExpenses(
  transactions: Transaction[],
  year: number,
  month: number
): DailyExpense[] {
  const monthIndex = month >= 1 && month <= 12 ? month - 1 : month;
  const monthStart = startOfMonth(new Date(year, monthIndex, 1));
  const monthEnd = endOfMonth(monthStart);

  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const expenseTransactions = transactions.filter((t) => t.type === 'expense');

  return days.map((day) => {
    const dayStr = format(day, 'yyyy-MM-dd');
    let amount = 0;
    let transactionCount = 0;

    for (const t of expenseTransactions) {
      const tDayStr = t.transaction_date.slice(0, 10);
      if (tDayStr === dayStr) {
        amount += Number(t.amount) || 0;
        transactionCount += 1;
      }
    }

    return {
      date: dayStr,
      dayOfMonth: day.getDate(),
      amount: round2(amount),
      transactionCount,
    };
  });
}

/**
 * Compute heatmap intensity bucket (0 to 4) based on amount relative to max amount.
 */
export function getHeatmapIntensity(amount: number, maxAmount: number): 0 | 1 | 2 | 3 | 4 {
  if (amount <= 0 || maxAmount <= 0) return 0;
  const ratio = amount / maxAmount;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}
