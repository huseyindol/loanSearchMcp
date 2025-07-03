/**
 * AI Provider Factory
 * Creates and manages AI providers with configuration
 */

import { 
  AIProvider, 
  AIProviderType, 
  AIProviderConfig, 
  SupportedLanguage,
  CreditType 
} from '../../types/index.js';
import { Logger } from '../../utils/logger.js';
import { ClaudeProvider } from './claude-provider.js';
import { OpenAIProvider } from './openai-provider.js';

export class AIProviderFactory {
  private static providers: Map<string, AIProvider> = new Map();
  private static defaultConfigs: Record<AIProviderType, Partial<AIProviderConfig>> = {
    [AIProviderType.CLAUDE]: {
      model: 'claude-3-haiku-20240307',
      maxTokens: 800,
      temperature: 0.1,
      timeout: 30000,
      maxRetries: 1
    },
    [AIProviderType.OPENAI]: {
      model: 'gpt-3.5-turbo',
      maxTokens: 800,
      temperature: 0.1,
      timeout: 30000,
      maxRetries: 1
    },
    [AIProviderType.MOCK]: {
      model: 'mock-model',
      maxTokens: 100,
      temperature: 0,
      timeout: 1000,
      maxRetries: 0
    }
  };

  /**
   * Create AI provider instance
   */
  static createProvider(config: AIProviderConfig): AIProvider {
    const fullConfig = this.mergeWithDefaults(config);
    const cacheKey = this.getCacheKey(fullConfig);

    // Return cached provider if exists
    if (this.providers.has(cacheKey)) {
      const cachedProvider = this.providers.get(cacheKey)!;
      Logger.debug(`Returning cached ${fullConfig.type} provider`);
      return cachedProvider;
    }

    let provider: AIProvider;

    switch (fullConfig.type) {
      case AIProviderType.CLAUDE:
        provider = new ClaudeProvider(fullConfig);
        break;
        
      case AIProviderType.OPENAI:
        provider = new OpenAIProvider(fullConfig);
        break;
        
      case AIProviderType.MOCK:
        provider = this.createMockProvider(fullConfig);
        break;
        
      default:
        throw new Error(`Unsupported AI provider type: ${fullConfig.type}`);
    }

    // Cache the provider
    this.providers.set(cacheKey, provider);
    Logger.info(`Created new ${fullConfig.type} provider`, { 
      provider: fullConfig.type,
      model: fullConfig.model,
      configured: provider.isConfigured
    });

    return provider;
  }

  /**
   * Get available AI providers
   */
  static getAvailableProviders(): AIProviderType[] {
    return Object.values(AIProviderType);
  }

  /**
   * Get provider recommendations based on context
   */
  static getRecommendedProvider(language: SupportedLanguage = SupportedLanguage.TURKISH): {
    primary: AIProviderType;
    fallback: AIProviderType;
    reasoning: string;
  } {
    // For Turkish language processing
    if (language === SupportedLanguage.TURKISH) {
      return {
        primary: AIProviderType.OPENAI,
        fallback: AIProviderType.CLAUDE,
        reasoning: 'OpenAI GPT models have better Turkish language support and faster response times. Claude is excellent fallback for complex reasoning.'
      };
    }

    // For English or other languages
    return {
      primary: AIProviderType.CLAUDE,
      fallback: AIProviderType.OPENAI,
      reasoning: 'Claude excels at complex language understanding tasks. OpenAI provides reliable fallback with consistent performance.'
    };
  }

  /**
   * Create provider with environment-based configuration
   */
  static createFromEnvironment(
    preferredType?: AIProviderType,
    language: SupportedLanguage = SupportedLanguage.TURKISH
  ): AIProvider {
    let providerType = preferredType;

    // Auto-select provider if not specified
    if (!providerType) {
      const recommendation = this.getRecommendedProvider(language);
      
      // Check if primary provider is available
      if (this.isProviderAvailable(recommendation.primary)) {
        providerType = recommendation.primary;
      } else if (this.isProviderAvailable(recommendation.fallback)) {
        providerType = recommendation.fallback;
        Logger.warn(`Primary provider ${recommendation.primary} not available, using fallback ${recommendation.fallback}`);
      } else {
        providerType = AIProviderType.MOCK;
        Logger.warn('No AI providers available, using mock provider');
      }
    }

    const config = this.buildConfigFromEnvironment(providerType);
    return this.createProvider(config);
  }

