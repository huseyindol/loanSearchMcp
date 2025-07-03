/**
 * Abstract Base AI Provider
 * Provides common functionality for all AI providers
 */

import { 
  AIProvider, 
  AIProviderType, 
  AIProviderConfig, 
  AIProviderResponse, 
  AIProviderDiagnostics,
  AIProviderError,
  CreditType 
} from '../../types/index.js';
import { Logger } from '../../utils/logger.js';

export abstract class BaseAIProvider implements AIProvider {
  protected config: AIProviderConfig;
  protected _isConfigured: boolean = false;

  constructor(config: AIProviderConfig) {
    this.config = config;
    this._isConfigured = this.validateConfiguration();
  }

  abstract get providerType(): AIProviderType;
  
  get isConfigured(): boolean {
    return this._isConfigured;
  }

  /**
   * Abstract methods to be implemented by concrete providers
   */
  abstract parseQuery(text: string): Promise<AIProviderResponse>;
  abstract testConnectivity(): Promise<boolean>;
  abstract getDiagnostics(): Promise<AIProviderDiagnostics>;

  /**
   * Update provider configuration
   */
  updateConfig(newConfig: Partial<AIProviderConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this._isConfigured = this.validateConfiguration();
    Logger.debug(`${this.providerType} provider configuration updated`, { 
      config: this.sanitizeConfigForLogging() 
    });
  }

  /**
   * Validate basic configuration requirements
   */
  protected validateConfiguration(): boolean {
    if (!this.config.apiKey) {
      Logger.warn(`${this.providerType} provider: API key not configured`);
      return false;
    }

    if (!this.config.model) {
      Logger.warn(`${this.providerType} provider: Model not specified`);
      return false;
    }

    return true;
  }

  /**
   * Validate API key format (to be overridden by specific providers)
   */
  protected validateApiKeyFormat(apiKey: string): boolean {
    return Boolean(apiKey && apiKey.length > 10); // Basic validation
  }

  /**
   * Analyze errors and provide user-friendly messages
   */
  protected analyzeError(error: any): AIProviderError {
    return {
      type: 'UNKNOWN_ERROR',
      userMessage: `${this.providerType} AI bilinmeyen hata: ${error.message || error}`,
      suggestion: 'Loglara bakın ve destek ile iletişime geçin',
      provider: this.providerType,
      originalError: error
    };
  }

  /**
   * Validate loan parameters
   */
  protected validateLoanParameters(amount?: number, term?: number, creditType?: CreditType): string[] {
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
   * Build Turkish loan extraction prompt (common across providers)
   */
  protected buildTurkishLoanPrompt(text: string): string {
    return `Sen bir Türkçe doğal dil işleme uzmanısın. Kullanıcının girdiği metinden kredi bilgilerini çıkarıp JSON formatında döneceksin.

GÖREV: Aşağıdaki metinden kredi türü, tutarı ve vadesini çıkar.

KRİTERLER:
- Kredi türü: "Konut", "Taşıt", "İhtiyaç" (sadece bunlardan biri)
- Tutar: Türk Lirası cinsinden sayı (örn: 2000000)
- Vade: Ay cinsinden sayı (örn: 60) 
- Bilgi bulamazsan null yaz
- Güven seviyeni 0.0-1.0 arası belirt

KULLANICI METNİ:
"${text}"

JSON yanıtını SADECE aşağıdaki schema'ya göre ver:

{
  "creditType": "Konut" | "Taşıt" | "İhtiyaç" | null,
  "amount": number | null,
  "term": number | null,
  "confidence": number,
  "reasoning": "açıklama",
  "extractedInfo": {
    "detectedPhrases": ["bulunan kelimeler"],
    "amountPhrase": "tutar ifadesi" | null,
    "termPhrase": "vade ifadesi" | null,
    "creditTypePhrase": "kredi türü ifadesi" | null
  },
  "uncertainties": ["belirsizlikler"],
  "isLoanQuery": boolean
}`;
  }

  /**
   * Parse response to standardized format
   */
  protected parseResponse(responseText: string, originalText: string): AIProviderResponse {
    try {
      const response = JSON.parse(responseText);
      
      return {
        creditType: response.creditType || null,
        amount: response.amount || null,
        term: response.term || null,
        confidence: response.confidence || 0,
        reasoning: response.reasoning || 'No reasoning provided',
        extractedInfo: {
          detectedPhrases: response.extractedInfo?.detectedPhrases || [],
          amountPhrase: response.extractedInfo?.amountPhrase || null,
          termPhrase: response.extractedInfo?.termPhrase || null,
          creditTypePhrase: response.extractedInfo?.creditTypePhrase || null
        },
        uncertainties: response.uncertainties || [],
        isLoanQuery: response.isLoanQuery || false,
        provider: this.providerType
      };

    } catch (error) {
      Logger.error(`${this.providerType} response parsing failed`, { 
        error, 
        responseText: responseText.substring(0, 200) 
      });
      
      // Return fallback response
      return {
        creditType: null,
        amount: null,
        term: null,
        confidence: 0.1,
        reasoning: `${this.providerType} yanıtı parse edilemedi`,
        extractedInfo: {
          detectedPhrases: [],
          amountPhrase: null,
          termPhrase: null,
          creditTypePhrase: null
        },
        uncertainties: ['PARSE_ERROR'],
        isLoanQuery: responseText.toLowerCase().includes('kredi'),
        provider: this.providerType
      };
    }
  }

  /**
   * Run basic tests
   */
  async runTests(): Promise<void> {
    const testQueries = [
      '2 milyon TL 60 ay vade konut kredisi istiyorum',
      '500 bin TL 5 yıl vadeli ihtiyaç kredisi',
      'Bu sadece test metni kredi değil'
    ];

    Logger.info(`${this.providerType} provider test başlatılıyor`);

    // Check diagnostics first
    const diagnostics = await this.getDiagnostics();
    Logger.info(`${this.providerType} Diagnostics`, diagnostics);

    if (diagnostics.connectionStatus === 'failed') {
      Logger.warn(`${this.providerType} bağlantı sorunu nedeniyle testler atlanıyor`);
      return;
    }

    for (let i = 0; i < testQueries.length; i++) {
      const query = testQueries[i];
      Logger.debug(`${this.providerType} Test ${i + 1}: "${query}"`);
      
      try {
        const result = await this.parseQuery(query);
        Logger.debug(`${this.providerType} Result:`, {
          creditType: result.creditType,
          amount: result.amount,
          term: result.term,
          confidence: result.confidence,
          isLoanQuery: result.isLoanQuery
        });
      } catch (error) {
        Logger.error(`${this.providerType} Test ${i + 1} failed:`, { error });
      }
    }
  }

  /**
   * Get configuration without sensitive data for logging
   */
  protected sanitizeConfigForLogging(): any {
    return {
      type: this.config.type,
      model: this.config.model,
      maxTokens: this.config.maxTokens,
      temperature: this.config.temperature,
      timeout: this.config.timeout,
      maxRetries: this.config.maxRetries,
      apiKey: this.config.apiKey ? `${this.config.apiKey.substring(0, 8)}...` : 'not_set'
    };
  }
} 