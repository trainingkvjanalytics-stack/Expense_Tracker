import { addMonths, format, parseISO, setDate, isValid, getDaysInMonth } from 'date-fns';
import type { Loan, LoanPayment, EmiScheduleItem, PrepaymentInsight, LoanType } from '@/types/loan';
import { round2 } from './calculations';

/**
 * Calculates standard monthly EMI using reducing balance formula.
 * @param principal Principal loan amount
 * @param annualRate Annual interest rate percentage (e.g., 10.5 for 10.5%, 0 for zero-interest)
 * @param tenureMonths Tenure in months
 */
export function calculateMonthlyEmi(
  principal: number,
  annualRate: number,
  tenureMonths: number
): number {
  if (principal <= 0 || tenureMonths <= 0) return 0;
  if (annualRate <= 0) {
    return round2(principal / tenureMonths);
  }

  const monthlyRate = annualRate / (12 * 100);
  const factor = Math.pow(1 + monthlyRate, tenureMonths);
  const emi = (principal * monthlyRate * factor) / (factor - 1);

  return round2(emi);
}

/**
 * Calculates total repayment amount (Principal + Total Interest) for fixed terms
 */
export function calculateTotalPayable(emi: number, tenureMonths: number): number {
  return round2(emi * tenureMonths);
}

/**
 * Calculates total interest payable over the loan duration
 */
export function calculateTotalInterest(principal: number, emi: number, tenureMonths: number): number {
  return round2(Math.max(0, emi * tenureMonths - principal));
}

/**
 * Helper to compute an installment's due date based on start date, repayment day, and index.
 */
export function computeInstallmentDueDate(
  startDateStr: string,
  repaymentDay: number,
  installmentNumber: number
): string {
  try {
    const baseDate = parseISO(startDateStr);
    if (!isValid(baseDate)) {
      return format(new Date(), 'yyyy-MM-dd');
    }

    // Installment 1 is typically in the first month following start date or matching month
    const targetMonthDate = addMonths(baseDate, installmentNumber);
    const maxDays = getDaysInMonth(targetMonthDate);
    const day = Math.min(Math.max(1, repaymentDay), maxDays);
    const resolvedDate = setDate(targetMonthDate, day);

    return format(resolvedDate, 'yyyy-MM-dd');
  } catch {
    return format(new Date(), 'yyyy-MM-dd');
  }
}

/**
 * Generates the complete amortization schedule for a loan, incorporating recorded payments and dynamic rescheduling.
 */
