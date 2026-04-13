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
    │   └── workflow.dto.ts     # WorkflowDto, NodeDto, EdgeDto, NodeType, NodeKind
    ├── trigger/
    │   └── trigger.service.ts  # Webhook and schedule trigger handlers
    ├── action/
    │   └── action.service.ts   # HTTP request and data-transform action handlers
    └── dag/
        ├── dag-parser.ts       # Kahn's topological sort + reverseAdjacency
        └── execution-engine.ts # Async execution engine; propagates node context
```

## API

### POST /workflow/execute

Accepts a workflow graph (nodes + edges) and executes it in topological order.

**Request body**

```json
{
  "nodes": [
    { "id": "t1", "type": "trigger", "label": "Webhook", "data": { "kind": "webhook" } },
    { "id": "a1", "type": "action",  "label": "Rename",  "data": { "kind": "data-transform", "mapping": { "by": "triggeredBy" } } }
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
    "[ACTION]  id=a1 label=\"Rename\" — executed",
    "Workflow execution complete"
  ],
  "contextMap": {
    "t1": { "triggeredBy": "webhook", "nodeId": "t1", "receivedAt": "..." },
    "a1": { "triggeredBy": "webhook", "by": "webhook", "nodeId": "a1", "receivedAt": "..." }
  }
}
```

`node.type` must be `"trigger"` or `"action"`. `node.data.kind` selects the handler: `webhook`, `schedule`, `http-request`, or `data-transform`. The endpoint returns `400` if the graph contains a cycle or references an unknown node.

**Node data fields by kind**

| kind | required fields | optional fields |
|---|---|---|
| `webhook` | — | — |
| `schedule` | — | `cron` (default `* * * * *`) |
| `http-request` | `url` | `method` (default `GET`), `headers`, `body` |
| `data-transform` | — | `mapping` (`{ outputKey: inputKey }`) |

## Changelog

### 2026-04-13

- Implemented real node business logic wired into the DAG execution engine
- Added `NodeKind` enum (`webhook`, `schedule`, `http-request`, `data-transform`) as a sub-type discriminator stored in `node.data.kind`
- Added `TriggerService` (`src/workflow/trigger/trigger.service.ts`): webhook and schedule trigger handlers; webhook trigger stamps `triggeredBy`, `nodeId`, and `receivedAt`; schedule trigger stamps `cron` expression and `firedAt`
- Added `ActionService` (`src/workflow/action/action.service.ts`): HTTP request action uses Node built-in `fetch` and returns `statusCode` + `responseBody`; data-transform action remaps context keys via a `mapping` object
- Updated `dag-parser.ts` to compute `reverseAdjacency` so the engine can merge upstream output contexts for each node
- Updated `execution-engine.ts` to be async; propagates a typed `contextMap` through each node in topological order and returns it in `ExecutionResult`
- `WorkflowService.execute` is now async and injects `TriggerService` and `ActionService`
- Updated `WorkflowModule` to register the two new services
- Added unit tests for `TriggerService` (3 tests) and `ActionService` (5 tests); updated `WorkflowService` spec to cover context propagation (4 tests)
- Total: 20 tests, all passing
- Implemented DAG execution engine: `POST /workflow/execute` endpoint
- Added DAG parser using Kahn's topological sort algorithm (`src/workflow/dag/dag-parser.ts`)
- Added mock execution engine with console log output (`src/workflow/dag/execution-engine.ts`)
- Added `WorkflowDto` / `NodeDto` / `EdgeDto` with `class-validator` + `class-transformer` validation
- Enabled global `ValidationPipe` in `main.ts`
- Added unit tests for DAG parser and WorkflowService (9 tests, all passing)
