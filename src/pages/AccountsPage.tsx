import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import {
  Landmark,
  Plus,
  ArrowLeftRight,
  Wallet,
  CreditCard,
  Edit2,
  Archive,
  Loader2,
  DollarSign,
  ShieldCheck,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { useAccounts } from '@/hooks/useAccounts';
import { useTransactions } from '@/hooks/useTransactions';
import { formatCurrency, formatDate, getAccountTypeLabel } from '@/lib/formatters';
import type { Account, AccountType } from '@/types/database';
import { toast } from 'sonner';

// Schema for Add/Edit Account
const accountSchema = z.object({
  name: z.string().min(1, 'Account name is required'),
  bank_name: z.string().optional().nullable(),
  type: z.enum(['savings', 'current', 'cash_wallet', 'other']),
  opening_balance: z.coerce.number().min(0, 'Initial balance is required'),
  opening_date: z.string().min(1, 'Opening date is required'),
  notes: z.string().optional().nullable(),
});

type AccountFormValues = z.infer<typeof accountSchema>;

// Schema for Transfer between Accounts
const transferSchema = z.object({
  from_account_id: z.string().min(1, 'Select source account'),
  to_account_id: z.string().min(1, 'Select recipient account'),
  amount: z
    .coerce.number()
    .positive('Amount must be greater than zero'),
  date: z.string().min(1, 'Date is required'),
  notes: z.string().optional().nullable(),
});

type TransferFormValues = z.infer<typeof transferSchema>;

export const AccountsPage: React.FC = () => {
  const [includeArchived, setIncludeArchived] = useState(false);

  const {
    accounts,
    loading,
    createAccount,
    updateAccount,
    archiveAccount,
  } = useAccounts({ includeArchived });

  const { createTransaction } = useTransactions();

  // Modals state
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [archiveTargetId, setArchiveTargetId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form for account Add/Edit
  const {
    register: registerAccount,
    handleSubmit: handleSubmitAccount,
    control: controlAccount,
    reset: resetAccount,
    formState: { errors: errorsAccount },
  } = useForm<AccountFormValues>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: '',
      bank_name: '',
      type: 'savings',
      opening_balance: 0,
      opening_date: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
    },
  });

  // Form for Transfer
  const {
    register: registerTransfer,
    handleSubmit: handleSubmitTransfer,
    control: controlTransfer,
    reset: resetTransfer,
    watch: watchTransfer,
    formState: { errors: errorsTransfer },
  } = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      from_account_id: accounts[0]?.id || '',
      to_account_id: accounts[1]?.id || '',
      amount: undefined,
      date: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
    },
  });

  const selectedFromAccId = watchTransfer('from_account_id');

  // Total balance across all active accounts
  const totalBalance = React.useMemo(() => {
    return accounts
      .filter((a) => !a.is_archived)
      .reduce((sum, a) => sum + (Number(a.current_balance) || 0), 0);
  }, [accounts]);

  const activeAccounts = accounts.filter((a) => !a.is_archived);
  const archivedAccounts = accounts.filter((a) => a.is_archived);

  const openAddModal = () => {
    setEditingAccount(null);
    resetAccount({
      name: '',
      bank_name: '',
      type: 'savings',
      opening_balance: 0,
      opening_date: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
    });
    setAccountModalOpen(true);
  };

  const openEditModal = (acc: Account) => {
    setEditingAccount(acc);
    resetAccount({
      name: acc.name || acc.account_name || '',
      bank_name: acc.bank_name || '',
      type: acc.type,
      opening_balance: Number(acc.opening_balance) || 0,
      opening_date: acc.opening_date ? acc.opening_date.slice(0, 10) : format(new Date(), 'yyyy-MM-dd'),
      notes: acc.notes || '',
    });
    setAccountModalOpen(true);
  };

  const onAccountSubmit = async (values: AccountFormValues) => {
    setIsSubmitting(true);
    try {
      if (editingAccount) {
        const ok = await updateAccount(editingAccount.id, {
          name: values.name,
          account_name: values.name,
          bank_name: values.bank_name || null,
          type: values.type,
          opening_balance: values.opening_balance,
          opening_date: values.opening_date,
          notes: values.notes || null,
        });
        if (ok) setAccountModalOpen(false);
      } else {
        const ok = await createAccount({
          name: values.name,
          account_name: values.name,
          bank_name: values.bank_name || null,
          type: values.type,
          opening_balance: values.opening_balance,
          opening_date: values.opening_date,
          notes: values.notes || null,
        });
        if (ok) setAccountModalOpen(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const onTransferSubmit = async (values: TransferFormValues) => {
    if (values.from_account_id === values.to_account_id) {
      toast.error('Source and destination accounts must be different');
      return;
    }

    setIsSubmitting(true);
    try {
      const fromAcc = accounts.find((a) => a.id === values.from_account_id);
      const toAcc = accounts.find((a) => a.id === values.to_account_id);

      const ok = await createTransaction({
        type: 'transfer',
        amount: values.amount,
        account_id: values.from_account_id,
        to_account_id: values.to_account_id,
        transaction_date: values.date,
        payment_mode: 'upi',
        description: `Transfer from ${fromAcc?.name || 'Account'} to ${toAcc?.name || 'Account'}`,
        notes: values.notes || null,
      });

      if (ok) {
        toast.success('Funds transferred successfully');
        setTransferModalOpen(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchive = async () => {
    if (!archiveTargetId) return;
    setIsSubmitting(true);
    try {
      await archiveAccount(archiveTargetId);
      setArchiveTargetId(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAccountIcon = (type: AccountType) => {
    switch (type) {
      case 'savings':
        return <Landmark className="h-5 w-5 text-primary" />;
      case 'current':
        return <CreditCard className="h-5 w-5 text-blue-600 dark:text-blue-400" />;
      case 'cash_wallet':
        return <Wallet className="h-5 w-5 text-amber-600 dark:text-amber-400" />;
      default:
        return <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bank Accounts & Wallets</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Manage savings accounts, current accounts, and cash balances with live movements
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {activeAccounts.length >= 2 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                resetTransfer({
                  from_account_id: activeAccounts[0]?.id || '',
                  to_account_id: activeAccounts[1]?.id || '',
                  amount: undefined,
                  date: format(new Date(), 'yyyy-MM-dd'),
                  notes: '',
                });
                setTransferModalOpen(true);
              }}
              className="gap-1.5 shadow-xs"
            >
              <ArrowLeftRight className="h-4 w-4" />
              Transfer Funds
            </Button>
          )}
          <Button onClick={openAddModal} size="sm" className="gap-1.5 shadow-xs">
            <Plus className="h-4 w-4" />
            Add Account
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Net Worth / Total Balance */}
        <Card className="p-4 border-primary/20 bg-primary/5 shadow-xs sm:col-span-1">
          <div className="flex items-center justify-between pb-1">
            <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">
              Total Available Funds
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-foreground">
            {formatCurrency(totalBalance)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Across {activeAccounts.length} active account{activeAccounts.length === 1 ? '' : 's'}
          </p>
        </Card>

        {/* Security / Privacy Banner */}
        <Card className="p-4 shadow-xs sm:col-span-2 flex items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-foreground">
              Privacy First & Safe Accounting
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              My Money Tracker calculates your real-time balances from your recorded transactions. We never ask for internet banking passwords, card PINs, or credentials.
            </p>
          </div>
        </Card>
      </div>

      {/* Accounts Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-foreground">
            Active Accounts ({activeAccounts.length})
          </h2>
          {archivedAccounts.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIncludeArchived(!includeArchived)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {includeArchived ? 'Hide Archived' : `Show Archived (${archivedAccounts.length})`}
            </Button>
          )}
        </div>

        {loading && accounts.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : accounts.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3">
              <Landmark className="h-6 w-6" />
            </div>
            <p className="text-base font-semibold">No bank accounts configured</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Add your savings account, cash wallet, or credit card to track your money movements accurately.
            </p>
            <Button onClick={openAddModal} size="sm" className="mt-4 gap-1.5">
              <Plus className="h-4 w-4" />
              Add First Account
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((acc) => (
              <Card
                key={acc.id}
                className={`p-4 flex flex-col justify-between shadow-xs border-border/80 transition-all ${
                  acc.is_archived ? 'opacity-60 bg-muted/30' : 'hover:border-primary/40'
                }`}
              >
                <div>
                  {/* Account Header */}
                  <div className="flex items-start justify-between gap-2 pb-2 border-b border-border/60">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted">
                        {getAccountIcon(acc.type)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm text-foreground truncate">
                          {acc.name || acc.account_name}
                        </h3>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {acc.bank_name || getAccountTypeLabel(acc.type)}
                        </p>
                      </div>
                    </div>
                    {acc.is_archived ? (
                      <Badge variant="secondary" className="text-[10px]">
                        Archived
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {acc.type.replace('_', ' ')}
                      </Badge>
                    )}
                  </div>

                  {/* Balance details */}
                  <div className="py-3 space-y-1">
                    <span className="text-[11px] font-medium text-muted-foreground">
                      Current Calculated Balance
                    </span>
                    <p className="text-xl sm:text-2xl font-extrabold text-foreground">
                      {formatCurrency(acc.current_balance)}
                    </p>
                    <div className="flex justify-between text-[11px] text-muted-foreground pt-1">
                      <span>Opening: {formatCurrency(acc.opening_balance)}</span>
                      <span>Since {acc.opening_date ? formatDate(acc.opening_date) : '-'}</span>
                    </div>
                    {acc.notes && (
                      <p className="text-[11px] text-muted-foreground italic bg-muted/40 p-1.5 rounded-md mt-1">
                        "{acc.notes}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-border/60 flex items-center justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs gap-1"
                    onClick={() => openEditModal(acc)}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  {!acc.is_archived && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs gap-1 text-muted-foreground hover:text-destructive"
                      onClick={() => setArchiveTargetId(acc.id)}
                    >
                      <Archive className="h-3.5 w-3.5" />
                      Archive
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* MODAL 1: Add/Edit Account */}
      <Dialog open={accountModalOpen} onOpenChange={setAccountModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingAccount ? 'Edit Account' : 'Add Account'}</DialogTitle>
            <DialogDescription>
              Configure bank account, wallet, or credit card details
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitAccount(onAccountSubmit)} className="space-y-4 pt-2">
            {/* Account Name */}
            <div className="space-y-1.5">
              <Label htmlFor="acc_name" className="text-xs font-semibold">
                Account Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="acc_name"
                placeholder="e.g. HDFC Salary, ICICI Emergency, Cash in Hand"
                className="h-10"
                {...registerAccount('name')}
              />
              {errorsAccount.name && (
                <p className="text-xs text-destructive">{errorsAccount.name.message}</p>
              )}
            </div>

            {/* Bank Name */}
            <div className="space-y-1.5">
              <Label htmlFor="bank_name" className="text-xs font-semibold">
                Bank / Institution Name
              </Label>
              <Input
                id="bank_name"
                placeholder="e.g. HDFC Bank, ICICI Bank, Cash"
                className="h-10"
                {...registerAccount('bank_name')}
              />
            </div>

            {/* Account Type */}
            <div className="space-y-1.5">
              <Label htmlFor="acc_type" className="text-xs font-semibold">
                Account Type <span className="text-destructive">*</span>
              </Label>
              <Controller
                control={controlAccount}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full h-10">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="savings">Savings Account</SelectItem>
                      <SelectItem value="current">Current Account</SelectItem>
                      <SelectItem value="cash_wallet">Cash Wallet</SelectItem>
                      <SelectItem value="other">Other Account</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Initial Opening Balance & Date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="opening_balance" className="text-xs font-semibold">
                  Initial Balance (₹) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="opening_balance"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className="h-10 text-base font-bold"
                  {...registerAccount('opening_balance', { valueAsNumber: true })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="opening_date" className="text-xs font-semibold">
                  Opening Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="opening_date"
                  type="date"
                  className="h-10 text-xs"
                  {...registerAccount('opening_date')}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="acc_notes" className="text-xs font-semibold">
                Notes (Optional)
              </Label>
              <Textarea
                id="acc_notes"
                rows={2}
                placeholder="Account purpose or branch..."
                className="resize-none"
                {...registerAccount('notes')}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setAccountModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : editingAccount ? 'Update Account' : 'Save Account'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: Transfer Funds between Accounts */}
      <Dialog open={transferModalOpen} onOpenChange={setTransferModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Transfer Funds Between Accounts</DialogTitle>
            <DialogDescription>
              Move funds between your accounts. Transfers do not alter your net income or total expenses.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitTransfer(onTransferSubmit)} className="space-y-4 pt-2">
            {/* From Account */}
            <div className="space-y-1.5">
              <Label htmlFor="from_acc" className="text-xs font-semibold">
                Transfer From <span className="text-destructive">*</span>
              </Label>
              <Controller
                control={controlTransfer}
                name="from_account_id"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full h-10">
                      <SelectValue placeholder="Select Source Account" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeAccounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.name || acc.account_name} ({formatCurrency(acc.current_balance, { showDecimals: false })})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* To Account */}
            <div className="space-y-1.5">
              <Label htmlFor="to_acc" className="text-xs font-semibold">
                Transfer To <span className="text-destructive">*</span>
              </Label>
              <Controller
                control={controlTransfer}
                name="to_account_id"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full h-10">
                      <SelectValue placeholder="Select Destination Account" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeAccounts
                        .filter((acc) => acc.id !== selectedFromAccId)
                        .map((acc) => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.name || acc.account_name} ({formatCurrency(acc.current_balance, { showDecimals: false })})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Amount and Date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="transfer_amount" className="text-xs font-semibold">
                  Amount (₹) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="transfer_amount"
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="0.00"
                  className="h-10 text-base font-bold"
                  {...registerTransfer('amount', { valueAsNumber: true })}
                />
                {errorsTransfer.amount && (
                  <p className="text-xs text-destructive">{errorsTransfer.amount.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="transfer_date" className="text-xs font-semibold">
                  Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="transfer_date"
                  type="date"
                  className="h-10 text-xs"
                  {...registerTransfer('date')}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="transfer_notes" className="text-xs font-semibold">
                Notes (Optional)
              </Label>
              <Input
                id="transfer_notes"
                placeholder="e.g. ATM cash withdrawal, moving to savings"
                className="h-10 text-xs"
                {...registerTransfer('notes')}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setTransferModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Transferring...' : 'Execute Transfer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation Alert */}
      <AlertDialog open={Boolean(archiveTargetId)} onOpenChange={(open) => !open && setArchiveTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Bank Account?</AlertDialogTitle>
            <AlertDialogDescription>
              Archiving this account removes it from active selection. All past transactions and balances linked to this account are strictly preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive} disabled={isSubmitting}>
              {isSubmitting ? 'Archiving...' : 'Archive Account'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AccountsPage;
