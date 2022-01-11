import axios, { AxiosRequestConfig, AxiosResponse} from 'axios';
import { authenticate } from './auth';

export const axiosCall = async (method: any, url: any, data: any, headers: any) => {
  // extract the bearer token from the header and validate it
  if(headers.authorization) {
      const token = await authenticate(headers)
      headers.user = JSON.stringify(token);
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
