# FlowWeaver

Node-based workflow automation tool. Build, connect, and automate your processes visually.

## Tech Stack

| Layer    | Technology                        |
| -------- | --------------------------------- |
| Frontend | Next.js (App Router), Tailwind CSS |
| Backend  | NestJS                            |
| Monorepo | pnpm workspaces                   |

## Project Structure

```
flowweaver/
├── apps/
│   ├── frontend/   # Next.js App Router (port 3000)
│   └── backend/    # NestJS REST API   (port 3001)
├── packages/       # Shared packages (future)
├── pnpm-workspace.yaml
└── package.json
```

## Prerequisites

- Node.js >= 20
- pnpm >= 9

## Getting Started

```bash
# Install all dependencies from the repo root
pnpm install

# Run both apps in parallel
pnpm dev

# Run individually
pnpm frontend dev
pnpm backend dev
```

## Scripts (root)

| Command        | Description                        |
| -------------- | ---------------------------------- |
| `pnpm dev`     | Start frontend and backend in parallel |
| `pnpm build`   | Build all apps                     |
| `pnpm lint`    | Lint all apps                      |
| `pnpm test`    | Run tests for all apps             |

## Changelog

### 2026-04-13 (canvas editor)
- Added visual canvas editor at `/canvas` route in `apps/frontend`
- Sidebar (`Sidebar.tsx`) lists draggable Trigger and Action node templates
- Drag-and-drop nodes onto a React Flow canvas (`FlowCanvas.tsx`)
- Custom node component (`CustomNode.tsx`) with inline config input and connection handles
- Zustand store (`store/flowStore.ts`) manages global nodes/edges state
- DAG utility (`lib/dagUtils.ts`) converts the canvas state to a backend-ready JSON graph in real time
- Home page updated with link to the canvas editor
- Dependencies added: `reactflow@11`, `zustand@5`

### 2026-04-13 (initial)
- Initial monorepo setup with pnpm workspaces
- `apps/frontend`: Next.js 16 + Tailwind CSS 4 (App Router)
- `apps/backend`: NestJS 11 (port 3001)
- Workspace packages named `@flowweaver/frontend` and `@flowweaver/backend`
