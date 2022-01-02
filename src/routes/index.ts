import express from 'express'
const router = express.Router()
import registry from '../registry/registry.json'
import fs from 'fs'
import { loadbalancer } from '../util/loadbalancer'
import { logger } from '../util/logger';
import joi from '@hapi/joi';
import { axiosCall } from '../util/axiosCaller'
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
                fs.writeFile('dist/registry/registry.json', JSON.stringify(registry), (error) => {
                    console.log(error)
                })
                logger.info(`enableInstance - Succeessfully enabled/disabled ${requestBody.url} for service ${serviceName}`); 

                return res.status(200).json({ message: `Succeessfully ${requestBody.enabled == true ? 'enabled' : 'disabled'} ${requestBody.url} for service ${serviceName}`, data: registryData.services[serviceName].instances[index] })
            }
        })
    }
    return
})

router.post('/gateway/service/register', (req, res) => {
    const requestBody = req.body
    const schema = joi.object().keys({
        serviceName: joi.string().required(),
        protocol: joi.string().required(),
        host: joi.string().required(),
        port: joi.number().required(),
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
                fs.writeFile('dist/registry/registry.json', JSON.stringify(registryData), (error) => {
                    console.log(error)
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
                fs.writeFile('dist/registry/registry.json', JSON.stringify(registryData), (error) => {
                    console.log(error)
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

router.all('/:serviceName/:path/:sl1?/:sl2?/:sl3?/:sl4?/:sl5?/:sl6?/:sl7?/:sl8?', async (req, res) => {
    if (registry.services.hasOwnProperty(req.params.serviceName.toLowerCase()) == false) {
        logger.error(`getServiceInstances - Service name not found`); 

        return res.status(404).json({
            message: 'Service name not found',
          });
    }
    const service = registryData.services[req.params.serviceName]
    if (service) {
        if (!service.loadBalanceStrategy) {
            service.loadBalanceStrategy = 'ROUND_ROBIN'
            fs.writeFile('src/registry/registry.json', JSON.stringify(registryData), (error) => {
                if (error) {
                    logger.error(`gatewayRouting - Couldn't write load balance strategy: ${error}`);

                    return res.status(400).json({message: `Couldn't write load balance strategy: ${error}`})
                }

                // write to dist folder too
                fs.writeFile('dist/registry/registry.json', JSON.stringify(registryData), (error) => {
                    console.log(error)
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
            const response = await axiosCall(method, apiUrl, headers, apiBody)
            logger.info(`gatewayRouting - Successfully routed request: method ${method}, url: ${apiUrl}`);

            return res.status(response.status).json(response.data)
        } catch (error: any) {
            console.log(error.code)
            logger.error(`gatewayRouting - An error occured: ${error.message}`);

            return res.status(400).json({message: `An error occured: ${error.message}`})
        }
    } else {
        logger.error(`gatewayRouting - Service name ${req.params.serviceName} does not exist`);

        return res.status(400).json({message: `Service name ${req.params.serviceName} does not exist`})
    }
})

const serviceAlreadyExists = (checkInfo: { serviceName: string | number; url: any }) => {
    let exists = false

    if (registry.services.hasOwnProperty(checkInfo.serviceName) == false) {
        exists = false
    }else{
        registryData.services[checkInfo.serviceName].instances.forEach((instance: { url: any }) => {
            if (instance.url === checkInfo.url) {
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