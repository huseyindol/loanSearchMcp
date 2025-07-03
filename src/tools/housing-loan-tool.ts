/**
 * Housing Loan Calculation Tool
 * Provides direct loan calculation functionality
 */

import { ToolResult, ToolExecutionContext, LoanParameters } from '../types/index.js';
import { HousingLoanService } from '../services/housing-loan.js';
import { Logger } from '../utils/logger.js';

export class HousingLoanTool {
  static readonly NAME = 'query_housing_loan';
  static readonly DESCRIPTION = 'Calculate housing loan details including monthly payments, interest rates, and eligibility';

  private static housingLoanService = new HousingLoanService();

  static getDefinition() {
    return {
      name: this.NAME,
      description: this.DESCRIPTION,
      inputSchema: {
        type: "object" as const,
        properties: {
          amount: {
            type: "number",
            description: "Loan amount in Turkish Lira (TL)",
            minimum: 50000,
            maximum: 10000000
          },
          term: {
            type: "number", 
            description: "Loan term in months",
            minimum: 6,
            maximum: 360
          }
        },
        required: ["amount", "term"]
      }
    };
  }

  static async execute(context: ToolExecutionContext): Promise<ToolResult> {
    const timer = Logger.startTimer('housing-loan-tool-execution');
    
    try {
      const { amount, term } = context.arguments;

      // Validate input parameters
      if (!amount || !term) {
        throw new Error('Amount and term parameters are required');
      }

      if (typeof amount !== 'number' || typeof term !== 'number') {
        throw new Error('Amount and term must be numbers');
      }

      if (amount < 50000 || amount > 10000000) {
        throw new Error('Amount must be between 50,000 and 10,000,000 TL');
      }

      if (term < 6 || term > 360) {
        throw new Error('Term must be between 6 and 360 months');
      }

      Logger.info('Processing housing loan calculation', {
        requestId: context.requestId,
        amount,
        term
      });

      // Calculate loan details
      const loanParameters: LoanParameters = { amount, term };
      const loanResult = await this.housingLoanService.queryLoan(loanParameters);

      // Build response
      const response = {
        success: true,
        loanParameters: {
          amount,
          term,
          amountFormatted: `${amount.toLocaleString('tr-TR')} TL`,
          termFormatted: `${term} ay`
        },
        calculationResult: {
          monthlyPayment: loanResult.monthlyPayment,
          monthlyPaymentFormatted: `${loanResult.monthlyPayment?.toLocaleString('tr-TR')} TL`,
          interestRate: loanResult.interestRate,
          totalPayment: loanResult.totalPayment,
          totalPaymentFormatted: `${loanResult.totalPayment?.toLocaleString('tr-TR')} TL`,
          totalInterest: loanResult.totalInterest,
          totalInterestFormatted: `${loanResult.totalInterest?.toLocaleString('tr-TR')} TL`,
          eligibility: loanResult.eligibility
        },
        dataSource: {
          isMockData: loanResult.mockData || false,
          message: loanResult.message,
          timestamp: new Date().toISOString()
        },
        metadata: {
          requestId: context.requestId,
          executionTime: Date.now() - context.startTime,
          apiSource: loanResult.mockData ? 'mock-fallback' : 'housing-loan-api'
        }
      };

      timer();

      Logger.info('Housing loan calculation completed successfully', {
        requestId: context.requestId,
        amount,
        term,
        monthlyPayment: loanResult.monthlyPayment,
        eligibility: loanResult.eligibility,
        isMockData: loanResult.mockData
      });

      return {
        content: [{
          type: "text",
          text: JSON.stringify(response, null, 2)
        }]
      };

    } catch (error) {
      timer();
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      Logger.error('Housing loan tool execution failed', {
        requestId: context.requestId,
        error: errorMessage,
        arguments: context.arguments,
        stack: error instanceof Error ? error.stack : undefined
      });

      const errorResponse = {
        success: false,
        loanParameters: context.arguments,
        error: {
          message: errorMessage,
          code: 'HOUSING_LOAN_CALCULATION_ERROR'
        },
        metadata: {
          requestId: context.requestId,
          timestamp: new Date().toISOString()
        }
      };

      return {
        content: [{
          type: "text",
          text: JSON.stringify(errorResponse, null, 2)
        }],
        isError: true
      };
    }
  }

  /**
   * Test the tool with sample parameters
   */
  static async runTests(): Promise<void> {
    Logger.info('Running housing loan tool tests');

    const testCases = [
      { amount: 2000000, term: 60, description: "2M TL for 60 months" },
      { amount: 1500000, term: 48, description: "1.5M TL for 48 months" },
      { amount: 500000, term: 120, description: "500K TL for 120 months" },
      { amount: 3000000, term: 240, description: "3M TL for 240 months" }
    ];

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      
      try {
        Logger.debug(`Testing: ${testCase.description}`);
        
        const context: ToolExecutionContext = {
          requestId: `test-${i + 1}`,
          toolName: this.NAME,
          arguments: { amount: testCase.amount, term: testCase.term },
          startTime: Date.now()
        };

        const result = await this.execute(context);
        const response = JSON.parse(result.content[0].text);
        
        Logger.debug('Test result:', {
          success: response.success,
          monthlyPayment: response.calculationResult?.monthlyPaymentFormatted,
          eligibility: response.calculationResult?.eligibility,
          dataSource: response.dataSource?.apiSource
        });
        
      } catch (error) {
        Logger.error(`Test ${i + 1} failed:`, { error });
      }
    }
  }

  /**
   * Update housing loan service configuration
   */
  static updateService(newService: HousingLoanService): void {
    this.housingLoanService = newService;
    Logger.debug('Housing loan service updated');
  }

  /**
   * Get current service health status
   */
  static async getHealthStatus(): Promise<{ healthy: boolean; details: any }> {
    try {
      const testResult = await this.housingLoanService.queryLoan({ amount: 100000, term: 12 });
      return {
        healthy: true,
        details: {
          responsive: true,
          mockData: testResult.mockData,
          lastChecked: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        healthy: false,
        details: {
          error: error instanceof Error ? error.message : String(error),
          lastChecked: new Date().toISOString()
        }
      };
    }
  }
} 