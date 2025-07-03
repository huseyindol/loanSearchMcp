/**
 * Natural Language Processing Service
 * Modern AI-powered text analysis with multiple provider support
 */

import { 
  ParsedQuery, 
  CreditType, 
  AIProviderType,
  SupportedLanguage 
} from '../types/index.js';
import { Logger } from '../utils/logger.js';
import { AIProviderFactory } from './ai-providers/index.js';
import type { AIProvider } from './ai-providers/index.js';

export class NaturalLanguageService {
  private static currentProvider: AIProvider | null = null;
  private static preferredProviderType: AIProviderType = AIProviderType.OPENAI; // Default to OpenAI as requested
  private static language: SupportedLanguage = SupportedLanguage.TURKISH;

  /**
   * Initialize the service with provider selection
   */
  static initialize(
    preferredProvider?: AIProviderType, 
    language: SupportedLanguage = SupportedLanguage.TURKISH
  ): void {
    this.preferredProviderType = preferredProvider || AIProviderType.OPENAI;
    this.language = language;
    
    // Create provider from environment
    this.currentProvider = AIProviderFactory.createFromEnvironment(
      this.preferredProviderType,
      this.language
    );

    Logger.info('Natural Language Service initialized', {
      provider: this.currentProvider.providerType,
      configured: this.currentProvider.isConfigured,
      language: this.language
    });
  }

