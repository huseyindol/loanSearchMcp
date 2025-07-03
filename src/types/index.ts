/**
 * Type definitions for Housing Loan MCP Server
 */

// Logger Types
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
}

// Housing Loan Types
export interface LoanParameters {
  amount: number;
  term: number; // in months
}

export interface LoanResult {
  monthlyPayment: number;
  interestRate: number;
  totalPayment: number;
  totalInterest: number;
  eligibility: boolean;
  mockData?: boolean;
  message?: string;
}

export interface ApiResponse {
  status: number;
  statusText: string;
  data?: any;
  headers?: Record<string, string>;
}

// Credit Types
export enum CreditType {
  KONUT = 'Konut',
  TASIT = 'Taşıt',
  IHTIYAC = 'İhtiyaç'
}

// Natural Language Processing Types
export interface ParsedQuery {
  amount?: number;
  term?: number;
  creditType?: CreditType;
  isHousingLoanQuery: boolean;
  confidence?: number;
  rawText?: string;
  extractedInfo?: {
    detectedPhrases: string[];
    amountPhrase?: string;
    termPhrase?: string;
    creditTypePhrase?: string;
  };
  claudeResponse?: {
    reasoning?: string;
    uncertainties?: string[];
  };
}

export interface ParsingContext {
  originalText: string;
  normalizedText: string;
  detectedKeywords: string[];
  amountMatches: Array<RegExpMatchArray | null>;
  termMatches: Array<RegExpMatchArray | null>;
}

// AI Provider Abstraction Types
export enum AIProviderType {
  CLAUDE = 'claude',
  OPENAI = 'openai',
  MOCK = 'mock'
}

export interface AIProviderConfig {
  type: AIProviderType;
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  timeout?: number;
  maxRetries?: number;
}

export interface AIProviderResponse {
  creditType: CreditType | null;
  amount: number | null;
  term: number | null;
  confidence: number;
  reasoning: string;
  extractedInfo: {
    detectedPhrases: string[];
    amountPhrase: string | null;
    termPhrase: string | null;
    creditTypePhrase: string | null;
  };
  uncertainties: string[];
  isLoanQuery: boolean;
  provider: AIProviderType;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export interface AIProviderError {
  type: string;
  userMessage: string;
  suggestion: string;
  provider: AIProviderType;
  originalError?: any;
}

export interface AIProvider {
  readonly providerType: AIProviderType;
  readonly isConfigured: boolean;
  
  parseQuery(text: string): Promise<AIProviderResponse>;
  testConnectivity(): Promise<boolean>;
  getDiagnostics(): Promise<AIProviderDiagnostics>;
  updateConfig(config: Partial<AIProviderConfig>): void;
}

export interface AIProviderDiagnostics {
  provider: AIProviderType;
  apiKeyStatus: 'missing' | 'invalid_format' | 'configured';
  connectionStatus: 'not_tested' | 'success' | 'failed';
  lastError?: string;
  suggestions: string[];
  modelSupported?: boolean;
}

// Multi-language Support Types (for future)
export enum SupportedLanguage {
  TURKISH = 'tr',
  ENGLISH = 'en',
  ARABIC = 'ar'
}

export interface LanguageConfig {
  language: SupportedLanguage;
  creditTypes: Record<string, CreditType>;
  patterns: {
    amounts: string[];
    terms: string[];
    keywords: string[];
  };
}

// Claude API Types (legacy - keeping for backward compatibility)
export interface ClaudeConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface ClaudeLoanExtractionRequest {
  text: string;
}

export interface ClaudeLoanExtractionResponse {
  creditType: CreditType | null;
  amount: number | null;
  term: number | null;
  confidence: number;
  reasoning: string;
  extractedInfo: {
    detectedPhrases: string[];
    amountPhrase: string | null;
    termPhrase: string | null;
    creditTypePhrase: string | null;
  };
  uncertainties: string[];
  isLoanQuery: boolean;
}

// OpenAI API Types
export interface OpenAIConfig {
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  organizationId?: string;
}

// MCP Tool Types
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, any>;
    required: string[];
  };
}

export interface ToolExecutionContext {
  requestId: string;
  toolName: string;
  arguments: Record<string, any>;
  startTime: number;
}

export interface ToolResult {
  content: Array<{
    type: "text";
    text: string;
  }>;
  isError?: boolean;
}

// Server Configuration Types
export interface ServerConfig {
  name: string;
  version: string;
  logLevel: LogLevel;
  apiTimeout: number;
  mockDataEnabled: boolean;
  aiProvider: AIProviderConfig;
}

export interface ServerCapabilities {
  tools: boolean;
  resources?: boolean;
  prompts?: boolean;
  logging?: boolean;
}

// API Configuration Types
export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  headers: Record<string, string>;
  sslVerifyEnabled: boolean;
}

// Error Types
export interface McpError extends Error {
  code?: string;
  cause?: any;
  requestId?: string;
}

