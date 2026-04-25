FROM node:24-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy shared module first and build it
COPY shared ./shared
WORKDIR /app/shared
RUN npm ci && npm run build

# Copy service files and dependencies
WORKDIR /app
COPY services/aukro-service ./services/aukro-service
COPY tsconfig.json ./
COPY package*.json ./
COPY prisma ./prisma

# Install service dependencies (which reference shared via file://)
WORKDIR /app/services/aukro-service
RUN npm ci

# Generate Prisma client (outputs to /app/shared/node_modules/.prisma/client)
WORKDIR /app
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" ./shared/node_modules/.bin/prisma generate --schema=prisma/schema.prisma

# Build service
WORKDIR /app/services/aukro-service
RUN npm run build

# Production stage - copy only what's needed
FROM node:24-slim

WORKDIR /app

# Copy service dist and node_modules
COPY --from=builder /app/services/aukro-service/dist ./dist
COPY --from=builder /app/services/aukro-service/node_modules ./node_modules

# Copy entire shared package (source + compiled dist + node_modules for @aukro/shared)
COPY --from=builder /app/shared ./shared

# Ensure @aukro/shared is properly resolved in node_modules
RUN mkdir -p /app/node_modules/@aukro && ln -sf ../../shared /app/node_modules/@aukro/shared

EXPOSE 3000

CMD ["node", "dist/main.js"]
