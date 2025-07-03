/**
 * Parse Natural Query Tool
 * Parses Turkish natural language queries to extract loan parameters
 */

import { ToolResult, ToolExecutionContext } from '../types/index.js';
import { NaturalLanguageService } from '../services/natural-language.js';
import { Logger } from '../utils/logger.js';

export class ParseQueryTool {
  static readonly NAME = 'parse_natural_query';
  static readonly DESCRIPTION = 'Parse Turkish natural language queries to extract loan amount, term, and type';

  static getDefinition() {
    return {
      name: this.NAME,
      description: this.DESCRIPTION,
      inputSchema: {
        type: "object" as const,
        properties: {
          query: {
            type: "string",
            description: "Turkish natural language query about loan (e.g., '2 milyon TL 60 ay vade konut kredisi')",
            minLength: 1,
            maxLength: 1000
          }
        },
        required: ["query"]
      }
    };
  }

  static async execute(context: ToolExecutionContext): Promise<ToolResult> {
    const timer = Logger.startTimer('parse-natural-query-execution');
    
    try {
      const { query } = context.arguments;

      if (!query || typeof query !== 'string') {
        throw new Error('Query parameter is required and must be a string');
      }

      Logger.info('Parsing natural language query', { 
        requestId: context.requestId,
        query: query.substring(0, 100) + (query.length > 100 ? '...' : '')
      });

      // Parse the query using Claude AI
      const parseResult = await NaturalLanguageService.parseQuery(query);

      // Validate extracted parameters
      const validationErrors = NaturalLanguageService.validateParameters(
        parseResult.amount,
        parseResult.term,
        parseResult.creditType
      );

      // Build response
      const response = {
        success: parseResult.isHousingLoanQuery,
        query: query,
        extractedData: {
          amount: parseResult.amount,
          term: parseResult.term,
          creditType: parseResult.creditType,
          confidence: parseResult.confidence || 0
        },
        analysis: {
          isLoanQuery: parseResult.isHousingLoanQuery,
          detectedPhrases: parseResult.extractedInfo?.detectedPhrases || [],
          amountPhrase: parseResult.extractedInfo?.amountPhrase,
          termPhrase: parseResult.extractedInfo?.termPhrase,
          creditTypePhrase: parseResult.extractedInfo?.creditTypePhrase,
          reasoning: parseResult.claudeResponse?.reasoning,
          uncertainties: parseResult.claudeResponse?.uncertainties || []
        },
        validation: {
          isValid: validationErrors.length === 0,
          errors: validationErrors
        },
        metadata: {
          processingMethod: parseResult.claudeResponse ? 'claude-ai' : 'pattern-matching',
          timestamp: new Date().toISOString(),
          requestId: context.requestId
        }
      };

      timer();

      Logger.info('Natural language query parsed successfully', {
        requestId: context.requestId,
        success: response.success,
        confidence: response.extractedData.confidence,
        processingMethod: response.metadata.processingMethod,
        validationErrors: validationErrors.length
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
      
      Logger.error('Parse natural query tool execution failed', {
        requestId: context.requestId,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });

      const errorResponse = {
        success: false,
        query: context.arguments.query || 'Unknown',
        error: {
          message: errorMessage,
          code: 'PARSE_QUERY_ERROR'
        },
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: context.requestId
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
   * Get tool usage examples for debugging
   */
  static getExamples(): Array<{ query: string; description: string }> {
    return [
      {
        query: "2 milyon TL 60 ay vade konut kredisi istiyorum",
        description: "Complete housing loan query with amount, term and type"
      },
      {
        query: "1.500.000 lira 48 aylık ev kredisi hesapla", 
        description: "Housing loan with specific amount and term"
      },
      {
        query: "500 bin TL 5 yıl vadeli ihtiyaç kredisi",
        description: "Personal loan with amount in thousands and term in years"
      },
      {
        query: "Araç alımı için 800000 TL 72 ay kredi",
        description: "Vehicle loan with specific purpose"
      },
      {
        query: "Taşıt kredisi 1 milyon lira 10 yıl vade",
        description: "Vehicle loan with amount in millions and term in years"
      },
      {
        query: "Bu sadece test metni kredi değil",
        description: "Non-loan query that should be rejected"
      }
    ];
  }

  /**
   * Test the tool with sample queries
   */
  static async runTests(): Promise<void> {
    Logger.info('Running parse query tool tests');

    const examples = this.getExamples();
    
    for (let i = 0; i < examples.length; i++) {
      const example = examples[i];
      
      try {
        Logger.debug(`Testing: ${example.description}`);
        
        const context: ToolExecutionContext = {
          requestId: `test-${i + 1}`,
          toolName: this.NAME,
          arguments: { query: example.query },
          startTime: Date.now()
        };

        const result = await this.execute(context);
        const response = JSON.parse(result.content[0].text);
        
        Logger.debug('Test result:', {
          success: response.success,
          extractedData: response.extractedData,
          processingMethod: response.metadata?.processingMethod
        });
        
      } catch (error) {
        Logger.error(`Test ${i + 1} failed:`, { error });
      }
    }
  }
} 