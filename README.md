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

### 2026-04-15

- **템플릿 갤러리 추가**: Prisma 스키마에 `Template` 모델 추가. 서버 최초 기동 시 `TemplatesService.onModuleInit()`에서 4개의 시드 템플릿("매일 아침 날씨 알림", "웹훅 받아서 디스코드 전송", "조건부 Slack 알림", "배열 데이터 순차 처리") 자동 삽입
- **템플릿 API**: `GET /templates`(목록 조회), `POST /templates/:id/use`(템플릿에서 새 플로우 생성) 엔드포인트 추가. JwtAuthGuard로 보호
- **대시보드 Templates 탭**: 대시보드에 "템플릿" 탭 신설. 템플릿을 카테고리 배지(스케줄·알림·데이터 처리)와 함께 카드로 표시. "사용하기" 버튼 클릭 시 템플릿 DAG를 복사하여 새 플로우를 생성하고 캔버스로 즉시 이동
- **Export 기능**: 캔버스 툴바에 "Export" 버튼 추가. 현재 캔버스의 노드·엣지를 DAG JSON으로 직렬화하여 `.json` 파일로 다운로드
- **Import 기능**: 캔버스 툴바에 "Import" 버튼 추가. `.json` 파일 선택 시 `nodes`·`edges` 필드 유효성을 검증한 후 `POST /flows/import` 백엔드 엔드포인트로 전송하여 새 플로우를 생성하고 캔버스에 즉시 로드
- **백엔드 Import 유효성 검증**: `POST /flows/import` 엔드포인트는 기존 `SaveFlowDto`의 class-validator 데코레이터(`@IsString`, `@IsArray`, `@ValidateNested`)를 통해 업로드된 DAG 구조를 스키마 수준에서 검증
- `pnpm build` 성공, 백엔드 단위 테스트 31개 전체 통과

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
- **Condition(조건) 노드 추가**: 사이드바 "Control Flow" 섹션에 Condition 노드 템플릿 추가. 캔버스에 드래그하면 비교 대상 필드명·연산자(==, !=, >, <, >=, <=)·기준값을 인라인 설정할 수 있는 앰버색 노드가 생성됨. 하단에 초록(True)·빨강(False) 두 개의 소스 핸들을 제공해 각 브랜치로 엣지를 연결 가능
- **Delay(지연) 노드 추가**: 사이드바에 Delay 노드 추가. 지연 시간(Amount)과 단위(초/분)를 설정하면 해당 시간만큼 워크플로우 실행을 일시 정지한 뒤 다음 노드로 진행. 티얼색으로 시각적으로 구분
- **실행 엔진 제어 흐름 고도화 (백엔드)**: `NodeType`에 `condition`, `delay` 추가. `EdgeDto`에 `sourceHandle` 필드 추가. DAG 파서에 `edgesBySource` 맵 추가. 실행 엔진을 activation-count 모델로 전면 재설계 — Condition 노드는 조건 평가 결과에 따라 True 또는 False 핸들의 하위 노드만 활성화하고 나머지 브랜치는 자동 스킵, Delay 노드는 `setTimeout` 기반 비동기 대기 후 다음 노드를 실행
- **api.ts 엣지 직렬화 개선**: `toApiEdges` 함수에서 `sourceHandle` 값을 포함해 백엔드로 전송, Condition 브랜치 라우팅 정보가 정확히 전달됨
- `pnpm build` 성공, 백엔드 단위 테스트 26개 전체 통과 (Condition·Delay 신규 테스트 4개 포함)

- **테스트 실행(Dry Run) 기능 추가**: 캔버스 툴바에 보라색 "Test Run" 버튼 추가. 클릭 시 Trigger 노드에 주입할 초기 입력값(Mock Input)을 JSON으로 입력하는 모달 창이 열림
- **디버그 API (`POST /workflow/debug`)**: DB에 실행 이력을 남기지 않는 별도 엔드포인트 구현. 각 노드 실행 시 입력값(Input)·출력값(Output)을 서버 콘솔에 출력하고, 전체 실행 결과 트리를 즉시 반환. Delay 노드는 dry-run 시 실제 대기 없이 시뮬레이션
- **실시간 디버그 피드백 UI**: 테스트 실행 결과를 캔버스에 반영. 성공 노드는 초록색 테두리, 실패 노드는 빨간색 테두리 + `!` 배지, 실행되지 않은 노드(브랜치 스킵)는 회색 테두리 + 반투명 처리
- **노드 상세 패널**: 테스트 실행 후 캔버스의 노드를 클릭하면 해당 노드의 실행 상태, Input/Output JSON, 에러 메시지를 보여주는 패널이 캔버스 우하단에 표시됨. 동일 노드 재클릭 또는 `x` 버튼으로 닫기
- **`StepResult` 인터페이스 확장**: 기존 `output`에 더해 `input` 필드 추가 (선택적). 디버그 엔진에서 각 노드의 입력 컨텍스트를 캡처해 프론트엔드로 전달
- `pnpm build` 성공, 백엔드 단위 테스트 26개 전체 통과
- **배포(Publish) 상태 관리**: `Flow` 모델에 `status` 필드(`DRAFT` / `PUBLISHED`) 추가. Prisma 스키마 업데이트 후 `prisma db push` 및 `prisma generate` 실행. 신규 플로우는 기본값 `DRAFT`로 생성됨
- **Publish / Unpublish 엔드포인트**: `PATCH /flows/:id/publish`, `PATCH /flows/:id/unpublish` 추가. JwtAuthGuard로 보호되며 본인 플로우만 상태 변경 가능
- **캔버스 툴바 Publish 버튼**: 플로우 저장 후 활성화되는 Publish/Unpublish 토글 버튼 추가. 배포 상태가 `PUBLISHED`이면 버튼이 초록색으로 표시되고 툴바 상태 바에 `published` 배지 노출
- **스케줄링 트리거 연동 (`@nestjs/schedule`)**: `@nestjs/schedule` 패키지 설치. `FlowSchedulerService`가 플로우 배포 시 DAG의 시작 노드가 `Schedule(Cron)` 타입이면 `SchedulerRegistry`에 동적 크론 잡 등록, Unpublish 시 자동 삭제. 서버 재시작 시 `onModuleInit`에서 DB의 모든 PUBLISHED 플로우를 조회해 잡을 복원
- **웹훅 트리거 연동**: `POST /webhooks/:flowId` 엔드포인트 추가 (인증 불필요). 플로우가 `PUBLISHED` 상태인지 확인 후 요청 Body를 Trigger 노드의 입력 컨텍스트로 주입해 워크플로우 실행 엔진 가동. 실행 결과는 `Execution` 레코드에 저장
- **실행 엔진 triggerInput 파라미터 추가**: `executeWorkflow` 함수에 선택적 `triggerInput` 파라미터 추가. 웹훅 Body 등 외부 입력을 Trigger 노드 컨텍스트에 병합 가능
- `pnpm build` 성공, 백엔드 단위 테스트 26개 전체 통과

