import * as React from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  parseISO,
  isValid,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export interface CalendarProps {
  selected?: Date | string | null;
  onSelect?: (date: Date) => void;
  className?: string;
  initialMonth?: Date;
  minDate?: Date;
  maxDate?: Date;
  disabledDates?: (date: Date) => boolean;
}

export function Calendar({
  selected,
  onSelect,
  className,
  initialMonth,
  minDate,
  maxDate,
  disabledDates,
}: CalendarProps) {
  const selectedDate = React.useMemo(() => {
    if (!selected) return null;
    const d = typeof selected === 'string' ? parseISO(selected) : selected;
    return isValid(d) ? d : null;
  }, [selected]);

  const [currentMonth, setCurrentMonth] = React.useState<Date>(() => {
    if (initialMonth && isValid(initialMonth)) return initialMonth;
    if (selectedDate) return selectedDate;
    return new Date();
  });

  const nextMonth = () => setCurrentMonth((prev) => addMonths(prev, 1));
  const prevMonth = () => setCurrentMonth((prev) => subMonths(prev, 1));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = React.useMemo(
    () => eachDayOfInterval({ start: calendarStart, end: calendarEnd }),
    [calendarStart, calendarEnd]
  );

  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <div className={cn('p-3 select-none w-[280px]', className)}>
      {/* Month & Nav header */}
      <div className="flex items-center justify-between pb-3">
        <span className="text-sm font-semibold text-foreground">
          {format(currentMonth, 'MMMM yyyy')}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={prevMonth}
            className={cn(
              buttonVariants({ variant: 'outline', size: 'icon' }),
              'h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100'
            )}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className={cn(
              buttonVariants({ variant: 'outline', size: 'icon' }),
              'h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100'
            )}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {weekDays.map((wd) => (
          <div
            key={wd}
            className="text-[0.8rem] font-medium text-muted-foreground py-1"
          >
            {wd}
          </div>
        ))}
      </div>

      {/* Calendar days grid */}
      <div className="grid grid-cols-7 gap-1" role="grid">
        {days.map((day) => {
          const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isTodayDate = isToday(day);

          const isDisabled =
            (minDate && day < minDate) ||
            (maxDate && day > maxDate) ||
            (disabledDates ? disabledDates(day) : false);

          return (
            <button
              key={day.toISOString()}
              type="button"
              disabled={isDisabled}
              onClick={() => {
                if (!isDisabled && onSelect) {
                  onSelect(day);
                }
              }}
              className={cn(
                'h-8 w-8 p-0 font-normal rounded-md text-xs flex items-center justify-center transition-colors',
                !isCurrentMonth && 'text-muted-foreground/40',
                isCurrentMonth && !isSelected && 'text-foreground hover:bg-accent hover:text-accent-foreground',
                isTodayDate && !isSelected && 'border border-primary text-primary font-semibold',
                isSelected &&
                  'bg-primary text-primary-foreground font-semibold hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground shadow-xs',
                isDisabled && 'opacity-30 cursor-not-allowed hover:bg-transparent'
              )}
              aria-selected={isSelected}
              role="gridcell"
            >
              <time dateTime={format(day, 'yyyy-MM-dd')}>{format(day, 'd')}</time>
            </button>
          );
        })}
      </div>
    </div>
  );
}
