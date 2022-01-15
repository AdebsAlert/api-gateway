import express from 'express'
const router = express.Router()
import registry from '../registry/registry.json'
import fs from 'fs'
import { loadbalancer } from '../util/loadbalancer'
import { logger } from '../util/logger';
import joi from '@hapi/joi';
import { axiosCall } from '../util/axiosCaller'
import { AUTH_FIELDS, AUTH_URL } from '../util/config'
import { ping } from '../util/ping'
import { refreshToken, signJWT } from '../util/auth'
// init the registry
const registryData: {[index: string]:any} = registry;
const loadbalancerData: {[index: string]:any} = loadbalancer;

router.post('/gateway/instance/enable/:serviceName', (req, res) => {
    const serviceName = req.params.serviceName;
    const requestBody = req.body;

    const schema = joi.object().keys({
        url: joi.string().required(),
        enabled: joi.boolean().required(),
      });
    
      const validation = schema.validate(requestBody);
      if (validation.error) {
        logger.error(`enableInstance - Enabling instance failed due to validation error - ${validation.error.details[0].message}`);
    
        return res.status(400).json({
          message: validation.error.details[0].message,
        });
      }

    let instances;

    if (registry.services.hasOwnProperty(serviceName) == true) {
        instances = registryData.services[serviceName].instances
    } else {
        logger.error(`enableInstance - Service name not found`); 

        return res.status(404).json({
            message: 'Service name not found',
          });
    }
    const index = instances.findIndex((srv: { url: any }) => { return srv.url === requestBody.url })
    if(index == -1){
        logger.error(`enableInstance - Could not find ${requestBody.url} for service ${serviceName}`); 

        return res.status(404).json({ message: `Could not find ${requestBody.url} for service ${serviceName}`})
    } else {
        instances[index].enabled = requestBody.enabled
        fs.writeFile('src/registry/registry.json', JSON.stringify(registry), (error) => {
            if (error) {
                logger.error(`enableInstance - Could not enable/disable ${requestBody.url} for service ${serviceName} : ${error}`); 

                return res.status(400).json({ message: `Could not enable/disable ${requestBody.url} for service ${serviceName} : ${error}`})
            } else {
                // write to dist folder too
                fs.writeFile('dist/registry/registry.json', JSON.stringify(registry), (_error) => {
                })
                logger.info(`enableInstance - Succeessfully enabled/disabled ${requestBody.url} for service ${serviceName}`); 

                return res.status(200).json({ message: `Succeessfully ${requestBody.enabled == true ? 'enabled' : 'disabled'} ${requestBody.url} for service ${serviceName}`, data: registryData.services[serviceName].instances[index] })
            }
        })
    }
    return
})

router.post('/gateway/service/register', async (req, res) => {
    const requestBody = req.body
    const schema = joi.object().keys({
        serviceName: joi.string().required(),
        protocol: joi.string().required(),
        host: joi.string().required(),
        port: joi.number().required(),
        healthUrl: joi.string().required(),
      });
    
      const validation = schema.validate(requestBody);
      if (validation.error) {
        logger.error(`registerService - registering service failed due to validation error - ${validation.error.details[0].message}`);
    
        return res.status(400).json({
          message: validation.error.details[0].message,
        });
      }


      requestBody.url = requestBody.protocol + "://" + requestBody.host + ":" + requestBody.port + "/"
      requestBody.enabled = true

      // check if healthUrl contains http
      if(requestBody.healthUrl.search('http') != 0) {

        logger.error(`registerService - Please input full path health url for ${requestBody.url}`);

        return res.status(400).json({ message: `Please input full path health url for ${requestBody.url}`})
      }

      // ping health endpoint to see if it is available
      const pingHealth = await ping.isAlive(requestBody.healthUrl)

      if(pingHealth === false) {
        logger.error(`registerService - Health url is not reachable for ${requestBody.url}`);

        return res.status(400).json({ message: `Health url is not reachable for ${requestBody.url}`})
      }

    if (serviceAlreadyExists(requestBody) == true) {
        logger.error(`registerService - Configuration already exists for ${requestBody.serviceName} at ${requestBody.url}`);

        return res.status(400).json({ message: `Configuration already exists for ${requestBody.serviceName} at ${requestBody.url}`})
    } else {
        const currentServicesData = registryData.services
        if (registry.services.hasOwnProperty(requestBody.serviceName) == false) {
            const newService = {
                [requestBody.serviceName.toLowerCase()]: { 
                    index: 0,
                    loadBalanceStrategy: "ROUND_ROBIN",
                    instances: []
                }
            }
            registryData.services = Object.assign(currentServicesData, newService)
            registryData.services[requestBody.serviceName.toLowerCase()].instances.push({ ...requestBody })
        }else{
            registryData.services[requestBody.serviceName.toLowerCase()].instances.push({ ...requestBody })

        }

        fs.writeFile('src/registry/registry.json', JSON.stringify(registryData), (error) => {
            if (error) {
                logger.error(`registerService - Could not register ${requestBody.serviceName}: ${error}`);

                return res.status(400).json({ message: `Could not register ${requestBody.serviceName}: ${error}`})
            } else {
                // write to dist folder too
                fs.writeFile('dist/registry/registry.json', JSON.stringify(registryData), (_error) => {
                })
                logger.info(`registerService - Successfully registered ${requestBody.serviceName}`);

                return res.status(200).json({ 
                    message: `Succeessfully registered ${requestBody.serviceName}`, 
                    data: registryData.services[requestBody.serviceName.toLowerCase()] })
            }
        })
    }
    return
})

