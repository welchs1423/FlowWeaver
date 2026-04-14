'use client';

import { memo, useState } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';

export interface ForEachNodeData {
  label: string;
  nodeType: 'foreach';
  config: Record<string, string>;
  _debugStatus?: 'success' | 'failed' | 'skipped';
}

function ForEachNode({ data, selected }: NodeProps<ForEachNodeData>) {
  const [arrayField, setArrayField] = useState(data.config?.arrayField ?? 'items');

  const debugStatus = data._debugStatus;

  const borderColor =
    debugStatus === 'success' ? 'border-emerald-500' :
    debugStatus === 'failed' ? 'border-red-500' :
    debugStatus === 'skipped' ? 'border-zinc-600' :
    selected ? 'border-white' :
    'border-purple-400';

  const opacity = debugStatus === 'skipped' ? 'opacity-40' : '';

  function sync(key: string, value: string) {
    data.config[key] = value;
  }

  return (
    <div className={`relative min-w-48 rounded-lg border-2 ${borderColor} ${opacity} bg-zinc-900 shadow-lg`}>
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

      <div className="bg-purple-700 rounded-t-md px-3 py-1.5 flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-white/70">
          for-each
        </span>
      </div>

      <div className="px-3 py-2.5 flex flex-col gap-2">
        <p className="text-sm font-medium text-white truncate">{data.label}</p>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-zinc-400">Array Field</label>
          <input
            type="text"
            value={arrayField}
            onChange={(e) => {
              setArrayField(e.target.value);
              sync('arrayField', e.target.value);
            }}
            placeholder="e.g. items"
            className="nodrag w-full rounded bg-zinc-800 border border-zinc-700 px-2 py-1 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500"
          />
        </div>

        <p className="text-[10px] text-zinc-500">
          Runs connected nodes once per array item
        </p>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="bg-zinc-400! border-zinc-600! w-3! h-3!"
      />
    </div>
  );
}

export default memo(ForEachNode);
