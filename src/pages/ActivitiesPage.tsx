import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  X,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  HandCoins,
  LineChart,
  ArrowLeftRight,
  Wallet,
  Trash2,
  Edit2,
  RotateCcw,
} from 'lucide-react';
import { useMonth } from '@/components/layout/AppLayout';
import MonthSelector from '@/components/shared/MonthSelector';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useActivities } from '@/hooks/useActivities';
import { useTransactions, type TransactionWithDetails } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { useAccounts } from '@/hooks/useAccounts';
import { cn } from '@/lib/utils';
import {
  formatCurrency,
  formatDate,
  formatRelativeDate,
  getTransactionTypeColor,
  getTransactionTypeBadgeColor,
  getTransactionTypeLabel,
} from '@/lib/formatters';
import type { TransactionType, PaymentMode } from '@/types/database';
import { startOfMonth, endOfMonth } from 'date-fns';

const TYPE_FILTER_TABS: { label: string; value: string }[] = [
  { label: 'All', value: 'all' },
  { label: 'Income', value: 'income' },
  { label: 'Expenses', value: 'expense' },
  { label: 'Investments', value: 'investment' },
  { label: 'Lent Money', value: 'lent' },
  { label: 'Repayments', value: 'repayment' },
  { label: 'Transfers', value: 'transfer' },
];

