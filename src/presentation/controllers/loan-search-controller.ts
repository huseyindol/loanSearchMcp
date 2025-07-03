import { Request, Response } from 'express';
import { Container } from '../../infrastructure/config/container.js';
import { LoanSearchRequest } from '../../application/dtos/index.js';
import { Logger } from '../../utils/logger.js';

/**
 * Loan Search Controller
 * HTTP controller for loan search endpoints
 */
export class LoanSearchController {
  private container: Container;

  constructor() {
    this.container = Container.getInstance();
  }

  async search(req: Request, res: Response): Promise<void> {
    try {
      const { query, type, amount, termMonths, currency } = req.body as LoanSearchRequest;
      
      if (!query) {
        res.status(400).json({
          success: false,
          error: 'Query is required'
        });
        return;
      }

      Logger.info('HTTP loan search request', { query, type, amount, termMonths });

      const searchUseCase = this.container.getSearchLoansUseCase();
      const result = await searchUseCase.execute({
        query,
        type,
        amount,
        termMonths,
        currency
      });

      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }

    } catch (error) {
      Logger.error('HTTP loan search error', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  async health(req: Request, res: Response): Promise<void> {
    res.json({
      status: 'ok',
      service: 'loan-search-mcp',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  }
} 