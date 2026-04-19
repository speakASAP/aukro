FROM node:24-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --prefer-offline --no-audit || npm ci

COPY . .

# Install root dependencies first (needed for file: symlinks like @aukro/shared)
RUN npm install --prefer-offline --no-audit

WORKDIR /app/services/aukro-service
RUN npm run build

EXPOSE 3000

ENTRYPOINT ["node"]
CMD ["dist/main.js"]
