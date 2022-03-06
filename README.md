# API-Gateway

A simple but robust API Gateway written in [TypeScript](https://www.typescriptlang.org/).

API Gateway is a developer friendly tool that sits at the heart of your microservices architecture and securely expose them through APIs using Nodejs.

## Features

- `Authentication` (Auth0)
- `Service Registry`
- `Service Management`
- `Load Balancing`
- `API Health & PING`
- `REST API`
- `Logging`


## Installation

1. Clone the repository to your project root directory using this command: (replace `api-gateway` with a folder name for the gateway)
```sh
git clone https://github.com/AdebsAlert/api-gateway.git api-gateway
```

2. CD into the gateway directory and install all dependencies:
```sh
cd api-gateway
npm install -g typescript
npm install
```

3. Create a .env file from the .env.example file and enter your key values
```sh
cp .env.example .env
```

4. Build and start the API Gateway
```sh
npm run build-ts
npm run watch-serve
```

## Service Management

https://documenter.getpostman.com/view/4644005/UVkvKYZS


## License
[MIT](LICENSE)
