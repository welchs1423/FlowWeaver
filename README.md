# FlowWeaver

Next.js와 Nest.js로 구축된 강력한 시각적 워크플로우 빌더. > 직관적인 UI에서 설계한 DAG 파이프라인을 엔터프라이즈급 백엔드 엔진에서 실행합니다.

## 기술 스택

| 레이어     | 기술                               |
| ---------- | ---------------------------------- |
| 프론트엔드 | Next.js (App Router), Tailwind CSS |
| 백엔드     | NestJS                             |
| 모노레포   | pnpm workspaces                    |

## 프로젝트 구조

```
flowweaver/
├── apps/
│   ├── frontend/   # Next.js App Router (포트 3000)
│   └── backend/    # NestJS REST API   (포트 3001)
├── packages/       # 공유 패키지 (예정)
├── pnpm-workspace.yaml
└── package.json
```

## 사전 요구사항

- Node.js >= 20
- pnpm >= 9

## 시작하기

```bash
# 루트에서 전체 의존성 설치
pnpm install

# 두 앱을 동시에 실행
pnpm dev

# 개별 실행
pnpm frontend dev
pnpm backend dev
```

## 스크립트 (루트)

| 명령어       | 설명                              |
| ------------ | --------------------------------- |
| `pnpm dev`   | 프론트엔드와 백엔드를 동시에 실행 |
| `pnpm build` | 전체 앱 빌드                      |
| `pnpm lint`  | 전체 앱 린트                      |
| `pnpm test`  | 전체 앱 테스트 실행               |

## 변경 이력

### 2026-04-14 (실행 엔진 고도화 및 실행 이력 로깅)

- **실행 엔진 에러 핸들링**: 각 노드 실행을 `try/catch`로 감싸 노드 단위 예외를 포착하도록 개선. 특정 노드에서 에러 발생 시 이후 노드 실행을 즉시 중단하고 `failedAt` 필드에 실패 노드 ID를 기록
- **StepResult 인터페이스 추가**: `ExecutionResult`에 노드별 실행 결과(`steps: StepResult[]`)를 추가. 각 스텝은 `nodeId`, `label`, `status`, `output` 또는 `error`, `startedAt`, `finishedAt`을 포함
- **실행 이력 타임스탬프**: `Execution` 모델에 `startedAt(DateTime)`, `finishedAt(DateTime?)` 필드 추가 후 `prisma db push`로 DB 반영. 워크플로우 실행 시 시작/종료 시각이 DB에 저장됨
- **FlowsService 업데이트**: 실행 전후 타임스탬프를 측정하고, `result.failedAt` 여부에 따라 `status`를 `'failed'`로 자동 판단하도록 수정
- **테스트 추가**: 노드 레벨 에러 발생 시 실행 중단 및 `failedAt` 설정 검증, 각 스텝의 타임스탬프 포함 여부 검증 등 2개 테스트 추가 (총 22개 테스트 통과)

### 2026-04-13 (DB & API Integration)

- Added Prisma ORM (v7) to `apps/backend` with SQLite database (`prisma/dev.db`)
- Defined `Flow` and `Execution` models in `prisma/schema.prisma`
- Created `PrismaModule` / `PrismaService` using `@prisma/adapter-better-sqlite3` (Prisma 7 driver adapter)
- Added `FlowsModule` with full REST endpoints:
  - `POST /flows` — save a flow (name + DAG JSON)
  - `GET /flows` — list all flows
  - `GET /flows/:id` — retrieve a single flow with execution history
  - `PATCH /flows/:id` — update flow name or DAG
  - `DELETE /flows/:id` — delete a flow
  - `POST /flows/:id/execute` — run a saved flow and persist the result
- Enabled CORS on the backend (`http://localhost:3000`)
- Added `app/lib/api.ts` to `apps/frontend` for typed API calls (`saveFlow`, `updateFlow`, `executeFlow`)
- Extended Zustand store with `savedFlowId` state to track the persisted flow
- Added **Save** and **Run** buttons to the canvas toolbar (`FlowCanvas.tsx`):
  - Save auto-creates or updates the flow in the DB
  - Run auto-saves if not yet saved, then executes via the backend and displays the execution log
- All 20 backend unit tests pass; both apps build cleanly

### 2026-04-13 (캔버스 에디터)

- `apps/frontend`에 `/canvas` 경로로 시각적 캔버스 에디터 추가
- 사이드바(`Sidebar.tsx`)에서 트리거/액션 노드 템플릿을 드래그 가능하도록 목록 표시
- React Flow 캔버스(`FlowCanvas.tsx`)에 노드 드래그앤드롭 지원
- 커스텀 노드 컴포넌트(`CustomNode.tsx`): 인라인 설정 입력 및 연결 핸들 포함
- Zustand 스토어(`store/flowStore.ts`)로 노드/엣지 전역 상태 관리
- DAG 유틸리티(`lib/dagUtils.ts`): 캔버스 상태를 백엔드용 JSON 그래프로 실시간 변환
- 홈 페이지에 캔버스 에디터 링크 추가
- 의존성 추가: `reactflow@11`, `zustand@5`

### 2026-04-13 (초기 설정)

- pnpm workspaces 기반 모노레포 초기 구성
- `apps/frontend`: Next.js 16 + Tailwind CSS 4 (App Router)
- `apps/backend`: NestJS 11 (포트 3001)
- 워크스페이스 패키지명: `@flowweaver/frontend`, `@flowweaver/backend`
