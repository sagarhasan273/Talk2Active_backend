import { createLogger, format, transports } from 'winston';

const logger = createLogger({
  level: 'info', // default log level
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), // add timestamp to logs
    format.colorize(), // colorize log output
    format.errors({ stack: true }), // include stack trace for errors
    format.printf(({ level, message, timestamp, stack }) => {
      return stack
        ? `[${timestamp}] ${level}: ${message}\n${stack}`
        : `[${timestamp}] ${level}: ${message}`;
    })
  ),
  transports: [
    new transports.Console(), // log to console
    new transports.File({ filename: 'logs/app.log' }), // log to file
    new transports.File({ filename: 'logs/error.log', level: 'error' }), // log errors to a separate file
  ],
});

export default logger;
