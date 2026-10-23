import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  Plus,
  Landmark,
  Calendar,
  Clock,
  Search,
  CheckCircle2,
  TrendingDown,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLoans } from '@/hooks/useLoans';
import { useAccounts } from '@/hooks/useAccounts';
import { formatCurrency, formatDate } from '@/lib/formatters';
import {
  generateLoanSchedule,
  getLoanTypeBadgeColor,
  getLoanTypeLabel,
} from '@/lib/emiCalculations';
import { AddLoanModal } from '@/components/loans/AddLoanModal';
import { EmiSidePanel } from '@/components/loans/EmiSidePanel';
import type { Loan } from '@/types/loan';

export const EmiLoanPage: React.FC = () => {
  const {
    loans,
    summaryMetrics,
    createLoan,
    recordEmiPayment,
    recordExtraLoanPayment,
    deleteLoanPayment,
    deleteLoan,
    getLoanPayments,
  } = useLoans();

  const { accounts } = useAccounts();

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'closed'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);

  // Map accounts by id for fast lookup
  const accountMap = useMemo(() => {
    const map = new Map<string, (typeof accounts)[0]>();
    accounts.forEach((acc) => map.set(acc.id, acc));
    return map;
  }, [accounts]);

  // Filtered loans list
  const filteredLoans = useMemo(() => {
    return loans.filter((loan) => {
      // Status filter
      if (statusFilter === 'active' && loan.status !== 'active') return false;
      if (statusFilter === 'closed' && loan.status !== 'closed') return false;

      // Type filter
      if (typeFilter !== 'all' && loan.loan_type !== typeFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const acc = accountMap.get(loan.account_id);
        const accName = (acc?.name || acc?.account_name || '').toLowerCase();
        const matchesName = loan.name.toLowerCase().includes(query);
        const matchesNotes = (loan.notes || '').toLowerCase().includes(query);
        const matchesAcc = accName.includes(query);
        if (!matchesName && !matchesNotes && !matchesAcc) return false;
      }

      return true;
    });
  }, [loans, statusFilter, typeFilter, searchQuery, accountMap]);

  return (
    <div className="space-y-6 pb-16">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              EMI & Loan Manager
            </h1>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
              {summaryMetrics.activeLoans} Active
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Track all your loans, monthly installments, smart prepayments, and dynamic rescheduling.
          </p>
        </div>

        <Button
          onClick={() => setAddModalOpen(true)}
          className="gap-2 shadow-sm font-semibold self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Loan / EMI</span>
        </Button>
      </div>

      {/* Overview Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Outstanding Balance */}
        <Card className="p-4 bg-gradient-to-br from-card via-card to-primary/[0.04] border-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Outstanding Balance</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-bold text-primary tracking-tight">
            {formatCurrency(summaryMetrics.totalOutstandingBalance)}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Across {summaryMetrics.activeLoans} active loans
          </p>
        </Card>

        {/* Monthly EMI Commitment */}
        <Card className="p-4 bg-gradient-to-br from-card via-card to-amber-500/[0.04] border-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Monthly EMI Commitment</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-bold text-foreground tracking-tight">
            {formatCurrency(summaryMetrics.totalMonthlyCommitment)}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Due every month from bank
          </p>
        </Card>

        {/* Total Principal Borrowed */}
        <Card className="p-4 bg-gradient-to-br from-card via-card to-blue-500/[0.04] border-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total Principal Borrowed</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-bold text-foreground tracking-tight">
            {formatCurrency(summaryMetrics.totalPrincipalBorrowed)}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {summaryMetrics.totalLoans} Total loans tracked
          </p>
        </Card>

        {/* Total Paid So Far */}
        <Card className="p-4 bg-gradient-to-br from-card via-card to-emerald-500/[0.04] border-border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total Amount Paid</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
            {formatCurrency(summaryMetrics.totalPaidAmount)}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Includes {formatCurrency(summaryMetrics.totalInterestPaid)} interest paid
          </p>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Status Tabs */}
        <div className="flex items-center rounded-lg bg-muted p-1 text-xs self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              statusFilter === 'all'
                ? 'bg-card text-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All Loans ({loans.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              statusFilter === 'active'
                ? 'bg-card text-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Active ({summaryMetrics.activeLoans})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('closed')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
              statusFilter === 'closed'
                ? 'bg-card text-foreground shadow-2xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Closed ({summaryMetrics.closedLoans})
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Type Filter */}
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-36 h-9 text-xs bg-card">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="personal">Personal Loan</SelectItem>
              <SelectItem value="home">Home Loan</SelectItem>
              <SelectItem value="car">Vehicle Loan</SelectItem>
              <SelectItem value="gadget">Gadget EMI</SelectItem>
              <SelectItem value="education">Education</SelectItem>
              <SelectItem value="gold">Gold Loan</SelectItem>
              <SelectItem value="business">Business</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>

          {/* Search Input */}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search loans or bank..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs bg-card"
            />
          </div>
        </div>
      </div>

      {/* Loans Grid */}
      {filteredLoans.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2 border-border/80 bg-muted/20">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
            <CreditCard className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-bold text-foreground">No EMI or Loans Found</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
            {searchQuery
              ? 'No loans match your search criteria. Try a different query.'
              : 'Add your home loan, car EMI, gadget zero-cost EMI, or personal loan to see amortization schedules and prepayments.'}
          </p>
          {!searchQuery && (
            <Button
              onClick={() => setAddModalOpen(true)}
              className="mt-5 gap-2 font-semibold"
            >
              <Plus className="h-4 w-4" />
              Add Your First Loan
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLoans.map((loan) => {
            const loanPayments = getLoanPayments(loan.id);
            const scheduleInfo = generateLoanSchedule(loan, loanPayments);
            const account = accountMap.get(loan.account_id);
            const typeColors = getLoanTypeBadgeColor(loan.loan_type);
            const percentPaid = Math.min(
              100,
              Math.round(
                ((loan.principal_amount - scheduleInfo.currentBalance) / loan.principal_amount) * 100
              )
            );
            const isClosed = scheduleInfo.isFullyPaid || loan.status === 'closed';
            const nextDue = scheduleInfo.schedule.find((s) => !s.isPaid);

            return (
              <Card
                key={loan.id}
                onClick={() => setSelectedLoan(loan)}
                className={`p-5 transition-all duration-200 cursor-pointer hover:shadow-md hover:border-primary/40 relative overflow-hidden group flex flex-col justify-between ${
                  isClosed ? 'opacity-80 bg-muted/30' : 'bg-card'
                }`}
              >
                {/* Top Row: Name, Type & Status */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className={`${typeColors.bg} ${typeColors.text} ${typeColors.border} text-[10px] font-semibold py-0`}
                        >
                          {getLoanTypeLabel(loan.loan_type)}
                        </Badge>
                        {isClosed ? (
                          <Badge className="bg-emerald-600 text-white text-[10px] py-0">Closed</Badge>
                        ) : (
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                            <Clock className="h-3 w-3" /> Due on {loan.repayment_day}th
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {loan.name}
                      </h3>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-base font-bold text-primary block">
                        {formatCurrency(loan.monthly_emi)}
                      </span>
                      <span className="text-[10px] text-muted-foreground block">Monthly EMI</span>
                    </div>
                  </div>

                  {/* Bank Account Info */}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 px-2.5 py-1.5 rounded-md">
                    <Landmark className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="truncate">
                      {account ? account.name || account.account_name : 'Bank Account'}
                    </span>
                    {account && (
                      <span className="text-[11px] text-muted-foreground/80 font-mono ml-auto">
                        Bal: {formatCurrency(account.current_balance)}
                      </span>
                    )}
                  </div>

                  {/* Progress Bar & Repaid Stats */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Principal Paid</span>
                      <span className="font-semibold text-foreground">
                        {percentPaid}% ({formatCurrency(loan.principal_amount - scheduleInfo.currentBalance)})
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-500 rounded-full"
                        style={{ width: `${percentPaid}%` }}
                      />
                    </div>
                  </div>

                  {/* Grid of Key Loan Terms */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div className="rounded-lg bg-muted/40 p-2 border border-border/40">
                      <span className="text-[10px] text-muted-foreground block">
                        Remaining Principal
                      </span>
                      <span className="text-xs font-bold text-foreground">
                        {formatCurrency(scheduleInfo.currentBalance)}
                      </span>
                    </div>

                    <div className="rounded-lg bg-muted/40 p-2 border border-border/40">
                      <span className="text-[10px] text-muted-foreground block">Rate & Tenure</span>
                      <span className="text-xs font-bold text-foreground">
                        {loan.interest_rate}% • {loan.tenure_months}m
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer / CTA to open Side Panel */}
                <div className="pt-4 border-t border-border/60 mt-4 flex items-center justify-between text-xs">
                  {nextDue ? (
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      Next:{' '}
                      <strong className="text-foreground font-semibold">
                        {formatDate(nextDue.dueDate, 'dd MMM yyyy')}
                      </strong>
                    </span>
                  ) : (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> All EMIs Paid
                    </span>
                  )}

                  <span className="text-primary font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                    View Schedule <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Loan Modal */}
      <AddLoanModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        onSubmit={async (data) => {
          await createLoan(data);
        }}
      />

      {/* Right-Side EMI Panel */}
      {selectedLoan && (
        <EmiSidePanel
          open={Boolean(selectedLoan)}
          onOpenChange={(val) => !val && setSelectedLoan(null)}
          loan={selectedLoan}
          payments={getLoanPayments(selectedLoan.id)}
          account={accountMap.get(selectedLoan.account_id)}
          onRecordPayment={recordEmiPayment}
          onRecordExtraPayment={recordExtraLoanPayment}
          onDeletePayment={deleteLoanPayment}
          onDeleteLoan={deleteLoan}
        />
      )}
    </div>
  );
};

export default EmiLoanPage;
