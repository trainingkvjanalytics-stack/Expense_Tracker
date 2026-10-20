import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import {
  LineChart,
  Plus,
  Coins,
  TrendingUp,
  Edit2,
  Trash2,
  Filter,
  Layers,
} from 'lucide-react';
import { useMonth } from '@/components/layout/AppLayout';
import MonthSelector from '@/components/shared/MonthSelector';
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
import { useInvestments, type InvestmentWithDetails } from '@/hooks/useInvestments';
import { useAccounts } from '@/hooks/useAccounts';
import {
  formatCurrency,
  formatDate,
  getInvestmentMethodLabel,
  getInvestmentTypeLabel,
} from '@/lib/formatters';
import type { InvestmentMethod, InvestmentType, PaymentMode } from '@/types/database';

const investmentSchema = z.object({
  name: z.string().min(1, 'Investment or scheme name is required'),
  amount: z
    .number()
    .positive('Amount must be greater than zero'),
  method: z.enum(['sip', 'one_time']),
  investment_type: z.enum(['mutual_fund', 'gold_fund', 'stocks', 'fixed_deposit', 'other']),
  start_date: z.string().min(1, 'Investment date is required'),
  maturity_date: z.string().optional().nullable(),
  sip_day_of_month: z.number().optional().nullable(),
  account_id: z.string().min(1, 'Select funding account'),
  payment_mode: z.enum(['cash', 'card', 'upi']),
  notes: z.string().optional().nullable(),
});

type InvestmentFormValues = z.infer<typeof investmentSchema>;

