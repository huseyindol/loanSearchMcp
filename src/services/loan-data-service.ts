import { LoanType, LoanDetail, LoanSearchParams } from '../types/index.js';

export class LoanDataService {
  private mockLoans: LoanDetail[] = [
    // Konut Kredileri
    {
      id: 'konut-001',
      bankName: 'Türkiye İş Bankası',
      type: LoanType.KONUT,
      interestRate: 1.89,
      monthlyPayment: 0,
      totalPayment: 0,
      minAmount: 100000,
      maxAmount: 10000000,
      maxTermMonths: 360,
      eligibilityNote: 'Maaş promosyonu ile %1.89 faiz oranı'
    },
    {
      id: 'konut-002',
      bankName: 'Garanti BBVA',
      type: LoanType.KONUT,
      interestRate: 1.95,
      monthlyPayment: 0,
      totalPayment: 0,
      minAmount: 150000,
      maxAmount: 8000000,
      maxTermMonths: 360,
      eligibilityNote: 'Bonus Card sahipleri için özel faiz oranı'
    },
    {
      id: 'konut-003',
      bankName: 'Ziraat Bankası',
      type: LoanType.KONUT,
      interestRate: 1.99,
      monthlyPayment: 0,
      totalPayment: 0,
      minAmount: 50000,
      maxAmount: 15000000,
      maxTermMonths: 360,
      eligibilityNote: 'Devlet destekli konut kredisi imkanı'
    },
    {
      id: 'konut-004',
      bankName: 'Akbank',
      type: LoanType.KONUT,
      interestRate: 2.15,
      monthlyPayment: 0,
      totalPayment: 0,
      minAmount: 100000,
      maxAmount: 12000000,
      maxTermMonths: 360,
      eligibilityNote: 'Yeni müşteriler için özel kampanya'
    },

    // İhtiyaç Kredileri
    {
      id: 'ihtiyac-001',
      bankName: 'Türkiye İş Bankası',
      type: LoanType.IHTIYAC,
      interestRate: 3.99,
      monthlyPayment: 0,
      totalPayment: 0,
      minAmount: 5000,
      maxAmount: 500000,
      maxTermMonths: 60,
      eligibilityNote: 'Maaşını bizden alan müşteriler için'
    },
    {
      id: 'ihtiyac-002',
      bankName: 'Yapı Kredi',
      type: LoanType.IHTIYAC,
      interestRate: 4.25,
      monthlyPayment: 0,
      totalPayment: 0,
      minAmount: 10000,
      maxAmount: 750000,
      maxTermMonths: 60,
      eligibilityNote: 'World Card sahipleri özel faiz'
    },
    {
      id: 'ihtiyac-003',
      bankName: 'Garanti BBVA',
      type: LoanType.IHTIYAC,
      interestRate: 4.15,
      monthlyPayment: 0,
      totalPayment: 0,
      minAmount: 5000,
      maxAmount: 600000,
      maxTermMonths: 60,
      eligibilityNote: 'Dijital başvuru ile hızlı onay'
    },

    // Taşıt Kredileri
    {
      id: 'tasit-001',
      bankName: 'VakıfBank',
      type: LoanType.TASIT,
      interestRate: 2.89,
      monthlyPayment: 0,
      totalPayment: 0,
      minAmount: 50000,
      maxAmount: 3000000,
      maxTermMonths: 60,
      eligibilityNote: 'Sıfır araç için özel faiz oranı'
    },
    {
      id: 'tasit-002',
      bankName: 'Halkbank',
      type: LoanType.TASIT,
      interestRate: 3.15,
      monthlyPayment: 0,
      totalPayment: 0,
      minAmount: 25000,
      maxAmount: 2500000,
      maxTermMonths: 60,
      eligibilityNote: 'İkinci el araç kredisi imkanı'
    },
    {
      id: 'tasit-003',
      bankName: 'Akbank',
      type: LoanType.TASIT,
      interestRate: 2.95,
      monthlyPayment: 0,
      totalPayment: 0,
      minAmount: 40000,
      maxAmount: 3500000,
      maxTermMonths: 60,
      eligibilityNote: 'Hibrit/elektrikli araçlar için özel oran'
    }
  ];

  searchLoans(params: LoanSearchParams): LoanDetail[] {
    // İlgili kredi türündeki kredileri filtrele
    const filteredLoans = this.mockLoans
      .filter(loan => loan.type === params.type)
      .filter(loan => params.amount >= loan.minAmount && params.amount <= loan.maxAmount)
      .filter(loan => params.termMonths <= loan.maxTermMonths);

    // Aylık ödeme ve toplam ödeme hesapla
    return filteredLoans.map(loan => {
      const monthlyPayment = this.calculateMonthlyPayment(
        params.amount,
        loan.interestRate,
        params.termMonths
      );
      
      return {
        ...loan,
        monthlyPayment,
        totalPayment: monthlyPayment * params.termMonths
      };
    }).sort((a, b) => a.interestRate - b.interestRate); // Faiz oranına göre sırala
  }

  private calculateMonthlyPayment(amount: number, annualRate: number, months: number): number {
    const monthlyRate = annualRate / 100 / 12;
    if (monthlyRate === 0) return amount / months;
    
    const monthlyPayment = amount * (monthlyRate * Math.pow(1 + monthlyRate, months)) / 
                          (Math.pow(1 + monthlyRate, months) - 1);
    
    return Math.round(monthlyPayment * 100) / 100; // 2 ondalık basamağa yuvarla
  }

  getAllLoanTypes(): string[] {
    return Object.values(LoanType);
  }

  getLoanTypeDisplayName(type: LoanType): string {
    const displayNames = {
      [LoanType.IHTIYAC]: 'İhtiyaç Kredisi',
      [LoanType.KONUT]: 'Konut Kredisi',
      [LoanType.TASIT]: 'Taşıt Kredisi'
    };
    return displayNames[type];
  }
} 