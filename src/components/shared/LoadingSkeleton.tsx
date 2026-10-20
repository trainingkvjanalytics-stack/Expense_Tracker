import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export const DashboardSkeleton: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn('space-y-4 sm:space-y-6', className)}>
      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <Card key={idx} className="p-4">
            <div className="flex items-center justify-between pb-2">
              <Skeleton className="h-3.5 w-16 sm:w-20" />
              <Skeleton className="h-7 w-7 rounded-full" />
            </div>
            <Skeleton className="h-6 w-24 sm:w-28 mt-1" />
            <Skeleton className="h-3 w-16 sm:w-20 mt-2" />
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 p-4 sm:p-6">
          <CardHeader className="p-0 pb-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-8 w-24 rounded-md" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Skeleton className="h-56 sm:h-72 w-full rounded-lg" />
          </CardContent>
        </Card>

        <Card className="p-4 sm:p-6">
          <CardHeader className="p-0 pb-4">
            <Skeleton className="h-5 w-28" />
          </CardHeader>
          <CardContent className="p-0 flex flex-col items-center justify-center">
            <Skeleton className="h-44 w-44 rounded-full" />
            <div className="mt-4 flex w-full justify-around">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-3 w-14" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities Placeholder */}
      <Card className="p-4 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="divide-y divide-border/60">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-28 sm:w-36" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export const ListSkeleton: React.FC<{ count?: number; className?: string }> = ({
  count = 5,
  className,
}) => {
  return (
    <div className={cn('space-y-2.5', className)}>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="flex items-center justify-between rounded-xl border border-border/70 bg-card p-3.5 shadow-xs"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-28 sm:w-44" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-12" />
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <Skeleton className="h-4 w-20 sm:w-24" />
            <Skeleton className="h-3 w-14" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const FormSkeleton: React.FC<{ fields?: number; className?: string }> = ({
  fields = 4,
  className,
}) => {
  return (
    <div className={cn('space-y-4 rounded-xl border border-border bg-card p-4 sm:p-6 shadow-xs', className)}>
      <Skeleton className="h-6 w-40 mb-2" />
      {Array.from({ length: fields }).map((_, idx) => (
        <div key={idx} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      ))}
      <div className="pt-2">
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
    </div>
  );
};

export default {
  DashboardSkeleton,
  ListSkeleton,
  FormSkeleton,
};
