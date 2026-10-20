import React from 'react';
import { addMonths, subMonths, format, isThisMonth } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface MonthSelectorProps {
  selectedMonth: Date;
  onChange: (date: Date) => void;
  className?: string;
}

export const MonthSelector: React.FC<MonthSelectorProps> = ({
  selectedMonth,
  onChange,
  className,
}) => {
  const handlePrevMonth = () => {
    onChange(subMonths(selectedMonth, 1));
  };

  const handleNextMonth = () => {
    onChange(addMonths(selectedMonth, 1));
  };

  const handleCurrentMonth = () => {
    onChange(new Date());
  };

  const isCurrent = isThisMonth(selectedMonth);

  return (
    <div
      className={cn(
        'inline-flex items-center justify-between gap-1 rounded-lg border border-border bg-card px-1 py-1 shadow-xs',
        className
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        type="button"
        onClick={handlePrevMonth}
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        aria-label="Previous month"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <button
        type="button"
        onClick={handleCurrentMonth}
        className={cn(
          'flex min-w-[120px] items-center justify-center gap-1.5 rounded-md px-2 py-1 text-sm font-semibold transition-colors hover:bg-accent/60 sm:min-w-[140px]',
          isCurrent ? 'text-primary' : 'text-foreground'
        )}
        title={isCurrent ? 'Current month' : 'Click to go to current month'}
      >
        <Calendar className="h-3.5 w-3.5 opacity-70" />
        <span className="truncate">{format(selectedMonth, 'MMMM yyyy')}</span>
      </button>

      <Button
        variant="ghost"
        size="icon"
        type="button"
        onClick={handleNextMonth}
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        aria-label="Next month"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default MonthSelector;
