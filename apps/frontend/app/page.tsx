import Link from 'next/link';

const features = [
  {
    icon: '⬡',
    title: '시각적 플로우 빌더',
    description:
      '드래그앤드롭으로 노드를 연결하고 DAG 파이프라인을 직관적으로 설계하세요. 코드 없이도 복잡한 자동화를 구성할 수 있습니다.',
  },
  {
    icon: '◈',
    title: '템플릿 갤러리',
    description:
      '날씨 알림, 디스코드 전송, Slack 알림 등 실전 검증된 템플릿으로 5분 안에 워크플로우를 시작하세요.',
  },
  {
    icon: '◉',
    title: '실시간 모니터링',
    description:
      'WebSocket 기반 실시간 노드 상태 추적. 각 노드가 성공, 실패, 처리 중인지 캔버스에서 즉시 확인합니다.',
  },
];

const plans = [
  {
    name: 'FREE',
    price: '₩0',
    period: '/월',
    description: '개인 프로젝트와 학습용',
    features: [
      '월 100회 워크플로우 실행',
      '플로우 무제한 생성',
      '기본 노드 타입 전체 제공',
      '실행 이력 30일 보관',
      '커뮤니티 지원',
    ],
    cta: '무료로 시작하기',
    href: '/auth/register',
    highlighted: false,
  },
  {
    name: 'PRO',
    price: '₩29,000',
    period: '/월',
    description: '팀 및 비즈니스 자동화',
    features: [
      '무제한 워크플로우 실행',
      '플로우 무제한 생성',
      '모든 노드 타입 + 우선 출시',
      '실행 이력 무제한 보관',
      '시크릿 금고 (암호화 저장)',
      '우선 기술 지원',
    ],
    cta: 'PRO 시작하기',
    href: '/auth/register?plan=pro',
    highlighted: true,
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-zinc-100">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-bold tracking-tight text-white">
            Flow<span className="text-violet-400">Weaver</span>
          </span>
          <nav className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="text-sm text-zinc-400 hover:text-white transition-colors px-3 py-1.5"
            >
              로그인
            </Link>
            <Link
              href="/dashboard"
              className="text-sm font-semibold bg-violet-600 hover:bg-violet-500 text-white px-4 py-1.5 rounded-lg transition-colors"
            >
              대시보드로 이동
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex flex-col flex-1">
        {/* Hero */}
        <section className="flex flex-col items-center text-center px-6 pt-24 pb-20 gap-8">
          <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/30 rounded-full px-4 py-1.5 text-sm text-violet-300">
            <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
            SaaS 정식 출시
          </div>
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight max-w-3xl leading-tight">
            자동화 워크플로우를{' '}
            <span className="text-violet-400">시각적으로</span> 설계하세요
          </h1>
          <p className="text-lg text-zinc-400 max-w-xl leading-relaxed">
            FlowWeaver는 코드 없이 복잡한 파이프라인을 구성하고, 엔터프라이즈급
            백엔드 엔진이 안정적으로 실행해 드립니다.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/auth/register"
              className="px-8 py-3 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-colors"
            >
              무료로 시작하기
            </Link>
            <Link
              href="/dashboard"
              className="px-8 py-3 rounded-lg border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white font-semibold text-sm transition-colors"
            >
              대시보드로 이동
            </Link>
          </div>
        </section>

        {/* Canvas preview placeholder */}
        <section className="px-6 pb-20 flex justify-center">
          <div className="w-full max-w-4xl rounded-2xl border border-zinc-800 bg-zinc-900 overflow-hidden">
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-zinc-800">
              <span className="w-3 h-3 rounded-full bg-red-500/70" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
              <span className="w-3 h-3 rounded-full bg-green-500/70" />
              <span className="ml-3 text-xs text-zinc-500">flowweaver — canvas</span>
            </div>
            <div className="h-56 flex items-center justify-center gap-6 px-8">
              {['Webhook Trigger', 'Filter', 'Discord Action'].map((label, i) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={`w-28 h-14 rounded-xl border flex items-center justify-center text-xs font-semibold ${
                        i === 0
                          ? 'border-blue-500/50 bg-blue-500/10 text-blue-300'
                          : i === 1
                            ? 'border-amber-500/50 bg-amber-500/10 text-amber-300'
                            : 'border-green-500/50 bg-green-500/10 text-green-300'
                      }`}
                    >
                      {label}
                    </div>
                  </div>
                  {i < 2 && (
                    <div className="flex items-center gap-1 text-zinc-600">
                      <div className="w-6 h-px bg-zinc-600" />
                      <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
                      <div className="w-6 h-px bg-zinc-600" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="px-6 py-20 bg-zinc-900/50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-3">주요 기능</h2>
            <p className="text-zinc-400 text-center mb-12">
              업무 자동화에 필요한 모든 것을 한 곳에
            </p>
            <div className="grid sm:grid-cols-3 gap-6">
              {features.map((f) => (
                <div
                  key={f.title}
                  className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-4 hover:border-violet-500/40 transition-colors"
                >
                  <span className="text-3xl">{f.icon}</span>
                  <h3 className="text-lg font-semibold">{f.title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{f.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="px-6 py-20">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-3">요금제</h2>
            <p className="text-zinc-400 text-center mb-12">
              규모에 맞는 플랜을 선택하세요
            </p>
            <div className="grid sm:grid-cols-2 gap-6">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={`rounded-2xl border p-8 flex flex-col gap-6 ${
                    plan.highlighted
                      ? 'border-violet-500 bg-violet-500/5 relative'
                      : 'border-zinc-800 bg-zinc-900'
                  }`}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet-600 text-white text-xs font-bold px-4 py-1 rounded-full">
                      추천
                    </div>
                  )}
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-semibold text-zinc-400">{plan.name}</span>
                    <div className="flex items-end gap-1">
                      <span className="text-4xl font-extrabold">{plan.price}</span>
                      <span className="text-zinc-500 mb-1">{plan.period}</span>
                    </div>
                    <p className="text-sm text-zinc-400">{plan.description}</p>
                  </div>
                  <ul className="flex flex-col gap-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <span className="text-violet-400 mt-0.5 shrink-0">✓</span>
                        <span className="text-zinc-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={plan.href}
                    className={`mt-auto text-center py-3 rounded-xl text-sm font-semibold transition-colors ${
                      plan.highlighted
                        ? 'bg-violet-600 hover:bg-violet-500 text-white'
                        : 'border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-8 px-6 text-center text-sm text-zinc-500">
        © 2026 FlowWeaver. All rights reserved.
      </footer>
    </div>
  );
}
