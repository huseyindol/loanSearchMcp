import { BankRepository } from '../../domain/repositories/bank-repository.js';
import { Bank } from '../../domain/entities/bank.js';

/**
 * In-Memory Bank Repository Implementation
 * Mock implementation for development and testing
 */
export class InMemoryBankRepository implements BankRepository {
  private banks: Bank[] = [];

  constructor() {
    this.initializeMockData();
  }

  async findById(id: string): Promise<Bank | null> {
    return this.banks.find(bank => bank.id === id) || null;
  }

  async findByName(name: string): Promise<Bank | null> {
    return this.banks.find(bank => bank.name.toLowerCase() === name.toLowerCase()) || null;
  }

  async findActive(): Promise<Bank[]> {
    return this.banks.filter(bank => bank.isActive);
  }

  async findAll(): Promise<Bank[]> {
    return [...this.banks];
  }

  async save(bank: Bank): Promise<void> {
    const index = this.banks.findIndex(existing => existing.id === bank.id);
    if (index >= 0) {
      this.banks[index] = bank;
    } else {
      this.banks.push(bank);
    }
  }

  async delete(id: string): Promise<void> {
    this.banks = this.banks.filter(bank => bank.id !== id);
  }

  private initializeMockData(): void {
    this.banks = [
      Bank.create('is-bankasi', 'Türkiye İş Bankası'),
      Bank.create('garanti-bbva', 'Garanti BBVA'),
      Bank.create('ziraat-bankasi', 'Ziraat Bankası'),
      Bank.create('akbank', 'Akbank'),
      Bank.create('yapi-kredi', 'Yapı Kredi'),
      Bank.create('vakifbank', 'VakıfBank'),
      Bank.create('halkbank', 'Halkbank'),
      Bank.create('denizbank', 'DenizBank'),
      Bank.create('qnb-finansbank', 'QNB Finansbank'),
      Bank.create('kuveyt-turk', 'Kuveyt Türk')
    ];
  }
} 