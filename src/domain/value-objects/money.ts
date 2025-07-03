/**
 * Money Value Object
 * Immutable object representing monetary amounts
 */
export class Money {
  private readonly _amount: number;
  private readonly _currency: string;

  constructor(amount: number, currency: string = 'TRY') {
    if (amount < 0) {
      throw new Error('Amount cannot be negative');
    }
    if (!currency || currency.length !== 3) {
      throw new Error('Currency must be a valid 3-letter code');
    }
    
    this._amount = Math.round(amount * 100) / 100; // 2 decimal places
    this._currency = currency.toUpperCase();
  }

  get amount(): number {
    return this._amount;
  }

  get currency(): string {
    return this._currency;
  }

  equals(other: Money): boolean {
    return this._amount === other._amount && this._currency === other._currency;
  }

  add(other: Money): Money {
    this.ensureSameCurrency(other);
    return new Money(this._amount + other._amount, this._currency);
  }

  subtract(other: Money): Money {
    this.ensureSameCurrency(other);
    return new Money(this._amount - other._amount, this._currency);
  }

  multiply(factor: number): Money {
    return new Money(this._amount * factor, this._currency);
  }

  divide(divisor: number): Money {
    if (divisor === 0) {
      throw new Error('Cannot divide by zero');
    }
    return new Money(this._amount / divisor, this._currency);
  }

  isGreaterThan(other: Money): boolean {
    this.ensureSameCurrency(other);
    return this._amount > other._amount;
  }

  isLessThan(other: Money): boolean {
    this.ensureSameCurrency(other);
    return this._amount < other._amount;
  }

  toString(): string {
    return `${this._amount.toLocaleString('tr-TR')} ${this._currency}`;
  }

  toFormattedString(): string {
    return `₺${this._amount.toLocaleString('tr-TR')}`;
  }

  private ensureSameCurrency(other: Money): void {
    if (this._currency !== other._currency) {
      throw new Error(`Cannot operate on different currencies: ${this._currency} vs ${other._currency}`);
    }
  }

  static zero(currency: string = 'TRY'): Money {
    return new Money(0, currency);
  }

  static fromNumber(amount: number, currency: string = 'TRY'): Money {
    return new Money(amount, currency);
  }
} 