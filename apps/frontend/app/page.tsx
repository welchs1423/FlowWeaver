import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 dark:bg-zinc-950">
      <main className="flex flex-col items-center gap-6 text-center px-6">
        <h1 className="text-5xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          FlowWeaver
        </h1>
        <p className="text-lg text-zinc-500 dark:text-zinc-400 max-w-md">
          Node-based workflow automation tool. Build, connect, and automate your
          processes visually.
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/auth/login"
            className="inline-block rounded-lg bg-violet-600 hover:bg-violet-500 px-6 py-2.5 text-sm font-semibold text-white transition-colors"
          >
            시작하기
          </Link>
          <Link
            href="/dashboard"
            className="inline-block rounded-lg border border-zinc-700 hover:border-zinc-500 px-6 py-2.5 text-sm font-semibold text-zinc-300 hover:text-zinc-100 transition-colors"
          >
            대시보드
          </Link>
        </div>
      </main>
    </div>
  );
}