export const ActivitiesPage: React.FC = () => {
  const { selectedMonth, setSelectedMonth } = useMonth();
  const navigate = useNavigate();

  // Filters state
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<string>('all');
  const [filterMonthOnly, setFilterMonthOnly] = useState<boolean>(true);

  // Detail & Delete Modal
  const [selectedTxn, setSelectedTxn] = useState<TransactionWithDetails | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { categories } = useCategories();
  const { accounts } = useAccounts();
  const { deleteTransaction } = useTransactions();

  // Date range for selected month if enabled
  const dateRange = useMemo(() => {
    if (!filterMonthOnly) return undefined;
    return {
      from: startOfMonth(selectedMonth),
      to: endOfMonth(selectedMonth),
    };
  }, [filterMonthOnly, selectedMonth]);

  const {
    activities,
    loading,
    totalCount,
    hasMore,
    loadMore,
    refetch,
  } = useActivities({
    type: selectedType !== 'all' ? (selectedType as TransactionType) : undefined,
    categoryId: selectedCategory !== 'all' ? selectedCategory : undefined,
    accountId: selectedAccount !== 'all' ? selectedAccount : undefined,
    paymentMode: selectedPaymentMode !== 'all' ? (selectedPaymentMode as PaymentMode) : undefined,
    dateRange,
    search: search.trim() || undefined,
  });

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteTransaction(deleteConfirmId);
      setDeleteConfirmId(null);
      setSelectedTxn(null);
      await refetch();
    } catch {
      // toast is handled in hook
    }
  };

  const clearAllFilters = () => {
    setSearch('');
    setSelectedType('all');
    setSelectedCategory('all');
    setSelectedAccount('all');
    setSelectedPaymentMode('all');
    setFilterMonthOnly(false);
  };

  const hasActiveFilters =
    search !== '' ||
    selectedType !== 'all' ||
    selectedCategory !== 'all' ||
    selectedAccount !== 'all' ||
    selectedPaymentMode !== 'all' ||
    !filterMonthOnly;

  // Group activities by date
  const groupedActivities = useMemo(() => {
    const groups: Record<string, TransactionWithDetails[]> = {};
    for (const txn of activities) {
      const dateKey = txn.transaction_date ? txn.transaction_date.slice(0, 10) : 'Unknown';
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(txn);
    }
    return groups;
  }, [activities]);

  const getActivityIcon = (type: TransactionType) => {
    switch (type) {
      case 'income':
        return <ArrowDownLeft className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
      case 'expense':
        return <ArrowUpRight className="h-4 w-4 text-rose-600 dark:text-rose-400" />;
      case 'investment':
        return <LineChart className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
      case 'lent':
        return <HandCoins className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
      case 'repayment':
        return <RotateCcw className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      case 'transfer':
        return <ArrowLeftRight className="h-4 w-4 text-slate-600 dark:text-slate-400" />;
      default:
        return <Wallet className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Activities</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Complete transaction ledger and chronological audit trail
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <MonthSelector selectedMonth={selectedMonth} onChange={setSelectedMonth} />
          <Button
            onClick={() => navigate('/transaction/new/expense')}
            className="gap-1.5 shadow-xs"
          >
            <Plus className="h-4 w-4" />
            Add Transaction
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-3 shadow-xs space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by description, person name, notes, category..."
            className="pl-9 h-10 text-xs sm:text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Type Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {TYPE_FILTER_TABS.map((tab) => {
            const isSelected = selectedType === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setSelectedType(tab.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  isSelected
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Dropdowns Row: Category, Account, Payment Mode, Month constraint */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-border/50">
          {/* Category Dropdown */}
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent className="max-h-56">
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Account Dropdown */}
          <Select value={selectedAccount} onValueChange={setSelectedAccount}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="All Accounts" />
            </SelectTrigger>
            <SelectContent className="max-h-56">
              <SelectItem value="all">All Accounts</SelectItem>
              {accounts.map((acc) => (
                <SelectItem key={acc.id} value={acc.id}>
                  {acc.name || acc.account_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Payment Mode */}
          <Select value={selectedPaymentMode} onValueChange={setSelectedPaymentMode}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="All Modes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Modes</SelectItem>
              <SelectItem value="upi">UPI</SelectItem>
              <SelectItem value="card">Card</SelectItem>
              <SelectItem value="cash">Cash</SelectItem>
            </SelectContent>
          </Select>

          {/* Month Scope Toggle */}
          <Button
            type="button"
            variant={filterMonthOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterMonthOnly(!filterMonthOnly)}
            className="h-8 text-xs font-medium"
          >
            {filterMonthOnly ? 'Month Locked' : 'All Months'}
          </Button>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
            <span>Showing filtered results ({totalCount} total)</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-6 text-xs text-primary px-2"
            >
              Reset Filters
            </Button>
          </div>
        )}
      </Card>

      {/* Activity Feed Grouped by Date */}
      {activities.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <p className="text-sm font-semibold">No activities match your filters</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Try adjusting your search query, selecting "All Months", or recording a new transaction.
          </p>
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearAllFilters} className="mt-3">
              Clear Filters
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedActivities).map(([dateStr, items]) => (
            <div key={dateStr} className="space-y-1.5">
              {/* Date Header Sticky Pill */}
              <div className="sticky top-14 z-20 bg-background/90 backdrop-blur-sm py-1">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  {formatRelativeDate(dateStr)} ({formatDate(dateStr)})
                </span>
              </div>

              {/* Transactions for this date */}
              <Card className="divide-y divide-border/60 shadow-xs">
                {items.map((txn) => {
                  const colorClass = getTransactionTypeColor(txn.type);
                  const isPositive = txn.type === 'income' || txn.type === 'repayment';

                  return (
                    <div
                      key={txn.id}
                      onClick={() => setSelectedTxn(txn)}
                      className="p-3.5 flex items-center justify-between hover:bg-muted/40 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={cn(
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors',
                            txn.type === 'income'
                              ? 'bg-[#E7F3EB] text-[#287A55] dark:bg-emerald-950/50 dark:text-emerald-400'
                              : txn.type === 'expense'
                              ? 'bg-[#F9EAEA] text-[#B94F4F] dark:bg-rose-950/50 dark:text-rose-400'
                              : txn.type === 'investment'
                              ? 'bg-[#EAF1FC] text-[#376DB5] dark:bg-blue-950/50 dark:text-blue-400'
                              : txn.type === 'lent'
                              ? 'bg-[#FBF1DB] text-[#A8751B] dark:bg-amber-950/50 dark:text-amber-400'
                              : 'bg-muted/80 text-foreground'
                          )}
                        >
                          {getActivityIcon(txn.type)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate text-foreground leading-tight">
                            {txn.description || txn.categories?.name || getTransactionTypeLabel(txn.type)}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                            {txn.categories?.name && (
                              <span className="truncate">{txn.categories.name}</span>
                            )}
                            {txn.subcategories?.name && (
                              <span>› {txn.subcategories.name}</span>
                            )}
                            <span>•</span>
                            <span className="capitalize">{txn.payment_mode || 'UPI'}</span>
                            {txn.accounts?.account_name && (
                              <>
                                <span>•</span>
                                <span className="truncate">{txn.accounts.account_name}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0 ml-3">
                        <p className={cn('text-base font-bold tracking-tight', colorClass)}>
                          {isPositive ? '+' : '-'}
                          {formatCurrency(txn.amount)}
                        </p>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] uppercase font-bold py-0.5 px-2 mt-0.5 border shadow-2xs',
                            getTransactionTypeBadgeColor(txn.type)
                          )}
                        >
                          {txn.type}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </Card>
            </div>
          ))}

          {/* Load More Button */}
          {hasMore && (
            <div className="text-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadMore}
                disabled={loading}
                className="w-full sm:w-auto"
              >
                {loading ? 'Loading...' : `Load More (${totalCount - activities.length} remaining)`}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Transaction Detail Dialog */}
      <Dialog open={Boolean(selectedTxn)} onOpenChange={(open) => !open && setSelectedTxn(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 capitalize">
              {selectedTxn && getActivityIcon(selectedTxn.type)}
              {selectedTxn && getTransactionTypeLabel(selectedTxn.type)} Details
            </DialogTitle>
            <DialogDescription>
              Recorded on {selectedTxn && formatDate(selectedTxn.transaction_date)}
            </DialogDescription>
          </DialogHeader>

          {selectedTxn && (
            <div className="space-y-3 pt-2 text-sm">
              <div className="flex justify-between items-center py-2 border-b border-border/60">
                <span className="text-muted-foreground font-medium">Amount</span>
                <div className="flex items-center gap-2">
                  <span className={cn('text-lg font-extrabold', getTransactionTypeColor(selectedTxn.type))}>
                    {selectedTxn.type === 'income' || selectedTxn.type === 'repayment' ? '+' : '-'}
                    {formatCurrency(selectedTxn.amount)}
                  </span>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] uppercase font-bold py-0.5 px-2 border',
                      getTransactionTypeBadgeColor(selectedTxn.type)
                    )}
                  >
                    {selectedTxn.type}
                  </Badge>
                </div>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/60">
                <span className="text-muted-foreground">Description</span>
                <span className="font-medium text-foreground">{selectedTxn.description || '-'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/60">
                <span className="text-muted-foreground">Category</span>
                <span className="font-medium">{selectedTxn.categories?.name || 'Uncategorized'}</span>
              </div>
              {selectedTxn.subcategories?.name && (
                <div className="flex justify-between py-1.5 border-b border-border/60">
                  <span className="text-muted-foreground">Subcategory</span>
                  <span className="font-medium">{selectedTxn.subcategories.name}</span>
                </div>
              )}
              <div className="flex justify-between py-1.5 border-b border-border/60">
                <span className="text-muted-foreground">Payment Mode</span>
                <span className="capitalize font-medium">{selectedTxn.payment_mode || 'UPI'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/60">
                <span className="text-muted-foreground">Bank Account</span>
                <span className="font-medium">{selectedTxn.accounts?.account_name || 'Cash/Default'}</span>
              </div>

              {selectedTxn.notes && (
                <div className="py-1.5">
                  <span className="text-muted-foreground block text-xs font-medium">Notes</span>
                  <p className="text-xs text-foreground bg-muted/40 p-2 rounded-md mt-1">
                    {selectedTxn.notes}
                  </p>
                </div>
              )}

              <DialogFooter className="flex flex-row gap-2 pt-4">
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setDeleteConfirmId(selectedTxn.id)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 flex-1"
                  onClick={() => {
                    const id = selectedTxn.id;
                    setSelectedTxn(null);
                    navigate(`/transaction/edit/${id}`);
                  }}
                >
                  <Edit2 className="h-4 w-4" />
                  Edit
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={Boolean(deleteConfirmId)} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this record and reverse its effect on your accounts and balances.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Yes, Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ActivitiesPage;
