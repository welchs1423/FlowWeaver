'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchExecution, type StepResult, type ExecutionResult, type ExecutionWithFlow } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

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
      <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
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
    fractionalSecondDigits: 3,
  });
}

function calcDurationMs(startedAt: string, finishedAt: string) {
  const ms = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(3)}s`;
}

function StepCard({ step }: { step: StepResult }) {
  const duration = calcDurationMs(step.startedAt, step.finishedAt);

  return (
    <div
      className={`rounded-lg border ${
        step.status === 'failed'
          ? 'border-red-800/60 bg-red-950/20'
          : 'border-zinc-800 bg-zinc-900/60'
      } p-4`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <StatusBadge status={step.status} />
          <span className="font-medium text-zinc-100 truncate">{step.label}</span>
          <span className="text-xs text-zinc-500 font-mono shrink-0">{step.nodeId}</span>
        </div>
        <span className="shrink-0 text-xs text-zinc-500 tabular-nums">{duration}</span>
      </div>

      <div className="mt-2 flex gap-4 text-xs text-zinc-500">
        <span>시작: {formatDateTime(step.startedAt)}</span>
        <span>종료: {formatDateTime(step.finishedAt)}</span>
      </div>

      {step.error && (
        <div className="mt-3 rounded-md bg-red-950/40 border border-red-800/50 px-3 py-2">
          <p className="text-xs font-medium text-red-400 mb-1">오류</p>
          <p className="text-xs text-red-300 font-mono break-all">{step.error}</p>
        </div>
      )}

      {step.output && Object.keys(step.output).length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-300 transition-colors select-none">
            출력값 보기
          </summary>
          <pre className="mt-2 overflow-x-auto rounded-md bg-zinc-800 p-3 text-xs text-zinc-300 font-mono">
            {JSON.stringify(step.output, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

function MetaField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-zinc-500">{label}</p>
      <p
        className={`mt-0.5 text-zinc-200 truncate ${mono ? 'font-mono text-xs' : 'text-sm'}`}
        title={value}
      >
        {value}
      </p>
    </div>
  );
}

export default function ExecutionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { init } = useAuthStore();
  const [execution, setExecution] = useState<ExecutionWithFlow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    fetchExecution(params.id)
      .then(setExecution)
      .catch(() => notFound())
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-500">
        불러오는 중...
      </div>
    );
  }

  if (!execution) return null;

  const result: ExecutionResult | null = execution.result
    ? (JSON.parse(execution.result) as ExecutionResult)
    : null;

  const totalDuration =
    execution.finishedAt
      ? calcDurationMs(execution.startedAt, execution.finishedAt)
      : '—';

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center gap-4">
          <Link
            href="/dashboard"
            className="text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            ← 대시보드
          </Link>
          <h1 className="text-lg font-semibold text-zinc-100">실행 상세</h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8 space-y-6">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-zinc-500 mb-1">플로우</p>
              <p className="text-xl font-semibold text-zinc-100">
                {execution.flow.name}
              </p>
            </div>
            <StatusBadge status={execution.status} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <MetaField label="실행 ID" value={execution.id} mono />
            <MetaField label="시작 시각" value={formatDateTime(execution.startedAt)} />
            <MetaField
              label="종료 시각"
              value={execution.finishedAt ? formatDateTime(execution.finishedAt) : '—'}
            />
            <MetaField label="총 소요 시간" value={totalDuration} />
          </div>

          {result?.failedAt && (
            <div className="mt-4 rounded-md border border-red-800/50 bg-red-950/30 px-3 py-2 text-sm">
              <span className="text-red-400 font-medium">실패 위치:</span>{' '}
              <span className="font-mono text-red-300">{result.failedAt}</span>
            </div>
          )}
        </div>

        {result && result.steps.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-medium text-zinc-400">
              노드 실행 단계 ({result.steps.length}개)
            </h2>
            <div className="space-y-3">
              {result.steps.map((step) => (
                <StepCard key={step.nodeId} step={step} />
              ))}
            </div>
          </section>
        )}

        {result && result.log.length > 0 && (
          <section>
            <details>
              <summary className="cursor-pointer text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors select-none">
                실행 로그 ({result.log.length}줄)
              </summary>
              <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-900">
                <pre className="p-4 text-xs text-zinc-400 font-mono leading-relaxed">
                  {result.log.join('\n')}
                </pre>
              </div>
            </details>
          </section>
        )}

        {!result && (
          <div className="rounded-lg border border-zinc-800 px-4 py-8 text-center text-sm text-zinc-500">
            실행 결과 데이터가 없습니다.
          </div>
        )}
      </main>
    </div>
  );
}
