import { Money, InterestRate, Term, LoanType } from '../value-objects/index.js';
import { Bank } from './bank.js';

/**
 * Loan Entity
 * Represents a loan product offered by a bank
 */
export class Loan {
  private _id: string;
  private _bank: Bank;
  private _type: LoanType;
  private _interestRate: InterestRate;
  private _minAmount: Money;
  private _maxAmount: Money;
  private _maxTerm: Term;
  private _eligibilityNote: string;
  private _isActive: boolean;
  private _createdAt: Date;
  private _updatedAt: Date;

  constructor(
    id: string,
    bank: Bank,
    type: LoanType,
    interestRate: InterestRate,
    minAmount: Money,
    maxAmount: Money,
    maxTerm: Term,
    eligibilityNote: string,
    isActive: boolean = true,
    createdAt?: Date,
    updatedAt?: Date
  ) {
    this.validateInputs(id, bank, type, interestRate, minAmount, maxAmount, maxTerm, eligibilityNote);

    this._id = id;
    this._bank = bank;
    this._type = type;
    this._interestRate = interestRate;
    this._minAmount = minAmount;
    this._maxAmount = maxAmount;
    this._maxTerm = maxTerm;
    this._eligibilityNote = eligibilityNote.trim();
    this._isActive = isActive;
    this._createdAt = createdAt || new Date();
    this._updatedAt = updatedAt || new Date();
  }

  get id(): string {
    return this._id;
  }

  get bank(): Bank {
    return this._bank;
  }

  get type(): LoanType {
    return this._type;
  }

  get interestRate(): InterestRate {
    return this._interestRate;
  }

  get minAmount(): Money {
    return this._minAmount;
  }

  get maxAmount(): Money {
    return this._maxAmount;
  }

  get maxTerm(): Term {
    return this._maxTerm;
  }

  get eligibilityNote(): string {
    return this._eligibilityNote;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  calculateMonthlyPayment(amount: Money, term: Term): Money {
    if (!this.isEligibleForAmount(amount)) {
      throw new Error(`Amount ${amount.toFormattedString()} is not within loan limits`);
    }
    if (!this.isEligibleForTerm(term)) {
      throw new Error(`Term ${term.toString()} exceeds maximum term`);
    }

    const monthlyRate = this._interestRate.monthlyRate;
    if (monthlyRate === 0) {
      return amount.divide(term.months);
    }

    const monthlyPayment = amount.amount * (monthlyRate * Math.pow(1 + monthlyRate, term.months)) / 
                          (Math.pow(1 + monthlyRate, term.months) - 1);
    
    return Money.fromNumber(monthlyPayment, amount.currency);
  }

  calculateTotalPayment(amount: Money, term: Term): Money {
    const monthlyPayment = this.calculateMonthlyPayment(amount, term);
    return monthlyPayment.multiply(term.months);
  }

  isEligibleForAmount(amount: Money): boolean {
    return !amount.isLessThan(this._minAmount) && !amount.isGreaterThan(this._maxAmount);
  }

  isEligibleForTerm(term: Term): boolean {
    return !term.isGreaterThan(this._maxTerm);
  }

  isEligible(amount: Money, term: Term): boolean {
    return this._isActive && this.isEligibleForAmount(amount) && this.isEligibleForTerm(term);
  }

  updateInterestRate(newRate: InterestRate): void {
    this._interestRate = newRate;
    this._updatedAt = new Date();
  }

  updateEligibilityNote(note: string): void {
    if (!note || note.trim().length === 0) {
      throw new Error('Eligibility note cannot be empty');
    }
    this._eligibilityNote = note.trim();
    this._updatedAt = new Date();
  }

  activate(): void {
    this._isActive = true;
    this._updatedAt = new Date();
  }

  deactivate(): void {
    this._isActive = false;
    this._updatedAt = new Date();
  }

  equals(other: Loan): boolean {
    return this._id === other._id;
  }

  toString(): string {
    return `${this._bank.name} - ${this._type.toDisplay()} (${this._interestRate.toString()})`;
  }

  private validateInputs(
    id: string,
    bank: Bank,
    type: LoanType,
    interestRate: InterestRate,
    minAmount: Money,
    maxAmount: Money,
    maxTerm: Term,
    eligibilityNote: string
  ): void {
    if (!id || id.trim().length === 0) {
      throw new Error('Loan ID cannot be empty');
    }
    if (!bank) {
      throw new Error('Bank is required');
    }
    if (!type) {
      throw new Error('Loan type is required');
    }
    if (!interestRate) {
      throw new Error('Interest rate is required');
    }
    if (!minAmount) {
      throw new Error('Minimum amount is required');
    }
    if (!maxAmount) {
      throw new Error('Maximum amount is required');
    }
    if (!maxTerm) {
      throw new Error('Maximum term is required');
    }
    if (!eligibilityNote || eligibilityNote.trim().length === 0) {
      throw new Error('Eligibility note cannot be empty');
    }
    if (minAmount.isGreaterThan(maxAmount)) {
      throw new Error('Minimum amount cannot be greater than maximum amount');
    }
  }

  static create(
    id: string,
    bank: Bank,
    type: LoanType,
    interestRate: InterestRate,
    minAmount: Money,
    maxAmount: Money,
    maxTerm: Term,
    eligibilityNote: string
  ): Loan {
    return new Loan(id, bank, type, interestRate, minAmount, maxAmount, maxTerm, eligibilityNote);
  }
} 