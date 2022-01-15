import express from 'express'
import helmet from 'helmet'
const app = express()
import * as registry from './registry/registry.json'
import { router } from './routes'
import { PORT, RATE_LIMIT_PER_HOUR } from './util/config'
import rateLimit from 'express-rate-limit'

const limiter = rateLimit({
	windowMs: 60 * 60 * 1000, // 60 minutes
	max: parseInt(RATE_LIMIT_PER_HOUR), // Limit each IP to 100 requests per `window` (here, per 60 minutes)
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
})

// Apply the rate limiting middleware to all requests
app.use(limiter)
app.use(express.json())
app.use(helmet())

app.get('/ui', (_req, res) => {
    res.render('index', { services: registry.services })
})
// app.use(auth)
app.use('/', router)

app.listen(PORT, () => {
    console.log('Gateway has started on port ' + PORT)
})
