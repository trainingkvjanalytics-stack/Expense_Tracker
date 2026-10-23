import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import {
  CreditCard,
  Percent,
  Clock,
  Sparkles,
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAccounts } from '@/hooks/useAccounts';
import { formatCurrency } from '@/lib/formatters';
import {
  calculateMonthlyEmi,
  calculateTotalInterest,
  calculateTotalPayable,
} from '@/lib/emiCalculations';

const addLoanSchema = z.object({
  name: z.string().min(2, 'Loan or EMI name is required (at least 2 characters)'),
  loan_type: z.enum([
    'personal',
    'home',
    'car',
    'education',
    'gadget',
    'gold',
    'business',
    'other',
  ]),
  principal_amount: z.number().positive('Principal amount must be greater than zero'),
  interest_rate: z.number().min(0, 'Interest rate cannot be negative'),
  tenure_months: z.number().int().positive('Tenure must be at least 1 month'),
  start_date: z.string().min(1, 'Starting date is required'),
  repayment_day: z
    .number()
    .int()
    .min(1, 'Repayment day must be between 1 and 31')
    .max(31, 'Repayment day must be between 1 and 31'),
  account_id: z.string().min(1, 'Please select a bank account'),
  notes: z.string().optional().nullable(),
});

type AddLoanFormValues = z.infer<typeof addLoanSchema>;

interface AddLoanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: AddLoanFormValues) => Promise<unknown>;
}

