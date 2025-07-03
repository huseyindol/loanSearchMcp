// Kredi türleri enum'u
export enum LoanType {
  IHTIYAC = 'ihtiyac',
  KONUT = 'konut',
  TASIT = 'tasit'
}

// Kredi arama parametreleri
export interface LoanSearchParams {
  type: LoanType;
  amount: number;
  termMonths: number;
}

// Parse edilmiş sorgu sonucu
export interface ParsedQuery {
  success: boolean;
  params?: LoanSearchParams;
  error?: string;
}

// Kredi detayları
export interface LoanDetail {
  id: string;
  bankName: string;
  type: LoanType;
  interestRate: number;
  monthlyPayment: number;
  totalPayment: number;
  minAmount: number;
  maxAmount: number;
  maxTermMonths: number;
  eligibilityNote: string;
}

// Kredi arama sonucu
export interface LoanSearchResult {
  query: string;
  parsedParams: LoanSearchParams;
  loans: LoanDetail[];
  totalFound: number;
} 