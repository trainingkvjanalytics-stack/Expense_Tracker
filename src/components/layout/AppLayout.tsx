import React, { createContext, useContext, useState, useMemo, type ReactNode } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { addMonths, subMonths } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
import AddTransactionFAB from '@/components/layout/AddTransactionFAB';

export interface MonthContextValue {
  selectedMonth: Date;
  setSelectedMonth: (date: Date) => void;
  nextMonth: () => void;
  prevMonth: () => void;
}

export const MonthContext = createContext<MonthContextValue | null>(null);

export const useMonth = (): MonthContextValue => {
  const context = useContext(MonthContext);
  if (!context) {
    throw new Error('useMonth must be used within an AppLayout');
  }
  return context;
};

export interface AppLayoutProps {
  children?: ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState<Date>(() => new Date());

  const monthContextValue = useMemo<MonthContextValue>(
    () => ({
      selectedMonth,
      setSelectedMonth,
      nextMonth: () => setSelectedMonth((prev) => addMonths(prev, 1)),
      prevMonth: () => setSelectedMonth((prev) => subMonths(prev, 1)),
    }),
    [selectedMonth]
  );

  // Authentication check
  if (loading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-3 bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">
          Loading your financial data...
        </p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <MonthContext.Provider value={monthContextValue}>
      <div className="flex min-h-screen bg-background text-foreground antialiased">
        {/* Desktop Sidebar (hidden on mobile) */}
        <Sidebar />

        {/* Main Content Area */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Header */}
          <Header
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
          />

          {/* Page Content */}
          <main className="w-full flex-1 px-3 py-4 sm:px-6 sm:py-6 pb-24 lg:pb-8">
            <div className="mx-auto max-w-7xl">
              {children || <Outlet />}
            </div>
          </main>
        </div>

        {/* Mobile Navigation (hidden on lg: screens) */}
        <BottomNav />

        {/* Floating Action Button for Add Transaction */}
        <AddTransactionFAB />
      </div>
    </MonthContext.Provider>
  );
};

export default AppLayout;
