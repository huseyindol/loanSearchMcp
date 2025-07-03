/**
 * Tool Registry and Management
 * Central hub for all MCP tools with registration, health checks, and execution
 */

import { ToolDefinition, ToolResult, ToolExecutionContext } from '../types/index.js';
// import { HousingLoanTool } from './housing-loan-tool.js';
import { ParseQueryTool } from './parse-query-tool.js';
import { Logger } from '../utils/logger.js';

/**
 * Tool registry interface
 */
interface ToolRegistry {
  [toolName: string]: {
    definition: ToolDefinition;
    execute: (context: ToolExecutionContext) => Promise<ToolResult>;
    health?: () => Promise<{ healthy: boolean; details: any }>;
  };
}

export class ToolManager {
  private static registry: ToolRegistry = {};
  private static initialized = false;

  /**
   * Initialize all tools and register them
   */
  static initialize(): void {
    if (this.initialized) {
      Logger.warn('Tool manager already initialized');
      return;
    }

    try {
      Logger.info('Initializing tool manager');

      // Register housing loan tool
      // this.registerTool(
      //   HousingLoanTool.NAME,
      //   HousingLoanTool.getDefinition(),
      //   HousingLoanTool.execute.bind(HousingLoanTool),
      //   HousingLoanTool.getHealthStatus.bind(HousingLoanTool)
      // );

      // Register parse query tool
      this.registerTool(
        ParseQueryTool.NAME,
        ParseQueryTool.getDefinition(),
        ParseQueryTool.execute.bind(ParseQueryTool)
      );

      this.initialized = true;
      
      Logger.info('Tool manager initialized successfully', {
        registeredTools: Object.keys(this.registry),
        toolCount: Object.keys(this.registry).length
      });

    } catch (error) {
      Logger.error('Failed to initialize tool manager', { error });
      throw new Error(`Tool manager initialization failed: ${error}`);
    }
  }

  /**
   * Register a tool in the registry
   */
  private static registerTool(
    name: string,
    definition: ToolDefinition,
    execute: (context: ToolExecutionContext) => Promise<ToolResult>,
    health?: () => Promise<{ healthy: boolean; details: any }>
  ): void {
    if (this.registry[name]) {
      Logger.warn(`Tool ${name} is already registered, overwriting`);
    }

    this.registry[name] = {
      definition,
      execute,
      health
    };

    Logger.debug(`Tool registered: ${name}`, { definition });
  }

  /**
   * Get all tool definitions for MCP server
   */
  static getToolDefinitions(): ToolDefinition[] {
    this.ensureInitialized();
    return Object.values(this.registry).map(tool => tool.definition);
  }

