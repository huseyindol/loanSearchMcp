/**
 * Loan Search Response DTO
 * Output data for loan search operations
 */
export interface LoanSearchResponse {
  query: string;
  parsedParams: ParsedLoanSearchRequest;
  loans: LoanDto[];
  totalFound: number;
  success: boolean;
  error?: string;
}

export interface ParsedLoanSearchRequest {
  type: string;
  amount: number;
  termMonths: number;
  currency: string;
}

export interface LoanDto {
  id: string;
  bankName: string;
  type: string;
  typeDisplayName: string;
  interestRate: number;
  monthlyPayment: number;
  totalPayment: number;
  totalInterest: number;
  minAmount: number;
  maxAmount: number;
  maxTermMonths: number;
  eligibilityNote: string;
  currency: string;
} 