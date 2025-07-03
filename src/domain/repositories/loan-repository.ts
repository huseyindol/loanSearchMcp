import { Loan } from '../entities/loan.js';
import { LoanType, Money, Term } from '../value-objects/index.js';

/**
 * Loan Repository Interface
 * Defines contract for loan persistence operations
 */
export interface LoanRepository {
  findById(id: string): Promise<Loan | null>;
  findByType(type: LoanType): Promise<Loan[]>;
  findEligible(type: LoanType, amount: Money, term: Term): Promise<Loan[]>;
  findAll(): Promise<Loan[]>;
  save(loan: Loan): Promise<void>;
  delete(id: string): Promise<void>;
} 