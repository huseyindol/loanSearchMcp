/**
 * InterestRate Value Object
 * Immutable object representing interest rates
 */
export class InterestRate {
  private readonly _rate: number;

  constructor(rate: number) {
    if (rate < 0) {
      throw new Error('Interest rate cannot be negative');
    }
    if (rate > 100) {
      throw new Error('Interest rate cannot exceed 100%');
    }
    
    this._rate = Math.round(rate * 100) / 100; // 2 decimal places
  }

  get rate(): number {
    return this._rate;
  }

  get monthlyRate(): number {
    return this._rate / 100 / 12;
  }

  equals(other: InterestRate): boolean {
    return this._rate === other._rate;
  }

  isGreaterThan(other: InterestRate): boolean {
    return this._rate > other._rate;
  }

  isLessThan(other: InterestRate): boolean {
    return this._rate < other._rate;
  }

  toString(): string {
    return `${this._rate}%`;
  }

  toDisplay(): string {
    return `%${this._rate}`;
  }

  static fromPercentage(percentage: number): InterestRate {
    return new InterestRate(percentage);
  }

  static zero(): InterestRate {
    return new InterestRate(0);
  }
} 