export const InvestmentsPage: React.FC = () => {
  const { selectedMonth, setSelectedMonth } = useMonth();
  const { accounts } = useAccounts();

  // Filters
  const [selectedMethodFilter, setSelectedMethodFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');

  const {
    investments,
    totalMonthly,
    totalOverall,
    createInvestment,
    updateInvestment,
    deleteInvestment,
  } = useInvestments({
    month: selectedMonth,
    method: selectedMethodFilter !== 'all' ? (selectedMethodFilter as InvestmentMethod) : undefined,
    type: selectedTypeFilter !== 'all' ? (selectedTypeFilter as InvestmentType) : undefined,
  });

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState<InvestmentWithDetails | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<InvestmentFormValues>({
    resolver: zodResolver(investmentSchema),
    defaultValues: {
      name: '',
      amount: undefined,
      method: 'sip',
      investment_type: 'mutual_fund',
      start_date: format(new Date(), 'yyyy-MM-dd'),
      maturity_date: '',
      sip_day_of_month: 10,
      account_id: accounts[0]?.id || '',
      payment_mode: 'upi',
      notes: '',
    },
  });

  const watchMethod = watch('method');

  const openAddModal = () => {
    setEditingInvestment(null);
    reset({
      name: '',
      amount: undefined,
      method: 'sip',
      investment_type: 'mutual_fund',
      start_date: format(new Date(), 'yyyy-MM-dd'),
      maturity_date: '',
      sip_day_of_month: 10,
      account_id: accounts[0]?.id || '',
      payment_mode: 'upi',
      notes: '',
    });
    setModalOpen(true);
  };

  const openEditModal = (inv: InvestmentWithDetails) => {
    setEditingInvestment(inv);
    reset({
      name: inv.name,
      amount: Number(inv.amount),
      method: inv.method,
      investment_type: inv.investment_type,
      start_date: inv.start_date.slice(0, 10),
      maturity_date: inv.maturity_date ? inv.maturity_date.slice(0, 10) : '',
      sip_day_of_month: inv.sip_day_of_month ?? null,
      account_id: inv.account_id || accounts[0]?.id || '',
      payment_mode: (inv.payment_mode as PaymentMode) || 'upi',
      notes: inv.notes || '',
    });
    setModalOpen(true);
  };

  const onSubmit = async (values: InvestmentFormValues) => {
    setIsSubmitting(true);
    try {
      if (editingInvestment) {
        const ok = await updateInvestment(editingInvestment.id, {
          name: values.name,
          amount: values.amount,
          method: values.method,
          investment_type: values.investment_type,
          start_date: values.start_date,
          maturity_date: values.maturity_date || null,
          sip_day_of_month: values.sip_day_of_month || null,
          account_id: values.account_id,
          payment_mode: values.payment_mode,
          notes: values.notes || null,
        });
        if (ok) setModalOpen(false);
      } else {
        const ok = await createInvestment({
          name: values.name,
          amount: values.amount,
          method: values.method,
          investment_type: values.investment_type,
          start_date: values.start_date,
          maturity_date: values.maturity_date || null,
          sip_day_of_month: values.sip_day_of_month || null,
          account_id: values.account_id,
          payment_mode: values.payment_mode,
          notes: values.notes || null,
        });
        if (ok) setModalOpen(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    setIsSubmitting(true);
    try {
      await deleteInvestment(deleteTargetId);
      setDeleteTargetId(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Active SIP count
  const sipCount = investments.filter((i) => i.method === 'sip' && i.is_active !== false).length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Investments</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Track mutual funds, SIPs, gold, fixed deposits, and stocks
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <MonthSelector selectedMonth={selectedMonth} onChange={setSelectedMonth} />
          <Button onClick={openAddModal} className="gap-1.5 shadow-xs">
            <Plus className="h-4 w-4" />
            Add Investment
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {/* Total This Month */}
        <Card className="p-4 border-purple-500/20 bg-purple-500/5 shadow-xs">
          <div className="flex items-center justify-between pb-1.5">
            <span className="text-[11px] font-semibold tracking-wider text-purple-700 dark:text-purple-400 uppercase">
              Invested This Month
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400">
            {formatCurrency(totalMonthly)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">For selected month</p>
        </Card>

        {/* Total Portfolio Value */}
        <Card className="p-4 shadow-xs">
          <div className="flex items-center justify-between pb-1.5">
            <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Portfolio Holdings
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <LineChart className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-foreground">
            {formatCurrency(totalOverall)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Cumulative investments</p>
        </Card>

        {/* Active SIPs */}
        <Card className="p-4 shadow-xs">
          <div className="flex items-center justify-between pb-1.5">
            <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Active SIPs
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Coins className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-foreground">
            {sipCount}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Monthly recurring plans</p>
        </Card>

        {/* Asset Classes */}
        <Card className="p-4 shadow-xs">
          <div className="flex items-center justify-between pb-1.5">
            <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Asset Classes
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-foreground">
            {new Set(investments.map((i) => i.investment_type)).size}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Diversified products</p>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <Card className="p-3 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground shrink-0">
            <Filter className="h-3.5 w-3.5" />
            Filter by:
          </div>

          <div className="flex flex-1 w-full flex-wrap items-center gap-2">
            {/* Method Filter */}
            <Select value={selectedMethodFilter} onValueChange={setSelectedMethodFilter}>
              <SelectTrigger className="h-8 text-xs w-32">
                <SelectValue placeholder="Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="sip">SIP Only</SelectItem>
                <SelectItem value="one_time">One-time Only</SelectItem>
              </SelectContent>
            </Select>

            {/* Product Type Filter */}
            <Select value={selectedTypeFilter} onValueChange={setSelectedTypeFilter}>
              <SelectTrigger className="h-8 text-xs w-36">
                <SelectValue placeholder="Product Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                <SelectItem value="mutual_fund">Mutual Funds</SelectItem>
                <SelectItem value="gold_fund">Gold Funds</SelectItem>
                <SelectItem value="stocks">Stocks</SelectItem>
                <SelectItem value="fixed_deposit">Fixed Deposits</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Investments List */}
      {investments.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 mb-3">
            <LineChart className="h-6 w-6" />
          </div>
          <p className="text-base font-semibold">No investments found</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            Start tracking your mutual fund SIPs, stocks, and deposits to keep your asset portfolio in sync.
          </p>
          <Button onClick={openAddModal} size="sm" className="mt-4 gap-1.5">
            <Plus className="h-4 w-4" />
            Add First Investment
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {investments.map((inv) => (
            <Card key={inv.id} className="p-4 flex flex-col justify-between shadow-xs border-border/80 hover:border-purple-500/40 transition-all">
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2 pb-2 border-b border-border/60">
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-foreground truncate">{inv.name}</h3>
                    <p className="text-[11px] text-muted-foreground capitalize mt-0.5">
                      {getInvestmentTypeLabel(inv.investment_type)}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      inv.method === 'sip'
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                        : 'border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300'
                    }
                  >
                    {getInvestmentMethodLabel(inv.method)}
                  </Badge>
                </div>

                {/* Amount Details */}
                <div className="py-3 space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-muted-foreground font-medium">
                      {inv.method === 'sip' ? 'Monthly Contribution' : 'Invested Amount'}
                    </span>
                    <span className="text-lg font-extrabold text-purple-600 dark:text-purple-400">
                      {formatCurrency(inv.amount)}
                    </span>
                  </div>

                  {inv.current_value && inv.current_value !== inv.amount && (
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Holding Value:</span>
                      <span className="font-semibold text-foreground">
                        {formatCurrency(inv.current_value)}
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] text-muted-foreground border-t border-border/40">
                    <div>
                      <span className="block font-medium">Start Date:</span>
                      {formatDate(inv.start_date)}
                    </div>
                    <div>
                      <span className="block font-medium">
                        {inv.method === 'sip' ? 'Debit Day:' : 'Maturity:'}
                      </span>
                      {inv.method === 'sip'
                        ? `${inv.sip_day_of_month || 10}th of month`
                        : inv.maturity_date
                        ? formatDate(inv.maturity_date)
                        : 'Open'}
                    </div>
                  </div>

                  {inv.accounts?.account_name && (
                    <p className="text-[11px] text-muted-foreground">
                      Source: <span className="font-medium text-foreground">{inv.accounts.account_name}</span>
                    </p>
                  )}

                  {inv.notes && (
                    <p className="text-[11px] text-muted-foreground italic bg-muted/30 p-1.5 rounded-md mt-1">
                      "{inv.notes}"
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-border/60 flex items-center justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs gap-1"
                  onClick={() => openEditModal(inv)}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs gap-1 text-destructive hover:bg-destructive/10"
                  onClick={() => setDeleteTargetId(inv.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Investment Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingInvestment ? 'Edit Investment' : 'Add Investment'}</DialogTitle>
            <DialogDescription>
              Record an investment contribution. This reduces your cash balance without being classified as a consumption expense.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
            {/* Investment Name */}
            <div className="space-y-1.5">
              <Label htmlFor="inv_name" className="text-xs font-semibold">
                Investment / Scheme Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="inv_name"
                placeholder="e.g. Parag Parikh Flexi Cap, Sovereign Gold Bond, Nifty 50"
                className="h-10"
                {...register('name')}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <Label htmlFor="inv_amount" className="text-xs font-semibold">
                Amount (₹) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="inv_amount"
                type="number"
                step="0.01"
                min="1"
                placeholder="0.00"
                className="h-10 text-base font-bold"
                {...register('amount', { valueAsNumber: true })}
              />
              {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
            </div>

            {/* Method & Product Type */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="method" className="text-xs font-semibold">
                  Investment Method
                </Label>
                <Controller
                  control={control}
                  name="method"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full h-10 text-xs">
                        <SelectValue placeholder="Method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sip">SIP (Recurring)</SelectItem>
                        <SelectItem value="one_time">One-time (Lumpsum)</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="inv_type" className="text-xs font-semibold">
                  Product Type
                </Label>
                <Controller
                  control={control}
                  name="investment_type"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full h-10 text-xs">
                        <SelectValue placeholder="Product" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mutual_fund">Mutual Fund</SelectItem>
                        <SelectItem value="gold_fund">Gold Fund</SelectItem>
                        <SelectItem value="stocks">Stocks</SelectItem>
                        <SelectItem value="fixed_deposit">Fixed Deposit</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            {/* Dates / SIP Day */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="start_date" className="text-xs font-semibold">
                  Investment Date <span className="text-destructive">*</span>
                </Label>
                <Input id="start_date" type="date" className="h-10 text-xs" {...register('start_date')} />
              </div>

              {watchMethod === 'sip' ? (
                <div className="space-y-1.5">
                  <Label htmlFor="sip_day" className="text-xs font-semibold">
                    Monthly SIP Day (1-31)
                  </Label>
                  <Input
                    id="sip_day"
                    type="number"
                    min="1"
                    max="31"
                    placeholder="10"
                    className="h-10 text-xs"
                    {...register('sip_day_of_month', { valueAsNumber: true })}
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label htmlFor="maturity_date" className="text-xs font-semibold">
                    Maturity Date (Optional)
                  </Label>
                  <Input id="maturity_date" type="date" className="h-10 text-xs" {...register('maturity_date')} />
                </div>
              )}
            </div>

            {/* Account & Payment Mode */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="inv_account_id" className="text-xs font-semibold">
                  Debit Account <span className="text-destructive">*</span>
                </Label>
                <Controller
                  control={control}
                  name="account_id"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full h-10 text-xs">
                        <SelectValue placeholder="Funding Account" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((acc) => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.name || acc.account_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="inv_payment_mode" className="text-xs font-semibold">
                  Payment Mode
                </Label>
                <Controller
                  control={control}
                  name="payment_mode"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full h-10 text-xs">
                        <SelectValue placeholder="Mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="inv_notes" className="text-xs font-semibold">
                Notes
              </Label>
              <Textarea
                id="inv_notes"
                rows={2}
                placeholder="Folio number, goals, broker remarks..."
                className="resize-none"
                {...register('notes')}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : editingInvestment ? 'Update Investment' : 'Save Investment'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={Boolean(deleteTargetId)} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Investment Record?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove this investment entry and remove its transaction impact from your activity ledger.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default InvestmentsPage;
