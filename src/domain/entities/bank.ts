import { Money, InterestRate, Term, LoanType } from '../value-objects/index.js';

/**
 * Bank Entity
 * Represents a financial institution that offers loans
 */
export class Bank {
  private _id: string;
  private _name: string;
  private _isActive: boolean;
  private _createdAt: Date;
  private _updatedAt: Date;

  constructor(
    id: string,
    name: string,
    isActive: boolean = true,
    createdAt?: Date,
    updatedAt?: Date
  ) {
    if (!id || id.trim().length === 0) {
      throw new Error('Bank ID cannot be empty');
    }
    if (!name || name.trim().length === 0) {
      throw new Error('Bank name cannot be empty');
    }

    this._id = id;
    this._name = name.trim();
    this._isActive = isActive;
    this._createdAt = createdAt || new Date();
    this._updatedAt = updatedAt || new Date();
  }

  get id(): string {
    return this._id;
  }

  get name(): string {
    return this._name;
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

  updateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Bank name cannot be empty');
    }
    this._name = name.trim();
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

  equals(other: Bank): boolean {
    return this._id === other._id;
  }

  toString(): string {
    return this._name;
  }

  static create(id: string, name: string): Bank {
    return new Bank(id, name);
  }
} 