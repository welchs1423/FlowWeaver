FROM node:20-alpine AS base
RUN npm install -g pnpm@9

# Install all dependencies and build
FROM base AS builder
WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @flowweaver/frontend build

# Production image using Next.js standalone output
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Standalone server bundle (includes its own minimal node_modules)
COPY --from=builder /app/apps/frontend/.next/standalone ./

# Static assets must be copied separately alongside the standalone server
COPY --from=builder /app/apps/frontend/.next/static ./apps/frontend/.next/static

# Public assets (directory may be absent)
COPY --from=builder /app/apps/frontend/public ./apps/frontend/public

EXPOSE 3000

# server.js is placed at the app's path within the standalone bundle
CMD ["node", "apps/frontend/server.js"]
