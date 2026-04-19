FROM node:24-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --prefer-offline --no-audit || npm ci

COPY . .

# Install root dependencies and build shared module
RUN npm install --prefer-offline --no-audit

# Build shared module first (required dependency for aukro-service)
RUN cd /app/shared && npm run build

WORKDIR /app/services/aukro-service
RUN npm run build

EXPOSE 3000

ENTRYPOINT ["node"]
CMD ["dist/main.js"]
