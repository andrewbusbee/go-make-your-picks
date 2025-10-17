/**
 * Frontend Logger
 * Provides consistent logging with levels for the frontend application
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL' | 'SILENT';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  metadata?: any;
}

class FrontendLogger {
  private logLevel: LogLevel = 'INFO';
  private isDevelopment: boolean = false;

  constructor() {
    this.isDevelopment = import.meta.env.MODE === 'development';
    this.setLogLevel();
    
    // Log the selected log level on startup
    this.info(`🔧 Frontend Logger initialized with level: ${this.logLevel}`, {
      selectedLevel: this.logLevel,
      environment: import.meta.env.MODE,
      availableLevels: ['FATAL', 'ERROR', 'WARN', 'INFO', 'DEBUG', 'SILENT']
    });
  }

  private setLogLevel(): void {
    // Check for log level in localStorage or default based on environment
    const storedLevel = localStorage.getItem('LOG_LEVEL') as LogLevel;
    if (storedLevel && ['DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL', 'SILENT'].includes(storedLevel)) {
      this.logLevel = storedLevel;
    } else {
      this.logLevel = this.isDevelopment ? 'DEBUG' : 'INFO';
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = {
      'FATAL': 0,
      'ERROR': 1,
      'WARN': 2,
      'INFO': 3,
      'DEBUG': 4,
      'SILENT': 5
    };

    return levels[level] <= levels[this.logLevel];
  }

  private formatMessage(level: LogLevel, message: string, metadata?: any): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level}]`;
    
    if (metadata && Object.keys(metadata).length > 0) {
      return `${prefix} ${message} ${JSON.stringify(metadata)}`;
    }
    
    return `${prefix} ${message}`;
  }

  private log(level: LogLevel, message: string, metadata?: any): void {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(level, message, metadata);
    
    // Use appropriate console method
    switch (level) {
      case 'FATAL':
      case 'ERROR':
        console.error(formattedMessage);
        break;
      case 'WARN':
        console.warn(formattedMessage);
        break;
      case 'INFO':
        console.info(formattedMessage);
        break;
      case 'DEBUG':
        console.debug(formattedMessage);
        break;
      default:
        console.log(formattedMessage);
    }

    // In development, also log to localStorage for debugging
    if (this.isDevelopment) {
      try {
        const logs = JSON.parse(localStorage.getItem('frontend_logs') || '[]');
        logs.push({
          level,
          message,
          timestamp: new Date().toISOString(),
          metadata
        });
        
        // Keep only last 100 logs
        if (logs.length > 100) {
          logs.splice(0, logs.length - 100);
        }
        
        localStorage.setItem('frontend_logs', JSON.stringify(logs));
      } catch (error) {
        // Ignore localStorage errors
      }
    }
  }

  public debug(message: string, metadata?: any): void {
    this.log('DEBUG', message, metadata);
  }

  public info(message: string, metadata?: any): void {
    this.log('INFO', message, metadata);
  }

  public warn(message: string, metadata?: any): void {
    this.log('WARN', message, metadata);
  }

  public error(message: string, metadata?: any): void {
    this.log('ERROR', message, metadata);
  }

  public fatal(message: string, metadata?: any): void {
    this.log('FATAL', message, metadata);
  }

  public setLevel(level: LogLevel): void {
    this.logLevel = level;
    localStorage.setItem('LOG_LEVEL', level);
  }

  public getLevel(): LogLevel {
    return this.logLevel;
  }

  public getLogs(): LogEntry[] {
    try {
      return JSON.parse(localStorage.getItem('frontend_logs') || '[]');
    } catch {
      return [];
    }
  }

  public clearLogs(): void {
    localStorage.removeItem('frontend_logs');
  }
}

// Create singleton instance
const logger = new FrontendLogger();

export default logger;

// Export individual log functions for convenience
export const logDebug = (message: string, metadata?: any) => logger.debug(message, metadata);
export const logInfo = (message: string, metadata?: any) => logger.info(message, metadata);
export const logWarn = (message: string, metadata?: any) => logger.warn(message, metadata);
export const logError = (message: string, metadata?: any) => logger.error(message, metadata);
export const logFatal = (message: string, metadata?: any) => logger.fatal(message, metadata);