  /**
   * Check if provider is available (has API key)
   */
  private static isProviderAvailable(type: AIProviderType): boolean {
    switch (type) {
      case AIProviderType.CLAUDE:
        return Boolean(process.env.ANTHROPIC_API_KEY);
      case AIProviderType.OPENAI:
        return Boolean(process.env.OPENAI_API_KEY);
      case AIProviderType.MOCK:
        return true;
      default:
        return false;
    }
  }

  /**
   * Build configuration from environment variables
   */
  private static buildConfigFromEnvironment(type: AIProviderType): AIProviderConfig {
    const baseConfig: AIProviderConfig = {
      type,
      apiKey: '',
      model: '',
      maxTokens: 800,
      temperature: 0.1
    };

    switch (type) {
      case AIProviderType.CLAUDE:
        baseConfig.apiKey = process.env.ANTHROPIC_API_KEY || '';
        baseConfig.model = process.env.CLAUDE_MODEL || 'claude-3-haiku-20240307';
        break;
        
      case AIProviderType.OPENAI:
        baseConfig.apiKey = process.env.OPENAI_API_KEY || '';
        baseConfig.model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
        break;
        
      case AIProviderType.MOCK:
        baseConfig.apiKey = 'mock-key';
        baseConfig.model = 'mock-model';
        break;
    }

    return this.mergeWithDefaults(baseConfig);
  }

  /**
   * Merge configuration with defaults
   */
  private static mergeWithDefaults(config: AIProviderConfig): AIProviderConfig {
    const defaults = this.defaultConfigs[config.type] || {};
    return { ...defaults, ...config } as AIProviderConfig;
  }

  /**
   * Generate cache key for provider
   */
  private static getCacheKey(config: AIProviderConfig): string {
    const keyParts = [
      config.type,
      config.model,
      config.maxTokens,
      config.temperature,
      config.apiKey ? 'hasKey' : 'noKey'
    ];
    return keyParts.join('-');
  }

  /**
   * Create mock provider for testing
   */
  private static createMockProvider(config: AIProviderConfig): AIProvider {
    return {
      providerType: AIProviderType.MOCK,
      isConfigured: true,
      
      async parseQuery(text: string) {
        Logger.debug('Mock provider parsing query', { text });
        
        // Simple mock logic for testing
        const isLoanQuery = text.toLowerCase().includes('kredi');
        const hasAmount = /\d+/.test(text);
        const hasTerm = /(ay|yıl|vade)/.test(text.toLowerCase());
        
        return {
          creditType: isLoanQuery ? CreditType.KONUT : null,
          amount: hasAmount ? 1000000 : null,
          term: hasTerm ? 60 : null,
          confidence: isLoanQuery ? 0.8 : 0.2,
          reasoning: 'Mock provider sonucu - test amaçlı',
          extractedInfo: {
            detectedPhrases: ['kredi', 'test'],
            amountPhrase: hasAmount ? 'tutar bulundu' : null,
            termPhrase: hasTerm ? 'vade bulundu' : null,
            creditTypePhrase: isLoanQuery ? 'kredi türü tespit edildi' : null
          },
          uncertainties: ['MOCK_RESPONSE'],
          isLoanQuery,
          provider: AIProviderType.MOCK
        };
      },
      
      async testConnectivity() {
        Logger.debug('Mock provider connectivity test');
        return true;
      },
      
      async getDiagnostics() {
        return {
          provider: AIProviderType.MOCK,
          apiKeyStatus: 'configured' as const,
          connectionStatus: 'success' as const,
          suggestions: ['Mock provider is always available'],
          modelSupported: true
        };
      },
      
      updateConfig(newConfig) {
        Logger.debug('Mock provider config updated', { newConfig });
      }
    };
  }

  /**
   * Clear provider cache
   */
  static clearCache(): void {
    this.providers.clear();
    Logger.debug('AI provider cache cleared');
  }

  /**
   * Get cached providers count
   */
  static getCachedProvidersCount(): number {
    return this.providers.size;
  }

  /**
   * Run diagnostics on all available providers
   */
  static async runDiagnostics(): Promise<Record<AIProviderType, any>> {
    const results: Record<string, any> = {};
    
    for (const type of this.getAvailableProviders()) {
      try {
        const provider = this.createFromEnvironment(type);
        results[type] = await provider.getDiagnostics();
      } catch (error) {
        results[type] = {
          provider: type,
          error: error instanceof Error ? error.message : String(error),
          available: false
        };
      }
    }
    
    return results as Record<AIProviderType, any>;
  }
} 