  /**
   * Execute a tool by name
   */
  static async executeTool(toolName: string, requestId: string, arguments_: any): Promise<ToolResult> {
    this.ensureInitialized();
    
    const timer = Logger.startTimer(`tool-execution-${toolName}`);
    
    try {
      const tool = this.registry[toolName];
      if (!tool) {
        throw new Error(`Tool not found: ${toolName}`);
      }

      Logger.info('Executing tool', {
        toolName,
        requestId,
        argumentKeys: Object.keys(arguments_ || {})
      });

      // Create execution context
      const context: ToolExecutionContext = {
        requestId,
        toolName,
        arguments: arguments_ || {},
        startTime: Date.now()
      };

      // Execute the tool
      const result = await tool.execute(context);
      
      timer();

      Logger.info('Tool execution completed', {
        toolName,
        requestId,
        success: !result.isError,
        executionTime: Date.now() - context.startTime
      });

      return result;

    } catch (error) {
      timer();
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      Logger.error('Tool execution failed', {
        toolName,
        requestId,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: false,
            error: {
              message: errorMessage,
              code: 'TOOL_EXECUTION_ERROR',
              toolName
            },
            metadata: {
              requestId,
              timestamp: new Date().toISOString()
            }
          }, null, 2)
        }],
        isError: true
      };
    }
  }

  /**
   * Check if a tool exists
   */
  static hasTools(toolName: string): boolean {
    this.ensureInitialized();
    return toolName in this.registry;
  }

  /**
   * Get tool names
   */
  static getToolNames(): string[] {
    this.ensureInitialized();
    return Object.keys(this.registry);
  }

  /**
   * Run health checks for all tools
   */
  static async runHealthChecks(): Promise<Record<string, { healthy: boolean; details: any }>> {
    this.ensureInitialized();
    
    Logger.info('Running tool health checks');
    
    const healthResults: Record<string, { healthy: boolean; details: any }> = {};
    
    for (const [toolName, tool] of Object.entries(this.registry)) {
      try {
        if (tool.health) {
          healthResults[toolName] = await tool.health();
        } else {
          healthResults[toolName] = {
            healthy: true,
            details: { message: 'No health check available' }
          };
        }
        
        Logger.debug(`Health check for ${toolName}:`, healthResults[toolName]);
        
      } catch (error) {
        healthResults[toolName] = {
          healthy: false,
          details: {
            error: error instanceof Error ? error.message : String(error),
            timestamp: new Date().toISOString()
          }
        };
        
        Logger.warn(`Health check failed for ${toolName}:`, { error });
      }
    }
    
    const healthyCount = Object.values(healthResults).filter(r => r.healthy).length;
    const totalCount = Object.keys(healthResults).length;
    
    Logger.info('Tool health checks completed', {
      healthyTools: healthyCount,
      totalTools: totalCount,
      overallHealth: healthyCount === totalCount ? 'healthy' : 'degraded'
    });
    
    return healthResults;
  }

  /**
   * Run tests for all tools
   */
  static async runAllTests(): Promise<void> {
    this.ensureInitialized();
    
    Logger.info('Running tests for all tools');
    
    try {
      // Test housing loan tool
      // await HousingLoanTool.runTests();
      
      // Test parse query tool
      await ParseQueryTool.runTests();
      
      Logger.info('All tool tests completed successfully');
      
    } catch (error) {
      Logger.error('Tool tests failed', { error });
      throw error;
    }
  }

  /**
   * Get detailed tool statistics
   */
  static getStatistics(): {
    totalTools: number;
    toolNames: string[];
    initialized: boolean;
    registrySize: number;
  } {
    return {
      totalTools: Object.keys(this.registry).length,
      toolNames: Object.keys(this.registry),
      initialized: this.initialized,
      registrySize: Object.keys(this.registry).length
    };
  }

  /**
   * Reset the tool manager (for testing)
   */
  static reset(): void {
    this.registry = {};
    this.initialized = false;
    Logger.debug('Tool manager reset');
  }

  /**
   * Ensure tool manager is initialized
   */
  private static ensureInitialized(): void {
    if (!this.initialized) {
      this.initialize();
    }
  }

  /**
   * Get tool definition by name
   */
  static getToolDefinition(toolName: string): ToolDefinition | null {
    this.ensureInitialized();
    const tool = this.registry[toolName];
    return tool ? tool.definition : null;
  }

  /**
   * Validate tool arguments against schema
   */
  static validateToolArguments(toolName: string, arguments_: any): string[] {
    this.ensureInitialized();
    
    const errors: string[] = [];
    const tool = this.registry[toolName];
    
    if (!tool) {
      errors.push(`Tool not found: ${toolName}`);
      return errors;
    }

    const schema = tool.definition.inputSchema;
    const required = schema.required || [];
    
    // Check required fields
    for (const field of required) {
      if (!(field in arguments_) || arguments_[field] === undefined || arguments_[field] === null) {
        errors.push(`Required field missing: ${field}`);
      }
    }
    
    // Basic type checking
    if (schema.properties) {
      for (const [field, fieldSchema] of Object.entries(schema.properties)) {
        if (field in arguments_) {
          const value = arguments_[field];
          const expectedType = (fieldSchema as any).type;
          
          if (expectedType === 'number' && typeof value !== 'number') {
            errors.push(`Field ${field} must be a number`);
          } else if (expectedType === 'string' && typeof value !== 'string') {
            errors.push(`Field ${field} must be a string`);
          }
        }
      }
    }
    
    return errors;
  }
}

// Export tool classes for direct access if needed
export { ParseQueryTool }; 
export { NaturalLanguageService } from '../services/natural-language.js'; 