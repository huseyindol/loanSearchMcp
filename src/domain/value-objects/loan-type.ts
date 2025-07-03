/**
 * LoanType Value Object
 * Immutable object representing loan types
 */
export class LoanType {
  private readonly _type: string;
  private readonly _displayName: string;

  private static readonly VALID_TYPES = {
    'ihtiyac': 'İhtiyaç Kredisi',
    'konut': 'Konut Kredisi',
    'tasit': 'Taşıt Kredisi'
  } as const;

  constructor(type: string) {
    if (!this.isValidType(type)) {
      throw new Error(`Invalid loan type: ${type}. Valid types: ${Object.keys(LoanType.VALID_TYPES).join(', ')}`);
    }
    
    this._type = type;
    this._displayName = LoanType.VALID_TYPES[type as keyof typeof LoanType.VALID_TYPES];
  }

  get type(): string {
    return this._type;
  }

  get displayName(): string {
    return this._displayName;
  }

  equals(other: LoanType): boolean {
    return this._type === other._type;
  }

  toString(): string {
    return this._type;
  }

  toDisplay(): string {
    return this._displayName;
  }

  private isValidType(type: string): boolean {
    return Object.keys(LoanType.VALID_TYPES).includes(type);
  }

  static ihtiyac(): LoanType {
    return new LoanType('ihtiyac');
  }

  static konut(): LoanType {
    return new LoanType('konut');
  }

  static tasit(): LoanType {
    return new LoanType('tasit');
  }

  static fromString(type: string): LoanType {
    return new LoanType(type);
  }

  static getAllTypes(): LoanType[] {
    return Object.keys(LoanType.VALID_TYPES).map(type => new LoanType(type));
  }
} 