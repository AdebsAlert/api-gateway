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
export const AUTH_POLICY = throwIfUndefined(process.env.AUTH_POLICY, 'AUTH_POLICY');
export const AUTH0_AUDIENCE = throwIfUndefined(process.env.AUTH0_AUDIENCE, 'AUTH0_AUDIENCE').replace(/\/$/, '');
export const AUTH0_ISSUERER = throwIfUndefined(process.env.AUTH0_ISSUERER, 'AUTH0_ISSUERER').replace(/\/$/, '');
export const AUTH0_JWKS_URI = throwIfUndefined(process.env.AUTH0_JWKS_URI, 'AUTH0_JWKS_URI').replace(/\/$/, '');
export const AUTH0_CLIENT_ID = throwIfUndefined(process.env.AUTH0_CLIENT_ID, 'AUTH0_CLIENT_ID');
export const AUTH0_CLIENT_SECRET = throwIfUndefined(process.env.AUTH0_CLIENT_SECRET, 'AUTH0_CLIENT_SECRET');
