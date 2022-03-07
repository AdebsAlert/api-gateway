import axios, { AxiosRequestConfig, AxiosResponse} from 'axios';
import { authenticateAuth0, authenticateCustom } from '../util/auth'
import { AUTH_POLICY } from './config';

export const axiosCall = async (method: any, url: any, data: any, headers: any) => {
  // extract the bearer token from the header and validate it
  if(headers.authorization && AUTH_POLICY === 'auth0') {
      const authUser = await authenticateAuth0(headers)
      headers.user = JSON.stringify(authUser);
  }else if(headers.authorization && AUTH_POLICY === 'custom'){
    const authUser = await authenticateCustom(headers)
     headers.user = JSON.stringify(authUser);
  }else{
    
  }
  
    const config: AxiosRequestConfig = {
        method,
        url,
        data,
        headers,
      };

      delete headers['authorization'];
      const response: AxiosResponse = await axios(config);
      return response
}
