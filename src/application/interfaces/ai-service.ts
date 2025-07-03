import { QueryParseResult } from '../dtos/query-parse-result.js';

/**
 * AI Service Interface
 * Abstraction for AI-based natural language processing
 */
export interface AIService {
  parseQuery(query: string): Promise<QueryParseResult>;
} 