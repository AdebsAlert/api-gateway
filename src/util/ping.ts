import axios from 'axios';


type IPing = {
    isAlive: Function;
}

const ping = {} as IPing;
ping.isAlive = async (url: any) => {
    try {
        const response = await axios.get(url);
      return response.status === 200 ? true: false;  
    } catch (error) {
        return false; 
        
    }       
}

export { ping } 