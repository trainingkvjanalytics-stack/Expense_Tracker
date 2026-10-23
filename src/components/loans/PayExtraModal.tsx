import React, { useState } from 'react';
import { format } from 'date-fns';
import {
  Sparkles,
  Zap,
  TrendingDown,
  Clock,
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
import { formatCurrency } from '@/lib/formatters';
import { calculatePrepaymentInsight } from '@/lib/emiCalculations';
import type { Loan } from '@/types/loan';
import type { PaymentMode } from '@/types/database';

interface PayExtraModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loan: Loan;
  currentBalance: number;
  remainingTenureMonths: number;
  onConfirmExtraPayment: (params: {
    amount: number;
    paymentDate: string;
    accountId: string;
    paymentMode: PaymentMode;
    notes?: string;
  }) => Promise<void>;
}

export const PayExtraModal: React.FC<PayExtraModalProps> = ({
  open,
  onOpenChange,
  loan,
  currentBalance,
  remainingTenureMonths,
  onConfirmExtraPayment,
}) => {
  const { accounts } = useAccounts();
  const [amount, setAmount] = useState<number>(25000);
  const [paymentDate, setPaymentDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [accountId, setAccountId] = useState<string>(loan.account_id || accounts[0]?.id || '');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('upi');
  const [notes, setNotes] = useState<string>('Extra Principal Prepayment');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fallbackAccount = {
    id: loan.account_id || 'acc-primary',
    name: 'HDFC Bank (Primary)',
    account_name: 'HDFC Bank (Primary)',
    current_balance: 250000,
  };
  const availableAccounts = accounts.length > 0 ? accounts : [fallbackAccount as any];
  const selectedAccount = availableAccounts.find((a: any) => a.id === accountId) || availableAccounts[0];

  // Calculate live preview of impact
  const insight = calculatePrepaymentInsight(
    currentBalance,
    loan.interest_rate,
    loan.monthly_emi,
    remainingTenureMonths,
    amount
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return;

    try {
      setIsSubmitting(true);
      await onConfirmExtraPayment({
        amount: Number(amount),
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
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-600/10 text-violet-600 dark:text-violet-400">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl">Pay Extra Amount to Loan</DialogTitle>
              <DialogDescription>
                {loan.name} • Direct principal reduction & tenure shortening
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          {/* Current Outstanding Balance Display */}
          <div className="rounded-xl border border-border bg-muted/40 p-3 flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">
              Current Outstanding Balance
            </span>
            <span className="text-base font-bold text-foreground">
              {formatCurrency(currentBalance)}
            </span>
          </div>

          {/* Extra Amount Input & Quick Presets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="extra_amount" className="text-sm font-semibold">
                Extra Prepayment Amount (₹) <span className="text-destructive">*</span>
              </Label>
              <span className="text-xs text-violet-600 dark:text-violet-400 font-medium">
                100% goes to Principal
              </span>
            </div>

            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">
                ₹
              </span>
              <Input
                id="extra_amount"
                type="number"
                step="500"
                min="500"
                max={currentBalance}
                required
                value={amount || ''}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="pl-8 text-base font-semibold"
                placeholder="Enter extra amount"
              />
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              {[10000, 25000, 50000, 100000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(preset)}
                  className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                    amount === preset
                      ? 'bg-violet-600 text-white border-violet-600 font-semibold'
                      : 'border-border bg-muted/50 hover:bg-muted text-muted-foreground'
                  }`}
                >
                  +{formatCurrency(preset, { showDecimals: false })}
                </button>
              ))}
            </div>
          </div>

          {/* Live Impact Preview Card */}
          {amount > 0 && (
            <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-3.5 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-violet-700 dark:text-violet-300">
                <Sparkles className="h-4 w-4" />
                Immediate Prepayment Impact
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-card p-2 border border-border">
                  <span className="text-[10px] text-muted-foreground block flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Tenure Shortened
                  </span>
                  <span className="text-sm font-bold text-violet-600 dark:text-violet-400">
                    {insight.monthsSaved} Months Saved!
                  </span>
                </div>
                <div className="rounded-lg bg-card p-2 border border-border">
                  <span className="text-[10px] text-muted-foreground block flex items-center gap-1">
                    <TrendingDown className="h-3 w-3" /> Interest Saved
                  </span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(insight.interestSaved)}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-violet-700/80 dark:text-violet-300/80">
                New payoff date:{' '}
                <strong>{insight.newPayoffDate}</strong> (earlier than {insight.currentPayoffDate})
              </p>
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

          {/* Bank Account Selection */}
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
                <span>Available Bank Balance:</span>
                <span className="font-semibold text-foreground">
                  {formatCurrency(selectedAccount.current_balance)}
                </span>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes / Reason (Optional)</Label>
            <Input
              id="notes"
              placeholder="e.g. Annual bonus, festival prepayment"
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
              className="min-w-[150px] bg-violet-600 hover:bg-violet-700 text-white font-semibold"
            >
              {isSubmitting ? 'Recording...' : `Pay ${formatCurrency(amount)} Extra`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PayExtraModal;
