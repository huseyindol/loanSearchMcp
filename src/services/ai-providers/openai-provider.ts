/**
 * OpenAI Provider Implementation
 * Uses OpenAI GPT models for Turkish loan query parsing
 */

import OpenAI from 'openai';
import { BaseAIProvider } from './base-provider.js';
import { 
  AIProviderType, 
  AIProviderConfig, 
  AIProviderResponse, 
  AIProviderDiagnostics,
  AIProviderError 
} from '../../types/index.js';
import { Logger } from '../../utils/logger.js';

export class OpenAIProvider extends BaseAIProvider {
  private openai: OpenAI | null = null;

  constructor(config: AIProviderConfig) {
    super(config);
  }

  get providerType(): AIProviderType {
    return AIProviderType.OPENAI;
  }

  /**
   * Initialize OpenAI client with Context7 best practices
   */
  private initializeOpenAI(): boolean {
    if (!this.config.apiKey) {
      Logger.warn('OpenAI API key not found in configuration');
      return false;
    }

    try {
      this.openai = new OpenAI({
        apiKey: this.config.apiKey,
        timeout: this.config.timeout || 30000, // 30 seconds timeout
        maxRetries: this.config.maxRetries || 1, // Reduced retries for faster fail
      });
      Logger.debug('OpenAI client initialized successfully');
      return true;
    } catch (error) {
      Logger.error('Failed to initialize OpenAI client', { error });
      return false;
    }
  }

  /**
   * Validate OpenAI API key format
   */
  protected validateApiKeyFormat(apiKey: string): boolean {
    return Boolean(apiKey && apiKey.startsWith('sk-'));
  }

  /**
   * Parse Turkish loan query using OpenAI with structured output
   */
  async parseQuery(text: string): Promise<AIProviderResponse> {
    const timer = Logger.startTimer('openai-natural-language-parsing');
    
    try {
      Logger.debug('Starting OpenAI-based natural language parsing', { originalText: text });

      // Initialize OpenAI if needed
      if (!this.openai && !this.initializeOpenAI()) {
        throw new Error('OpenAI API is not available');
      }

      // Parse with OpenAI using Context7 patterns
      const result = await this.parseWithOpenAI(text);
      timer();
      return result;

    } catch (error) {
      timer();
      
      // Enhanced error handling with Context7 patterns
      const errorInfo = this.analyzeOpenAIError(error);
      Logger.error('OpenAI-based natural language parsing failed', { 
        text, 
        error: error instanceof Error ? error.message : String(error),
        errorType: errorInfo.type,
        suggestion: errorInfo.suggestion
      });
      
      // Return failed state with helpful error info
      return {
        creditType: null,
        amount: null,
        term: null,
        confidence: 0,
        reasoning: errorInfo.userMessage,
        extractedInfo: {
          detectedPhrases: [],
          amountPhrase: null,
          termPhrase: null,
          creditTypePhrase: null
        },
        uncertainties: [errorInfo.type],
        isLoanQuery: false,
        provider: this.providerType
      };
    }
  }

