import React, { useState, useMemo } from 'react';
import {
  Landmark,
  Clock,
  Sparkles,
  CheckCircle2,
  TrendingDown,
  Trash2,
  Undo2,
  Zap,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
import { formatCurrency, formatDate } from '@/lib/formatters';
import {
  generateLoanSchedule,
  calculatePrepaymentInsight,
  getLoanTypeBadgeColor,
  getLoanTypeLabel,
} from '@/lib/emiCalculations';
import { PayEmiModal } from './PayEmiModal';
import { PayExtraModal } from './PayExtraModal';
import type { Loan, LoanPayment, EmiScheduleItem } from '@/types/loan';
import type { Account, PaymentMode } from '@/types/database';

interface EmiSidePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loan: Loan | null;
  payments: LoanPayment[];
  account?: Account | null;
  onRecordPayment: (params: {
    loan: Loan;
    installmentNumber: number;
    scheduledDate: string;
    scheduledAmount: number;
    actualAmountPaid: number;
    paymentDate: string;
    accountId: string;
    paymentMode: PaymentMode;
    notes?: string;
  }) => Promise<LoanPayment | null>;
  onRecordExtraPayment?: (params: {
    loan: Loan;
    amount: number;
    paymentDate: string;
    accountId: string;
    paymentMode: PaymentMode;
    notes?: string;
  }) => Promise<LoanPayment | null>;
  onDeletePayment: (paymentId: string) => Promise<boolean>;
  onDeleteLoan: (loanId: string) => Promise<boolean>;
}

