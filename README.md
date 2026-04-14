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

### 2026-04-14

- **JWT 인증 시스템 (Email/Password)**: 백엔드에 `POST /auth/register`, `POST /auth/login` 엔드포인트 추가. bcryptjs로 비밀번호 해시 처리, `@nestjs/jwt` + `passport-jwt`로 토큰 발급 및 검증
- **User 모델 추가**: Prisma 스키마에 `User` 모델 추가 (`id`, `email`, `passwordHash`). `Flow` 모델에 `userId` 외래키 연결로 유저별 데이터 격리
- **라우트 권한 보호 (JwtAuthGuard)**: `FlowsController`, `ExecutionsController` 전체에 `JwtAuthGuard` 적용. 인증된 유저 본인 데이터만 조회/수정/실행 가능하며, 타인 데이터 접근 시 403 반환
- **프론트엔드 인증 페이지**: `/auth/login`, `/auth/register` 페이지 추가. Zustand 스토어(`authStore`)에 토큰·유저 정보 저장, localStorage 및 쿠키 동기화
- **라우트 보호 (Next.js Proxy)**: `proxy.ts`로 `/canvas`, `/dashboard` 미인증 접근 시 로그인 페이지로 리다이렉트. `/auth/*` 경로는 로그인 상태면 대시보드로 리다이렉트
- **내 워크플로우 탭 신설**: 대시보드를 "내 워크플로우" / "실행 이력" 두 탭으로 개편. 워크플로우 카드 UI에서 열기·삭제 바로 수행 가능. `fetchFlows`, `deleteFlow` API 함수 추가
- **AppHeader 공통 컴포넌트**: 로그인한 유저 이메일 표시, 로그아웃 버튼, "새 워크플로우" 바로가기 포함한 헤더 컴포넌트 분리
- `pnpm build` 성공, 백엔드 단위 테스트 22개 전체 통과
- **실행 엔진 에러 핸들링**: 각 노드 실행을 `try/catch`로 감싸 노드 단위 예외를 포착하도록 개선. 특정 노드에서 에러 발생 시 이후 노드 실행을 즉시 중단하고 `failedAt` 필드에 실패 노드 ID를 기록
- **StepResult 인터페이스 추가**: `ExecutionResult`에 노드별 실행 결과(`steps: StepResult[]`)를 추가. 각 스텝은 `nodeId`, `label`, `status`, `output` 또는 `error`, `startedAt`, `finishedAt`을 포함
- **실행 이력 타임스탬프**: `Execution` 모델에 `startedAt(DateTime)`, `finishedAt(DateTime?)` 필드 추가 후 `prisma db push`로 DB 반영. 워크플로우 실행 시 시작/종료 시각이 DB에 저장됨
- **FlowsService 업데이트**: 실행 전후 타임스탬프를 측정하고, `result.failedAt` 여부에 따라 `status`를 `'failed'`로 자동 판단하도록 수정
- **테스트 추가**: 노드 레벨 에러 발생 시 실행 중단 및 `failedAt` 설정 검증, 각 스텝의 타임스탬프 포함 여부 검증 등 2개 테스트 추가 (총 22개 테스트 통과)
- **ExecutionsModule 추가**: 백엔드에 `GET /executions`, `GET /executions/:id` 엔드포인트 추가. 모든 실행 이력을 플로우 이름과 함께 최신순으로 조회 가능
- **대시보드 메인 페이지 (`/dashboard`)**: 전체 실행 이력을 테이블로 표시. 5초 주기 자동 폴링으로 실시간 상태 반영. 전체/성공/실패/실행 중 건수를 통계 카드로 요약
- **상태 배지**: `Success`(초록), `Failed`(빨강), `Running`(파랑 점멸) 배지로 실행 상태를 시각적으로 구분
- **실행 상세 페이지 (`/dashboard/[id]`)**: 특정 실행 클릭 시 노드별 실행 단계(라벨, 상태, 소요 시간, 출력값, 에러 메시지) 및 전체 실행 로그 확인 가능
- **홈 페이지 업데이트**: 홈(`/`)에 "Monitoring Dashboard" 버튼 추가
- **api.ts 타입 확장**: `StepResult`, `ExecutionWithFlow` 인터페이스 추가, `ExecutionRecord`에 `startedAt`/`finishedAt` 필드 추가
- `pnpm build` 성공, 백엔드 단위 테스트 22개 전체 통과

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
