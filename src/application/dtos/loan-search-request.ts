/**
 * Loan Search Request DTO
 * Input data for loan search operations
 */
export interface LoanSearchRequest {
  query: string;
  type?: string;
  amount?: number;
  termMonths?: number;
  currency?: string;
} 