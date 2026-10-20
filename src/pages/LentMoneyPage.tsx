import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, differenceInDays, parseISO } from 'date-fns';
import {
  HandCoins,
  Plus,
  CheckCircle2,
  AlertTriangle,
  History,
  Wallet,
  ArrowDownLeft,
  Loader2,
  User,
  Phone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLentMoney, type LentRecordWithDetails } from '@/hooks/useLentMoney';
import { useAccounts } from '@/hooks/useAccounts';
import { formatCurrency, formatDate, getLentStatusColor } from '@/lib/formatters';
import { toast } from 'sonner';

// Zod schema for adding lent money
const addLentSchema = z.object({
  borrower_name: z.string().min(1, "Person's name is required"),
  borrower_contact: z.string().optional().nullable(),
  amount: z
    .number()
    .positive('Amount must be greater than zero'),
  lent_date: z.string().min(1, 'Date lent is required'),
  due_date: z.string().min(1, 'Expected repayment date is required'),
  account_id: z.string().min(1, 'Please select source account'),
  payment_mode: z.enum(['cash', 'card', 'upi']),
  notes: z.string().optional().nullable(),
});

type AddLentFormValues = z.infer<typeof addLentSchema>;

// Zod schema for partial repayment
const partialRepaymentSchema = z.object({
  amount: z
    .number()
    .positive('Repayment amount must be greater than zero'),
  repayment_date: z.string().min(1, 'Date is required'),
  expected_remaining_date: z.string().optional().nullable(),
  destination_account_id: z.string().min(1, 'Select destination account'),
  payment_mode: z.enum(['cash', 'card', 'upi']),
  notes: z.string().optional().nullable(),
});

type PartialRepaymentValues = z.infer<typeof partialRepaymentSchema>;

