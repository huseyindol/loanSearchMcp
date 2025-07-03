export class Logger {
  static debug(message: string, ...args: any[]) {
    console.error(`[DEBUG] ${new Date().toISOString()} - ${message}`, ...args);
  }

  static info(message: string, ...args: any[]) {
    console.error(`[INFO] ${new Date().toISOString()} - ${message}`, ...args);
  }

  static warn(message: string, ...args: any[]) {
    console.error(`[WARN] ${new Date().toISOString()} - ${message}`, ...args);
  }

  static error(message: string, ...args: any[]) {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, ...args);
  }

  static query(query: string, result?: any) {
    console.error(`[QUERY] ${new Date().toISOString()} - "${query}"`, result ? JSON.stringify(result, null, 2) : '');
  }

  static tool(toolName: string, args: any, result?: any) {
    console.error(`[TOOL] ${new Date().toISOString()} - ${toolName}`, {
      args,
      result: result ? (typeof result === 'string' ? result.substring(0, 200) + '...' : result) : undefined
    });
  }
} 