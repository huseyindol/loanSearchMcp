/**
 * Query Parse Result DTO
 * Result of natural language query parsing
 */
export interface QueryParseResult {
  success: boolean;
  type?: string;
  amount?: number;
  termMonths?: number;
  currency?: string;
  error?: string;
  confidence?: number;
} 