  /**
   * Parse using OpenAI API with Context7 best practices
   */
  private async parseWithOpenAI(text: string): Promise<AIProviderResponse> {
    try {
      const prompt = this.buildTurkishLoanPrompt(text);
      
      Logger.debug('Sending request to OpenAI API', { 
        model: this.config.model,
        textLength: text.length 
      });

      // Use structured output with response_format (Context7 pattern)
      const response = await this.openai!.chat.completions.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        messages: [
          {
            role: 'system',
            content: 'Sen bir Türkçe doğal dil işleme uzmanısın. JSON formatında yanıt ver.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' }, // Context7 structured output pattern
      });

      const responseText = response.choices[0]?.message?.content || '';

      Logger.debug('OpenAI API response received', { 
        responseLength: responseText.length,
        usage: response.usage 
      });

      // Parse response and add usage info
      const result = this.parseResponse(responseText, text);
      if (response.usage) {
        result.usage = {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens
        };
      }

      return result;

    } catch (error) {
      Logger.error('OpenAI API request failed', { error });
      throw error;
    }
  }

  /**
   * Analyze OpenAI API errors using Context7 patterns
   */
  private analyzeOpenAIError(error: any): AIProviderError {
    // OpenAI APIError handling from Context7
    if (error instanceof OpenAI.APIError) {
      switch (error.status) {
        case 400:
          return {
            type: 'BAD_REQUEST',
            userMessage: 'OpenAI API geçersiz istek formatı',
            suggestion: 'Sorgu formatını veya model parametrelerini kontrol edin',
            provider: this.providerType,
            originalError: error
          };
          
        case 401:
          return {
            type: 'AUTHENTICATION_ERROR',
            userMessage: 'OpenAI API anahtarı geçersiz',
            suggestion: 'OPENAI_API_KEY environment variable\'ını kontrol edin',
            provider: this.providerType,
            originalError: error
          };
          
        case 403:
          return {
            type: 'PERMISSION_ERROR', 
            userMessage: 'OpenAI API erişim izni reddedildi',
            suggestion: 'API anahtarınızın yetkilerini kontrol edin',
            provider: this.providerType,
            originalError: error
          };
          
        case 404:
          return {
            type: 'MODEL_NOT_FOUND',
            userMessage: 'OpenAI model bulunamadı',
            suggestion: `Model adını kontrol edin: ${this.config.model}`,
            provider: this.providerType,
            originalError: error
          };
          
        case 429:
          return {
            type: 'RATE_LIMIT_ERROR',
            userMessage: 'OpenAI API rate limit aşıldı',
            suggestion: 'Biraz bekleyip tekrar deneyin veya plan yükseltin',
            provider: this.providerType,
            originalError: error
          };
          
        default:
          if (error.status && error.status >= 500) {
            return {
              type: 'SERVER_ERROR',
              userMessage: 'OpenAI API sunucu hatası',
              suggestion: 'OpenAI sunucularında geçici bir sorun var, tekrar deneyin',
              provider: this.providerType,
              originalError: error
            };
          }
      }
    }

    // Connection or other errors
    if (error.message?.includes('fetch') || error.message?.includes('network')) {
      return {
        type: 'CONNECTION_ERROR',
        userMessage: 'OpenAI API bağlantı hatası',
        suggestion: 'İnternet bağlantınızı kontrol edin',
        provider: this.providerType,
        originalError: error
      };
    }

    // Generic error
    return {
      type: 'UNKNOWN_ERROR',
      userMessage: 'OpenAI API bilinmeyen hata: ' + (error.message || error),
      suggestion: 'Loglara bakın ve support ile iletişime geçin',
      provider: this.providerType,
      originalError: error
    };
  }

  /**
   * Test OpenAI API connectivity
   */
  async testConnectivity(): Promise<boolean> {
    try {
      const testResult = await this.parseQuery('test konut kredisi 1000000 TL 60 ay');
      
      // Check if we got a valid response (not an error)
      const isSuccess = testResult.isLoanQuery && (testResult.confidence || 0) > 0;
      
      if (isSuccess) {
        Logger.info('OpenAI API connectivity test successful', { testResult });
      } else {
        Logger.warn('OpenAI API test completed but with errors', { testResult });
      }
      
      return isSuccess;
    } catch (error) {
      Logger.warn('OpenAI API connectivity test failed', { error });
      return false;
    }
  }

  /**
   * Get OpenAI API status and diagnostics
   */
  async getDiagnostics(): Promise<AIProviderDiagnostics> {
    const diagnostics: AIProviderDiagnostics = {
      provider: this.providerType,
      apiKeyStatus: 'missing',
      connectionStatus: 'not_tested',
      suggestions: []
    };

    // Check API key format
    if (!this.config.apiKey) {
      diagnostics.apiKeyStatus = 'missing';
      diagnostics.suggestions.push('OPENAI_API_KEY environment variable eksik');
    } else if (!this.validateApiKeyFormat(this.config.apiKey)) {
      diagnostics.apiKeyStatus = 'invalid_format';
      diagnostics.suggestions.push('API key formatı geçersiz (sk- ile başlamalı)');
    } else {
      diagnostics.apiKeyStatus = 'configured';
    }

    // Check model support
    const supportedModels = ['gpt-4', 'gpt-4o', 'gpt-3.5-turbo', 'gpt-4-turbo'];
    diagnostics.modelSupported = supportedModels.some(model => 
      this.config.model.includes(model)
    );

    if (!diagnostics.modelSupported) {
      diagnostics.suggestions.push(`Model ${this.config.model} desteklenmiyor olabilir`);
    }

    // Test connection
    try {
      const success = await this.testConnectivity();
      diagnostics.connectionStatus = success ? 'success' : 'failed';
      
      if (!success) {
        diagnostics.suggestions.push('OpenAI API bağlantısı başarısız - API key veya permissions kontrol edin');
      }
    } catch (error) {
      diagnostics.connectionStatus = 'failed';
      diagnostics.lastError = error instanceof Error ? error.message : String(error);
      diagnostics.suggestions.push('OpenAI API test hatası: ' + diagnostics.lastError);
    }

    return diagnostics;
  }
} 