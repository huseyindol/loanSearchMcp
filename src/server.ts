#!/usr/bin/env node

/**
 * Housing Loan MCP Server with Claude AI Integration
 * Provides natural language processing for Turkish loan queries using Claude API
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';

import { Logger, LogLevel } from './utils/logger.js';
import { ToolManager } from './tools/index.js';
import { NaturalLanguageService } from './services/natural-language.js';

/**
 * Server configuration from environment variables
 */
const SERVER_CONFIG = {
  name: 'kredi-arama-mcp-server',
  version: '2.0.0',
  logLevel: (process.env.LOG_LEVEL as keyof typeof LogLevel) || 'INFO',
  claudeEnabled: !!process.env.ANTHROPIC_API_KEY,
  debugMode: process.env.DEBUG_MODE === 'true'
};

/**
 * Main MCP Server class with Claude AI integration
 */
class HousingLoanMcpServer {
  private server: Server;
  private initialized = false;

  constructor() {
    this.server = new Server(
      {
        name: SERVER_CONFIG.name,
        version: SERVER_CONFIG.version,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupRequestHandlers();
    Logger.info('MCP Server instance created', { 
      config: SERVER_CONFIG,
      claudeIntegration: SERVER_CONFIG.claudeEnabled ? 'enabled' : 'disabled (missing ANTHROPIC_API_KEY)'
    });
  }

  /**
   * Setup MCP request handlers
   */
  private setupRequestHandlers(): void {
    // Handle list_tools requests
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      try {
        const tools = ToolManager.getToolDefinitions();
        
        Logger.debug('Tools list requested', { 
          toolCount: tools.length,
          toolNames: tools.map(t => t.name)
        });

        return { tools };
      } catch (error) {
        Logger.error('Failed to list tools', { error });
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to list tools: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });

    // Handle call_tool requests
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name: toolName, arguments: args } = request.params;
      const requestId = this.generateRequestId();

      try {
        Logger.info('Tool execution requested', {
          requestId,
          toolName,
          hasArguments: !!args && Object.keys(args).length > 0
        });

        // Validate tool exists
        if (!ToolManager.hasTools(toolName)) {
          const availableTools = ToolManager.getToolNames();
          Logger.warn('Unknown tool requested', { 
            requestedTool: toolName,
            availableTools 
          });
          
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${toolName}. Available tools: ${availableTools.join(', ')}`
          );
        }

        // Validate arguments
        const validationErrors = ToolManager.validateToolArguments(toolName, args);
        if (validationErrors.length > 0) {
          Logger.warn('Tool argument validation failed', {
            requestId,
            toolName,
            errors: validationErrors
          });

          throw new McpError(
            ErrorCode.InvalidParams,
            `Invalid arguments: ${validationErrors.join(', ')}`
          );
        }

        // Execute tool
        const result = await ToolManager.executeTool(toolName, requestId, args);

        Logger.info('Tool execution completed', {
          requestId,
          toolName,
          success: !result.isError,
          responseLength: result.content[0]?.text?.length || 0
        });

        return {
          content: result.content,
          isError: result.isError
        };

      } catch (error) {
        // Handle MCP errors (already logged)
        if (error instanceof McpError) {
          throw error;
        }

        // Handle unexpected errors
        const errorMessage = error instanceof Error ? error.message : String(error);
        Logger.error('Unexpected error during tool execution', {
          requestId,
          toolName,
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined
        });

        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${errorMessage}`
        );
      }
    });

    Logger.debug('Request handlers configured');
  }

  /**
   * Initialize the server and all components
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      Logger.warn('Server already initialized');
      return;
    }

    try {
      Logger.info('Initializing MCP server with Claude AI integration');

      // Set log level
      Logger.setLevel(LogLevel[SERVER_CONFIG.logLevel as keyof typeof LogLevel]);
      
      // Initialize tool manager
      ToolManager.initialize();

      // Test Claude API connectivity if enabled
      if (SERVER_CONFIG.claudeEnabled) {
        Logger.info('Testing Claude API connectivity');
        const isConnected = await NaturalLanguageService.testConnectivity();
        Logger.info('Claude API status', { connected: isConnected });
      } else {
        Logger.warn('Claude API disabled - set ANTHROPIC_API_KEY environment variable to enable AI features');
      }

      // Run health checks
      const healthResults = await ToolManager.runHealthChecks();
      const healthyTools = Object.values(healthResults).filter(r => r.healthy).length;
      const totalTools = Object.keys(healthResults).length;

      if (healthyTools < totalTools) {
        Logger.warn('Some tools failed health checks', { 
          healthyTools, 
          totalTools, 
          healthResults 
        });
      }

      this.initialized = true;

      Logger.info('MCP server initialized successfully', {
        toolCount: ToolManager.getStatistics().totalTools,
        toolNames: ToolManager.getToolNames(),
        claudeIntegration: SERVER_CONFIG.claudeEnabled,
        healthyTools: `${healthyTools}/${totalTools}`
      });

    } catch (error) {
      Logger.error('Server initialization failed', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  /**
   * Start the server
   */
  async start(): Promise<void> {
    try {
      // Initialize if not already done
      if (!this.initialized) {
        await this.initialize();
      }

      // Create stdio transport
      const transport = new StdioServerTransport();
      
      Logger.info('Starting MCP server on stdio transport');

      // Start server
      await this.server.connect(transport);

      Logger.info('MCP server started successfully', {
        serverName: SERVER_CONFIG.name,
        version: SERVER_CONFIG.version,
        transport: 'stdio',
        tools: ToolManager.getToolNames()
      });

      // Run comprehensive tests in debug mode
      if (SERVER_CONFIG.debugMode) {
        Logger.info('Debug mode enabled - running comprehensive tests');
        await this.runDebugTests();
      }

    } catch (error) {
      Logger.error('Failed to start MCP server', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      process.exit(1);
    }
  }

  /**
   * Run debug tests (only in debug mode)
   */
  private async runDebugTests(): Promise<void> {
    try {
      Logger.info('Running debug tests');
      
      // Test all tools
      await ToolManager.runAllTests();
      
      // Test natural language service
      await NaturalLanguageService.runTests();
      
      Logger.info('Debug tests completed successfully');
      
    } catch (error) {
      Logger.warn('Debug tests failed (non-critical)', { error });
    }
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    Logger.info('Shutting down MCP server');
    
    try {
      await this.server.close();
      Logger.info('MCP server shutdown completed');
    } catch (error) {
      Logger.error('Error during server shutdown', { error });
    }
  }
}

/**
 * Handle process signals for graceful shutdown
 */
function setupSignalHandlers(server: HousingLoanMcpServer): void {
  const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];
  
  signals.forEach((signal) => {
    process.on(signal, async () => {
      Logger.info(`Received ${signal}, initiating graceful shutdown`);
      await server.shutdown();
      process.exit(0);
    });
  });

  process.on('uncaughtException', (error) => {
    Logger.error('Uncaught exception', { 
      error: error.message,
      stack: error.stack 
    });
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    Logger.error('Unhandled promise rejection', { 
      reason,
      promise: promise.toString()
    });
    process.exit(1);
  });
}

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    // Create and start server
    const server = new HousingLoanMcpServer();
    
    // Setup signal handlers
    setupSignalHandlers(server);
    
    // Start server
    await server.start();
    
  } catch (error) {
    Logger.error('Application startup failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    process.exit(1);
  }
}

// Start the application
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { HousingLoanMcpServer }; 