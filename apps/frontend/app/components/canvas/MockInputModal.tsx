'use client';

import { useState } from 'react';

interface Props {
  onConfirm: (mockInput: Record<string, unknown>) => void;
  onCancel: () => void;
}

export default function MockInputModal({ onConfirm, onCancel }: Props) {
  const [raw, setRaw] = useState('{}');
  const [parseError, setParseError] = useState('');

  function handleConfirm() {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      setParseError('');
      onConfirm(parsed);
    } catch {
      setParseError('유효한 JSON 형식이 아닙니다.');
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Tab') {
      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const next = raw.substring(0, start) + '  ' + raw.substring(end);
      setRaw(next);
      requestAnimationFrame(() => {
        el.selectionStart = start + 2;
        el.selectionEnd = start + 2;
      });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-[480px] bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl">
        <div className="px-5 py-4 border-b border-zinc-700">
          <h2 className="text-sm font-semibold text-white">
            테스트 실행 — Mock Input
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            Trigger 노드에 주입할 초기 입력값을 JSON으로 입력하세요.
          </p>
        </div>

        <div className="px-5 py-4">
          <textarea
            value={raw}
            onChange={(e) => {
              setRaw(e.target.value);
              setParseError('');
            }}
            onKeyDown={handleKeyDown}
            rows={10}
            spellCheck={false}
            className="w-full rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-violet-500 resize-none"
          />
          {parseError && (
            <p className="mt-1 text-xs text-red-400">{parseError}</p>
          )}
        </div>

        <div className="px-5 py-3 border-t border-zinc-700 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 rounded text-xs font-medium bg-zinc-700 hover:bg-zinc-600 text-zinc-200 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-1.5 rounded text-xs font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors"
          >
            테스트 실행
          </button>
        </div>
      </div>
    </div>
  );
}