export function generateLoanSchedule(
  loan: Loan,
  recordedPayments: LoanPayment[] = []
): {
  schedule: EmiScheduleItem[];
  currentBalance: number;
  totalPaid: number;
  totalPrincipalPaid: number;
  totalInterestPaid: number;
  remainingTenureMonths: number;
  isFullyPaid: boolean;
} {
  const schedule: EmiScheduleItem[] = [];
  const monthlyRate = loan.interest_rate > 0 ? loan.interest_rate / (12 * 100) : 0;
  const standardEmi = loan.monthly_emi || calculateMonthlyEmi(loan.principal_amount, loan.interest_rate, loan.tenure_months);

  // Separate regular payments and standalone extra prepayments
  const extraPrepayments = recordedPayments.filter(
    (p) => p.payment_type === 'extra_prepayment' || p.is_extra || p.installment_number === 0
  );
  const regularPayments = recordedPayments.filter(
    (p) => !(p.payment_type === 'extra_prepayment' || p.is_extra || p.installment_number === 0)
  );

  const paymentMap = new Map<number, LoanPayment>();
  regularPayments.forEach((p) => {
    paymentMap.set(p.installment_number, p);
  });

  let runningBalance = loan.principal_amount;
  let currentOutstandingBalance = loan.principal_amount;
  let totalPaid = 0;
  let totalPrincipalPaid = 0;
  let totalInterestPaid = 0;
  let installmentNum = 1;

  let extraPrepaymentsApplied = false;

  // Process paid regular installments and apply extra prepayments
  while (runningBalance > 0.01 && installmentNum <= Math.max(loan.tenure_months * 2, 120)) {
    const paid = paymentMap.get(installmentNum);
    const dueDate = computeInstallmentDueDate(loan.start_date, loan.repayment_day, installmentNum);

    if (paid) {
      // Installment is paid: use recorded values
      const interestComp = paid.interest_paid;
      const principalComp = paid.principal_paid;
      runningBalance = round2(paid.remaining_balance_after);
      currentOutstandingBalance = runningBalance;

      totalPaid += paid.actual_amount_paid;
      totalPrincipalPaid += principalComp;
      totalInterestPaid += interestComp;

      const extraPaid = Math.max(0, round2(paid.actual_amount_paid - paid.scheduled_amount));

      schedule.push({
        id: paid.id,
        installment_number: installmentNum,
        dueDate: paid.payment_date || dueDate,
        monthlyPayment: paid.actual_amount_paid,
        principalComponent: principalComp,
        interestComponent: interestComp,
        balanceAfterPayment: runningBalance,
        isPaid: true,
        extraAmount: extraPaid > 0 ? extraPaid : undefined,
        paidDetails: paid,
      });
    } else {
      // Transition from paid to unpaid: deduct any extra prepayments made so far
      if (!extraPrepaymentsApplied) {
        const totalExtraPrincipal = extraPrepayments.reduce(
          (sum, ep) => sum + (ep.principal_paid || ep.actual_amount_paid),
          0
        );
        runningBalance = Math.max(0, round2(runningBalance - totalExtraPrincipal));
        currentOutstandingBalance = runningBalance;
        extraPrepaymentsApplied = true;

        if (runningBalance <= 0.01) {
          break;
        }
      }

      // Unpaid installment: calculate next monthly obligation
      const interestComp = round2(runningBalance * monthlyRate);
      let emiForThisMonth = standardEmi;

      // If running balance + interest is less than standard EMI (final payment)
      if (
        runningBalance + interestComp <= standardEmi ||
        (installmentNum === loan.tenure_months && runningBalance < standardEmi * 1.5)
      ) {
        emiForThisMonth = round2(runningBalance + interestComp);
      }

      const principalComp = round2(Math.min(runningBalance, emiForThisMonth - interestComp));
      runningBalance = round2(Math.max(0, runningBalance - principalComp));

      schedule.push({
        installment_number: installmentNum,
        dueDate,
        monthlyPayment: emiForThisMonth,
        principalComponent: principalComp,
        interestComponent: interestComp,
        balanceAfterPayment: runningBalance,
        isPaid: false,
      });
    }

    if (runningBalance <= 0.01) {
      break;
    }

    installmentNum++;
  }

  // Insert standalone extra prepayments into schedule
  extraPrepayments.forEach((ep) => {
    totalPaid += ep.actual_amount_paid;
    totalPrincipalPaid += ep.principal_paid || ep.actual_amount_paid;
    totalInterestPaid += ep.interest_paid || 0;

    // Deduct from current balance if recorded
    if (ep.remaining_balance_after !== undefined && ep.remaining_balance_after >= 0) {
      currentOutstandingBalance = Math.min(currentOutstandingBalance, ep.remaining_balance_after);
    } else {
      currentOutstandingBalance = Math.max(0, currentOutstandingBalance - ep.actual_amount_paid);
    }

    schedule.push({
      id: ep.id,
      installment_number: 0,
      dueDate: ep.payment_date,
      monthlyPayment: ep.actual_amount_paid,
      principalComponent: ep.principal_paid || ep.actual_amount_paid,
      interestComponent: ep.interest_paid || 0,
      balanceAfterPayment: ep.remaining_balance_after ?? currentOutstandingBalance,
      isPaid: true,
      isExtraPayment: true,
      extraAmount: ep.actual_amount_paid,
      paidDetails: ep,
    });
  });

  // Sort schedule: paid items by date/sequence first, then upcoming unpaid
  schedule.sort((a, b) => {
    if (a.isPaid && !b.isPaid) return -1;
    if (!a.isPaid && b.isPaid) return 1;
    if (a.isPaid && b.isPaid) {
      return a.dueDate.localeCompare(b.dueDate);
    }
    return a.installment_number - b.installment_number;
  });

  const unpaidItems = schedule.filter((item) => !item.isPaid);
  const isFullyPaid =
    currentOutstandingBalance <= 0.01 && schedule.some((item) => item.isPaid);

  return {
    schedule,
    currentBalance: round2(currentOutstandingBalance),
    totalPaid: round2(totalPaid),
    totalPrincipalPaid: round2(totalPrincipalPaid),
    totalInterestPaid: round2(totalInterestPaid),
    remainingTenureMonths: unpaidItems.length,
    isFullyPaid,
  };
}

/**
 * Calculates prepayment insight:
 * Shows how much tenure and interest are saved if the user pays an extra lump sum now.
 */