router.post('/gateway/service/unregister', (req, res) => {
    const requestBody = req.body

    const schema = joi.object().keys({
        serviceName: joi.string().required(),
        url: joi.string().required(),
      });
    
      const validation = schema.validate(requestBody);
      if (validation.error) {
        logger.error(`unregisterService - registering service failed due to validation error - ${validation.error.details[0].message}`);
    
        return res.status(400).json({
          message: validation.error.details[0].message,
        });
      }

    if (serviceAlreadyExists(requestBody)) {
        const index = registryData.services[requestBody.serviceName.toLowerCase()].instances.findIndex((instance: { url: any }) => {
            return requestBody.url === instance.url
        })
        registryData.services[requestBody.serviceName.toLowerCase()].instances.splice(index, 1)
        fs.writeFile('src/registry/registry.json', JSON.stringify(registryData), (error) => {
            if (error) {
                logger.error(`unregisterService - Could not unregister ${requestBody.serviceName}: ${error}`);

                return res.status(400).json({ message: `Could not unregister ${requestBody.serviceName}: ${error}`})
            } else {
                // write to dist folder too
                fs.writeFile('dist/registry/registry.json', JSON.stringify(registryData), (_error) => {
                })

                logger.info(`unregisterService - Successfully unregistered ${requestBody.serviceName}`);

                return res.status(200).json({ message: `Successfully unregistered ${requestBody.serviceName}`})
            }
        })
    } else {
        logger.error(`unregisterService - Service does not exist for ${requestBody.serviceName} at ${requestBody.url}`);

        return res.status(400).json({ message: `Service does not exist for ${requestBody.serviceName} at ${requestBody.url}`})
    }
    return
})

router.get('/gateway/service/all', (_req, res) => {    
    logger.info(`getAllServices - All services returned successfully`);

    return res.status(200).json({ message: `All services returned successfully`, data: registryData.services })
})

router.get('/gateway/service/:serviceName', (req, res) => {    
    if (registry.services.hasOwnProperty(req.params.serviceName.toLowerCase()) == true ) {
    const instances = registryData.services[req.params.serviceName.toLowerCase()].instances
    logger.info(`getServiceInstances - Instances fetced successfully`); 

    return res.status(200).json({ message: `Service instances returned successfully`, data: instances })
    } else {
        logger.error(`getServiceInstances - Service name not found`); 

        return res.status(404).json({
            message: 'Service name not found',
          });
    }
})

router.post('/gateway/user/authenticate/refresh-token', async (req, res) => {
    const token = req.body.token

        // call axios
        try {
            const newToken = await refreshToken(token)

                logger.info(`refreshToken - Successfully refreshed token`);

                return res.status(200).json({
                    message: 'Token refreshed successfully',
                    token: newToken,
                })
            
        } catch (error: any) {
            logger.error(`refreshToken - ${error.message}`);

            return res.status(400).json({message: `${error.message}`})
        }
})

router.post('/gateway/user/authenticate', async (req, res) => {
    const authFields = AUTH_FIELDS.replace(/^\s+|\s+$/gm,'').split(','); // remove spaces if any and strip string by comma on auth fields

    const schema = joi.object().keys({
        username: joi.string().required(),
        password: joi.string().required(),
      });
    
      const validation = schema.validate(req.body);
      if (validation.error) {
        logger.error(`authenticate - authentication failed due to validation error - ${validation.error.details[0].message}`);
    
        return res.status(400).json({
          message: validation.error.details[0].message,
        });
      }

    const username: string = authFields[0]
    const password: string = authFields[1]

        const method = 'POST'
        const apiUrl = `${AUTH_URL}`
        const apiBody = {[username]: req.body.username, [password]: req.body.password}
        const headers = {}

        // call axios
        try {
            const response = await axiosCall(method, apiUrl, apiBody, headers)

            logger.info(`authenticate - authenticating the request`);

            // check if response is 200 and sign the credential
            if(response.status !== 200) {
                logger.info(`authenticate - authentication failed`);

                return res.status(response.status).json(response.data)
            }else{
                // it is a valid auth, sign the credential
                const token = signJWT(response.data.data);

                logger.info(`authenticate - Successfully authenticated the request`);

                return res.status(response.status).json({
                    message: 'Authenticated successfully',
                    token,
                    data: response.data.data
                })
                
            }

            
        } catch (error: any) {
            logger.error(`authenticate - ${error.message}`);

            return res.status(400).json({message: `${error.message}`})
        }
})

