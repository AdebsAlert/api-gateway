import Joi from '@hapi/joi';
import jwt from 'jsonwebtoken';
import { TOKEN_EXPIRY } from './config';
import { APP_SECRET } from './config';

export function signJWT(data: string | object | Buffer) {
  return jwt.sign(data,
    APP_SECRET,
    {
      expiresIn: TOKEN_EXPIRY,
    },
  );
}

export async function authenticate(headers: { authorization: string; }) {
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
    let decoded: Object;
    try {
      decoded = jwt.verify(token, APP_SECRET);
    } catch (error) {
      throw new Error('Invalid authorization token, you need to authenticate again');
    }

    return decoded;
}


export async function refreshToken(token: string) {

  let decoded: any;
    try {
      decoded = jwt.verify(token, APP_SECRET);
    } catch (error) {
      throw new Error('Invalid authorization token, you need to authenticate again');
    }

    delete decoded.iat;
    delete decoded.exp;

    return jwt.sign(decoded,
      APP_SECRET,
      {
        expiresIn: TOKEN_EXPIRY,
      },
    );


}