export const LentMoneyPage: React.FC = () => {
  const {
    lentRecords,
    createLentRecord,
    processFullRepayment,
    processPartialRepayment,
  } = useLentMoney({ includeRepaid: true });

  const { accounts } = useAccounts();

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [fullModalRecord, setFullModalRecord] = useState<LentRecordWithDetails | null>(null);
  const [partialModalRecord, setPartialModalRecord] = useState<LentRecordWithDetails | null>(null);
  const [historyModalRecord, setHistoryModalRecord] = useState<LentRecordWithDetails | null>(null);
  const [fullDestinationAccount, setFullDestinationAccount] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add Lent Form
  const {
    register: registerAdd,
    handleSubmit: handleSubmitAdd,
    control: controlAdd,
    reset: resetAdd,
    formState: { errors: errorsAdd },
  } = useForm<AddLentFormValues>({
    resolver: zodResolver(addLentSchema),
    defaultValues: {
      borrower_name: '',
      borrower_contact: '',
      amount: undefined,
      lent_date: format(new Date(), 'yyyy-MM-dd'),
      due_date: format(new Date(Date.now() + 30 * 86400000), 'yyyy-MM-dd'),
      account_id: accounts[0]?.id || '',
      payment_mode: 'upi',
      notes: '',
    },
  });

  // Partial Repayment Form
  const {
    register: registerPartial,
    handleSubmit: handleSubmitPartial,
    control: controlPartial,
    reset: resetPartial,
    formState: { errors: errorsPartial },
  } = useForm<PartialRepaymentValues>({
    resolver: zodResolver(partialRepaymentSchema),
    defaultValues: {
      amount: undefined,
      repayment_date: format(new Date(), 'yyyy-MM-dd'),
      expected_remaining_date: '',
      destination_account_id: accounts[0]?.id || '',
      payment_mode: 'upi',
      notes: '',
    },
  });

  // Calculate stats
  const activeRecords = lentRecords.filter((r) => r.status !== 'repaid');
  const repaidRecords = lentRecords.filter((r) => r.status === 'repaid');

  const totalOutstanding = activeRecords.reduce(
    (sum, r) => sum + (Number(r.outstanding_amount) || 0),
    0
  );

  const totalRecovered = lentRecords.reduce(
    (sum, r) => sum + (Number(r.amount_repaid) || 0),
    0
  );

  const totalOriginalLent = lentRecords.reduce(
    (sum, r) => sum + (Number(r.amount) || 0),
    0
  );

  // Submit Add Lent
  const onAddSubmit = async (values: AddLentFormValues) => {
    setIsSubmitting(true);
    try {
      const res = await createLentRecord({
        borrower_name: values.borrower_name,
        borrower_contact: values.borrower_contact || null,
        amount: values.amount,
        lent_date: values.lent_date,
        due_date: values.due_date,
        account_id: values.account_id,
        payment_mode: values.payment_mode,
        notes: values.notes || null,
      });

      if (res) {
        setAddModalOpen(false);
        resetAdd();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Full Repayment
  const onFullRepaymentSubmit = async () => {
    if (!fullModalRecord) return;
    const destAccount = fullDestinationAccount || accounts[0]?.id;
    if (!destAccount) {
      toast.error('Please select an account to receive funds');
      return;
    }

    setIsSubmitting(true);
    try {
      const ok = await processFullRepayment(
        fullModalRecord.id,
        destAccount,
        fullModalRecord.payment_mode || 'upi'
      );
      if (ok) {
        setFullModalRecord(null);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Partial Repayment Modal
  const openPartialModal = (record: LentRecordWithDetails) => {
    setPartialModalRecord(record);
    resetPartial({
      amount: record.outstanding_amount,
      repayment_date: format(new Date(), 'yyyy-MM-dd'),
      expected_remaining_date: record.due_date ? record.due_date.slice(0, 10) : '',
      destination_account_id: accounts[0]?.id || '',
      payment_mode: 'upi',
      notes: '',
    });
  };

  // Submit Partial Repayment
  const onPartialSubmit = async (values: PartialRepaymentValues) => {
    if (!partialModalRecord) return;

    if (values.amount > partialModalRecord.outstanding_amount) {
      toast.error(
        `Amount cannot exceed outstanding balance of ${formatCurrency(partialModalRecord.outstanding_amount)}`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const ok = await processPartialRepayment({
        lentRecordId: partialModalRecord.id,
        amount: values.amount,
        repaymentDate: values.repayment_date,
        expectedRemainingDate: values.expected_remaining_date || null,
        destinationAccountId: values.destination_account_id,
        paymentMode: values.payment_mode,
        notes: values.notes || undefined,
      });

      if (ok) {
        setPartialModalRecord(null);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lent Money Tracker</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Track loans given to family or friends and manage full or partial repayments
          </p>
        </div>
        <Button
          onClick={() => {
            resetAdd();
            setAddModalOpen(true);
          }}
          className="gap-1.5 self-start sm:self-auto shadow-xs"
        >
          <Plus className="h-4 w-4" />
          Record Lent Money
        </Button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {/* Outstanding Balance */}
        <Card className="p-4 border-amber-500/20 bg-amber-500/5 shadow-xs">
          <div className="flex items-center justify-between pb-1.5">
            <span className="text-[11px] font-semibold tracking-wider text-amber-700 dark:text-amber-400 uppercase">
              Total Outstanding
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <HandCoins className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400">
            {formatCurrency(totalOutstanding)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            {activeRecords.length} active borrower{activeRecords.length === 1 ? '' : 's'}
          </p>
        </Card>

        {/* Total Recovered */}
        <Card className="p-4 border-blue-500/20 bg-blue-500/5 shadow-xs">
          <div className="flex items-center justify-between pb-1.5">
            <span className="text-[11px] font-semibold tracking-wider text-blue-700 dark:text-blue-400 uppercase">
              Total Recovered
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
            {formatCurrency(totalRecovered)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Repaid principal</p>
        </Card>

        {/* Total Ever Lent */}
        <Card className="p-4 shadow-xs">
          <div className="flex items-center justify-between pb-1.5">
            <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Total Lent
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-foreground">
            {formatCurrency(totalOriginalLent)}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">All time cumulative</p>
        </Card>

        {/* Overdue Count */}
        <Card className="p-4 shadow-xs">
          <div className="flex items-center justify-between pb-1.5">
            <span className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Overdue Loans
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-rose-600 dark:text-rose-400">
            {activeRecords.filter((r) => r.status === 'overdue' || (r.due_date && new Date(r.due_date) < new Date())).length}
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">Passed due date</p>
        </Card>
      </div>

      {/* Tabs: Active Loans vs Repaid History */}
      <Tabs defaultValue="active" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 max-w-xs">
          <TabsTrigger value="active" className="gap-2">
            Active ({activeRecords.length})
          </TabsTrigger>
          <TabsTrigger value="repaid" className="gap-2">
            Settled ({repaidRecords.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Active Loans */}
        <TabsContent value="active" className="space-y-4">
          {activeRecords.length === 0 ? (
            <Card className="p-8 text-center border-dashed">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-3">
                <HandCoins className="h-6 w-6" />
              </div>
              <p className="text-base font-semibold">No active money lent</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                You do not have any pending loans awaiting repayment. Record new money lent to keep track.
              </p>
              <Button
                size="sm"
                className="mt-4 gap-1.5"
                onClick={() => setAddModalOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Record Lent Money
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeRecords.map((record) => {
                const isOverdue =
                  record.due_date && new Date(record.due_date) < new Date();
                const overdueDays = record.due_date
                  ? differenceInDays(new Date(), parseISO(record.due_date))
                  : 0;

                return (
                  <Card key={record.id} className="p-4 flex flex-col justify-between shadow-xs border-border/80 hover:border-primary/40 transition-all">
                    <div>
                      {/* Card Header: Person & Status */}
                      <div className="flex items-start justify-between gap-2 pb-2 border-b border-border/60">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <h3 className="font-bold text-sm text-foreground">
                              {record.borrower_name}
                            </h3>
                          </div>
                          {record.borrower_contact && (
                            <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Phone className="h-3 w-3" />
                              {record.borrower_contact}
                            </p>
                          )}
                        </div>
                        <Badge
                          variant="outline"
                          className={isOverdue ? getLentStatusColor('overdue') : getLentStatusColor(record.status)}
                        >
                          {isOverdue ? `Overdue ${overdueDays}d` : record.status}
                        </Badge>
                      </div>

                      {/* Financial Figures */}
                      <div className="py-3 space-y-2">
                        <div className="flex justify-between items-baseline">
                          <span className="text-xs text-muted-foreground font-medium">Outstanding</span>
                          <span className="text-lg font-extrabold text-amber-600 dark:text-amber-400">
                            {formatCurrency(record.outstanding_amount)}
                          </span>
                        </div>

                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Original: {formatCurrency(record.amount)}</span>
                          <span>Repaid: {formatCurrency(record.amount_repaid)}</span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-1.5 rounded-full transition-all"
                            style={{
                              width: `${Math.min(
                                100,
                                ((record.amount_repaid || 0) / (record.amount || 1)) * 100
                              )}%`,
                            }}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] text-muted-foreground border-t border-border/40">
                          <div>
                            <span className="block font-medium">Lent Date:</span>
                            {formatDate(record.lent_date)}
                          </div>
                          <div>
                            <span className="block font-medium">Expected Date:</span>
                            {record.due_date ? formatDate(record.due_date) : '-'}
                          </div>
                        </div>

                        {record.notes && (
                          <p className="text-[11px] text-muted-foreground italic bg-muted/30 p-1.5 rounded-md mt-1">
                            "{record.notes}"
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions: Full & Partial Repayment */}
                    <div className="pt-3 border-t border-border/60 flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        className="flex-1 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => {
                          setFullModalRecord(record);
                          setFullDestinationAccount(accounts[0]?.id || '');
                        }}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Full Settle
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs gap-1"
                        onClick={() => openPartialModal(record)}
                      >
                        <ArrowDownLeft className="h-3.5 w-3.5" />
                        Partial Pay
                      </Button>

                      {record.repayments && record.repayments.length > 0 && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 rounded-lg"
                          title="View Repayment History"
                          onClick={() => setHistoryModalRecord(record)}
                        >
                          <History className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Settled History */}
        <TabsContent value="repaid" className="space-y-4">
          {repaidRecords.length === 0 ? (
            <Card className="p-8 text-center border-dashed">
              <p className="text-sm font-semibold">No settled loans yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Loans that have been fully recovered will be archived here for your audit trail.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {repaidRecords.map((record) => (
                <Card key={record.id} className="p-4 shadow-xs opacity-90 border-border/70">
                  <div className="flex items-start justify-between pb-2 border-b border-border/60">
                    <div>
                      <h3 className="font-bold text-sm text-foreground">{record.borrower_name}</h3>
                      <p className="text-[11px] text-muted-foreground">Lent: {formatDate(record.lent_date)}</p>
                    </div>
                    <Badge variant="outline" className={getLentStatusColor('repaid')}>
                      Fully Repaid
                    </Badge>
                  </div>
                  <div className="py-2.5 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Amount Recovered:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(record.amount)}
                      </span>
                    </div>
                    {record.repayments && record.repayments.length > 0 && (
                      <p className="text-[11px] text-muted-foreground">
                        Recovered across {record.repayments.length} installment{record.repayments.length > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full text-xs gap-1 border border-border/60"
                    onClick={() => setHistoryModalRecord(record)}
                  >
                    <History className="h-3.5 w-3.5" />
                    View Repayments Log
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* MODAL 1: Add Lent Record */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Lent Money</DialogTitle>
            <DialogDescription>
              Record a personal loan or advance given to someone. This reduces your bank balance without counting as a regular expense.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitAdd(onAddSubmit)} className="space-y-4 pt-2">
            {/* Person Name */}
            <div className="space-y-1.5">
              <Label htmlFor="borrower_name" className="text-xs font-semibold">
                Borrower's Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="borrower_name"
                placeholder="e.g., Amit Kumar, Rahul Verma"
                className="h-10"
                {...registerAdd('borrower_name')}
              />
              {errorsAdd.borrower_name && (
                <p className="text-xs text-destructive">{errorsAdd.borrower_name.message}</p>
              )}
            </div>

            {/* Contact */}
            <div className="space-y-1.5">
              <Label htmlFor="borrower_contact" className="text-xs font-semibold">
                Contact / Phone (Optional)
              </Label>
              <Input
                id="borrower_contact"
                placeholder="+91 98765 43210"
                className="h-10"
                {...registerAdd('borrower_contact')}
              />
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <Label htmlFor="lent_amount" className="text-xs font-semibold">
                Amount Lent (₹) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="lent_amount"
                type="number"
                step="0.01"
                min="1"
                placeholder="0.00"
                className="h-10 text-base font-bold"
                {...registerAdd('amount', { valueAsNumber: true })}
              />
              {errorsAdd.amount && (
                <p className="text-xs text-destructive">{errorsAdd.amount.message}</p>
              )}
            </div>

            {/* Date Lent & Expected Date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="lent_date" className="text-xs font-semibold">
                  Date Lent <span className="text-destructive">*</span>
                </Label>
                <Input id="lent_date" type="date" className="h-10 text-xs" {...registerAdd('lent_date')} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="due_date" className="text-xs font-semibold">
                  Expected Repayment <span className="text-destructive">*</span>
                </Label>
                <Input id="due_date" type="date" className="h-10 text-xs" {...registerAdd('due_date')} />
              </div>
            </div>

            {/* Account & Payment Mode */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="account_id" className="text-xs font-semibold">
                  Paid From Account <span className="text-destructive">*</span>
                </Label>
                <Controller
                  control={controlAdd}
                  name="account_id"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full h-10 text-xs">
                        <SelectValue placeholder="Source Account" />
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
                <Label htmlFor="payment_mode" className="text-xs font-semibold">
                  Payment Mode
                </Label>
                <Controller
                  control={controlAdd}
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
              <Label htmlFor="lent_notes" className="text-xs font-semibold">
                Notes
              </Label>
              <Textarea
                id="lent_notes"
                rows={2}
                placeholder="Reason or conditions for the loan..."
                className="resize-none"
                {...registerAdd('notes')}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setAddModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Recording...' : 'Record Loan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: Full Settle Confirmation */}
      <Dialog open={Boolean(fullModalRecord)} onOpenChange={(open) => !open && setFullModalRecord(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Full Settlement</DialogTitle>
            <DialogDescription>
              Confirm receipt of full outstanding amount from {fullModalRecord?.borrower_name}.
            </DialogDescription>
          </DialogHeader>

          {fullModalRecord && (
            <div className="space-y-4 pt-2">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                <span className="text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                  Outstanding Amount to Settle:
                </span>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {formatCurrency(fullModalRecord.outstanding_amount)}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dest_acc" className="text-xs font-semibold">
                  Deposit Funds To Account <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={fullDestinationAccount || accounts[0]?.id || ''}
                  onValueChange={setFullDestinationAccount}
                >
                  <SelectTrigger className="w-full h-10">
                    <SelectValue placeholder="Receiving Account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name || acc.account_name} ({formatCurrency(acc.current_balance, { showDecimals: false })})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <p className="text-xs text-muted-foreground">
                This will record a repayment transaction, increase the chosen account balance,
                and mark this loan as fully settled.
              </p>

              <DialogFooter className="pt-2">
                <Button
                  variant="outline"
                  onClick={() => setFullModalRecord(null)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={onFullRepaymentSubmit}
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                      Processing...
                    </>
                  ) : (
                    'Confirm Receipt & Close'
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL 3: Partial Repayment */}
      <Dialog open={Boolean(partialModalRecord)} onOpenChange={(open) => !open && setPartialModalRecord(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Partial Payment</DialogTitle>
            <DialogDescription>
              Record an installment received from {partialModalRecord?.borrower_name}.
            </DialogDescription>
          </DialogHeader>

          {partialModalRecord && (
            <form onSubmit={handleSubmitPartial(onPartialSubmit)} className="space-y-4 pt-2">
              <div className="flex justify-between items-center text-xs p-2.5 rounded-lg bg-muted">
                <span className="text-muted-foreground">Current Outstanding:</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  {formatCurrency(partialModalRecord.outstanding_amount)}
                </span>
              </div>

              {/* Amount Received */}
              <div className="space-y-1.5">
                <Label htmlFor="part_amount" className="text-xs font-semibold">
                  Amount Received (₹) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="part_amount"
                  type="number"
                  step="0.01"
                  min="1"
                  max={partialModalRecord.outstanding_amount}
                  className="h-10 text-base font-bold"
                  {...registerPartial('amount', { valueAsNumber: true })}
                />
                {errorsPartial.amount && (
                  <p className="text-xs text-destructive">{errorsPartial.amount.message}</p>
                )}
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="rep_date" className="text-xs font-semibold">
                    Date Received <span className="text-destructive">*</span>
                  </Label>
                  <Input id="rep_date" type="date" className="h-10 text-xs" {...registerPartial('repayment_date')} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="rem_date" className="text-xs font-semibold">
                    Next Due Date
                  </Label>
                  <Input id="rem_date" type="date" className="h-10 text-xs" {...registerPartial('expected_remaining_date')} />
                </div>
              </div>

              {/* Destination Account */}
              <div className="space-y-1.5">
                <Label htmlFor="dest_acc_part" className="text-xs font-semibold">
                  Destination Account <span className="text-destructive">*</span>
                </Label>
                <Controller
                  control={controlPartial}
                  name="destination_account_id"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full h-10 text-xs">
                        <SelectValue placeholder="Deposit Account" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((acc) => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.name || acc.account_name} ({formatCurrency(acc.current_balance, { showDecimals: false })})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="part_notes" className="text-xs font-semibold">
                  Notes (Optional)
                </Label>
                <Input
                  id="part_notes"
                  placeholder="e.g. GPay UPI reference, cash receipt"
                  className="h-10 text-xs"
                  {...registerPartial('notes')}
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPartialModalRecord(null)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Record Payment'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL 4: Repayment History View */}
      <Dialog open={Boolean(historyModalRecord)} onOpenChange={(open) => !open && setHistoryModalRecord(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Repayment History</DialogTitle>
            <DialogDescription>
              All repayments recorded for {historyModalRecord?.borrower_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2 max-h-72 overflow-y-auto">
            {historyModalRecord?.repayments && historyModalRecord.repayments.length > 0 ? (
              historyModalRecord.repayments.map((rep, idx) => (
                <div
                  key={rep.id || idx}
                  className="p-3 rounded-lg border border-border/70 flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-semibold">{formatDate(rep.repayment_date)}</p>
                    <p className="text-muted-foreground text-[11px] mt-0.5">
                      {rep.notes || 'Repayment'} • <span className="uppercase">{rep.payment_mode}</span>
                    </p>
                  </div>
                  <span className="font-bold text-blue-600 dark:text-blue-400 text-sm">
                    +{formatCurrency(rep.amount)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">
                No repayments have been recorded for this loan yet.
              </p>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button onClick={() => setHistoryModalRecord(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LentMoneyPage;