router.all('/:serviceName/:path/:sl1?/:sl2?/:sl3?/:sl4?/:sl5?/:sl6?/:sl7?/:sl8?', async (req, res) => {
    if (registry.services.hasOwnProperty(req.params.serviceName.toLowerCase()) == false) {
        logger.error(`getServiceInstances - Service name not found`); 

        return res.status(404).json({
            message: 'Service name not found',
          });
    }
    const service = registryData.services[req.params.serviceName]

    // check if any active instance for this server
    let servInstances = service.instances.find( (instance: { [x: string]: boolean }) => instance['enabled'] === true );

    if(!servInstances) {
        logger.error(`gatewayRouting - No active instance for service ${req.params.serviceName}`);

        return res.status(400).json({message: `No active instance for service ${req.params.serviceName}`})

    }

    if (service) {
        if (!service.loadBalanceStrategy) {
            service.loadBalanceStrategy = 'ROUND_ROBIN'
            fs.writeFile('src/registry/registry.json', JSON.stringify(registryData), (error) => {
                if (error) {
                    logger.error(`gatewayRouting - Couldn't write load balance strategy: ${error}`);

                    return res.status(400).json({message: `Couldn't write load balance strategy: ${error}`})
                }

                // write to dist folder too
                fs.writeFile('dist/registry/registry.json', JSON.stringify(registryData), (_error) => {
                })
                return
            })
        }

        const trailingUrlChain1 = req.params.sl1 ? '/' + req.params.sl1 : ''
        const trailingUrlChain2 = req.params.sl2 ? '/' + req.params.sl2 : ''
        const trailingUrlChain3 = req.params.sl3 ? '/' + req.params.sl3 : ''
        const trailingUrlChain4 = req.params.sl4 ? '/' + req.params.sl4 : ''
        const trailingUrlChain5 = req.params.sl5 ? '/' + req.params.sl5 : ''
        const trailingUrlChain6 = req.params.sl6 ? '/' + req.params.sl6 : ''
        const trailingUrlChain7 = req.params.sl7 ? '/' + req.params.sl7 : ''
        const trailingUrlChain8 = req.params.sl8 ? '/' + req.params.sl8 : ''

        const newIndex = loadbalancerData[service.loadBalanceStrategy](service)
        const url = service.instances[newIndex].url
        const method = req.method
        const apiUrl = `${url}${req.params.path}${trailingUrlChain1}${trailingUrlChain2}${trailingUrlChain3}
        ${trailingUrlChain4}${trailingUrlChain5}${trailingUrlChain6}${trailingUrlChain7}${trailingUrlChain8}`
        const apiBody = req.body as string
        const headers = req.headers

        // call axios
        try {
            const response = await axiosCall(method, apiUrl, apiBody, headers)
            logger.info(`gatewayRouting - Successfully routed request: method ${method}, url: ${apiUrl}`);

            return res.status(response.status).json(response.data)
        } catch (error: any) {
            if(error.code == 'ECONNREFUSED') {
                // turn the service inactive as it is unreachable
                service.instances[newIndex].enabled = false
                fs.writeFile('src/registry/registry.json', JSON.stringify(registry), (error) => {
            if (error) {
                logger.error(`gatewayRouting - Could not disable ${url} for service ${service.instances[newIndex].serviceName} : ${error}`); 
            } else {
                // write to dist folder too
                fs.writeFile('dist/registry/registry.json', JSON.stringify(registry), (_error) => {
                })
                logger.info(`gatewayRouting - Successfully disabled ${url} for service ${service.instances[newIndex].serviceName}`); 
            }
        })
            logger.error(`gatewayRouting - An error occured: service ${url} is unreachable`);

            return res.status(400).json({message: `An error occured: service ${url} is unreachable`})

            }
            logger.error(`gatewayRouting - ${error.message}`);

            return res.status(400).json({message: `${error.message}`})
        }
    } else {
        logger.error(`gatewayRouting - Service name ${req.params.serviceName} does not exist`);

        return res.status(400).json({message: `Service name ${req.params.serviceName} does not exist`})
    }
})

const serviceAlreadyExists = (checkInfo: { serviceName: string | number; url: any; }) => {
    let exists = false

    if (registry.services.hasOwnProperty(checkInfo.serviceName) == false) {
        exists = false
    }else{
        registryData.services[checkInfo.serviceName].instances.forEach((instance: { url: any; enabled: boolean }) => {
            if (instance.url === checkInfo.url && instance.enabled === true) {
                exists = true
                return
            }else{
                exists = false
            }
        })
    }
    return exists
}

export { router };