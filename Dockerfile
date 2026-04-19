FROM node:24-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --prefer-offline --no-audit || npm ci

COPY . .

WORKDIR /app/services/aukro-service
RUN npm install --prefer-offline --no-audit 2>/dev/null || true
RUN npm run build 2>/dev/null || true

EXPOSE 3000

ENTRYPOINT ["node"]
CMD ["dist/main.js"]
