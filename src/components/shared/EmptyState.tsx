import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-card/40 p-6 text-center animate-in fade-in-50',
        className
      )}
    >
      <div className="mb-3.5 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-6 w-6 stroke-[1.75]" />
      </div>
      <h3 className="text-base font-semibold text-foreground tracking-tight">{title}</h3>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground sm:text-sm">
        {description}
      </p>
      {action && (
        <Button
          type="button"
          onClick={action.onClick}
          size="sm"
          className="mt-4 gap-1.5 shadow-xs"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
