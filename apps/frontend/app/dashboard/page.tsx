'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { fetchExecutions, type ExecutionWithFlow } from '../lib/api';

const POLL_INTERVAL_MS = 5000;

function StatusBadge({ status }: { status: string }) {
  if (status === 'success') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Success
      </span>
    );
  }
  if (status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-medium text-red-400">
        <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
        Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/15 px-2.5 py-0.5 text-xs font-medium text-sky-400">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-400" />
      Running
    </span>
  );
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function calcDuration(startedAt: string, finishedAt: string | null) {
  if (!finishedAt) return '—';
  const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export default function DashboardPage() {
  const [executions, setExecutions] = useState<ExecutionWithFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await fetchExecutions();
      setExecutions(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load executions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [load]);

  const total = executions.length;
  const successCount = executions.filter((e) => e.status === 'success').length;
  const failedCount = executions.filter((e) => e.status === 'failed').length;
  const runningCount = executions.filter(
    (e) => e.status !== 'success' && e.status !== 'failed',
  ).length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              ← FlowWeaver
            </Link>
            <h1 className="text-lg font-semibold text-zinc-100">
              실행 모니터링
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-xs text-zinc-500">
                마지막 업데이트: {lastUpdated.toLocaleTimeString('ko-KR')}
              </span>
            )}
            <button
              onClick={load}
              className="rounded-md bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700 transition-colors"
            >
              새로고침
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="전체 실행" value={total} color="zinc" />
          <StatCard label="성공" value={successCount} color="emerald" />
          <StatCard label="실패" value={failedCount} color="red" />
          <StatCard label="실행 중" value={runningCount} color="sky" />
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16 text-zinc-500">
            불러오는 중...
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {!loading && !error && executions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
            <p className="text-sm">실행 이력이 없습니다.</p>
            <Link
              href="/canvas"
              className="mt-3 text-sm text-violet-400 hover:text-violet-300 transition-colors"
            >
              캔버스에서 워크플로우를 실행해 보세요 →
            </Link>
          </div>
        )}

        {!loading && executions.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900">
                  <th className="px-4 py-3 text-left font-medium text-zinc-400">
                    플로우
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-400">
                    상태
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-400">
                    시작 시각
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-400">
                    소요 시간
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-zinc-400">
                    상세
                  </th>
                </tr>
              </thead>
              <tbody>
                {executions.map((exec, idx) => (
                  <tr
                    key={exec.id}
                    className={`border-b border-zinc-800/60 transition-colors hover:bg-zinc-900/60 ${
                      idx === executions.length - 1 ? 'border-b-0' : ''
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-zinc-200">
                      {exec.flow.name}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={exec.status} />
                    </td>
                    <td className="px-4 py-3 text-zinc-400">
                      {formatDateTime(exec.startedAt)}
                    </td>
                    <td className="px-4 py-3 text-zinc-400 tabular-nums">
                      {calcDuration(exec.startedAt, exec.finishedAt ?? null)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/${exec.id}`}
                        className="text-violet-400 hover:text-violet-300 transition-colors"
                      >
                        보기 →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: 'zinc' | 'emerald' | 'red' | 'sky';
}) {
  const colorMap = {
    zinc: 'border-zinc-700 bg-zinc-900',
    emerald: 'border-emerald-800/50 bg-emerald-950/40',
    red: 'border-red-800/50 bg-red-950/40',
    sky: 'border-sky-800/50 bg-sky-950/40',
  };
  const textMap = {
    zinc: 'text-zinc-100',
    emerald: 'text-emerald-400',
    red: 'text-red-400',
    sky: 'text-sky-400',
  };
  return (
    <div className={`rounded-lg border px-4 py-4 ${colorMap[color]}`}>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold tabular-nums ${textMap[color]}`}>
        {value}
      </p>
    </div>
  );
}
