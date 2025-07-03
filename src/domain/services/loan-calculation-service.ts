import { Loan } from '../entities/loan.js';
import { Money, Term } from '../value-objects/index.js';

/**
 * Loan Calculation Service
 * Domain service for loan calculation business logic
 */
export class LoanCalculationService {
  
  calculateMonthlyPayment(loan: Loan, amount: Money, term: Term): Money {
    return loan.calculateMonthlyPayment(amount, term);
  }

  calculateTotalPayment(loan: Loan, amount: Money, term: Term): Money {
    return loan.calculateTotalPayment(amount, term);
  }

  calculateTotalInterest(loan: Loan, amount: Money, term: Term): Money {
    const totalPayment = loan.calculateTotalPayment(amount, term);
    return totalPayment.subtract(amount);
  }

  compareLoans(loans: Loan[], amount: Money, term: Term): LoanComparison[] {
    return loans
      .filter(loan => loan.isEligible(amount, term))
      .map(loan => ({
        loan,
        monthlyPayment: loan.calculateMonthlyPayment(amount, term),
        totalPayment: loan.calculateTotalPayment(amount, term),
        totalInterest: this.calculateTotalInterest(loan, amount, term)
      }))
      .sort((a, b) => a.totalPayment.amount - b.totalPayment.amount);
  }

  findBestLoan(loans: Loan[], amount: Money, term: Term): Loan | null {
    const comparisons = this.compareLoans(loans, amount, term);
    return comparisons.length > 0 ? comparisons[0].loan : null;
  }
}

export interface LoanComparison {
  loan: Loan;
  monthlyPayment: Money;
  totalPayment: Money;
  totalInterest: Money;
} 