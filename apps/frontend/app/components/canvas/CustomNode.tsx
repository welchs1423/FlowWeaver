'use client';

import { memo, useState, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { useSecretsStore } from '../../store/secretsStore';

export interface CustomNodeData {
  label: string;
  nodeType: 'trigger' | 'action';
  config: Record<string, string>;
  _debugStatus?: 'success' | 'failed' | 'skipped';
}

function CustomNode({ data, selected }: NodeProps<CustomNodeData>) {
  const [configValue, setConfigValue] = useState(data.config?.value ?? '');
  const [maxRetries, setMaxRetries] = useState(data.config?.maxRetries ?? '0');
  const [retryDelay, setRetryDelay] = useState(data.config?.retryDelay ?? '1000');
  const [useSecret, setUseSecret] = useState(
    data.config?.useSecret === 'true' ? true : false,
  );
  const [secretRef, setSecretRef] = useState(data.config?.secretRef ?? '');

  const { secrets, loaded, load } = useSecretsStore();

  const isTrigger = data.nodeType === 'trigger';
  const debugStatus = data._debugStatus;

  useEffect(() => {
    if (!loaded) load();
  }, [loaded, load]);

  const headerBg = isTrigger ? 'bg-violet-600' : 'bg-sky-600';

  const borderColor =
    debugStatus === 'success' ? 'border-emerald-500' :
    debugStatus === 'failed' ? 'border-red-500' :
    debugStatus === 'skipped' ? 'border-zinc-600' :
    selected ? 'border-white' :
    isTrigger ? 'border-violet-400' : 'border-sky-400';

  const opacity = debugStatus === 'skipped' ? 'opacity-40' : '';

  function handleUseSecretToggle(checked: boolean) {
    setUseSecret(checked);
    data.config.useSecret = checked ? 'true' : 'false';
    if (!checked) {
      data.config.secretRef = '';
      setSecretRef('');
    }
  }

  function handleSecretRefChange(id: string) {
    setSecretRef(id);
    data.config.secretRef = id;
  }

  return (
    <div
      className={`relative min-w-45 rounded-lg border-2 ${borderColor} ${opacity} bg-zinc-900 shadow-lg`}
    >
      {debugStatus === 'failed' && (
        <span className="absolute top-1.5 right-1.5 flex items-center justify-center w-4 h-4 rounded-full bg-red-600 text-white text-[9px] font-bold leading-none z-10">
          !
        </span>
      )}

      {!isTrigger && (
        <Handle
          type="target"
          position={Position.Top}
          className="bg-zinc-400! border-zinc-600! w-3! h-3!"
        />
      )}

      <div className={`${headerBg} rounded-t-md px-3 py-1.5 flex items-center gap-2`}>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-white/70">
          {data.nodeType}
        </span>
      </div>

      <div className="px-3 py-2.5 flex flex-col gap-2">
        <p className="text-sm font-medium text-white truncate">
          {data.label}
        </p>

        {!isTrigger && (
          <div className="flex items-center gap-2 pb-1 border-b border-zinc-800">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={useSecret}
                onChange={(e) => handleUseSecretToggle(e.target.checked)}
                className="nodrag w-3 h-3 accent-violet-500"
              />
              <span className="text-[11px] text-zinc-400">시크릿 사용</span>
            </label>
          </div>
        )}

        {!isTrigger && useSecret ? (
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-zinc-400">Credential</label>
            <select
              value={secretRef}
              onChange={(e) => handleSecretRefChange(e.target.value)}
              className="nodrag w-full rounded bg-zinc-800 border border-zinc-700 px-2 py-1 text-xs text-white focus:outline-none focus:border-violet-500"
            >
              <option value="">-- 선택 --</option>
              {secrets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-zinc-400">Value</label>
            <input
              type="text"
              value={configValue}
              onChange={(e) => {
                setConfigValue(e.target.value);
                data.config.value = e.target.value;
              }}
              placeholder="Enter value..."
              className="nodrag w-full rounded bg-zinc-800 border border-zinc-700 px-2 py-1 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500"
            />
          </div>
        )}

        {!isTrigger && (
          <div className="flex gap-2 pt-1 border-t border-zinc-800">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-[11px] text-zinc-400">Max Retries</label>
              <input
                type="number"
                min="0"
                max="10"
                value={maxRetries}
                onChange={(e) => {
                  setMaxRetries(e.target.value);
                  data.config.maxRetries = e.target.value;
                }}
                className="nodrag w-full rounded bg-zinc-800 border border-zinc-700 px-2 py-1 text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-[11px] text-zinc-400">Retry Delay (ms)</label>
              <input
                type="number"
                min="0"
                value={retryDelay}
                onChange={(e) => {
                  setRetryDelay(e.target.value);
                  data.config.retryDelay = e.target.value;
                }}
                className="nodrag w-full rounded bg-zinc-800 border border-zinc-700 px-2 py-1 text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="bg-zinc-400! border-zinc-600! w-3! h-3!"
      />
    </div>
  );
}

export default memo(CustomNode);
