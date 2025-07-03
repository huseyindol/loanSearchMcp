import { Bank } from '../entities/bank.js';

/**
 * Bank Repository Interface
 * Defines contract for bank persistence operations
 */
export interface BankRepository {
  findById(id: string): Promise<Bank | null>;
  findByName(name: string): Promise<Bank | null>;
  findActive(): Promise<Bank[]>;
  findAll(): Promise<Bank[]>;
  save(bank: Bank): Promise<void>;
  delete(id: string): Promise<void>;
} 