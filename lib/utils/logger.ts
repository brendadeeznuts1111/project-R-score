/**
 * 🛠️ Simple Logger Utility
 * 
 * Centralized logging utility to replace console.log statements
 * Provides structured logging with different levels
 * 
 * @version 1.0.0
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export const logger = {
  info: (msg: string): void => {
    console.log(msg);
  },
  
  error: (msg: string): void => {
    console.error(msg);
  },
  
  warn: (msg: string): void => {
    console.warn(msg);
  },
  
  debug: (msg: string): void => {
    if (process.env.DEBUG) {
      console.log(msg);
    }
  },
};
