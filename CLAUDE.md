# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

FlowWeaver is a node-based workflow automation tool. Monorepo managed with pnpm workspaces.

- **Frontend:** `apps/frontend` — `@flowweaver/frontend`, Next.js App Router, port 3000
- **Backend:** `apps/backend` — `@flowweaver/backend`, NestJS REST API, port 3001
- **Shared packages:** `packages/` (reserved, currently empty)

## Commands

All commands run from the repo root unless noted.

### Development

```bash
pnpm dev                          # Start both apps in parallel
pnpm frontend dev                 # Frontend only (Next.js dev server)
pnpm backend dev                  # Backend only (NestJS watch mode)
```

### Build

```bash
pnpm build                        # Build all apps
pnpm --filter @flowweaver/backend build
```

### Lint & Format

```bash
pnpm lint                         # ESLint across all apps
pnpm --filter @flowweaver/backend lint     # Backend ESLint (runs --fix)
pnpm --filter @flowweaver/backend format   # Prettier format
```

### Test

```bash
pnpm test                                       # All apps
pnpm --filter @flowweaver/backend test          # Backend unit tests
pnpm --filter @flowweaver/backend test:watch    # Watch mode
pnpm --filter @flowweaver/backend test:cov      # Coverage report
pnpm --filter @flowweaver/backend test:e2e      # E2E tests
```

## Architecture

### Backend (NestJS)

Standard NestJS module architecture:
- `src/main.ts` — bootstrap, creates NestFactory app on port 3001
- `src/app.module.ts` — root module, imports all feature modules
- Feature modules follow the pattern: `*.module.ts` → `*.controller.ts` → `*.service.ts`
- Unit tests colocated as `*.spec.ts`; E2E tests live under `test/`
- Jest config is inline in `apps/backend/package.json`
- ESLint uses flat config (`eslint.config.mjs`) with TypeScript + Prettier

### Frontend (Next.js App Router)

- `app/` directory — App Router file-based routing
- `app/layout.tsx` — root layout (fonts, metadata)
- Path alias `@/*` maps to the repo root
- Tailwind v4 configured via PostCSS (`postcss.config.mjs`)

> **Next.js version note:** This project uses Next.js 16, which has breaking changes from earlier versions. Before writing frontend code, check `node_modules/next/dist/docs/` for current APIs and conventions.

## Workspace Shortcuts

The root `package.json` defines `pnpm frontend` and `pnpm backend` as aliases for `pnpm --filter @flowweaver/frontend` and `pnpm --filter @flowweaver/backend` respectively.
