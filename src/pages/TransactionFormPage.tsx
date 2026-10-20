import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowLeft,
  Save,
  Trash2,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { useTransactions } from '@/hooks/useTransactions';
import { useCategories } from '@/hooks/useCategories';
import { useAccounts } from '@/hooks/useAccounts';
import { getTransactionTypeLabel, formatCurrency } from '@/lib/formatters';
import type { TransactionType } from '@/types/database';
import { toast } from 'sonner';

const transactionSchema = z.object({
  type: z.enum(['income', 'expense', 'investment', 'lent', 'repayment', 'transfer']),
  amount: z
    .number()
    .positive('Amount must be greater than zero'),
  category_id: z.string().optional().nullable(),
  subcategory_id: z.string().optional().nullable(),
  transaction_date: z.string().min(1, 'Date is required'),
  payment_mode: z.enum(['cash', 'card', 'upi']),
  account_id: z.string().min(1, 'Please select an account'),
  destination_account_id: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

export const TransactionFormPage: React.FC = () => {
  const { type, id } = useParams<{ type?: string; id?: string }>();
  const navigate = useNavigate();

  const isEdit = Boolean(id);
  const defaultType: TransactionType = (type as TransactionType) || 'expense';

  const { transactions, createTransaction, updateTransaction, deleteTransaction } = useTransactions();
  const { categories, subcategories } = useCategories();
  const { accounts } = useAccounts();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [existingLoaded, setExistingLoaded] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: defaultType,
      amount: undefined,
      category_id: '',
      subcategory_id: '',
      transaction_date: format(new Date(), 'yyyy-MM-dd'),
      payment_mode: 'upi',
      account_id: '',
      destination_account_id: '',
      description: '',
      notes: '',
    },
  });

  const selectedType = watch('type');
  const selectedCategoryId = watch('category_id');

  // Load existing transaction if edit mode
  useEffect(() => {
    if (isEdit && id && transactions.length > 0 && !existingLoaded) {
      const existing = transactions.find((t) => t.id === id);
      if (existing) {
        reset({
          type: existing.type,
          amount: Number(existing.amount),
          category_id: existing.category_id || '',
          subcategory_id: existing.subcategory_id || '',
          transaction_date: existing.transaction_date.slice(0, 10),
          payment_mode: existing.payment_mode || 'upi',
          account_id: existing.account_id || '',
          destination_account_id: existing.to_account_id || '',
          description: existing.description || '',
          notes: existing.notes || '',
        });
        setExistingLoaded(true);
      }
    }
  }, [isEdit, id, transactions, existingLoaded, reset]);

  // Set default account if not set
  useEffect(() => {
    if (accounts.length > 0 && !watch('account_id') && !isEdit) {
      setValue('account_id', accounts[0].id);
    }
  }, [accounts, setValue, isEdit, watch]);

  // Filter categories by selected transaction type
  const filteredCategories = React.useMemo(() => {
    if (selectedType === 'income') {
      return categories.filter((c) => c.type === 'income');
    }
    if (selectedType === 'expense') {
      return categories.filter((c) => c.type === 'expense');
    }
    return categories;
  }, [categories, selectedType]);

  // Filter subcategories by selected category
  const filteredSubcategories = React.useMemo(() => {
    if (!selectedCategoryId) return [];
    return subcategories.filter((s) => s.category_id === selectedCategoryId);
  }, [subcategories, selectedCategoryId]);

  const onSubmit = async (values: TransactionFormValues) => {
    setIsSubmitting(true);
    try {
      if (isEdit && id) {
        const result = await updateTransaction(id, {
          type: values.type,
          amount: values.amount,
          category_id: values.category_id || null,
          subcategory_id: values.subcategory_id || null,
          transaction_date: values.transaction_date,
          payment_mode: values.payment_mode,
          account_id: values.account_id,
          to_account_id: values.destination_account_id || null,
          description: values.description || null,
          notes: values.notes || null,
        });

        if (result) {
          navigate(-1);
        }
      } else {
        const result = await createTransaction({
          type: values.type,
          amount: values.amount,
          category_id: values.category_id || null,
          subcategory_id: values.subcategory_id || null,
          transaction_date: values.transaction_date,
          payment_mode: values.payment_mode,
          account_id: values.account_id,
          to_account_id: values.destination_account_id || null,
          description: values.description || null,
          notes: values.notes || null,
        });

        if (result) {
          navigate(-1);
        }
      }
    } catch {
      toast.error('An unexpected error occurred while saving the transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    setIsSubmitting(true);
    try {
      const success = await deleteTransaction(id);
      if (success) {
        navigate(-1);
      }
    } finally {
      setIsSubmitting(false);
      setShowDeleteConfirm(false);
    }
  };

  const title = isEdit ? 'Edit Transaction' : `Add ${getTransactionTypeLabel(selectedType)}`;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-9 w-9 rounded-full"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{title}</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {isEdit ? 'Update transaction details' : 'Record financial transaction to keep your balance accurate'}
            </p>
          </div>
        </div>

        {isEdit && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowDeleteConfirm(true)}
            className="text-destructive hover:bg-destructive/10 rounded-full"
            aria-label="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Main Form Card */}
      <Card className="shadow-xs border-border/80">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">Transaction Details</CardTitle>
          <CardDescription className="text-xs">
            Enter amount, category, bank account, and date
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Transaction Type Selector (if not edit) */}
            {!isEdit && (
              <div className="space-y-1.5">
                <Label htmlFor="type" className="text-xs font-semibold">Transaction Type</Label>
                <Controller
                  control={control}
                  name="type"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full h-10">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="expense">Expense (-)</SelectItem>
                        <SelectItem value="income">Income (+)</SelectItem>
                        <SelectItem value="transfer">Account Transfer (⇄)</SelectItem>
                        <SelectItem value="investment">Investment (📈)</SelectItem>
                        <SelectItem value="lent">Money Lent (🤝)</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            )}

            {/* Amount Field with INR Rupee Icon */}
            <div className="space-y-1.5">
              <Label htmlFor="amount" className="text-xs font-semibold">
                Amount (₹) <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base font-bold text-muted-foreground">
                  ₹
                </span>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  inputMode="decimal"
                  className={`pl-8 text-lg font-bold h-11 ${
                    errors.amount ? 'border-destructive focus-visible:ring-destructive' : ''
                  }`}
                  {...register('amount', { valueAsNumber: true })}
                />
              </div>
              {errors.amount && (
                <p className="text-xs text-destructive">{errors.amount.message}</p>
              )}
            </div>

            {/* Category & Subcategory (for income/expense) */}
            {(selectedType === 'income' || selectedType === 'expense') && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Category */}
                <div className="space-y-1.5">
                  <Label htmlFor="category_id" className="text-xs font-semibold">
                    Category <span className="text-destructive">*</span>
                  </Label>
                  <Controller
                    control={control}
                    name="category_id"
                    render={({ field }) => (
                      <Select
                        value={field.value || ''}
                        onValueChange={(val) => {
                          field.onChange(val);
                          setValue('subcategory_id', ''); // Reset subcategory when category changes
                        }}
                      >
                        <SelectTrigger className="w-full h-10">
                          <SelectValue placeholder="Select Category" />
                        </SelectTrigger>
                        <SelectContent className="max-h-56">
                          {filteredCategories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              <div className="flex items-center gap-2">
                                <span
                                  className="h-2.5 w-2.5 rounded-full"
                                  style={{ backgroundColor: c.color || '#3b82f6' }}
                                />
                                <span>{c.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.category_id && (
                    <p className="text-xs text-destructive">{errors.category_id.message}</p>
                  )}
                </div>

                {/* Subcategory */}
                <div className="space-y-1.5">
                  <Label htmlFor="subcategory_id" className="text-xs font-semibold">
                    Subcategory (Optional)
                  </Label>
                  <Controller
                    control={control}
                    name="subcategory_id"
                    render={({ field }) => (
                      <Select
                        value={field.value || ''}
                        onValueChange={field.onChange}
                        disabled={!selectedCategoryId || filteredSubcategories.length === 0}
                      >
                        <SelectTrigger className="w-full h-10">
                          <SelectValue
                            placeholder={
                              !selectedCategoryId
                                ? 'Pick category first'
                                : filteredSubcategories.length === 0
                                ? 'No subcategories'
                                : 'Select Subcategory'
                            }
                          />
                        </SelectTrigger>
                        <SelectContent className="max-h-56">
                          {filteredSubcategories.map((sub) => (
                            <SelectItem key={sub.id} value={sub.id}>
                              {sub.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>
            )}

            {/* Date and Payment Mode */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Date */}
              <div className="space-y-1.5">
                <Label htmlFor="transaction_date" className="text-xs font-semibold">
                  Date <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="transaction_date"
                    type="date"
                    className="h-10"
                    {...register('transaction_date')}
                  />
                </div>
                {errors.transaction_date && (
                  <p className="text-xs text-destructive">{errors.transaction_date.message}</p>
                )}
              </div>

              {/* Payment Mode */}
              <div className="space-y-1.5">
                <Label htmlFor="payment_mode" className="text-xs font-semibold">
                  Payment Mode
                </Label>
                <Controller
                  control={control}
                  name="payment_mode"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full h-10">
                        <SelectValue placeholder="Payment Mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="upi">UPI (GPay / PhonePe / Paytm)</SelectItem>
                        <SelectItem value="card">Card (Debit / Credit)</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            {/* Account Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Source Account */}
              <div className="space-y-1.5">
                <Label htmlFor="account_id" className="text-xs font-semibold">
                  {selectedType === 'income' ? 'Destination Account' : 'Paid From Account'}{' '}
                  <span className="text-destructive">*</span>
                </Label>
                <Controller
                  control={control}
                  name="account_id"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full h-10">
                        <SelectValue placeholder="Select Account" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((acc) => (
                          <SelectItem key={acc.id} value={acc.id}>
                            <div className="flex items-center justify-between w-full gap-2">
                              <span>{acc.name || acc.account_name}</span>
                              <span className="text-xs font-semibold text-muted-foreground">
                                ({formatCurrency(acc.current_balance, { showDecimals: false })})
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

              {/* Destination Account for transfers */}
              {selectedType === 'transfer' && (
                <div className="space-y-1.5">
                  <Label htmlFor="destination_account_id" className="text-xs font-semibold">
                    Transfer To Account <span className="text-destructive">*</span>
                  </Label>
                  <Controller
                    control={control}
                    name="destination_account_id"
                    render={({ field }) => (
                      <Select value={field.value || ''} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full h-10">
                          <SelectValue placeholder="Select Target Account" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts
                            .filter((acc) => acc.id !== watch('account_id'))
                            .map((acc) => (
                              <SelectItem key={acc.id} value={acc.id}>
                                {acc.name || acc.account_name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              )}
            </div>

            {/* Description Field */}
            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs font-semibold">
                Title / Description
              </Label>
              <Input
                id="description"
                placeholder="e.g., Grocery shopping at Nature Basket, Monthly salary"
                className="h-10"
                {...register('description')}
              />
            </div>

            {/* Notes Field */}
            <div className="space-y-1.5">
              <Label htmlFor="notes" className="text-xs font-semibold">
                Additional Notes (Optional)
              </Label>
              <Textarea
                id="notes"
                rows={2}
                placeholder="Bill number, items purchased, remarks..."
                className="resize-none"
                {...register('notes')}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" className="gap-2" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    {isEdit ? 'Update Transaction' : 'Save Transaction'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this transaction record and revert its balance impact
              on your accounts and monthly totals.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? 'Deleting...' : 'Yes, Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TransactionFormPage;
