FROM node:20-alpine AS base
RUN npm install -g pnpm@9

# Install all dependencies and build
FROM base AS builder
WORKDIR /app

COPY . .
RUN pnpm install --frozen-lockfile

# Generate Prisma client (output: node_modules/.prisma/client at repo root)
RUN pnpm --filter @flowweaver/backend exec prisma generate

# Compile NestJS to dist/
RUN pnpm --filter @flowweaver/backend build

# Production image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV DATABASE_URL=file:/data/flowweaver.db

# Copy compiled output and schema
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/prisma ./apps/backend/prisma

# Copy root node_modules (includes .prisma/client and all runtime deps)
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3001

# Push schema to DB on first boot, then start the server
CMD ["sh", "-c", "node_modules/.bin/prisma db push --schema=./apps/backend/prisma/schema.prisma --skip-generate && node apps/backend/dist/main"]
