import axios, { AxiosRequestConfig, AxiosResponse} from 'axios';
import { authenticateAuth0, authenticateCustom } from '../util/auth'
import { AUTH_POLICY } from './config';
import { logger } from './logger';

export const axiosCall = async (method: any, url: any, data: any, headers: any) => {
  // extract the bearer token from the header and validate it
  if(!url.includes('/auth/')  && AUTH_POLICY === 'auth0') {
    logger.info('Gateway - request is being authenticated with Auth0')
    const authUser = await authenticateAuth0(headers)
      headers.user = JSON.stringify(authUser);  
  }else if(!url.includes('/auth/') && AUTH_POLICY === 'custom'){
    logger.info('Gateway - request is being authenticated with Custom Auth')
    const authUser = await authenticateCustom(headers)
     headers.user = JSON.stringify(authUser);
  }else{
    logger.info('Gateway - request is not being authenticated')
    
  }

    const config: AxiosRequestConfig = {
        method,
        url,
        data,
      };

      delete headers['authorization'];

      logger.info('Gateway - routing incoming request')

      try {
        const response: AxiosResponse = await axios(config);
        return response
        
      } catch (error: any) {
        if (error.response) {
          logger.error(`Gateway - response error: ${error.response.data.error}`);
          return error.response;
        } else {
          logger.error(`Gateway - routing error: ${error.message}`)
          return error.message;
        } 
      }
      
}
