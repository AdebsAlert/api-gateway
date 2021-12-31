import axios, { AxiosRequestConfig, AxiosResponse} from 'axios';

export const axiosCall = async (method: any, url: any, data: any, headers: any) => {
    const config: AxiosRequestConfig = {
        method,
        url,
        headers,
        data
      };
      const response: AxiosResponse = await axios(config);
      return response
}
