import { AUTH0_JWKS_URI, AUTH0_AUDIENCE, AUTH0_ISSUERER, CUSTOM_AUTH_SECRET } from './config';

import jwt from 'express-jwt';
import jwks from 'jwks-rsa';
import Joi from '@hapi/joi';
import axios from 'axios';
import jwtWeb from 'jsonwebtoken';


export const jwtCheck = jwt({
  secret: jwks.expressJwtSecret({
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 5,
      jwksUri: AUTH0_JWKS_URI
}),
audience: `${AUTH0_AUDIENCE}/`,
issuer: `${AUTH0_ISSUERER}/`,
algorithms: ['RS256']
});

export async function authenticateAuth0(headers: { authorization: string; }) {
  const { authorization } = headers;

  const schema = Joi.object()
    .keys({
      authorization: Joi.string()
        .regex(/^Bearer [A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/)
        .required()
        .error(new Error('Invalid bearer token, you need authenticate again')),
    })
    .unknown(true);

  const validation = schema.validate(headers);
  if (validation.error) {
    throw new Error(validation.error.message);
  }

  const [, token] = authorization!.split('Bearer ');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    try {
      const response = await axios.get(
        `${AUTH0_ISSUERER}/userinfo`,
        {
          headers: {
            authorization: `Bearer ${token}`,
          }
        }
      )

      return response.data;
    } catch (error) {
      throw new Error('Invalid authorization token, you need to authenticate again');
    }
}

export async function authenticateCustom(headers: { authorization: string; }) {
  const { authorization } = headers;

  const schema = Joi.object()
    .keys({
      authorization: Joi.string()
        .regex(/^Bearer [A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$/)
        .required()
        .error(new Error('Invalid bearer token, you need authenticate again')),
    })
    .unknown(true);

  const validation = schema.validate(headers);
  if (validation.error) {
    throw new Error(validation.error.message);
  }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const [, token] = authorization!.split('Bearer ');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let decoded: any;
    try {
      decoded = jwtWeb.verify(token, CUSTOM_AUTH_SECRET);

      return decoded;
    } catch (error) {
      throw new Error('Invalid authorization token, you need to authenticate again');
    } 
}
