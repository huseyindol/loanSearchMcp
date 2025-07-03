/**
 * Claude Provider Implementation
 * Uses Anthropic Claude models for Turkish loan query parsing
 */

import Anthropic from '@anthropic-ai/sdk';
import { BaseAIProvider } from './base-provider.js';
import { 
  AIProviderType, 
  AIProviderConfig, 
  AIProviderResponse, 
  AIProviderDiagnostics,
  AIProviderError 
} from '../../types/index.js';
import { Logger } from '../../utils/logger.js';

export class ClaudeProvider extends BaseAIProvider {
  private anthropic: Anthropic | null = null;

  constructor(config: AIProviderConfig) {
    super(config);
  }

  get providerType(): AIProviderType {
    return AIProviderType.CLAUDE;
  }

  /**
   * Initialize Claude client with error handling
   */
  private initializeAnthropic(): boolean {
    if (!this.config.apiKey) {
      Logger.warn('Claude API key not found in configuration');
      return false;
    }

    try {
      this.anthropic = new Anthropic({
        apiKey: this.config.apiKey,
        maxRetries: this.config.maxRetries || 1, // Reduced retries for faster fail
        timeout: this.config.timeout || 30000, // 30 seconds timeout
      });
      Logger.debug('Claude API client initialized successfully');
      return true;
    } catch (error) {
      Logger.error('Failed to initialize Claude API client', { error });
      return false;
    }
  }

  /**
   * Validate Claude API key format
   */
  protected validateApiKeyFormat(apiKey: string): boolean {
    return Boolean(apiKey && apiKey.startsWith('sk-ant-'));
  }

