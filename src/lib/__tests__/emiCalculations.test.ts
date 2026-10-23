import { describe, it, expect } from 'vitest';
import {
  calculateMonthlyEmi,
  calculateTotalInterest,
  calculateTotalPayable,
  generateLoanSchedule,
  calculatePrepaymentInsight,
  getLoanTypeLabel,
  getLoanTypeBadgeColor,
} from '../emiCalculations';
import type { Loan, LoanPayment } from '@/types/loan';

describe('EMI and Loan Calculations', () => {
  it('correctly calculates monthly EMI for standard loans', () => {
    // Principal: ₹1,00,000, 12% p.a., 12 months
    // Standard EMI = [100000 * 0.01 * (1.01)^12] / [(1.01)^12 - 1] ≈ 8884.88
    const emi = calculateMonthlyEmi(100000, 12, 12);
    expect(emi).toBeCloseTo(8884.88, 1);

    const totalPayable = calculateTotalPayable(emi, 12);
    expect(totalPayable).toBeCloseTo(106618.56, 1);

    const totalInterest = calculateTotalInterest(100000, emi, 12);
    expect(totalInterest).toBeCloseTo(6618.56, 1);
  });

  it('correctly calculates 0% no-cost EMI', () => {
    // Principal: ₹60,000, 0% interest, 6 months
    const emi = calculateMonthlyEmi(60000, 0, 6);
    expect(emi).toBe(10000);

    const totalInterest = calculateTotalInterest(60000, emi, 6);
    expect(totalInterest).toBe(0);
  });

  it('generates a full amortization schedule without payments', () => {
    const loan: Loan = {
      id: 'loan-1',
      user_id: 'user-1',
      name: 'iPhone EMI',
      loan_type: 'gadget',
      principal_amount: 60000,
      interest_rate: 0,
      tenure_months: 6,
      start_date: '2026-10-01',
      repayment_day: 5,
      account_id: 'acc-1',
      monthly_emi: 10000,
      status: 'active',
      created_at: '2026-10-01',
    };

    const scheduleInfo = generateLoanSchedule(loan, []);
    expect(scheduleInfo.schedule.length).toBe(6);
    expect(scheduleInfo.currentBalance).toBe(60000);
    expect(scheduleInfo.schedule[0].monthlyPayment).toBe(10000);
    expect(scheduleInfo.schedule[0].isPaid).toBe(false);
  });

  it('reschedules remaining tenure when extra prepayment is made', () => {
    const loan: Loan = {
      id: 'loan-2',
      user_id: 'user-1',
      name: 'Personal Loan',
      loan_type: 'personal',
      principal_amount: 100000,
      interest_rate: 12,
      tenure_months: 12,
      start_date: '2026-10-01',
      repayment_day: 5,
      account_id: 'acc-1',
      monthly_emi: 8885,
      status: 'active',
      created_at: '2026-10-01',
    };

    // First installment regular payment
    const payment1: LoanPayment = {
      id: 'pay-1',
      loan_id: 'loan-2',
      user_id: 'user-1',
      installment_number: 1,
      scheduled_date: '2026-11-05',
      scheduled_amount: 8885,
      actual_amount_paid: 8885,
      payment_date: '2026-11-05',
      principal_paid: 7885,
      interest_paid: 1000,
      remaining_balance_after: 92115,
      account_id: 'acc-1',
      payment_mode: 'upi',
      status: 'paid',
      created_at: '2026-11-05',
    };

    // Second installment: Huge extra prepayment of ₹50,000!
    const payment2: LoanPayment = {
      id: 'pay-2',
      loan_id: 'loan-2',
      user_id: 'user-1',
      installment_number: 2,
      scheduled_date: '2026-12-05',
      scheduled_amount: 8885,
      actual_amount_paid: 50000,
      payment_date: '2026-12-05',
      principal_paid: 49079,
      interest_paid: 921,
      remaining_balance_after: 43036,
      account_id: 'acc-1',
      payment_mode: 'upi',
      status: 'paid',
      created_at: '2026-12-05',
    };

    const scheduleInfo = generateLoanSchedule(loan, [payment1, payment2]);

    // Schedule should be rescheduled to much fewer months because balance is reduced to ₹43,036!
    expect(scheduleInfo.currentBalance).toBe(43036);
    expect(scheduleInfo.schedule.length).toBeLessThan(12);
    expect(scheduleInfo.schedule[0].isPaid).toBe(true);
    expect(scheduleInfo.schedule[1].isPaid).toBe(true);
    expect(scheduleInfo.totalPaid).toBe(58885);
  });

  it('calculates prepayment insight for extra payment', () => {
    // Current outstanding balance: ₹2,00,000, 10% interest rate, EMI ₹10,000, 24 months
    const insight = calculatePrepaymentInsight(200000, 10, 10000, 24, 50000);

    expect(insight.extraAmount).toBe(50000);
    expect(insight.monthsSaved).toBeGreaterThan(0);
    expect(insight.interestSaved).toBeGreaterThan(0);
    expect(insight.newRemainingTenureMonths).toBeLessThan(insight.currentRemainingTenureMonths);
  });

  it('supports standalone extra prepayment and reflects in schedule with isExtraPayment flag', () => {
    const loan: Loan = {
      id: 'loan-3',
      user_id: 'user-1',
      name: 'Car Loan',
      loan_type: 'car',
      principal_amount: 500000,
      interest_rate: 9,
      tenure_months: 60,
      start_date: '2026-01-01',
      repayment_day: 10,
      account_id: 'acc-1',
      monthly_emi: 10379,
      status: 'active',
      created_at: '2026-01-01',
    };

    const extraPayment: LoanPayment = {
      id: 'extra-1',
      loan_id: 'loan-3',
      user_id: 'user-1',
      installment_number: 0,
      payment_type: 'extra_prepayment',
      is_extra: true,
      scheduled_date: '2026-03-15',
      scheduled_amount: 0,
      actual_amount_paid: 100000,
      payment_date: '2026-03-15',
      principal_paid: 100000,
      interest_paid: 0,
      remaining_balance_after: 400000,
      account_id: 'acc-1',
      payment_mode: 'upi',
      status: 'paid',
      created_at: '2026-03-15',
    };

    const scheduleInfo = generateLoanSchedule(loan, [extraPayment]);
    const extraItem = scheduleInfo.schedule.find((s) => s.isExtraPayment);
    expect(extraItem).toBeDefined();
    expect(extraItem?.monthlyPayment).toBe(100000);
    expect(extraItem?.interestComponent).toBe(0);
    expect(extraItem?.principalComponent).toBe(100000);
    expect(scheduleInfo.currentBalance).toBeLessThanOrEqual(400000);
    expect(scheduleInfo.remainingTenureMonths).toBeLessThan(60);
  });

  it('provides appropriate badges and labels for loan types', () => {
    expect(getLoanTypeLabel('home')).toBe('Home Loan');
    expect(getLoanTypeLabel('car')).toBe('Car / Vehicle Loan');
    expect(getLoanTypeBadgeColor('home').bg).toContain('blue');
    expect(getLoanTypeBadgeColor('car').bg).toContain('emerald');
  });
});

