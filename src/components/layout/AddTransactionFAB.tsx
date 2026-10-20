import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  TrendingUp,
  TrendingDown,
  HandCoins,
  LineChart,
  ArrowLeftRight,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface TransactionOption {
  type: string;
  label: string;
  description: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  badgeBg: string;
}

const transactionOptions: TransactionOption[] = [
  {
    type: 'income',
    label: 'Income',
    description: 'Salary, freelance, bonus, or dividends',
    path: '/transaction/new/income',
    icon: TrendingUp,
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    badgeBg: 'bg-emerald-500/10 border-emerald-500/30',
  },
  {
    type: 'expense',
    label: 'Expense',
    description: 'Groceries, bills, dining, or shopping',
    path: '/transaction/new/expense',
    icon: TrendingDown,
    colorClass: 'text-rose-600 dark:text-rose-400',
    badgeBg: 'bg-rose-500/10 border-rose-500/30',
  },
  {
    type: 'lent',
    label: 'Lent Money',
    description: 'Loan or advance given to someone',
    path: '/transaction/new/lent',
    icon: HandCoins,
    colorClass: 'text-amber-600 dark:text-amber-400',
    badgeBg: 'bg-amber-500/10 border-amber-500/30',
  },
  {
    type: 'investment',
    label: 'Investment',
    description: 'SIP, mutual funds, stocks, or gold',
    path: '/transaction/new/investment',
    icon: LineChart,
    colorClass: 'text-purple-600 dark:text-purple-400',
    badgeBg: 'bg-purple-500/10 border-purple-500/30',
  },
  {
    type: 'transfer',
    label: 'Transfer',
    description: 'Move money between your accounts',
    path: '/transaction/new/transfer',
    icon: ArrowLeftRight,
    colorClass: 'text-slate-600 dark:text-slate-400',
    badgeBg: 'bg-slate-500/10 border-slate-500/30',
  },
];

export const AddTransactionFAB: React.FC = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleSelect = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Add transaction"
        className={cn(
          'fixed z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          // Positioned above BottomNav on mobile, bottom-right on desktop
          'bottom-20 right-4 sm:bottom-20 sm:right-6 lg:bottom-8 lg:right-8'
        )}
      >
        <Plus className="h-6 w-6 stroke-[2.5]" />
      </button>

      {/* Transaction Type Sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="px-4 pb-8 pt-3 sm:max-w-md sm:mx-auto sm:rounded-2xl">
          <SheetHeader className="mb-4 text-left">
            <SheetTitle className="text-lg font-bold">Add Transaction</SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              Select the type of transaction you want to record
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-2.5">
            {transactionOptions.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => handleSelect(opt.path)}
                  className="flex w-full min-h-[52px] items-center gap-3.5 rounded-xl border border-border/70 bg-card p-3 text-left transition-all hover:bg-accent/60 active:scale-98"
                >
                  <div
                    className={cn(
                      'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border',
                      opt.badgeBg,
                      opt.colorClass
                    )}
                  >
                    <Icon className="h-5 w-5 stroke-[2]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm font-semibold leading-tight', opt.colorClass)}>
                      {opt.label}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {opt.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default AddTransactionFAB;
