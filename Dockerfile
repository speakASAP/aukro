FROM node:24-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --prefer-offline --no-audit || npm ci

COPY . .

WORKDIR /app/services/aukro-service
RUN npm install --prefer-offline --no-audit
RUN npm run build

EXPOSE 3000

ENTRYPOINT ["node"]
CMD ["dist/main.js"]