- **For-Each(반복) 노드 추가**: `NodeType`에 `FOR_EACH = 'foreach'` 추가. 백엔드 실행 엔진에서 배열 필드를 순회하며 하위 노드를 각 항목마다 반복 실행하는 `executeForEachBody` 서브-그래프 실행 로직 구현. 반복 실행된 스텝은 `iterationIndex`와 함께 `Execution` 로그에 기록
- **자동 재시도(Retry) 메커니즘 추가**: Action 노드 설정에 `maxRetries`(최대 재시도 횟수)와 `retryDelay`(재시도 대기 시간 ms) 필드 추가. 백엔드 실행 엔진에서 에러 발생 시 설정 횟수만큼 재시도하는 `executeWithRetry` 헬퍼 구현. 성공 시 `retryCount`가 `StepResult`에 기록되고 `[RETRY]` 로그가 생성됨
- **실행 로그 상세화**: `StepResult` 인터페이스에 `iterationIndex`(현재 반복 인덱스)와 `retryCount`(재시도 발생 횟수) 필드 추가. `FlowExecution` DB 결과 JSON에 포함되어 대시보드에서 확인 가능
- **프론트엔드 ForEachNode 컴포넌트**: 보라색(purple) 헤더의 `ForEachNode.tsx` 추가. `Array Field` 설정 입력을 통해 컨텍스트에서 순회할 배열 키를 지정. 사이드바 "Control Flow" 섹션에 등록
- **프론트엔드 CustomNode Retry 설정 UI**: Action 노드에 `Max Retries`와 `Retry Delay (ms)` 입력 필드 추가 (Trigger 노드에는 표시 안 됨)
- **WorkflowService 시그니처 통합**: `executeWithInput` 메서드를 제거하고 `execute(dto, triggerInput?)` 형태로 단일화. 웹훅 트리거(`WebhooksService`)도 동일 메서드 사용
- `pnpm build` 성공, 백엔드 단위 테스트 31개 전체 통과 (FOR_EACH 3개 + Retry 2개 신규 테스트 포함)

- **시크릿 금고(Secrets Vault) 추가**: Prisma 스키마에 `Secret` 모델 추가. 저장 시 AES-256-CBC로 암호화(`src/common/crypto.util.ts`). `POST /secrets`, `GET /secrets`, `DELETE /secrets/:id` 엔드포인트 구현. 응답에는 암호화된 값 대신 마스킹된 정보만 반환
- **자격 증명 관리 페이지 (`/credentials`)**: 대시보드 헤더에 "Credentials" 버튼 추가. 이름(예: My Discord Token)과 값을 등록·삭제할 수 있는 페이지 구현
- **캔버스 Action 노드 시크릿 선택 UI**: Action 노드에 "시크릿 사용" 토글 추가. 활성화 시 등록된 자격 증명을 드롭다운으로 선택 가능. 실행 시 백엔드가 자동으로 복호화하여 주입(`secretRef` → 실제 값 치환)
- **워크플로우 버전 관리(Versioning) 추가**: Prisma 스키마에 `FlowVersion` 모델 추가. Publish 시마다 현재 DAG JSON을 자동으로 새 버전(v1, v2, v3…)으로 스냅샷 저장
- **버전 히스토리 패널 (캔버스)**: 저장된 플로우에 "History" 버튼 추가. 클릭 시 오른쪽 상단에 패널이 열려 게시 이력(버전 번호 + 날짜)을 표시. "롤백" 클릭 시 해당 버전의 DAG로 캔버스 상태를 즉시 복원하고 DB도 업데이트
- **`fromDag` 유틸리티 추가**: 저장된 DAG JSON을 React Flow 노드/엣지로 복원하는 함수 추가. 포지션 정보가 없는 경우 자동 격자 배치로 재현. 버전 롤백 및 플로우 불러오기에 사용
- `pnpm build` 성공, 백엔드 단위 테스트 31개 전체 통과

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
