'use client';

import { memo, useState } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';

export interface CustomNodeData {
  label: string;
  nodeType: 'trigger' | 'action';
  config: Record<string, string>;
  _debugStatus?: 'success' | 'failed' | 'skipped';
}

function CustomNode({ data, selected }: NodeProps<CustomNodeData>) {
  const [configValue, setConfigValue] = useState(
    data.config?.value ?? ''
  );

  const isTrigger = data.nodeType === 'trigger';
  const debugStatus = data._debugStatus;

  const headerBg = isTrigger ? 'bg-violet-600' : 'bg-sky-600';

  const borderColor =
    debugStatus === 'success' ? 'border-emerald-500' :
    debugStatus === 'failed' ? 'border-red-500' :
    debugStatus === 'skipped' ? 'border-zinc-600' :
    selected ? 'border-white' :
    isTrigger ? 'border-violet-400' : 'border-sky-400';

  const opacity = debugStatus === 'skipped' ? 'opacity-40' : '';

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

      <div className="px-3 py-2.5">
        <p className="text-sm font-medium text-white truncate mb-2">
          {data.label}
        </p>

        <label className="block text-[11px] text-zinc-400 mb-1">
          Value
        </label>
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

      <Handle
        type="source"
        position={Position.Bottom}
        className="bg-zinc-400! border-zinc-600! w-3! h-3!"
      />
    </div>
  );
}

export default memo(CustomNode);