export const EmiSidePanel: React.FC<EmiSidePanelProps> = ({
  open,
  onOpenChange,
  loan,
  payments,
  account,
  onRecordPayment,
  onRecordExtraPayment,
  onDeletePayment,
  onDeleteLoan,
}) => {
  // Filter for schedule items: 'all' | 'unpaid' | 'paid'
  const [filter, setFilter] = useState<'all' | 'unpaid' | 'paid'>('all');

  // Prepayment Insight interactive state
  const [extraPaymentInput, setExtraPaymentInput] = useState<number>(10000);

  // Modal states
  const [payModalItem, setPayModalItem] = useState<EmiScheduleItem | null>(null);
  const [payExtraModalOpen, setPayExtraModalOpen] = useState<boolean>(false);
  const [deleteConfirmPaymentId, setDeleteConfirmPaymentId] = useState<string | null>(null);
  const [deleteConfirmLoan, setDeleteConfirmLoan] = useState<boolean>(false);

  // Compute live schedule with recorded payments and dynamic rescheduling
  const scheduleData = useMemo(() => {
    if (!loan) return null;
    return generateLoanSchedule(loan, payments);
  }, [loan, payments]);

  // Compute prepayment insight based on current outstanding balance
  const prepaymentInsight = useMemo(() => {
    if (!loan || !scheduleData) return null;
    return calculatePrepaymentInsight(
      scheduleData.currentBalance,
      loan.interest_rate,
      loan.monthly_emi,
      scheduleData.remainingTenureMonths,
      extraPaymentInput
    );
  }, [loan, scheduleData, extraPaymentInput]);

  if (!loan || !scheduleData) return null;

  const typeColors = getLoanTypeBadgeColor(loan.loan_type);
  const percentRepaid = Math.min(
    100,
    Math.round(((loan.principal_amount - scheduleData.currentBalance) / loan.principal_amount) * 100)
  );

  const filteredSchedule = scheduleData.schedule.filter((item) => {
    if (filter === 'unpaid') return !item.isPaid;
    if (filter === 'paid') return item.isPaid;
    return true;
  });

  const nextDueInstallment = scheduleData.schedule.find((item) => !item.isPaid);

  const handlePayConfirm = async (params: {
    actualAmount: number;
    paymentDate: string;
    accountId: string;
    paymentMode: PaymentMode;
    notes?: string;
  }) => {
    if (!payModalItem) return;
    await onRecordPayment({
      loan,
      installmentNumber: payModalItem.installment_number,
      scheduledDate: payModalItem.dueDate,
      scheduledAmount: payModalItem.monthlyPayment,
      actualAmountPaid: params.actualAmount,
      paymentDate: params.paymentDate,
      accountId: params.accountId,
      paymentMode: params.paymentMode,
      notes: params.notes,
    });
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl xl:max-w-4xl p-0 flex flex-col h-full bg-background"
        >
          <SheetTitle className="sr-only">{loan.name}</SheetTitle>
          {/* Header */}
          <div className="border-b border-border p-5 bg-card sticky top-0 z-10 space-y-3">
            <div className="flex items-start justify-between gap-4 pr-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                    {loan.name}
                  </h2>
                  <Badge
                    variant="outline"
                    className={`${typeColors.bg} ${typeColors.text} ${typeColors.border} text-xs font-semibold`}
                  >
                    {getLoanTypeLabel(loan.loan_type)}
                  </Badge>
                  {scheduleData.isFullyPaid || loan.status === 'closed' ? (
                    <Badge className="bg-emerald-600 text-white text-xs">Closed / Fully Paid</Badge>
                  ) : (
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
                      Active
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1">
                    <Landmark className="h-3.5 w-3.5" />
                    {account ? account.name || account.account_name : 'Bank Account'}
                  </span>
                  <span>•</span>
                  <span>Started on {formatDate(loan.start_date)}</span>
                  <span>•</span>
                  <span>Repayment on {loan.repayment_day}th of every month</span>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDeleteConfirmLoan(true)}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                title="Delete Loan"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <div className="rounded-lg bg-muted/50 p-2.5 border border-border/50">
                <span className="text-[11px] text-muted-foreground block">Principal Borrowed</span>
                <span className="text-sm sm:text-base font-bold text-foreground block">
                  {formatCurrency(loan.principal_amount)}
                </span>
              </div>
              <div className="rounded-lg bg-muted/50 p-2.5 border border-border/50">
                <span className="text-[11px] text-muted-foreground block">Outstanding Principal</span>
                <span className="text-sm sm:text-base font-bold text-primary block">
                  {formatCurrency(scheduleData.currentBalance)}
                </span>
              </div>
              <div className="rounded-lg bg-muted/50 p-2.5 border border-border/50">
                <span className="text-[11px] text-muted-foreground block">Monthly EMI</span>
                <span className="text-sm sm:text-base font-bold text-foreground block">
                  {formatCurrency(loan.monthly_emi)}
                </span>
              </div>
              <div className="rounded-lg bg-muted/50 p-2.5 border border-border/50">
                <span className="text-[11px] text-muted-foreground block">Interest Rate</span>
                <span className="text-sm sm:text-base font-bold text-foreground block">
                  {loan.interest_rate}% p.a.
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1 pt-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">
                  Repayment Progress ({percentRepaid}% Principal Paid)
                </span>
                <span className="font-semibold text-foreground">
                  {scheduleData.schedule.filter((s) => s.isPaid).length} of{' '}
                  {scheduleData.schedule.length} Installments
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500 rounded-full"
                  style={{ width: `${percentRepaid}%` }}
                />
              </div>
            </div>
          </div>

          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* ============================================================== */}
            {/* INSIGHT BOX AT THE TOP OF THE TABLE (USER REQUIREMENT) */}
            {/* ============================================================== */}
            {!scheduleData.isFullyPaid && scheduleData.currentBalance > 0 && (
              <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-transparent p-5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-white shadow-xs">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-foreground">
                        Prepayment & Tenure Reduction Insights
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        See how paying extra now shortens your tenure and saves you interest
                      </p>
                    </div>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[5000, 10000, 25000, 50000].map((amt) => (
                      <Button
                        key={amt}
                        type="button"
                        size="sm"
                        variant={extraPaymentInput === amt ? 'default' : 'outline'}
                        onClick={() => setExtraPaymentInput(amt)}
                        className={`h-7 px-2.5 text-xs rounded-full ${
                          extraPaymentInput === amt
                            ? 'bg-violet-600 hover:bg-violet-700 text-white'
                            : 'border-violet-300 dark:border-violet-700 hover:bg-violet-50 dark:hover:bg-violet-950/50'
                        }`}
                      >
                        +{formatCurrency(amt, { showDecimals: false })}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Custom Extra Amount Input & Pay Action */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <span className="text-xs font-medium text-foreground whitespace-nowrap">
                      Test Extra Payment:
                    </span>
                    <div className="relative max-w-xs flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-xs">
                        ₹
                      </span>
                      <Input
                        type="number"
                        step="500"
                        min="500"
                        value={extraPaymentInput || ''}
                        onChange={(e) => setExtraPaymentInput(parseFloat(e.target.value) || 0)}
                        className="pl-7 h-8 text-xs bg-card"
                        placeholder="Enter extra amount"
                      />
                    </div>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setPayExtraModalOpen(true)}
                    className="h-8 px-3.5 text-xs font-semibold rounded-lg bg-violet-600 hover:bg-violet-700 text-white shadow-xs flex items-center gap-1.5"
                  >
                    <Zap className="h-3.5 w-3.5" />
                    Pay Extra Principal Now
                  </Button>
                </div>

                {/* Insight Result Display */}
                {prepaymentInsight && prepaymentInsight.extraAmount > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {/* Months Saved */}
                    <div className="rounded-xl border border-violet-500/20 bg-card p-3.5 flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
                        <Clock className="h-5 w-5" />
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[11px] text-muted-foreground block">
                          Tenure Reduction
                        </span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-lg font-bold text-violet-600 dark:text-violet-400">
                            {prepaymentInsight.monthsSaved} Months Saved!
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground block">
                          Closes in <strong>{prepaymentInsight.newPayoffDate}</strong> (instead of{' '}
                          {prepaymentInsight.currentPayoffDate})
                        </span>
                      </div>
                    </div>

                    {/* Interest Saved */}
                    <div className="rounded-xl border border-emerald-500/20 bg-card p-3.5 flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <TrendingDown className="h-5 w-5" />
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[11px] text-muted-foreground block">
                          Total Interest Saved
                        </span>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(prepaymentInsight.interestSaved)}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground block">
                          Direct savings on remaining interest payments
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ============================================================== */}
            {/* AMORTIZATION & REPAYMENT TABLE */}
            {/* ============================================================== */}
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="text-base font-bold text-foreground">EMI Repayment Schedule</h3>
                  <p className="text-xs text-muted-foreground">
                    Rescheduled automatically when prepayments or custom amounts are paid
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setPayExtraModalOpen(true)}
                    className="h-7 text-xs border-violet-500/30 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/40 font-semibold flex items-center gap-1"
                  >
                    <Zap className="h-3 w-3" /> Pay Extra
                  </Button>

                  {/* Filter Tabs */}
                  <div className="flex items-center rounded-lg bg-muted p-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setFilter('all')}
                      className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                        filter === 'all'
                          ? 'bg-card text-foreground shadow-2xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      All ({scheduleData.schedule.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilter('unpaid')}
                      className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                        filter === 'unpaid'
                          ? 'bg-card text-foreground shadow-2xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Upcoming ({scheduleData.schedule.filter((s) => !s.isPaid).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilter('paid')}
                      className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                        filter === 'paid'
                          ? 'bg-card text-foreground shadow-2xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Paid ({scheduleData.schedule.filter((s) => s.isPaid).length})
                    </button>
                  </div>
                </div>
              </div>

              {/* Table Wrapper */}
              <div className="rounded-xl border border-border bg-card overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border bg-muted/60 text-muted-foreground">
                        <th className="py-3 px-3 text-left font-semibold"># / Due Date</th>
                        <th className="py-3 px-3 text-right font-semibold">EMI Amount</th>
                        <th className="py-3 px-3 text-right font-semibold">Principal</th>
                        <th className="py-3 px-3 text-right font-semibold">Interest</th>
                        <th className="py-3 px-3 text-right font-semibold">Balance</th>
                        <th className="py-3 px-3 text-center font-semibold">Status / Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredSchedule.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-muted-foreground">
                            No installments found in this filter
                          </td>
                        </tr>
                      ) : (
                        filteredSchedule.map((item, index) => {
                          const isNextDue =
                            !item.isPaid &&
                            nextDueInstallment?.installment_number === item.installment_number;

                          const uniqueKey = item.id || `${item.isExtraPayment ? 'extra-' : ''}${item.installment_number}-${item.dueDate}-${index}`;

                          return (
                            <tr
                              key={uniqueKey}
                              className={`transition-colors hover:bg-muted/30 ${
                                item.isExtraPayment
                                  ? 'bg-violet-500/[0.08] hover:bg-violet-500/[0.12] border-l-4 border-l-violet-600 dark:border-l-violet-400 font-medium'
                                  : isNextDue
                                  ? 'bg-primary/5 font-medium'
                                  : item.isPaid
                                  ? 'bg-emerald-500/[0.02]'
                                  : ''
                              }`}
                            >
                              {/* Installment Number & Due Date */}
                              <td className="py-3 px-3 whitespace-nowrap">
                                {item.isExtraPayment ? (
                                  <div className="flex items-center gap-2">
                                    <span className="flex h-5 items-center justify-center rounded-full bg-violet-600 text-white text-[10px] font-bold px-1.5 gap-0.5">
                                      <Zap className="h-2.5 w-2.5" /> Extra
                                    </span>
                                    <div>
                                      <span className="font-bold text-violet-700 dark:text-violet-300 block">
                                        Extra Prepayment
                                      </span>
                                      <span className="text-[10px] text-muted-foreground block">
                                        Paid: {formatDate(item.dueDate, 'dd MMM yyyy')}
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                                        item.isPaid
                                          ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                                          : isNextDue
                                          ? 'bg-primary text-primary-foreground'
                                          : 'bg-muted text-muted-foreground'
                                      }`}
                                    >
                                      {item.installment_number}
                                    </span>
                                    <div>
                                      <span className="font-semibold text-foreground block">
                                        {formatDate(item.dueDate, 'dd MMM yyyy')}
                                      </span>
                                      {item.isPaid && item.paidDetails?.payment_date && (
                                        <span className="text-[10px] text-muted-foreground block">
                                          Paid: {formatDate(item.paidDetails.payment_date, 'dd MMM')}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </td>

                              {/* Monthly Payment Amount */}
                              <td className="py-3 px-3 text-right font-semibold whitespace-nowrap">
                                {item.isExtraPayment ? (
                                  <div>
                                    <span className="text-violet-700 dark:text-violet-300 font-bold block">
                                      +{formatCurrency(item.monthlyPayment)}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground block font-normal">
                                      Prepayment
                                    </span>
                                  </div>
                                ) : (
                                  <div>
                                    <span className="text-foreground block">
                                      {formatCurrency(item.monthlyPayment)}
                                    </span>
                                    {item.extraAmount && item.extraAmount > 0 ? (
                                      <span className="text-[10px] text-violet-600 dark:text-violet-400 block font-normal">
                                        (+{formatCurrency(item.extraAmount)} extra)
                                      </span>
                                    ) : null}
                                  </div>
                                )}
                              </td>

                              {/* Amount to Principal */}
                              <td className="py-3 px-3 text-right whitespace-nowrap font-mono font-medium text-foreground">
                                {item.isExtraPayment ? (
                                  <span className="text-violet-700 dark:text-violet-300 font-bold">
                                    {formatCurrency(item.principalComponent)}
                                  </span>
                                ) : (
                                  formatCurrency(item.principalComponent)
                                )}
                              </td>

                              {/* Amount to Interest */}
                              <td className="py-3 px-3 text-right whitespace-nowrap font-mono">
                                {item.isExtraPayment ? (
                                  <span className="text-muted-foreground text-[11px]">— (₹0)</span>
                                ) : (
                                  <span className="text-amber-600 dark:text-amber-400">
                                    {formatCurrency(item.interestComponent)}
                                  </span>
                                )}
                              </td>

                              {/* Remaining Balance After Payment */}
                              <td className="py-3 px-3 text-right font-semibold text-foreground whitespace-nowrap font-mono">
                                {formatCurrency(item.balanceAfterPayment)}
                              </td>

                              {/* Status / Action Button */}
                              <td className="py-3 px-3 text-center whitespace-nowrap">
                                {item.isExtraPayment ? (
                                  <div className="flex items-center justify-center gap-1.5">
                                    <Badge className="bg-violet-600/15 text-violet-700 dark:text-violet-300 hover:bg-violet-600/20 border-violet-500/30 gap-1 text-[11px] font-semibold py-0.5">
                                      <Sparkles className="h-3 w-3" />
                                      Extra Paid
                                    </Badge>
                                    {item.paidDetails && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setDeleteConfirmPaymentId(item.paidDetails!.id)
                                        }
                                        title="Revert Extra Payment (Restores bank balance and loan schedule)"
                                        className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                                      >
                                        <Undo2 className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                  </div>
                                ) : item.isPaid ? (
                                  <div className="flex items-center justify-center gap-1.5">
                                    <Badge className="bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600/20 border-emerald-500/30 gap-1 text-[11px] font-medium py-0.5">
                                      <CheckCircle2 className="h-3 w-3" />
                                      Paid
                                    </Badge>
                                    {item.paidDetails && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setDeleteConfirmPaymentId(item.paidDetails!.id)
                                        }
                                        title="Revert Payment (Restores bank balance and loan schedule)"
                                        className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                                      >
                                        <Undo2 className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <Button
                                    size="sm"
                                    onClick={() => setPayModalItem(item)}
                                    className={`h-7 px-3 text-xs font-semibold rounded-md shadow-2xs ${
                                      isNextDue
                                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                                    }`}
                                  >
                                    Pay EMI
                                  </Button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Pay EMI Modal */}
      {payModalItem && (
        <PayEmiModal
          open={Boolean(payModalItem)}
          onOpenChange={(val) => !val && setPayModalItem(null)}
          loan={loan}
          item={payModalItem}
          onConfirmPayment={handlePayConfirm}
        />
      )}

      {/* Pay Extra Amount Modal */}
      {payExtraModalOpen && (
        <PayExtraModal
          open={payExtraModalOpen}
          onOpenChange={setPayExtraModalOpen}
          loan={loan}
          currentBalance={scheduleData.currentBalance}
          remainingTenureMonths={scheduleData.remainingTenureMonths}
          onConfirmExtraPayment={async (params) => {
            if (onRecordExtraPayment) {
              await onRecordExtraPayment({
                loan,
                amount: params.amount,
                paymentDate: params.paymentDate,
                accountId: params.accountId,
                paymentMode: params.paymentMode,
                notes: params.notes,
              });
            }
          }}
        />
      )}

      {/* Confirm Payment Revert Dialog */}
      <AlertDialog
        open={Boolean(deleteConfirmPaymentId)}
        onOpenChange={(val) => !val && setDeleteConfirmPaymentId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revert EMI Payment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will undo this recorded installment payment, delete the corresponding expense
              transaction from your bank account (restoring your bank balance), and reschedule the
              loan back.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deleteConfirmPaymentId) {
                  await onDeletePayment(deleteConfirmPaymentId);
                  setDeleteConfirmPaymentId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Revert Payment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Loan Deletion Dialog */}
      <AlertDialog open={deleteConfirmLoan} onOpenChange={setDeleteConfirmLoan}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Loan "{loan.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this loan? All recorded installment payments and linked
              transactions will also be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await onDeleteLoan(loan.id);
                setDeleteConfirmLoan(false);
                onOpenChange(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Loan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default EmiSidePanel;
