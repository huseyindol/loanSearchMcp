/**
 * Professional Logger utility for MCP Housing Loan Server
 * Supports multiple log levels, structured logging, and contextual information
 */

import { LogLevel, LogEntry } from '../types/index.js';

// Re-export LogLevel for convenience
export { LogLevel };

export class Logger {
  private static currentLogLevel: LogLevel = LogLevel.DEBUG;
  private static context: string = '';

  /**
   * Set the global log level
   */
  static setLogLevel(level: LogLevel): void {
    this.currentLogLevel = level;
  }

  /**
   * Set the global log level (alias for compatibility)
   */
  static setLevel(level: LogLevel): void {
    this.currentLogLevel = level;
  }

  /**
   * Set logging context (e.g., request ID, module name)
   */
  static setContext(context: string): void {
    this.context = context;
  }

  /**
   * Clear logging context
   */
  static clearContext(): void {
    this.context = '';
  }

  /**
   * Format timestamp for log entries
   */
  private static formatTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * Create structured log entry
   */
  private static createLogEntry(level: LogLevel, message: string, data?: any): LogEntry {
    return {
      timestamp: this.formatTimestamp(),
      level,
      message: this.context ? `[${this.context}] ${message}` : message,
      data
    };
  }

  /**
   * Core logging method
   */
  private static log(level: LogLevel, message: string, data?: any): void {
    if (level < this.currentLogLevel) return;

    const logEntry = this.createLogEntry(level, message, data);
    const levelName = LogLevel[level];
    const prefix = `[${logEntry.timestamp}] [${levelName}]`;
    
    // Use stderr for logs to avoid interfering with MCP protocol on stdout
    if (data) {
      console.error(`${prefix} ${logEntry.message}`, JSON.stringify(data, null, 2));
    } else {
      console.error(`${prefix} ${logEntry.message}`);
    }
  }

  /**
   * Log debug information
   */
  static debug(message: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, data);
  }

  /**
   * Log general information
   */
  static info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * Log warnings
   */
  static warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * Log errors
   */
  static error(message: string, data?: any): void {
    this.log(LogLevel.ERROR, message, data);
  }

  /**
   * Log performance metrics
   */
  static perf(operation: string, duration: number, data?: any): void {
    this.debug(`Performance: ${operation} took ${duration}ms`, data);
  }

  /**
   * Log API requests and responses
   */
  static api(method: string, url: string, status?: number, duration?: number): void {
    const logData = { method, url, status, duration };
    if (status && status >= 400) {
      this.error(`API Error: ${method} ${url}`, logData);
    } else {
      this.debug(`API Call: ${method} ${url}`, logData);
    }
  }

  /**
   * Log tool executions
   */
  static tool(toolName: string, toolArgs: any, result?: any, error?: any): void {
    if (error) {
      this.error(`Tool execution failed: ${toolName}`, { arguments: toolArgs, error });
    } else {
      this.debug(`Tool executed: ${toolName}`, { arguments: toolArgs, hasResult: !!result });
    }
  }

  /**
   * Log with custom context (returns cleanup function)
   */
  static withContext<T>(context: string, fn: () => T): T {
    const originalContext = this.context;
    this.setContext(context);
    try {
      return fn();
    } finally {
      this.context = originalContext;
    }
  }

  /**
   * Log with custom context for async operations
   */
  static async withContextAsync<T>(context: string, fn: () => Promise<T>): Promise<T> {
    const originalContext = this.context;
    this.setContext(context);
    try {
      return await fn();
    } finally {
      this.context = originalContext;
    }
  }

  /**
   * Create a timer for performance logging
   */
  static startTimer(operation: string): () => void {
    const startTime = Date.now();
    return () => {
      const duration = Date.now() - startTime;
      this.perf(operation, duration);
    };
  }

  /**
   * Log system information
   */
  static system(message: string, data?: any): void {
    this.info(`SYSTEM: ${message}`, data);
  }

  /**
   * Get current log level name
   */
  static getCurrentLogLevel(): string {
    return LogLevel[this.currentLogLevel];
  }
} 