export const AddLoanModal: React.FC<AddLoanModalProps> = ({
  open,
  onOpenChange,
  onSubmit,
}) => {
  const { accounts } = useAccounts();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fallbackAccount = {
    id: 'acc-primary',
    name: 'HDFC Bank (Primary)',
    account_name: 'HDFC Bank (Primary)',
    bank_name: 'HDFC Bank',
    current_balance: 250000,
  };
  const availableAccounts = accounts.length > 0 ? accounts : [fallbackAccount as any];

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AddLoanFormValues>({
    resolver: zodResolver(addLoanSchema),
    defaultValues: {
      name: '',
      loan_type: 'personal',
      principal_amount: undefined,
      interest_rate: 10.5,
      tenure_months: 24,
      start_date: format(new Date(), 'yyyy-MM-dd'),
      repayment_day: 5,
      account_id: accounts[0]?.id || fallbackAccount.id,
      notes: '',
    },
  });

  // Watch values for live EMI calculation preview
  const watchedPrincipal = watch('principal_amount');
  const watchedRate = watch('interest_rate');
  const watchedTenure = watch('tenure_months');

  const p = Number(watchedPrincipal) || 0;
  const r = Number(watchedRate) >= 0 ? Number(watchedRate) : 0;
  const n = Number(watchedTenure) || 0;

  const previewEmi = p > 0 && n > 0 ? calculateMonthlyEmi(p, r, n) : 0;
  const previewTotalInterest = p > 0 && n > 0 ? calculateTotalInterest(p, previewEmi, n) : 0;
  const previewTotalPayable = p > 0 && n > 0 ? calculateTotalPayable(previewEmi, n) : 0;

  // Set default account when accounts load
  useEffect(() => {
    if (availableAccounts.length > 0 && !watch('account_id')) {
      setValue('account_id', availableAccounts[0].id);
    }
  }, [availableAccounts, setValue, watch]);

  const handleFormSubmit = async (values: AddLoanFormValues) => {
    try {
      setIsSubmitting(true);
      await onSubmit(values);
      reset();
      onOpenChange(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl">Add New EMI / Loan</DialogTitle>
              <DialogDescription>
                Set up a new loan or gadget EMI to track payments and schedule
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 py-2">
          {/* Loan Name & Category Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">
                Loan / EMI Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="e.g. HDFC Car Loan, MacBook EMI"
                {...register('name')}
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="loan_type">Loan Type</Label>
              <Controller
                name="loan_type"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="loan_type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="personal">Personal Loan</SelectItem>
                      <SelectItem value="home">Home Loan</SelectItem>
                      <SelectItem value="car">Vehicle / Car Loan</SelectItem>
                      <SelectItem value="gadget">Gadget / Consumer EMI</SelectItem>
                      <SelectItem value="education">Education Loan</SelectItem>
                      <SelectItem value="gold">Gold Loan</SelectItem>
                      <SelectItem value="business">Business Loan</SelectItem>
                      <SelectItem value="other">Other EMI / Loan</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Principal Amount & Interest Rate */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="principal_amount">
                Principal Amount (₹) <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">
                  ₹
                </span>
                <Input
                  id="principal_amount"
                  type="number"
                  step="any"
                  placeholder="e.g. 500000"
                  className={`pl-8 ${errors.principal_amount ? 'border-destructive' : ''}`}
                  {...register('principal_amount', { valueAsNumber: true })}
                />
              </div>
              {errors.principal_amount && (
                <p className="text-xs text-destructive">{errors.principal_amount.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="interest_rate">
                  Interest Rate (% p.a.) <span className="text-destructive">*</span>
                </Label>
                <button
                  type="button"
                  onClick={() => setValue('interest_rate', 0)}
                  className="text-[11px] text-primary hover:underline font-medium"
                >
                  0% No-Cost EMI
                </button>
              </div>
              <div className="relative">
                <Input
                  id="interest_rate"
                  type="number"
                  step="0.01"
                  placeholder="e.g. 10.5"
                  className={errors.interest_rate ? 'border-destructive' : ''}
                  {...register('interest_rate', { valueAsNumber: true })}
                />
                <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
              {errors.interest_rate && (
                <p className="text-xs text-destructive">{errors.interest_rate.message}</p>
              )}
            </div>
          </div>

          {/* Tenure & Repayment Day */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="tenure_months">
                  Tenure (Months) <span className="text-destructive">*</span>
                </Label>
                <div className="flex gap-1">
                  {[12, 24, 36, 60].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setValue('tenure_months', t)}
                      className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                        watchedTenure === t
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border text-muted-foreground hover:bg-accent'
                      }`}
                    >
                      {t / 12}y
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative">
                <Input
                  id="tenure_months"
                  type="number"
                  placeholder="e.g. 24"
                  className={errors.tenure_months ? 'border-destructive' : ''}
                  {...register('tenure_months', { valueAsNumber: true })}
                />
                <Clock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
              {errors.tenure_months && (
                <p className="text-xs text-destructive">{errors.tenure_months.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="repayment_day">
                Repayment Day in Month <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="repayment_day"
                  type="number"
                  min={1}
                  max={31}
                  placeholder="e.g. 5"
                  className={errors.repayment_day ? 'border-destructive' : ''}
                  {...register('repayment_day', { valueAsNumber: true })}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
                  th of month
                </span>
              </div>
              {errors.repayment_day && (
                <p className="text-xs text-destructive">{errors.repayment_day.message}</p>
              )}
            </div>
          </div>

          {/* Starting Date & Bank Account */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="start_date">
                Starting Date <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="start_date"
                  type="date"
                  className={errors.start_date ? 'border-destructive' : ''}
                  {...register('start_date')}
                />
              </div>
              {errors.start_date && (
                <p className="text-xs text-destructive">{errors.start_date.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="account_id">
                Bank Account <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="account_id"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      id="account_id"
                      className={errors.account_id ? 'border-destructive' : ''}
                    >
                      <SelectValue placeholder="Select bank account" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableAccounts.map((acc: any) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          <div className="flex items-center justify-between w-full gap-2">
                            <span>{acc.name || acc.account_name}</span>
                            <span className="text-xs text-muted-foreground font-mono">
                              ({formatCurrency(acc.current_balance)})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.account_id && (
                <p className="text-xs text-destructive">{errors.account_id.message}</p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes / Loan Account Number (Optional)</Label>
            <Textarea
              id="notes"
              rows={2}
              placeholder="e.g. Loan A/C # 123456789, auto-debit enabled"
              {...register('notes')}
            />
          </div>

          {/* Live Calculated EMI Summary Preview Card */}
          {p > 0 && n > 0 && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3 animate-in fade-in-50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Estimated Loan Breakdown
                </span>
                <span className="text-xs text-muted-foreground">
                  {n} Monthly Payments
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg bg-card p-2.5 shadow-2xs border border-border">
                  <span className="text-[11px] text-muted-foreground block">Monthly EMI</span>
                  <span className="text-base sm:text-lg font-bold text-primary block mt-0.5">
                    {formatCurrency(previewEmi)}
                  </span>
                </div>
                <div className="rounded-lg bg-card p-2.5 shadow-2xs border border-border">
                  <span className="text-[11px] text-muted-foreground block">Total Interest</span>
                  <span className="text-base sm:text-lg font-bold text-amber-600 dark:text-amber-400 block mt-0.5">
                    {formatCurrency(previewTotalInterest)}
                  </span>
                </div>
                <div className="rounded-lg bg-card p-2.5 shadow-2xs border border-border">
                  <span className="text-[11px] text-muted-foreground block">Total Payable</span>
                  <span className="text-base sm:text-lg font-bold text-foreground block mt-0.5">
                    {formatCurrency(previewTotalPayable)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="min-w-[120px]">
              {isSubmitting ? 'Adding...' : 'Add Loan / EMI'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddLoanModal;
