import express from 'express'
import helmet from 'helmet'
const app = express()
import { router } from './routes'
import { APP_SECRET, AUTH0_AUDIENCE, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET, AUTH0_ISSUERER, PORT, RATE_LIMIT_PER_HOUR, AUTH_POLICY } from './util/config'
import rateLimit from 'express-rate-limit'
import { auth } from 'express-openid-connect'
import bodyParser from 'body-parser'
import cors from 'cors'

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
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
	cors({
	  origin: '*',
	  methods: ['GET', 'POST', 'DELETE', 'UPDATE', 'PUT', 'PATCH'],
	  allowedHeaders: ['Content-Type', 'Authorization'],
	  preflightContinue: false,
	}),
  );

if(AUTH_POLICY === 'auth0') {
	const config: any = {
		authRequired: false,
		auth0Logout: true,
		secret: APP_SECRET,
		baseURL: AUTH0_AUDIENCE,
		clientID: AUTH0_CLIENT_ID,
		issuerBaseURL: AUTH0_ISSUERER,
		clientSecret: AUTH0_CLIENT_SECRET,
		authorizationParams: {
			response_type: 'code',
			audience: `${AUTH0_AUDIENCE}/`,
			scope: 'openid profile email',
		},
		routes: {
			login: false,
			logout: false,
		}
	};	

	app.use(auth(config))

	app.get('/', (req, res) => {
		res.json({user: req.oidc.user, token: req.oidc.accessToken?.access_token});
	})
} else {

}


app.use('/', router)

app.listen(PORT, () => {
    console.log('Gateway has started on port ' + PORT)
})
