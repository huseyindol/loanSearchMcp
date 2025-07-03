import { LoanRepository } from '../../domain/repositories/loan-repository.js';
import { LoanCalculationService } from '../../domain/services/loan-calculation-service.js';
import { Money, Term, LoanType } from '../../domain/value-objects/index.js';
import { LoanSearchRequest, LoanSearchResponse, LoanDto } from '../dtos/index.js';
import { AIService } from '../interfaces/ai-service.js';
import { Logger } from '../../utils/logger.js';

/**
 * Search Loans Use Case
 * Application service for loan search operations
 */
export class SearchLoansUseCase {
  constructor(
    private loanRepository: LoanRepository,
    private aiService: AIService,
    private calculationService: LoanCalculationService
  ) {}

  async execute(request: LoanSearchRequest): Promise<LoanSearchResponse> {
    try {
      Logger.info('Starting loan search', { query: request.query });

      // Parse natural language query
      const parseResult = await this.aiService.parseQuery(request.query);
      
      if (!parseResult.success) {
        return {
          query: request.query,
          parsedParams: this.createEmptyParams(),
          loans: [],
          totalFound: 0,
          success: false,
          error: parseResult.error || 'Query could not be parsed'
        };
      }

      // Create value objects
      const loanType = LoanType.fromString(parseResult.type!);
      const amount = Money.fromNumber(parseResult.amount!, parseResult.currency || 'TRY');
      const term = Term.fromMonths(parseResult.termMonths!);

      // Find eligible loans
      const loans = await this.loanRepository.findEligible(loanType, amount, term);
      
      // Calculate loan details and sort by total payment
      const loanComparisons = this.calculationService.compareLoans(loans, amount, term);
      
      // Convert to DTOs
      const loanDtos = loanComparisons.map(comparison => this.toLoanDto(comparison, amount, term));

      Logger.info('Loan search completed', { 
        query: request.query,
        totalFound: loanDtos.length 
      });

      return {
        query: request.query,
        parsedParams: {
          type: parseResult.type!,
          amount: parseResult.amount!,
          termMonths: parseResult.termMonths!,
          currency: parseResult.currency || 'TRY'
        },
        loans: loanDtos,
        totalFound: loanDtos.length,
        success: true
      };

    } catch (error) {
      Logger.error('Loan search failed', error);
      return {
        query: request.query,
        parsedParams: this.createEmptyParams(),
        loans: [],
        totalFound: 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private toLoanDto(comparison: any, amount: Money, term: Term): LoanDto {
    const { loan, monthlyPayment, totalPayment, totalInterest } = comparison;
    
    return {
      id: loan.id,
      bankName: loan.bank.name,
      type: loan.type.type,
      typeDisplayName: loan.type.displayName,
      interestRate: loan.interestRate.rate,
      monthlyPayment: monthlyPayment.amount,
      totalPayment: totalPayment.amount,
      totalInterest: totalInterest.amount,
      minAmount: loan.minAmount.amount,
      maxAmount: loan.maxAmount.amount,
      maxTermMonths: loan.maxTerm.months,
      eligibilityNote: loan.eligibilityNote,
      currency: amount.currency
    };
  }

  private createEmptyParams() {
    return {
      type: '',
      amount: 0,
      termMonths: 0,
      currency: 'TRY'
    };
  }
} 