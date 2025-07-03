import { LoanRepository } from '../../domain/repositories/loan-repository.js';
import { Loan, Bank } from '../../domain/entities/index.js';
import { LoanType, Money, Term, InterestRate } from '../../domain/value-objects/index.js';

/**
 * In-Memory Loan Repository Implementation
 * Mock implementation for development and testing
 */
export class InMemoryLoanRepository implements LoanRepository {
  private loans: Loan[] = [];

  constructor() {
    this.initializeMockData();
  }

  async findById(id: string): Promise<Loan | null> {
    return this.loans.find(loan => loan.id === id) || null;
  }

  async findByType(type: LoanType): Promise<Loan[]> {
    return this.loans.filter(loan => loan.type.equals(type) && loan.isActive);
  }

  async findEligible(type: LoanType, amount: Money, term: Term): Promise<Loan[]> {
    return this.loans.filter(loan => 
      loan.type.equals(type) && 
      loan.isEligible(amount, term)
    );
  }

  async findAll(): Promise<Loan[]> {
    return [...this.loans];
  }

  async save(loan: Loan): Promise<void> {
    const index = this.loans.findIndex(existing => existing.id === loan.id);
    if (index >= 0) {
      this.loans[index] = loan;
    } else {
      this.loans.push(loan);
    }
  }

  async delete(id: string): Promise<void> {
    this.loans = this.loans.filter(loan => loan.id !== id);
  }

  private initializeMockData(): void {
    // Create banks
    const banks = [
      Bank.create('is-bankasi', 'Türkiye İş Bankası'),
      Bank.create('garanti-bbva', 'Garanti BBVA'),
      Bank.create('ziraat-bankasi', 'Ziraat Bankası'),
      Bank.create('akbank', 'Akbank'),
      Bank.create('yapi-kredi', 'Yapı Kredi'),
      Bank.create('vakifbank', 'VakıfBank'),
      Bank.create('halkbank', 'Halkbank')
    ];

    // Create loan types
    const ihtiyacType = LoanType.ihtiyac();
    const konutType = LoanType.konut();
    const tasitType = LoanType.tasit();

    // Create loans
    this.loans = [
      // Konut Kredileri
      Loan.create(
        'konut-001',
        banks[0], // İş Bankası
        konutType,
        InterestRate.fromPercentage(1.89),
        Money.fromNumber(100000),
        Money.fromNumber(10000000),
        Term.fromMonths(360),
        'Maaş promosyonu ile %1.89 faiz oranı'
      ),
      Loan.create(
        'konut-002',
        banks[1], // Garanti BBVA
        konutType,
        InterestRate.fromPercentage(1.95),
        Money.fromNumber(150000),
        Money.fromNumber(8000000),
        Term.fromMonths(360),
        'Bonus Card sahipleri için özel faiz oranı'
      ),
      Loan.create(
        'konut-003',
        banks[2], // Ziraat Bankası
        konutType,
        InterestRate.fromPercentage(1.99),
        Money.fromNumber(50000),
        Money.fromNumber(15000000),
        Term.fromMonths(360),
        'Devlet destekli konut kredisi imkanı'
      ),
      Loan.create(
        'konut-004',
        banks[3], // Akbank
        konutType,
        InterestRate.fromPercentage(2.15),
        Money.fromNumber(100000),
        Money.fromNumber(12000000),
        Term.fromMonths(360),
        'Yeni müşteriler için özel kampanya'
      ),

      // İhtiyaç Kredileri
      Loan.create(
        'ihtiyac-001',
        banks[0], // İş Bankası
        ihtiyacType,
        InterestRate.fromPercentage(3.99),
        Money.fromNumber(5000),
        Money.fromNumber(500000),
        Term.fromMonths(60),
        'Maaşını bizden alan müşteriler için'
      ),
      Loan.create(
        'ihtiyac-002',
        banks[4], // Yapı Kredi
        ihtiyacType,
        InterestRate.fromPercentage(4.25),
        Money.fromNumber(10000),
        Money.fromNumber(750000),
        Term.fromMonths(60),
        'World Card sahipleri özel faiz'
      ),
      Loan.create(
        'ihtiyac-003',
        banks[1], // Garanti BBVA
        ihtiyacType,
        InterestRate.fromPercentage(4.15),
        Money.fromNumber(5000),
        Money.fromNumber(600000),
        Term.fromMonths(60),
        'Dijital başvuru ile hızlı onay'
      ),

      // Taşıt Kredileri
      Loan.create(
        'tasit-001',
        banks[5], // VakıfBank
        tasitType,
        InterestRate.fromPercentage(2.89),
        Money.fromNumber(50000),
        Money.fromNumber(3000000),
        Term.fromMonths(60),
        'Sıfır araç için özel faiz oranı'
      ),
      Loan.create(
        'tasit-002',
        banks[6], // Halkbank
        tasitType,
        InterestRate.fromPercentage(3.15),
        Money.fromNumber(25000),
        Money.fromNumber(2500000),
        Term.fromMonths(60),
        'İkinci el araç kredisi imkanı'
      ),
      Loan.create(
        'tasit-003',
        banks[3], // Akbank
        tasitType,
        InterestRate.fromPercentage(2.95),
        Money.fromNumber(40000),
        Money.fromNumber(3500000),
        Term.fromMonths(60),
        'Hibrit/elektrikli araçlar için özel oran'
      )
    ];
  }
} 