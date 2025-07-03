/**
 * Customer Entity
 * Represents a customer who can apply for loans
 */
export class Customer {
  private _id: string;
  private _name: string;
  private _email: string;
  private _phone: string;
  private _isActive: boolean;
  private _createdAt: Date;
  private _updatedAt: Date;

  constructor(
    id: string,
    name: string,
    email: string,
    phone: string,
    isActive: boolean = true,
    createdAt?: Date,
    updatedAt?: Date
  ) {
    this.validateInputs(id, name, email, phone);

    this._id = id;
    this._name = name.trim();
    this._email = email.trim().toLowerCase();
    this._phone = phone.trim();
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

  get email(): string {
    return this._email;
  }

  get phone(): string {
    return this._phone;
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
      throw new Error('Customer name cannot be empty');
    }
    this._name = name.trim();
    this._updatedAt = new Date();
  }

  updateEmail(email: string): void {
    if (!email || !this.isValidEmail(email)) {
      throw new Error('Valid email is required');
    }
    this._email = email.trim().toLowerCase();
    this._updatedAt = new Date();
  }

  updatePhone(phone: string): void {
    if (!phone || phone.trim().length === 0) {
      throw new Error('Phone number cannot be empty');
    }
    this._phone = phone.trim();
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

  equals(other: Customer): boolean {
    return this._id === other._id;
  }

  toString(): string {
    return `${this._name} (${this._email})`;
  }

  private validateInputs(id: string, name: string, email: string, phone: string): void {
    if (!id || id.trim().length === 0) {
      throw new Error('Customer ID cannot be empty');
    }
    if (!name || name.trim().length === 0) {
      throw new Error('Customer name cannot be empty');
    }
    if (!email || !this.isValidEmail(email)) {
      throw new Error('Valid email is required');
    }
    if (!phone || phone.trim().length === 0) {
      throw new Error('Phone number cannot be empty');
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static create(id: string, name: string, email: string, phone: string): Customer {
    return new Customer(id, name, email, phone);
  }
} 