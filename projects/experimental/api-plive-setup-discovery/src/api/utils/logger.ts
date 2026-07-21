import { config } from '../config/api-config';
const winston = require('winston');

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return `${timestamp} ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''}`;
  })
);

export const logger = winston.createLogger({
  level: config.environment === 'production' ? 'info' : 'debug',
  format: logFormat,
  transports: [
    // Error log
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: logFormat
    }),
    // Combined log
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: logFormat
    })
  ]
});

// Add console transport for development
if (config.environment !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

// Handle uncaught exceptions
logger.exceptions.handle(
  new winston.transports.File({ filename: 'logs/exceptions.log' })
);

// Handle unhandled promise rejections
logger.rejections.handle(
  new winston.transports.File({ filename: 'logs/rejections.log' })
);
