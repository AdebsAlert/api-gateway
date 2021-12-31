import { createLogger, format, transports } from 'winston';

const logger = createLogger({
  format: format.combine(
    format.colorize(),
    format.timestamp(),
    format.printf(({ level, message, timestamp }) => `${timestamp} ${level}: ${message}`),
  ),
  transports: [new transports.Console()],
});

export { logger };
