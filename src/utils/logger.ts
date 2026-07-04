import winston from 'winston';
import { createLogger, format, transports } from 'winston';


const { combine, timestamp, label, printf, prettyPrint } = format;

const myFormat = printf(({ level, message, label, timestamp }) => {
  return `${timestamp} [${label}] ${level}: ${message}`;
});



export const logger = winston.createLogger({
  level: 'debug',
  // format: winston.format.json(),
  format: combine(
    label({ label: 'Starting!' }),
    timestamp(),
    myFormat,
    // prettyPrint()
  ),
  defaultMeta: {},
  transports: [
    //
    // - Write all logs with importance level of `error` or higher to `error.log`
    //   (i.e., error, fatal, but not other levels)
    //
    new winston.transports.Console({
      level: 'debug'
    }),
    new winston.transports.File({ filename: './src/logs/error.log', level: 'error' }),
    //
    // - Write all logs with importance level of `info` or higher to `combined.log`
    //   (i.e., fatal, error, warn, and info, but not trace)
    //
    new winston.transports.File({ filename: './src/logs/combined.log' }),
  ],
});

//
// If we're not in production then log to the `console` with the format:
// `${info.level}: ${info.message} JSON.stringify({ ...rest }) `
//
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}
