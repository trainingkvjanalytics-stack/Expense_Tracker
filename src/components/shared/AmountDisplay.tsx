import React from 'react';
import type { TransactionType } from '@/types/database';
import { formatCurrency, getTransactionTypeColor } from '@/lib/formatters';
import { cn } from '@/lib/utils';

export interface AmountDisplayProps {
  amount: number;
  type?: TransactionType;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSign?: boolean;
  showDecimals?: boolean;
  className?: string;
}

const sizeClasses: Record<NonNullable<AmountDisplayProps['size']>, string> = {
  sm: 'text-xs sm:text-sm font-medium',
  md: 'text-sm sm:text-base font-semibold',
  lg: 'text-lg sm:text-xl font-bold',
  xl: 'text-2xl sm:text-3xl font-extrabold tracking-tight',
};

export const AmountDisplay: React.FC<AmountDisplayProps> = ({
  amount,
  type,
  size = 'md',
  showSign = false,
  showDecimals = true,
  className,
}) => {
  const colorClass = type ? getTransactionTypeColor(type) : 'text-foreground';

  // Format amount with sign prefix if requested
  const formatted = formatCurrency(Math.abs(amount), {
    showDecimals,
    showSign: false,
  });

  let prefix = '';
  if (showSign) {
    if (type === 'income' || type === 'repayment') {
      prefix = '+';
    } else if (type === 'expense' || type === 'lent') {
      prefix = '-';
    } else if (amount > 0) {
      prefix = '+';
    } else if (amount < 0) {
      prefix = '-';
    }
  } else if (amount < 0) {
    prefix = '-';
  }

  return (
    <span
      className={cn(
        'tabular-nums font-mono-nums tracking-tight inline-flex items-center',
        sizeClasses[size],
        colorClass,
        className
      )}
    >
      {prefix}
      {formatted}
    </span>
  );
};

export default AmountDisplay;
