/**
 * Term Value Object
 * Immutable object representing loan terms
 */
export class Term {
  private readonly _months: number;

  constructor(months: number) {
    if (months <= 0) {
      throw new Error('Term must be positive');
    }
    if (months > 360) {
      throw new Error('Term cannot exceed 360 months (30 years)');
    }
    
    this._months = Math.round(months);
  }

  get months(): number {
    return this._months;
  }

  get years(): number {
    return Math.round((this._months / 12) * 100) / 100;
  }

  equals(other: Term): boolean {
    return this._months === other._months;
  }

  isGreaterThan(other: Term): boolean {
    return this._months > other._months;
  }

  isLessThan(other: Term): boolean {
    return this._months < other._months;
  }

  toString(): string {
    if (this._months % 12 === 0) {
      return `${this._months / 12} yıl`;
    }
    return `${this._months} ay`;
  }

  toDisplay(): string {
    const years = Math.floor(this._months / 12);
    const remainingMonths = this._months % 12;
    
    if (years === 0) {
      return `${remainingMonths} ay`;
    }
    if (remainingMonths === 0) {
      return `${years} yıl`;
    }
    return `${years} yıl ${remainingMonths} ay`;
  }

  static fromMonths(months: number): Term {
    return new Term(months);
  }

  static fromYears(years: number): Term {
    return new Term(years * 12);
  }
} 