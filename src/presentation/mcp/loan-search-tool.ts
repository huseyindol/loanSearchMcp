import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { Container } from '../../infrastructure/config/container.js';
import { Logger } from '../../utils/logger.js';

/**
 * MCP Loan Search Tool
 * Provides loan search functionality through MCP protocol
 */
export class LoanSearchTool {
  private container: Container;

  constructor() {
    this.container = Container.getInstance();
  }

  getToolDefinition(): Tool {
    return {
      name: 'search_loans',
      description: 'Türkçe doğal dil ile kredi arama. Kredi türü, tutar ve vade bilgilerini içeren sorguları anlayabilir.',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Türkçe kredi arama sorgusu (örn: "2 milyon 36 ay konut kredisi")'
          }
        },
        required: ['query']
      }
    };
  }

  async handle(args: { query: string }): Promise<string> {
    try {
      const { query } = args;
      
      if (!query) {
        return JSON.stringify({
          success: false,
          error: 'Sorgu parametresi gerekli'
        });
      }

      Logger.tool('MCP loan search request', { query });

      const searchUseCase = this.container.getSearchLoansUseCase();
      const result = await searchUseCase.execute({ query });

      if (!result.success) {
        Logger.warn('MCP loan search failed', { query, error: result.error });
        return JSON.stringify({
          success: false,
          error: result.error
        });
      }

      const response = {
        success: true,
        query: result.query,
        parsedParams: {
          type: result.parsedParams.type,
          typeDisplayName: this.getTypeDisplayName(result.parsedParams.type),
          amount: result.parsedParams.amount,
          termMonths: result.parsedParams.termMonths,
          currency: result.parsedParams.currency,
          formattedAmount: this.formatAmount(result.parsedParams.amount),
          formattedTerm: this.formatTerm(result.parsedParams.termMonths)
        },
        loans: result.loans.map(loan => ({
          id: loan.id,
          bankName: loan.bankName,
          type: loan.type,
          typeDisplayName: loan.typeDisplayName,
          interestRate: loan.interestRate,
          monthlyPayment: loan.monthlyPayment,
          totalPayment: loan.totalPayment,
          totalInterest: loan.totalInterest,
          eligibilityNote: loan.eligibilityNote,
          formattedMonthlyPayment: this.formatAmount(loan.monthlyPayment),
          formattedTotalPayment: this.formatAmount(loan.totalPayment),
          formattedTotalInterest: this.formatAmount(loan.totalInterest),
          formattedInterestRate: `%${loan.interestRate}`
        })),
        totalFound: result.totalFound,
        summary: this.createSummary(result)
      };

      Logger.tool('MCP loan search completed', { 
        query, 
        totalFound: result.totalFound 
      });

      return JSON.stringify(response, null, 2);

    } catch (error) {
      Logger.error('MCP loan search tool error', error);
      return JSON.stringify({
        success: false,
        error: 'Kredi arama sırasında hata oluştu'
      });
    }
  }

  private getTypeDisplayName(type: string): string {
    const displayNames: { [key: string]: string } = {
      'ihtiyac': 'İhtiyaç Kredisi',
      'konut': 'Konut Kredisi',
      'tasit': 'Taşıt Kredisi'
    };
    return displayNames[type] || type;
  }

  private formatAmount(amount: number): string {
    return `₺${amount.toLocaleString('tr-TR')}`;
  }

  private formatTerm(months: number): string {
    if (months % 12 === 0) {
      return `${months / 12} yıl`;
    }
    return `${months} ay`;
  }

  private createSummary(result: any): string {
    const { parsedParams, loans, totalFound } = result;
    
    if (totalFound === 0) {
      return `${this.getTypeDisplayName(parsedParams.type)} için ${this.formatAmount(parsedParams.amount)} tutar ve ${this.formatTerm(parsedParams.termMonths)} vade ile uygun kredi bulunamadı.`;
    }

    const bestLoan = loans[0];
    const worstLoan = loans[loans.length - 1];
    
    return `${this.getTypeDisplayName(parsedParams.type)} için ${totalFound} adet kredi bulundu. ` +
           `En uygun: ${bestLoan.bankName} (${this.formatAmount(bestLoan.monthlyPayment)}/ay, %${bestLoan.interestRate}). ` +
           `En yüksek: ${worstLoan.bankName} (${this.formatAmount(worstLoan.monthlyPayment)}/ay, %${worstLoan.interestRate}).`;
  }
} 