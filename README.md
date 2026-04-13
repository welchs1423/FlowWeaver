# FlowWeaver

노드 기반 워크플로우 자동화 도구. 프로세스를 시각적으로 구성하고 연결해 자동화할 수 있습니다.

## 기술 스택

| 레이어   | 기술                              |
| -------- | --------------------------------- |
| 프론트엔드 | Next.js (App Router), Tailwind CSS |
| 백엔드   | NestJS                            |
| 모노레포 | pnpm workspaces                   |

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

| 명령어         | 설명                               |
| -------------- | ---------------------------------- |
| `pnpm dev`     | 프론트엔드와 백엔드를 동시에 실행  |
| `pnpm build`   | 전체 앱 빌드                       |
| `pnpm lint`    | 전체 앱 린트                       |
| `pnpm test`    | 전체 앱 테스트 실행                |

## 변경 이력

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
