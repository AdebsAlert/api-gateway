import dotenv from 'dotenv';
import { logger } from './logger';

dotenv.config({});

function throwIfUndefined<T>(secret: T | undefined, name?: string): T {
  if (!secret) {
    logger.error(`${name} must not be undefined`);
    return process.exit(1);
  }
  return secret;
}

export const PORT = throwIfUndefined(process.env.PORT, 'PORT');
export const APP = throwIfUndefined(process.env.APP, 'APP');
export const NODE_ENV = throwIfUndefined(process.env.NODE_ENV, 'NODE_ENV');
export const RATE_LIMIT_PER_HOUR = throwIfUndefined(process.env.RATE_LIMIT_PER_HOUR, 'RATE_LIMIT_PER_HOUR');
export const APP_SECRET = throwIfUndefined(process.env.APP_SECRET, 'APP_SECRET');
export const AUTH_URL = throwIfUndefined(process.env.AUTH_URL, 'AUTH_URL');
export const AUTH_FIELDS = throwIfUndefined(process.env.AUTH_FIELDS, 'AUTH_FIELDS');
export const TOKEN_EXPIRY = throwIfUndefined(process.env.TOKEN_EXPIRY, 'TOKEN_EXPIRY');