  /**
   * Parse Turkish loan query using Claude AI with structured output
   */
  async parseQuery(text: string): Promise<AIProviderResponse> {
    const timer = Logger.startTimer('claude-natural-language-parsing');
    
    try {
      Logger.debug('Starting Claude-based natural language parsing', { originalText: text });

      // Initialize Claude if needed
      if (!this.anthropic && !this.initializeAnthropic()) {
        throw new Error('Claude API is not available');
      }

      // Parse with Claude using structured output
      const result = await this.parseWithClaude(text);
      timer();
      return result;

    } catch (error) {
      timer();
      
      // Enhanced error handling with Context7 patterns
      const errorInfo = this.analyzeClaudeError(error);
      Logger.error('Claude-based natural language parsing failed', { 
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
   * Parse using Claude API with structured JSON output
   */
  private async parseWithClaude(text: string): Promise<AIProviderResponse> {
    try {
      const prompt = this.buildTurkishLoanPrompt(text);
      
      Logger.debug('Sending request to Claude API', { 
        model: this.config.model,
        textLength: text.length 
      });

      // Use structured output with JSON prefill technique
      const response = await this.anthropic!.messages.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        messages: [
          {
            role: 'user',
            content: prompt
          },
          {
            role: 'assistant',
            content: '{'  // JSON prefill technique from Context7
          }
        ]
      });

      const responseText = response.content[0].type === 'text' 
        ? response.content[0].text 
        : '';

      // Complete the JSON by adding the opening brace back
      const fullJsonResponse = '{' + responseText;

      Logger.debug('Claude API response received', { 
        responseLength: fullJsonResponse.length,
        usage: response.usage 
      });

      // Parse response and add usage info
      const result = this.parseResponse(fullJsonResponse, text);
      if (response.usage) {
        result.usage = {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens
        };
      }

      return result;

    } catch (error) {
      Logger.error('Claude API request failed', { error });
      throw error;
    }
  }

  /**
   * Analyze Claude API errors using Context7 patterns
   */
  private analyzeClaudeError(error: any): AIProviderError {
    // Claude APIError handling from Context7
    if (error instanceof Anthropic.APIError) {
      switch (error.status) {
        case 400:
          if (error.message?.includes('credit balance')) {
            return {
              type: 'BILLING_ERROR',
              userMessage: 'Claude API kredi bakiyesi yetersiz. API anahtarı güncellenmelidir.',
              suggestion: 'Anthropic hesabınızı kontrol edin ve kredi ekleyin',
              provider: this.providerType,
              originalError: error
            };
          }
          return {
            type: 'BAD_REQUEST',
            userMessage: 'Claude API geçersiz istek formatı',
            suggestion: 'Sorgu formatını kontrol edin',
            provider: this.providerType,
            originalError: error
          };
          
        case 401:
          return {
            type: 'AUTHENTICATION_ERROR',
            userMessage: 'Claude API anahtarı geçersiz',
            suggestion: 'ANTHROPIC_API_KEY environment variable\'ını kontrol edin',
            provider: this.providerType,
            originalError: error
          };
          
        case 403:
          return {
            type: 'PERMISSION_ERROR', 
            userMessage: 'Claude API erişim izni reddedildi',
            suggestion: 'API anahtarınızın yetkilerini kontrol edin',
            provider: this.providerType,
            originalError: error
          };
          
        case 404:
          return {
            type: 'MODEL_NOT_FOUND',
            userMessage: 'Claude model bulunamadı',
            suggestion: `Model adını kontrol edin: ${this.config.model}`,
            provider: this.providerType,
            originalError: error
          };
          
        case 422:
          return {
            type: 'VALIDATION_ERROR',
            userMessage: 'Claude API parametre hatası',
            suggestion: 'Mesaj formatını ve token limitlerini kontrol edin',
            provider: this.providerType,
            originalError: error
          };
          
        case 429:
          return {
            type: 'RATE_LIMIT_ERROR',
            userMessage: 'Claude API rate limit aşıldı',
            suggestion: 'Biraz bekleyip tekrar deneyin',
            provider: this.providerType,
            originalError: error
          };
          
        default:
          if (error.status && error.status >= 500) {
            return {
              type: 'SERVER_ERROR',
              userMessage: 'Claude API sunucu hatası',
              suggestion: 'Anthropic sunucularında geçici bir sorun var, tekrar deneyin',
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
        userMessage: 'Claude API bağlantı hatası',
        suggestion: 'İnternet bağlantınızı kontrol edin',
        provider: this.providerType,
        originalError: error
      };
    }

    // Generic error
    return {
      type: 'UNKNOWN_ERROR',
      userMessage: 'Claude API bilinmeyen hata: ' + (error.message || error),
      suggestion: 'Loglara bakın ve support ile iletişime geçin',
      provider: this.providerType,
      originalError: error
    };
  }

  /**
   * Test Claude API connectivity with better error reporting
   */
  async testConnectivity(): Promise<boolean> {
    try {
      const testResult = await this.parseQuery('test konut kredisi 1000000 TL 60 ay');
      
      // Check if we got a valid response (not an error)
      const isSuccess = testResult.isLoanQuery && (testResult.confidence || 0) > 0;
      
      if (isSuccess) {
        Logger.info('Claude API connectivity test successful', { testResult });
      } else {
        Logger.warn('Claude API test completed but with errors', { testResult });
      }
      
      return isSuccess;
    } catch (error) {
      Logger.warn('Claude API connectivity test failed', { error });
      return false;
    }
  }

  /**
   * Get Claude API status and diagnostics
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
      diagnostics.suggestions.push('ANTHROPIC_API_KEY environment variable eksik');
    } else if (!this.validateApiKeyFormat(this.config.apiKey)) {
      diagnostics.apiKeyStatus = 'invalid_format';
      diagnostics.suggestions.push('API key formatı geçersiz (sk-ant- ile başlamalı)');
    } else {
      diagnostics.apiKeyStatus = 'configured';
    }

    // Check model support
    const supportedModels = ['claude-3-haiku', 'claude-3-sonnet', 'claude-3-opus', 'claude-3.5-sonnet'];
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
        diagnostics.suggestions.push('Claude API bağlantısı başarısız - billing veya permissions kontrol edin');
      }
    } catch (error) {
      diagnostics.connectionStatus = 'failed';
      diagnostics.lastError = error instanceof Error ? error.message : String(error);
      diagnostics.suggestions.push('Claude API test hatası: ' + diagnostics.lastError);
    }

    return diagnostics;
  }
} 