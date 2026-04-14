'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  fetchExecutions,
  fetchFlows,
  deleteFlow,
  type ExecutionWithFlow,
  type FlowRecord,
} from '../lib/api';
import { useAuthStore } from '../store/authStore';
import AppHeader from '../components/common/AppHeader';

const POLL_INTERVAL_MS = 5000;

type Tab = 'flows' | 'executions';

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
  });
}

function calcDuration(startedAt: string, finishedAt: string | null) {
  if (!finishedAt) return '—';
  const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export default function DashboardPage() {
  const router = useRouter();
  const { init } = useAuthStore();
  const [tab, setTab] = useState<Tab>('flows');
  const [flows, setFlows] = useState<FlowRecord[]>([]);
  const [executions, setExecutions] = useState<ExecutionWithFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    init();
  }, [init]);

  const loadAll = useCallback(async () => {
    try {
      const [flowsData, execData] = await Promise.all([
        fetchFlows(),
        fetchExecutions(),
      ]);
      setFlows(flowsData);
      setExecutions(execData);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터 로드 실패');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
    const timer = setInterval(loadAll, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [loadAll]);

  async function handleDelete(id: string) {
    if (!confirm('이 워크플로우를 삭제하시겠습니까?')) return;
    setDeletingId(id);
    try {
      await deleteFlow(id);
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제 실패');
    } finally {
      setDeletingId(null);
    }
  }

  function openCanvas(flowId?: string) {
    if (flowId) {
      router.push(`/canvas?flowId=${flowId}`);
    } else {
      router.push('/canvas');
    }
  }

  const total = executions.length;
  const successCount = executions.filter((e) => e.status === 'success').length;
  const failedCount = executions.filter((e) => e.status === 'failed').length;
  const runningCount = executions.filter(
    (e) => e.status !== 'success' && e.status !== 'failed',
  ).length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <AppHeader title="대시보드" />

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex gap-1 rounded-lg border border-zinc-800 bg-zinc-900 p-1">
            <TabButton active={tab === 'flows'} onClick={() => setTab('flows')}>
              내 워크플로우 ({flows.length})
            </TabButton>
            <TabButton
              active={tab === 'executions'}
              onClick={() => setTab('executions')}
            >
              실행 이력 ({total})
            </TabButton>
          </div>

          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-xs text-zinc-500">
                {lastUpdated.toLocaleTimeString('ko-KR')}
              </span>
            )}
            <Link
              href="/credentials"
              className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:border-violet-700 hover:text-violet-400 transition-colors"
            >
              Credentials
            </Link>
            <button
              onClick={loadAll}
              className="rounded-md bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700 transition-colors"
            >
              새로고침
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-16 text-zinc-500">
            불러오는 중...
          </div>
        )}

        {!loading && tab === 'flows' && (
          <FlowsTab
            flows={flows}
            deletingId={deletingId}
            onDelete={handleDelete}
            onOpen={openCanvas}
          />
        )}

        {!loading && tab === 'executions' && (
          <ExecutionsTab
            executions={executions}
            successCount={successCount}
            failedCount={failedCount}
            runningCount={runningCount}
          />
        )}
      </main>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
        active
          ? 'bg-zinc-700 text-zinc-100'
          : 'text-zinc-400 hover:text-zinc-200'
      }`}
    >
      {children}
    </button>
  );
}

function FlowsTab({
  flows,
  deletingId,
  onDelete,
  onOpen,
}: {
  flows: FlowRecord[];
  deletingId: string | null;
  onDelete: (id: string) => void;
  onOpen: (id: string) => void;
}) {
  if (flows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
        <p className="text-sm">저장된 워크플로우가 없습니다.</p>
        <Link
          href="/canvas"
          className="mt-3 text-sm text-violet-400 hover:text-violet-300 transition-colors"
        >
          캔버스에서 새 워크플로우를 만들어 보세요 →
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {flows.map((flow) => (
        <div
          key={flow.id}
          className="rounded-lg border border-zinc-800 bg-zinc-900 p-4"
        >
          <div className="mb-3 flex items-start justify-between gap-2">
            <h3 className="font-medium text-zinc-100 leading-tight">
              {flow.name}
            </h3>
          </div>
          <p className="mb-4 text-xs text-zinc-500">
            수정: {new Date(flow.updatedAt).toLocaleString('ko-KR', {
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => onOpen(flow.id)}
              className="flex-1 rounded-md bg-violet-600/20 px-3 py-1.5 text-xs font-medium text-violet-400 hover:bg-violet-600/30 transition-colors"
            >
              열기
            </button>
            <button
              onClick={() => onDelete(flow.id)}
              disabled={deletingId === flow.id}
              className="rounded-md border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-500 hover:border-red-800 hover:text-red-400 transition-colors disabled:opacity-40"
            >
              {deletingId === flow.id ? '...' : '삭제'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ExecutionsTab({
  executions,
  successCount,
  failedCount,
  runningCount,
}: {
  executions: ExecutionWithFlow[];
  successCount: number;
  failedCount: number;
  runningCount: number;
}) {
  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="전체 실행" value={executions.length} color="zinc" />
        <StatCard label="성공" value={successCount} color="emerald" />
        <StatCard label="실패" value={failedCount} color="red" />
        <StatCard label="실행 중" value={runningCount} color="sky" />
      </div>

      {executions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-zinc-500">
          <p className="text-sm">실행 이력이 없습니다.</p>
          <Link
            href="/canvas"
            className="mt-3 text-sm text-violet-400 hover:text-violet-300 transition-colors"
          >
            캔버스에서 워크플로우를 실행해 보세요 →
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900">
                <th className="px-4 py-3 text-left font-medium text-zinc-400">플로우</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-400">상태</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-400">시작 시각</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-400">소요 시간</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-400">상세</th>
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
    </>
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
