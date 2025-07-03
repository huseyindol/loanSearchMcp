// Load environment variables from .env file
import 'dotenv/config';

import { LoanRepository, BankRepository } from '../../domain/repositories/index.js';
import { LoanCalculationService } from '../../domain/services/index.js';
import { AIService } from '../../application/interfaces/index.js';
import { SearchLoansUseCase } from '../../application/use-cases/index.js';
import { InMemoryLoanRepository, InMemoryBankRepository } from '../repositories/index.js';
import { GeminiAIService } from '../services/index.js';

/**
 * Dependency Injection Container
 * Manages application dependencies and their lifecycle
 */
export class Container {
  private static instance: Container;
  private dependencies: Map<string, any> = new Map();

  private constructor() {
    this.initializeDependencies();
  }

  static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }

  get<T>(key: string): T {
    const dependency = this.dependencies.get(key);
    if (!dependency) {
      throw new Error(`Dependency not found: ${key}`);
    }
    return dependency as T;
  }

  private initializeDependencies(): void {
    // Environment variables
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }

    // Repositories
    const loanRepository = new InMemoryLoanRepository();
    const bankRepository = new InMemoryBankRepository();
    
    // Services
    const aiService = new GeminiAIService(geminiApiKey);
    const calculationService = new LoanCalculationService();
    
    // Use Cases
    const searchLoansUseCase = new SearchLoansUseCase(
      loanRepository,
      aiService,
      calculationService
    );

    // Register dependencies
    this.dependencies.set('loanRepository', loanRepository);
    this.dependencies.set('bankRepository', bankRepository);
    this.dependencies.set('aiService', aiService);
    this.dependencies.set('calculationService', calculationService);
    this.dependencies.set('searchLoansUseCase', searchLoansUseCase);
  }

  // Convenience methods
  getLoanRepository(): LoanRepository {
    return this.get<LoanRepository>('loanRepository');
  }

  getBankRepository(): BankRepository {
    return this.get<BankRepository>('bankRepository');
  }

  getAIService(): AIService {
    return this.get<AIService>('aiService');
  }

  getCalculationService(): LoanCalculationService {
    return this.get<LoanCalculationService>('calculationService');
  }

  getSearchLoansUseCase(): SearchLoansUseCase {
    return this.get<SearchLoansUseCase>('searchLoansUseCase');
  }
} 