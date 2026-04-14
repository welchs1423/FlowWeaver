'use client';

import { memo, useState } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';

export interface DelayNodeData {
  label: string;
  nodeType: 'delay';
  config: Record<string, string>;
  _debugStatus?: 'success' | 'failed' | 'skipped';
}

function DelayNode({ data, selected }: NodeProps<DelayNodeData>) {
  const [amount, setAmount] = useState(data.config?.delayAmount ?? '5');
  const [unit, setUnit] = useState(data.config?.delayUnit ?? 'seconds');

  const debugStatus = data._debugStatus;

  const borderColor =
    debugStatus === 'success' ? 'border-emerald-500' :
    debugStatus === 'failed' ? 'border-red-500' :
    debugStatus === 'skipped' ? 'border-zinc-600' :
    selected ? 'border-white' :
    'border-teal-400';

  const opacity = debugStatus === 'skipped' ? 'opacity-40' : '';

  function sync(key: string, value: string) {
    data.config[key] = value;
  }

  return (
    <div className={`relative min-w-45 rounded-lg border-2 ${borderColor} ${opacity} bg-zinc-900 shadow-lg`}>
      {debugStatus === 'failed' && (
        <span className="absolute top-1.5 right-1.5 flex items-center justify-center w-4 h-4 rounded-full bg-red-600 text-white text-[9px] font-bold leading-none z-10">
          !
        </span>
      )}

      <Handle
        type="target"
        position={Position.Top}
        className="bg-zinc-400! border-zinc-600! w-3! h-3!"
      />

      <div className="bg-teal-700 rounded-t-md px-3 py-1.5 flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-white/70">
          delay
        </span>
      </div>

      <div className="px-3 py-2.5 flex flex-col gap-2">
        <p className="text-sm font-medium text-white truncate">{data.label}</p>

        <div className="flex gap-2 items-end">
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-[11px] text-zinc-400">Amount</label>
            <input
              type="number"
              min="0"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                sync('delayAmount', e.target.value);
              }}
              className="nodrag w-full rounded bg-zinc-800 border border-zinc-700 px-2 py-1 text-xs text-white focus:outline-none focus:border-teal-500"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-zinc-400">Unit</label>
            <select
              value={unit}
              onChange={(e) => {
                setUnit(e.target.value);
                sync('delayUnit', e.target.value);
              }}
              className="nodrag rounded bg-zinc-800 border border-zinc-700 px-2 py-1 text-xs text-white focus:outline-none focus:border-teal-500"
            >
              <option value="seconds">sec</option>
              <option value="minutes">min</option>
            </select>
          </div>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="bg-zinc-400! border-zinc-600! w-3! h-3!"
      />
    </div>
  );
}

export default memo(DelayNode);