export function calculatePrepaymentInsight(
  currentBalance: number,
  annualRate: number,
  standardEmi: number,
  remainingTenureMonths: number,
  extraAmount: number
): PrepaymentInsight {
  if (currentBalance <= 0 || extraAmount <= 0) {
    const today = format(new Date(), 'yyyy-MM-dd');
    return {
      extraAmount: 0,
      currentRemainingTenureMonths: remainingTenureMonths,
      newRemainingTenureMonths: remainingTenureMonths,
      monthsSaved: 0,
      currentRemainingInterest: 0,
      newRemainingInterest: 0,
      interestSaved: 0,
      currentPayoffDate: today,
      newPayoffDate: today,
    };
  }

  const monthlyRate = annualRate > 0 ? annualRate / (12 * 100) : 0;

  // 1. Calculate scenario WITHOUT extra prepayment
  let balWithout = currentBalance;
  let totalInterestWithout = 0;
  let monthsWithout = 0;

  while (balWithout > 0.01 && monthsWithout < 480) {
    const intComp = round2(balWithout * monthlyRate);
    totalInterestWithout += intComp;
    const emi = Math.min(standardEmi, balWithout + intComp);
    const princComp = emi - intComp;
    balWithout = Math.max(0, balWithout - princComp);
    monthsWithout++;
  }

  // 2. Calculate scenario WITH extra prepayment now (applied directly to principal)
  let balWith = Math.max(0, currentBalance - extraAmount);
  let totalInterestWith = 0;
  let monthsWith = 0;

  while (balWith > 0.01 && monthsWith < 480) {
    const intComp = round2(balWith * monthlyRate);
    totalInterestWith += intComp;
    const emi = Math.min(standardEmi, balWith + intComp);
    const princComp = emi - intComp;
    balWith = Math.max(0, balWith - princComp);
    monthsWith++;
  }

  const monthsSaved = Math.max(0, monthsWithout - monthsWith);
  const interestSaved = round2(Math.max(0, totalInterestWithout - totalInterestWith));

  const currentDate = new Date();
  const currentPayoffDate = format(addMonths(currentDate, monthsWithout), 'MMM yyyy');
  const newPayoffDate = format(addMonths(currentDate, monthsWith), 'MMM yyyy');

  return {
    extraAmount,
    currentRemainingTenureMonths: monthsWithout,
    newRemainingTenureMonths: monthsWith,
    monthsSaved,
    currentRemainingInterest: round2(totalInterestWithout),
    newRemainingInterest: round2(totalInterestWith),
    interestSaved,
    currentPayoffDate,
    newPayoffDate,
  };
}

/**
 * Returns human-readable label for a loan type
 */
export function getLoanTypeLabel(type: LoanType): string {
  switch (type) {
    case 'home':
      return 'Home Loan';
    case 'car':
      return 'Car / Vehicle Loan';
    case 'personal':
      return 'Personal Loan';
    case 'education':
      return 'Education Loan';
    case 'gadget':
      return 'Gadget / Consumer EMI';
    case 'gold':
      return 'Gold Loan';
    case 'business':
      return 'Business Loan';
    case 'other':
    default:
      return 'Loan / EMI';
  }
}

/**
 * Returns color classes for loan type badge
 */
export function getLoanTypeBadgeColor(type: LoanType): { bg: string; text: string; border: string } {
  switch (type) {
    case 'home':
      return { bg: 'bg-blue-500/10 dark:bg-blue-500/20', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/30' };
    case 'car':
      return { bg: 'bg-emerald-500/10 dark:bg-emerald-500/20', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/30' };
    case 'personal':
      return { bg: 'bg-purple-500/10 dark:bg-purple-500/20', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-500/30' };
    case 'education':
      return { bg: 'bg-amber-500/10 dark:bg-amber-500/20', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/30' };
    case 'gadget':
      return { bg: 'bg-cyan-500/10 dark:bg-cyan-500/20', text: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-500/30' };
    case 'gold':
      return { bg: 'bg-yellow-500/10 dark:bg-yellow-500/20', text: 'text-yellow-600 dark:text-yellow-400', border: 'border-yellow-500/30' };
    case 'business':
      return { bg: 'bg-indigo-500/10 dark:bg-indigo-500/20', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-500/30' };
    case 'other':
    default:
      return { bg: 'bg-slate-500/10 dark:bg-slate-500/20', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-500/30' };
  }
}
