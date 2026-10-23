import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Landmark,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAccounts } from '@/hooks/useAccounts';
import { formatCurrency, formatDate } from '@/lib/formatters';
import type { Loan, EmiScheduleItem } from '@/types/loan';
import type { PaymentMode } from '@/types/database';

interface PayEmiModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loan: Loan;
  item: EmiScheduleItem | null;
  onConfirmPayment: (params: {
    actualAmount: number;
    paymentDate: string;
    accountId: string;
    paymentMode: PaymentMode;
    notes?: string;
  }) => Promise<void>;
}

export const PayEmiModal: React.FC<PayEmiModalProps> = ({
  open,
  onOpenChange,
  loan,
  item,
  onConfirmPayment,
}) => {
  const { accounts } = useAccounts();
  const [amount, setAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [accountId, setAccountId] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('upi');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fallbackAccount = {
    id: loan.account_id || 'acc-primary',
    name: 'HDFC Bank (Primary)',
    account_name: 'HDFC Bank (Primary)',
    current_balance: 250000,
  };
  const availableAccounts = accounts.length > 0 ? accounts : [fallbackAccount as any];

  // Sync state whenever modal opens or item changes
  useEffect(() => {
    if (item && open) {
      setAmount(item.monthlyPayment);
      setPaymentDate(format(new Date(), 'yyyy-MM-dd'));
      setAccountId(loan.account_id || availableAccounts[0]?.id || '');
      setPaymentMode('upi');
      setNotes('');
    }
  }, [item, open, loan.account_id, availableAccounts]);

  if (!item) return null;

  const scheduledAmount = item.monthlyPayment;
  const isPrepayingMore = amount > scheduledAmount;
  const extraAmount = Math.max(0, amount - scheduledAmount);
  const selectedAccount = availableAccounts.find((a: any) => a.id === accountId) || availableAccounts[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return;

    try {
      setIsSubmitting(true);
      await onConfirmPayment({
        actualAmount: Number(amount),
        paymentDate,
        accountId: accountId || loan.account_id,
        paymentMode,
        notes: notes || undefined,
      });
      onOpenChange(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl">
                Pay EMI: Installment #{item.installment_number}
              </DialogTitle>
              <DialogDescription>
                {loan.name} • Due on {formatDate(item.dueDate)}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          {/* Fixed Scheduled Amount Display */}
          <div className="rounded-xl border border-border bg-muted/40 p-3.5 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs text-muted-foreground font-medium block">
                Scheduled Fixed EMI
              </span>
              <span className="text-sm font-semibold text-foreground">
                Principal: {formatCurrency(item.principalComponent)} + Interest:{' '}
                {formatCurrency(item.interestComponent)}
              </span>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-foreground">
                {formatCurrency(scheduledAmount)}
              </span>
              <span className="text-[11px] text-muted-foreground block">Fixed schedule</span>
            </div>
          </div>

          {/* Editable Payment Amount */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="pay_amount" className="text-sm font-semibold">
                Amount to Pay (₹) <span className="text-destructive">*</span>
              </Label>
              {amount !== scheduledAmount && (
                <button
                  type="button"
                  onClick={() => setAmount(scheduledAmount)}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Reset to Fixed EMI
                </button>
              )}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">
                ₹
              </span>
              <Input
                id="pay_amount"
                type="number"
                step="any"
                min="1"
                required
                value={amount || ''}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="pl-8 text-base font-semibold"
                placeholder="Enter payment amount"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              You can edit this amount. If you pay more, the extra money reduces your principal and
              reschedules remaining installments!
            </p>
          </div>

          {/* Rescheduling Alert Banner when paying more */}
          {isPrepayingMore && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 flex items-start gap-2.5 text-xs text-emerald-800 dark:text-emerald-300 animate-in fade-in-50">
              <Sparkles className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              <div>
                <p className="font-semibold">
                  Prepaying Extra {formatCurrency(extraAmount)}!
                </p>
                <p className="mt-0.5 text-emerald-700/90 dark:text-emerald-300/90">
                  This extra payment goes directly to reduce your principal balance. The remaining
                  loan schedule will be automatically rescheduled to shorten your tenure.
                </p>
              </div>
            </div>
          )}

          {/* Payment Date & Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="payment_date">Payment Date</Label>
              <Input
                id="payment_date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="payment_mode">Payment Mode</Label>
              <Select
                value={paymentMode}
                onValueChange={(val) => setPaymentMode(val as PaymentMode)}
              >
                <SelectTrigger id="payment_mode">
                  <SelectValue placeholder="Mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upi">UPI / Net Banking</SelectItem>
                  <SelectItem value="card">Debit / Credit Card</SelectItem>
                  <SelectItem value="cash">Cash / Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Bank Account Selection & Balance Warning */}
          <div className="space-y-1.5">
            <Label htmlFor="account_id">Bank Account to Deduct From</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger id="account_id">
                <SelectValue placeholder="Select bank account" />
              </SelectTrigger>
              <SelectContent>
                {availableAccounts.map((acc: any) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    <div className="flex items-center justify-between w-full gap-2">
                      <span>{acc.name || acc.account_name}</span>
                      <span className="text-xs font-mono text-muted-foreground">
                        ({formatCurrency(acc.current_balance)})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedAccount && (
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-0.5">
                <span>Current Account Balance:</span>
                <span className="font-semibold text-foreground">
                  {formatCurrency(selectedAccount.current_balance)}
                </span>
              </div>
            )}
          </div>

          {/* Auto Category Notification */}
          <div className="rounded-lg border border-border bg-card p-2.5 text-xs text-muted-foreground flex items-center gap-2">
            <Landmark className="h-4 w-4 text-primary shrink-0" />
            <span>
              Categorized automatically as: <strong className="text-foreground">EMI</strong> &gt;{' '}
              <strong className="text-foreground">{loan.name}</strong>
            </span>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes / Transaction Reference (Optional)</Label>
            <Input
              id="notes"
              placeholder="e.g. UTR / Transaction ID #987654"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || amount <= 0}
              className="min-w-[140px] bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSubmitting ? 'Recording...' : `Pay ${formatCurrency(amount)}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PayEmiModal;
