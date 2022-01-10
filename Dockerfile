FROM node:16

# Create app directory
WORKDIR /usr/src/app

# Add package file
COPY package*.json ./

# Install deps
RUN npm i
RUN npm audit fix --force

# Copy source
COPY . .

# Build dist
RUN npm run build-ts

# Expose port
EXPOSE ${PORT}

CMD npm run start