  /**
   * Parse natural language query with automatic provider selection
   */
  static async parseQuery(text: string): Promise<ParsedQuery> {
    const timer = Logger.startTimer('natural-language-parsing');
    
    try {
      // Ensure provider is initialized
      if (!this.currentProvider) {
        this.initialize();
      }

      Logger.debug('Starting natural language parsing', { 
        originalText: text,
        provider: this.currentProvider!.providerType
      });

      // Parse with current provider
      const result = await this.currentProvider!.parseQuery(text);
      
      // Convert AI provider response to ParsedQuery format
      const parsedQuery = this.convertToParseQuery(result, text);
      
      timer();
      
      Logger.info('Natural language parsing completed', {
        provider: result.provider,
        confidence: result.confidence,
        isLoanQuery: result.isLoanQuery,
        creditType: result.creditType
      });

      return parsedQuery;

    } catch (error) {
      timer();
      
      Logger.error('Natural language parsing failed', { 
        text, 
        provider: this.currentProvider?.providerType,
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Try fallback provider if available
      return this.tryFallbackProvider(text);
    }
  }

  /**
   * Try fallback provider on primary failure
   */
  private static async tryFallbackProvider(text: string): Promise<ParsedQuery> {
    try {
      const recommendation = AIProviderFactory.getRecommendedProvider(this.language);
      const fallbackType = this.currentProvider?.providerType === recommendation.primary 
        ? recommendation.fallback 
        : recommendation.primary;

      Logger.warn(`Trying fallback provider: ${fallbackType}`);
      
      const fallbackProvider = AIProviderFactory.createFromEnvironment(fallbackType, this.language);
      const result = await fallbackProvider.parseQuery(text);
      
      return this.convertToParseQuery(result, text);
      
    } catch (fallbackError) {
      Logger.error('Fallback provider also failed', { fallbackError });
      
      // Return minimal failed response
      return this.createFailedResponse(text);
    }
  }

  /**
   * Convert AI provider response to ParsedQuery format
   */
  private static convertToParseQuery(result: any, originalText: string): ParsedQuery {
    return {
      amount: result.amount || undefined,
      term: result.term || undefined,
      creditType: result.creditType || undefined,
      isHousingLoanQuery: result.isLoanQuery,
      confidence: result.confidence,
      rawText: originalText,
      extractedInfo: {
        detectedPhrases: result.extractedInfo.detectedPhrases,
        amountPhrase: result.extractedInfo.amountPhrase || undefined,
        termPhrase: result.extractedInfo.termPhrase || undefined,
        creditTypePhrase: result.extractedInfo.creditTypePhrase || undefined
      },
      claudeResponse: {
        reasoning: result.reasoning,
        uncertainties: result.uncertainties
      }
    };
  }

  /**
   * Create failed response
   */
  private static createFailedResponse(text: string): ParsedQuery {
    return {
      isHousingLoanQuery: false,
      confidence: 0,
      rawText: text,
      claudeResponse: {
        reasoning: 'Tüm AI providers başarısız oldu',
        uncertainties: ['ALL_PROVIDERS_FAILED']
      }
    };
  }

  /**
   * Switch AI provider dynamically
   */
  static switchProvider(providerType: AIProviderType): void {
    try {
      this.preferredProviderType = providerType;
      this.currentProvider = AIProviderFactory.createFromEnvironment(providerType, this.language);
      
      Logger.info('AI provider switched successfully', {
        newProvider: providerType,
        configured: this.currentProvider.isConfigured
      });
    } catch (error) {
      Logger.error('Failed to switch AI provider', { providerType, error });
      throw new Error(`Cannot switch to provider ${providerType}: ${error}`);
    }
  }

  /**
   * Get current provider information
   */
  static getCurrentProvider(): {
    type: AIProviderType;
    isConfigured: boolean;
    language: SupportedLanguage;
  } {
    return {
      type: this.currentProvider?.providerType || this.preferredProviderType,
      isConfigured: this.currentProvider?.isConfigured || false,
      language: this.language
    };
  }

  /**
   * Test connectivity of current provider
   */
  static async testConnectivity(): Promise<boolean> {
    if (!this.currentProvider) {
      this.initialize();
    }
    
    try {
      return await this.currentProvider!.testConnectivity();
    } catch (error) {
      Logger.error('Provider connectivity test failed', { error });
      return false;
    }
  }

  /**
   * Get diagnostics for current provider
   */
  static async getDiagnostics(): Promise<any> {
    if (!this.currentProvider) {
      this.initialize();
    }
    
    try {
      return await this.currentProvider!.getDiagnostics();
    } catch (error) {
      Logger.error('Provider diagnostics failed', { error });
      return {
        provider: this.currentProvider?.providerType || 'unknown',
        error: error instanceof Error ? error.message : String(error),
        connectionStatus: 'failed'
      };
    }
  }

  /**
   * Get diagnostics for all available providers
   */
  static async getAllDiagnostics(): Promise<Record<AIProviderType, any>> {
    try {
      return await AIProviderFactory.runDiagnostics();
    } catch (error) {
      Logger.error('Failed to get all provider diagnostics', { error });
      return {} as Record<AIProviderType, any>;
    }
  }

  /**
   * Validate parsed loan parameters
   */
  static validateParameters(amount?: number, term?: number, creditType?: CreditType): string[] {
    const errors: string[] = [];

    if (amount !== undefined) {
      if (amount <= 0) errors.push('Kredi tutarı pozitif olmalıdır');
      if (amount < 50000) errors.push('Minimum kredi tutarı 50,000 TL olmalıdır');
      if (amount > 10000000) errors.push('Maksimum kredi tutarı 10,000,000 TL olmalıdır');
    }

    if (term !== undefined) {
      if (term <= 0) errors.push('Kredi vadesi pozitif olmalıdır');
      if (term < 6) errors.push('Minimum kredi vadesi 6 ay olmalıdır');
      if (term > 360) errors.push('Maksimum kredi vadesi 360 ay (30 yıl) olmalıdır');
    }

    if (creditType && !Object.values(CreditType).includes(creditType)) {
      errors.push('Geçersiz kredi türü. Konut, Taşıt veya İhtiyaç olmalıdır');
    }

    return errors;
  }

  /**
   * Run comprehensive tests with Turkish loan queries
   */
  static async runTests(): Promise<void> {
    const testQueries = [
      '2 milyon TL 60 ay vade konut kredisi istiyorum',
      '1.500.000 lira 48 aylık ev kredisi hesapla',
      '500 bin TL 5 yıl vadeli ihtiyaç kredisi',
      'Araç alımı için 800000 TL 72 ay kredi',
      'Taşıt kredisi 1 milyon lira 10 yıl vade',
      'Ev satın almak için 3.5 milyon 120 ay konut kredisi',
      '5 milyon 48 ay vade konut kredisi sorgula',
      'Bu sadece test metni kredi değil'
    ];

    Logger.info('Running comprehensive natural language parsing tests');

    // Test all available providers
    const providers = AIProviderFactory.getAvailableProviders();
    
    for (const providerType of providers) {
      Logger.info(`Testing provider: ${providerType}`);
      
      try {
        // Switch to this provider
        this.switchProvider(providerType);
        
        // Check diagnostics first
        const diagnostics = await this.getDiagnostics();
        Logger.info(`${providerType} Diagnostics`, diagnostics);

        if (diagnostics.connectionStatus === 'failed') {
          Logger.warn(`Skipping ${providerType} tests due to connection issues`);
          continue;
        }

        // Run test queries
        for (let i = 0; i < testQueries.length; i++) {
          const query = testQueries[i];
          Logger.debug(`${providerType} Test ${i + 1}: "${query}"`);
          
          try {
            const result = await this.parseQuery(query);
            Logger.debug(`${providerType} Result:`, {
              creditType: result.creditType,
              amount: result.amount,
              term: result.term,
              confidence: result.confidence,
              isLoanQuery: result.isHousingLoanQuery
            });
          } catch (error) {
            Logger.error(`${providerType} Test ${i + 1} failed:`, { error });
          }
        }
      } catch (error) {
        Logger.error(`Failed to test provider ${providerType}:`, { error });
      }
    }
  }

  /**
   * Get provider recommendations
   */
  static getProviderRecommendations(): any {
    return AIProviderFactory.getRecommendedProvider(this.language);
  }

  /**
   * Set language for processing
   */
  static setLanguage(language: SupportedLanguage): void {
    this.language = language;
    // Reinitialize with new language setting
    this.initialize(this.preferredProviderType, language);
  }
} 