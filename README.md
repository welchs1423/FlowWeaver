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

### 2026-04-13

#### 초기 설정

- pnpm workspaces 기반 모노레포 초기 구성
- `apps/frontend`: Next.js 16 + Tailwind CSS 4 (App Router)
- `apps/backend`: NestJS 11 (포트 3001)
- 워크스페이스 패키지명: `@flowweaver/frontend`, `@flowweaver/backend`

#### 캔버스 에디터

- `apps/frontend`에 `/canvas` 경로로 시각적 캔버스 에디터 추가
- 사이드바(`Sidebar.tsx`)에서 트리거/액션 노드 템플릿을 드래그 가능하도록 목록 표시
- React Flow 캔버스(`FlowCanvas.tsx`)에 노드 드래그앤드롭 지원
- 커스텀 노드 컴포넌트(`CustomNode.tsx`): 인라인 설정 입력 및 연결 핸들 포함
- Zustand 스토어(`store/flowStore.ts`)로 노드/엣지 전역 상태 관리
- DAG 유틸리티(`lib/dagUtils.ts`): 캔버스 상태를 백엔드용 JSON 그래프로 실시간 변환
- 홈 페이지에 캔버스 에디터 링크 추가
- 의존성 추가: `reactflow@11`, `zustand@5`

#### DB & API 연동

- `apps/backend`에 Prisma ORM (v7) 추가, SQLite 데이터베이스 (`prisma/dev.db`) 사용
- `prisma/schema.prisma`에 `Flow`, `Execution` 모델 정의
- `@prisma/adapter-better-sqlite3` (Prisma 7 드라이버 어댑터)를 사용하는 `PrismaModule` / `PrismaService` 생성
- `FlowsModule`에 REST 엔드포인트 전체 추가:
  - `POST /flows` — 플로우 저장 (이름 + DAG JSON)
  - `GET /flows` — 전체 플로우 목록 조회
  - `GET /flows/:id` — 단일 플로우 및 실행 이력 조회
  - `PATCH /flows/:id` — 플로우 이름 또는 DAG 수정
  - `DELETE /flows/:id` — 플로우 삭제
  - `POST /flows/:id/execute` — 저장된 플로우 실행 및 결과 DB 저장
- 백엔드에 CORS 허용 설정 (`http://localhost:3000`)
- `apps/frontend`에 `app/lib/api.ts` 추가: 타입 지정 API 호출 함수 (`saveFlow`, `updateFlow`, `executeFlow`)
- Zustand 스토어에 `savedFlowId` 상태 추가하여 저장된 플로우 ID 추적
- 캔버스 툴바(`FlowCanvas.tsx`)에 **저장** 및 **실행** 버튼 추가:
  - 저장: DB에 플로우를 자동 생성하거나 업데이트
  - 실행: 미저장 상태면 자동 저장 후 백엔드에서 실행하고 실행 로그 표시
- 백엔드 유닛 테스트 20개 전체 통과, 두 앱 모두 빌드 정상
