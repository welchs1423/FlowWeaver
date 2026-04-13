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
├── app.module.ts               # Root module
├── app.controller.ts           # Root controller
├── app.service.ts              # Root service
├── main.ts                     # Entry point (global ValidationPipe)
└── workflow/
    ├── workflow.module.ts
    ├── workflow.controller.ts  # POST /workflow/execute
    ├── workflow.service.ts
    ├── dto/
    │   └── workflow.dto.ts     # WorkflowDto, NodeDto, EdgeDto (class-validator)
    └── dag/
        ├── dag-parser.ts       # Kahn's topological sort
        └── execution-engine.ts # Mock execution engine (console log)
```

## API

### POST /workflow/execute

Accepts a workflow graph (nodes + edges) and executes it in topological order.

**Request body**

```json
{
  "nodes": [
    { "id": "t1", "type": "trigger", "label": "Webhook" },
    { "id": "a1", "type": "action",  "label": "Send Email" }
  ],
  "edges": [
    { "id": "e1", "source": "t1", "target": "a1" }
  ]
}
```

**Response**

```json
{
  "executedNodes": ["t1", "a1"],
  "log": [
    "Starting workflow execution — 2 node(s)",
    "[TRIGGER] id=t1 label=\"Webhook\" — fired",
    "  -> dispatching to: [a1]",
    "[ACTION]  id=a1 label=\"Send Email\" — executed",
    "Workflow execution complete"
  ]
}
```

Node `type` must be either `"trigger"` or `"action"`. The endpoint returns `400` if the graph contains a cycle or references an unknown node.

## Changelog

### 2026-04-13

- Implemented DAG execution engine: `POST /workflow/execute` endpoint
- Added DAG parser using Kahn's topological sort algorithm (`src/workflow/dag/dag-parser.ts`)
- Added mock execution engine with console log output (`src/workflow/dag/execution-engine.ts`)
- Added `WorkflowDto` / `NodeDto` / `EdgeDto` with `class-validator` + `class-transformer` validation
- Enabled global `ValidationPipe` in `main.ts`
- Added unit tests for DAG parser and WorkflowService (9 tests, all passing)
