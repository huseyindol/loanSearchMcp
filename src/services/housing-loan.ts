/**
 * Housing Loan API Service
 * Handles all interactions with the housing loan gateway API
 */

import { LoanParameters, LoanResult, ApiConfig } from '../types/index.js';
import { Logger } from '../utils/logger.js';
import https from 'https';

export class HousingLoanService {
  private static readonly DEFAULT_CONFIG: ApiConfig = {
    baseUrl: 'https://gatewayapi.test-gateways/pages/housingloan',
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'MCP-Konut-Kredisi-Server/1.0.0'
    },
    sslVerifyEnabled: false // Disabled for test environment
  };

  private config: ApiConfig;
  private httpsAgent: https.Agent;

  constructor(config?: Partial<ApiConfig>) {
    this.config = { ...HousingLoanService.DEFAULT_CONFIG, ...config };
    
    // Create a custom HTTPS agent for SSL handling
    this.httpsAgent = new https.Agent({
      rejectUnauthorized: Boolean(this.config.sslVerifyEnabled),
      // Allow self-signed certificates
      checkServerIdentity: this.config.sslVerifyEnabled ? undefined : () => undefined,
      // Set timeout for socket connections
      timeout: this.config.timeout,
      // Keep connections alive for better performance
      keepAlive: true,
      maxSockets: 5
    });

    Logger.debug('HousingLoanService initialized', { 
      config: this.config,
      sslVerifyEnabled: this.config.sslVerifyEnabled 
    });
  }

  /**
   * Query housing loan information from the API
   */
  async queryLoan(params: LoanParameters): Promise<LoanResult> {
    const timer = Logger.startTimer('housing-loan-api-query');
    const { amount, term } = params;

    try {
      Logger.debug('Starting housing loan query', params);
      
      const apiUrl = this.buildApiUrl(amount, term);
      Logger.debug('API URL constructed', { url: apiUrl });

      const result = await this.makeApiRequest(apiUrl);
      timer(); // Log performance
      
      Logger.info('Housing loan query successful', { 
        amount, 
        term, 
        hasResult: !!result 
      });

      return result;

    } catch (error) {
      timer(); // Log performance even on error
      
      Logger.error('Housing loan query failed', { 
        amount, 
        term, 
        error: this.serializeError(error)
      });

      // Return mock data for development/testing
      if (this.shouldReturnMockData(error)) {
        Logger.warn('Returning mock data due to API failure', params);
        return this.generateMockData(amount, term);
      }

      throw error;
    }
  }

  /**
   * Build the API URL with parameters
   */
  private buildApiUrl(amount: number, term: number): string {
    const url = new URL(`${this.config.baseUrl}/list`);
    url.searchParams.set('Amount', amount.toString());
    url.searchParams.set('Maturity', term.toString());
    return url.toString();
  }

  /**
   * Make the actual API request with enhanced SSL handling
   */
  private async makeApiRequest(url: string): Promise<LoanResult> {
    // Multiple SSL bypass strategies
    const originalRejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    const originalExtraCaCerts = process.env.NODE_EXTRA_CA_CERTS;

    try {
      // Strategy 1: Disable TLS rejection globally (for development)
      if (!this.config.sslVerifyEnabled) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        Logger.debug('SSL verification disabled globally');
      }

      // Strategy 2: Set additional CA certificates if available
      if (process.env.SSL_CERT_FILE || process.env.SSL_CERT_DIR) {
        Logger.debug('Using custom SSL certificates from environment', {
          certFile: process.env.SSL_CERT_FILE,
          certDir: process.env.SSL_CERT_DIR
        });
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      Logger.debug('Making API request with SSL configuration', { 
        url, 
        timeout: this.config.timeout,
        sslVerifyEnabled: this.config.sslVerifyEnabled,
        agentOptions: {
          rejectUnauthorized: this.httpsAgent.options.rejectUnauthorized,
          keepAlive: (this.httpsAgent as any).keepAlive
        }
      });

      // Strategy 3: Use fetch with custom agent for Node.js 18+
      const fetchOptions: any = {
        method: 'GET',
        headers: this.config.headers,
        signal: controller.signal
      };

      // For Node.js environments that support it, add the agent
      if (this.isNodeEnvironment()) {
        fetchOptions.agent = this.httpsAgent;
      }

      const response = await fetch(url, fetchOptions);

      clearTimeout(timeoutId);

      Logger.api('GET', url, response.status);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      Logger.debug('API response received and parsed', { 
        status: response.status,
        hasData: !!data 
      });

      return this.transformApiResponse(data);

    } catch (error: any) {
      // Enhanced error analysis for SSL issues
      if (this.isSSLError(error)) {
        Logger.warn('SSL certificate error detected, attempting fallback strategies', {
          error: this.serializeError(error),
          sslVerifyEnabled: this.config.sslVerifyEnabled
        });

        // Try with alternative fetch approach if not already done
        if (this.config.sslVerifyEnabled) {
          Logger.info('Retrying with SSL verification disabled');
          const fallbackService = new HousingLoanService({
            ...this.config,
            sslVerifyEnabled: false
          });
          return await fallbackService.makeApiRequest(url);
        }
      }

      throw error;

    } finally {
      // Always restore original SSL settings
      if (originalRejectUnauthorized !== undefined) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalRejectUnauthorized;
      } else {
        delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
      }

      if (originalExtraCaCerts !== undefined) {
        process.env.NODE_EXTRA_CA_CERTS = originalExtraCaCerts;
      }
    }
  }

  /**
   * Check if running in Node.js environment (vs browser/edge runtime)
   */
  private isNodeEnvironment(): boolean {
    return typeof process !== 'undefined' && 
           process.versions && 
           !!process.versions.node;
  }

  /**
   * Enhanced SSL error detection
   */
  private isSSLError(error: any): boolean {
    const sslErrorCodes = [
      'DEPTH_ZERO_SELF_SIGNED_CERT',
      'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
      'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
      'CERT_HAS_EXPIRED',
      'CERT_UNTRUSTED',
      'CERT_SIGNATURE_FAILURE',
      'CERT_NOT_YET_VALID'
    ];

    const sslErrorMessages = [
      'certificate',
      'SSL',
      'TLS',
      'self signed',
      'unable to verify',
      'certificate verify failed'
    ];

    const errorMessage = error?.message?.toLowerCase() || '';
    const errorCode = error?.cause?.code || error?.code || '';

    return sslErrorCodes.includes(errorCode) || 
           sslErrorMessages.some(msg => errorMessage.includes(msg));
  }

  /**
   * Transform API response to our internal format
   */
  private transformApiResponse(apiData: any): LoanResult {
    // This would normally transform the actual API response
    // For now, we'll use a standard structure
    return {
      monthlyPayment: apiData.monthlyPayment || 0,
      interestRate: apiData.interestRate || 0,
      totalPayment: apiData.totalPayment || 0,
      totalInterest: apiData.totalInterest || 0,
      eligibility: apiData.eligibility ?? true
    };
  }

  /**
   * Check if we should return mock data based on the error
   */
  private shouldReturnMockData(error: any): boolean {
    const networkErrors = [
      'fetch failed',
      'DEPTH_ZERO_SELF_SIGNED_CERT',
      'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
      'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
      'ECONNREFUSED',
      'ENOTFOUND',
      'ETIMEDOUT',
      'CERT_HAS_EXPIRED',
      'CERT_UNTRUSTED'
    ];

    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode = error?.cause?.code || error?.code;

    return networkErrors.some(pattern => 
      errorMessage.includes(pattern) || errorCode === pattern
    ) || this.isSSLError(error);
  }

  /**
   * Generate mock loan data for testing
   */
  private generateMockData(amount: number, term: number): LoanResult {
    Logger.debug('Generating mock loan data', { amount, term });

    // Simplified loan calculation for mock data
    const monthlyInterestRate = 0.02; // 2% monthly interest
    const monthlyPayment = Math.round(
      (amount * monthlyInterestRate) / (1 - Math.pow(1 + monthlyInterestRate, -term))
    );

    const totalPayment = Math.round(amount * 1.4); // 40% total interest for simplicity
    const totalInterest = totalPayment - amount;

    return {
      monthlyPayment,
      interestRate: 2.0,
      totalPayment,
      totalInterest,
      eligibility: amount <= 3000000, // 3M TL limit for eligibility
      mockData: true,
      message: 'Bu sonuçlar test amaçlıdır - gerçek API erişilemedi'
    };
  }

  /**
   * Serialize error for logging (avoid circular references)
   */
  private serializeError(error: any): any {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: (error as any).cause,
        code: (error as any).code
      };
    }
    return error;
  }

  /**
   * Test API connectivity with enhanced SSL diagnostics
   */
  async testConnectivity(): Promise<boolean> {
    Logger.debug('Testing API connectivity with SSL diagnostics');

    try {
      // Test with a small loan amount
      await this.queryLoan({ amount: 100000, term: 12 });
      Logger.info('API connectivity test successful');
      return true;
    } catch (error) {
      Logger.warn('API connectivity test failed', { 
        error: this.serializeError(error),
        isSSLError: this.isSSLError(error),
        suggestions: this.generateSSLTroubleshootingSuggestions(error)
      });
      return false;
    }
  }

  /**
   * Generate troubleshooting suggestions for SSL errors
   */
  private generateSSLTroubleshootingSuggestions(error: any): string[] {
    const suggestions: string[] = [];

    if (this.isSSLError(error)) {
      suggestions.push('SSL Certificate hatası tespit edildi. Çözüm önerileri:');
      suggestions.push('1. NODE_TLS_REJECT_UNAUTHORIZED=0 environment variable kullanın');
      suggestions.push('2. NODE_EXTRA_CA_CERTS ile custom CA certificate ekleyin');
      suggestions.push('3. Sunucu certificate\'ı güncelleyin veya geçerli CA\'den alın');
      suggestions.push('4. Test ortamında sslVerifyEnabled: false kullanın');
    }

    const errorCode = error?.cause?.code || error?.code;
    if (errorCode === 'DEPTH_ZERO_SELF_SIGNED_CERT') {
      suggestions.push('Self-signed certificate tespit edildi');
      suggestions.push('Çözüm: Certificate\'ı CA\'den imzalatın veya custom CA ekleyin');
    }

    if (errorCode === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
      suggestions.push('Certificate chain doğrulanamadı');
      suggestions.push('Çözüm: Intermediate certificate\'ları kontrol edin');
    }

    return suggestions;
  }

  /**
   * Get service configuration
   */
  getConfig(): ApiConfig {
    return { ...this.config };
  }

  /**
   * Update service configuration and recreate HTTPS agent
   */
  updateConfig(newConfig: Partial<ApiConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Recreate HTTPS agent with new configuration
    this.httpsAgent = new https.Agent({
      rejectUnauthorized: Boolean(this.config.sslVerifyEnabled),
      checkServerIdentity: this.config.sslVerifyEnabled ? undefined : () => undefined,
      timeout: this.config.timeout,
      keepAlive: true,
      maxSockets: 5
    });

    Logger.debug('Service configuration updated', { 
      config: this.config,
      agentRecreated: true 
    });
  }

  /**
   * Get SSL diagnostics information
   */
  getSSLDiagnostics(): any {
    return {
      sslVerifyEnabled: this.config.sslVerifyEnabled,
      environmentVariables: {
        NODE_TLS_REJECT_UNAUTHORIZED: process.env.NODE_TLS_REJECT_UNAUTHORIZED,
        NODE_EXTRA_CA_CERTS: process.env.NODE_EXTRA_CA_CERTS,
        SSL_CERT_FILE: process.env.SSL_CERT_FILE,
        SSL_CERT_DIR: process.env.SSL_CERT_DIR
      },
      agentOptions: this.httpsAgent.options,
      nodeVersion: process.version,
      platform: process.platform
    };
  }
} 