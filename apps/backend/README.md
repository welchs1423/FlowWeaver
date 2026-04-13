# @flowweaver/backend

NestJS REST API server for FlowWeaver.

## Port

Runs on **3001** by default.

## Scripts

```bash
# Development (watch mode)
pnpm dev

# Build
pnpm build

# Production
pnpm start:prod

# Unit tests
pnpm test

# E2E tests
pnpm test:e2e
```

## Structure

```
src/
├── app.module.ts       # Root module
├── app.controller.ts   # Root controller
├── app.service.ts      # Root service
└── main.ts             # Entry point
```
