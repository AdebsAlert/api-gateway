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
