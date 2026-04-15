'use client';

import { useCallback, useRef, useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
} from 'reactflow';
import type { DragEvent, MouseEvent } from 'react';
import type { Node } from 'reactflow';
import 'reactflow/dist/style.css';

import { useFlowStore } from '../../store/flowStore';
import { toDag, fromDag } from '../../lib/dagUtils';
import {
  saveFlow,
  updateFlow,
  executeFlow,
  debugWorkflow,
  publishFlow,
  unpublishFlow,
  fetchFlow,
  fetchFlowVersions,
  rollbackFlowVersion,
  importFlow,
  type FlowVersionRecord,
} from '../../lib/api';
import type { ExecutionResult, StepResult } from '../../lib/api';
import CustomNode from './CustomNode';
import ConditionNode from './ConditionNode';
import DelayNode from './DelayNode';
import ForEachNode from './ForEachNode';
import MockInputModal from './MockInputModal';

const nodeTypes = {
  customNode: CustomNode,
  conditionNode: ConditionNode,
  delayNode: DelayNode,
  forEachNode: ForEachNode,
};

let nodeIdCounter = 1;
function generateId(): string {
  return `node_${nodeIdCounter++}`;
}

type ActionStatus = 'idle' | 'loading' | 'success' | 'error';

export default function FlowCanvas() {
  const searchParams = useSearchParams();
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode, setSavedFlowId, savedFlowId, reset } =
    useFlowStore();

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const [saveStatus, setSaveStatus] = useState<ActionStatus>('idle');
  const [runStatus, setRunStatus] = useState<ActionStatus>('idle');
  const [debugStatus, setDebugStatus] = useState<ActionStatus>('idle');
  const [publishStatus, setPublishStatus] = useState<ActionStatus>('idle');
  const [flowStatus, setFlowStatus] = useState<'DRAFT' | 'PUBLISHED' | null>(null);
  const [lastLog, setLastLog] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [debugResult, setDebugResult] = useState<ExecutionResult | null>(null);
  const [showMockModal, setShowMockModal] = useState(false);
  const [selectedDebugNodeId, setSelectedDebugNodeId] = useState<string | null>(null);

  const [showVersionPanel, setShowVersionPanel] = useState(false);
  const [versions, setVersions] = useState<FlowVersionRecord[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [rollbackStatus, setRollbackStatus] = useState<ActionStatus>('idle');

  // Load flow from URL param on mount
  useEffect(() => {
    const flowId = searchParams.get('flowId');
    if (!flowId) return;
    if (savedFlowId === flowId) return;

    fetchFlow(flowId)
      .then((flow) => {
        const { nodes: rfNodes, edges: rfEdges } = fromDag(flow.dag);
        reset();
        rfNodes.forEach((n) => addNode(n));
        setSavedFlowId(flow.id);
        setFlowStatus(flow.status as 'DRAFT' | 'PUBLISHED');
        // Restore edges via store bulk-set would require extending the store;
        // use onEdgesChange workaround via direct state replacement
        useFlowStore.setState({ edges: rfEdges });
      })
      .catch(() => {
        // Flow not found or auth error — proceed with empty canvas
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const displayNodes = useMemo(() => {
    if (!debugResult) return nodes;
    return nodes.map((node) => {
      const step = debugResult.steps.find((s) => s.nodeId === node.id);
      const isExecuted = debugResult.executedNodes.includes(node.id);
      let _debugStatus: 'success' | 'failed' | 'skipped';
      if (step?.status === 'failed') {
        _debugStatus = 'failed';
      } else if (isExecuted) {
        _debugStatus = 'success';
      } else {
        _debugStatus = 'skipped';
      }
      return {
        ...node,
        data: {
          ...node.data,
          _debugStatus,
          _debugInput: step?.input,
          _debugOutput: step?.output,
          _debugError: step?.error,
        },
      };
    });
  }, [nodes, debugResult]);

  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const raw = event.dataTransfer.getData('application/reactflow');
      if (!raw) return;

      const { nodeType, label } = JSON.parse(raw) as {
        nodeType: 'trigger' | 'action' | 'condition' | 'delay' | 'foreach';
        label: string;
      };

      const wrapper = reactFlowWrapper.current;
      if (!wrapper) return;

      const bounds = wrapper.getBoundingClientRect();
      const position = {
        x: event.clientX - bounds.left - 90,
        y: event.clientY - bounds.top - 40,
      };

      const reactFlowType =
        nodeType === 'condition' ? 'conditionNode'
        : nodeType === 'delay' ? 'delayNode'
        : nodeType === 'foreach' ? 'forEachNode'
        : 'customNode';

      const newNode: Node = {
        id: generateId(),
        type: reactFlowType,
        position,
        data: { label, nodeType, config: {} },
      };

      addNode(newNode);
    },
    [addNode]
  );

  const handleSave = useCallback(async () => {
    setSaveStatus('loading');
    setErrorMsg('');
    try {
      if (savedFlowId) {
        await updateFlow(savedFlowId, nodes, edges);
      } else {
        const flowName = `Flow ${new Date().toLocaleString()}`;
        const record = await saveFlow(flowName, nodes, edges);
        setSavedFlowId(record.id);
        setFlowStatus(record.status);
      }
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }, [nodes, edges, savedFlowId, setSavedFlowId]);

  const handlePublish = useCallback(async () => {
    if (!savedFlowId) return;
    setPublishStatus('loading');
    setErrorMsg('');
    try {
      const record = await publishFlow(savedFlowId);
      setFlowStatus(record.status);
      setPublishStatus('success');
      setVersions([]);
      setTimeout(() => setPublishStatus('idle'), 2000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setPublishStatus('error');
      setTimeout(() => setPublishStatus('idle'), 3000);
    }
  }, [savedFlowId]);

  const handleUnpublish = useCallback(async () => {
    if (!savedFlowId) return;
    setPublishStatus('loading');
    setErrorMsg('');
    try {
      const record = await unpublishFlow(savedFlowId);
      setFlowStatus(record.status);
      setPublishStatus('success');
      setTimeout(() => setPublishStatus('idle'), 2000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setPublishStatus('error');
      setTimeout(() => setPublishStatus('idle'), 3000);
    }
  }, [savedFlowId]);

  const handleRun = useCallback(async () => {
    setRunStatus('loading');
    setLastLog([]);
    setErrorMsg('');

    let targetId = savedFlowId;

    if (!targetId) {
      try {
        const flowName = `Flow ${new Date().toLocaleString()}`;
        const record = await saveFlow(flowName, nodes, edges);
        setSavedFlowId(record.id);
        targetId = record.id;
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : String(err));
        setRunStatus('error');
        setTimeout(() => setRunStatus('idle'), 3000);
        return;
      }
    }

    try {
      const { result } = await executeFlow(targetId);
      setLastLog((result as ExecutionResult).log ?? []);
      setRunStatus('success');
      setTimeout(() => setRunStatus('idle'), 3000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setRunStatus('error');
      setTimeout(() => setRunStatus('idle'), 3000);
    }
  }, [nodes, edges, savedFlowId, setSavedFlowId]);

  const handleTestRun = useCallback(
    async (mockInput: Record<string, unknown>) => {
      setShowMockModal(false);
      setDebugStatus('loading');
      setDebugResult(null);
      setSelectedDebugNodeId(null);
      setErrorMsg('');
      try {
        const result = await debugWorkflow(nodes, edges, mockInput);
        setDebugResult(result);
        setLastLog(result.log);
        setDebugStatus('success');
        setTimeout(() => setDebugStatus('idle'), 3000);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : String(err));
        setDebugStatus('error');
        setTimeout(() => setDebugStatus('idle'), 3000);
      }
    },
    [nodes, edges]
  );

  const handleClearDebug = useCallback(() => {
    setDebugResult(null);
    setSelectedDebugNodeId(null);
    setLastLog([]);
  }, []);

  const onNodeClick = useCallback(
    (_evt: MouseEvent, node: Node) => {
      if (!debugResult) return;
      setSelectedDebugNodeId((prev) => (prev === node.id ? null : node.id));
    },
    [debugResult]
  );

  const handleOpenVersionPanel = useCallback(async () => {
    if (!savedFlowId) return;
    setShowVersionPanel(true);
    setVersionsLoading(true);
    try {
      const data = await fetchFlowVersions(savedFlowId);
      setVersions(data);
    } catch {
      setVersions([]);
    } finally {
      setVersionsLoading(false);
    }
  }, [savedFlowId]);

  const handleRollback = useCallback(
    async (versionId: string) => {
      if (!savedFlowId) return;
      if (!confirm('이 버전으로 캔버스를 되돌리겠습니까? 저장되지 않은 변경 사항은 사라집니다.')) return;
      setRollbackStatus('loading');
      try {
        const flow = await rollbackFlowVersion(savedFlowId, versionId);
        const { nodes: rfNodes, edges: rfEdges } = fromDag(flow.dag);
        reset();
        rfNodes.forEach((n) => addNode(n));
        setSavedFlowId(flow.id);
        setFlowStatus(flow.status as 'DRAFT' | 'PUBLISHED');
        useFlowStore.setState({ edges: rfEdges });
        setShowVersionPanel(false);
        setDebugResult(null);
        setRollbackStatus('success');
        setTimeout(() => setRollbackStatus('idle'), 2000);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : String(err));
        setRollbackStatus('error');
        setTimeout(() => setRollbackStatus('idle'), 3000);
      }
    },
    [savedFlowId, reset, addNode, setSavedFlowId]
  );

  const handleExport = useCallback(() => {
    const dag = toDag(nodes, edges);
    const blob = new Blob(
      [JSON.stringify({ name: `Flow Export ${new Date().toLocaleString()}`, ...dag }, null, 2)],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flow-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [nodes, edges]);

  const [importStatus, setImportStatus] = useState<ActionStatus>('idle');

  const handleImportFile = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      e.target.value = '';

      setImportStatus('loading');
      setErrorMsg('');
      try {
        const text = await file.text();
        const json = JSON.parse(text) as {
          name?: string;
          nodes?: unknown[];
          edges?: unknown[];
        };
        if (!Array.isArray(json.nodes) || !Array.isArray(json.edges)) {
          throw new Error('유효하지 않은 플로우 파일입니다. nodes와 edges 필드가 필요합니다.');
        }
        const { nodes: rfNodes, edges: rfEdges } = fromDag(
          JSON.stringify({ nodes: json.nodes, edges: json.edges }),
        );
        const flowName = json.name ?? `Imported Flow ${new Date().toLocaleString()}`;
        const record = await importFlow(flowName, rfNodes, rfEdges);
        reset();
        rfNodes.forEach((n) => addNode(n));
        useFlowStore.setState({ edges: rfEdges });
        setSavedFlowId(record.id);
        setFlowStatus(record.status as 'DRAFT' | 'PUBLISHED');
        setImportStatus('success');
        setTimeout(() => setImportStatus('idle'), 2000);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : String(err));
        setImportStatus('error');
        setTimeout(() => setImportStatus('idle'), 3000);
      }
    },
    [reset, addNode, setSavedFlowId],
  );

  const importBtnLabel =
    importStatus === 'loading' ? 'Importing…'
    : importStatus === 'success' ? 'Imported'
    : importStatus === 'error' ? 'Error'
    : 'Import';

  const saveBtnLabel =
    saveStatus === 'loading' ? 'Saving…'
    : saveStatus === 'success' ? 'Saved'
    : saveStatus === 'error' ? 'Error'
    : savedFlowId ? 'Update'
    : 'Save';

  const publishBtnLabel =
    publishStatus === 'loading' ? (flowStatus === 'PUBLISHED' ? 'Unpublishing…' : 'Publishing…')
    : publishStatus === 'error' ? 'Error'
    : flowStatus === 'PUBLISHED' ? 'Unpublish'
    : 'Publish';

  const runBtnLabel =
    runStatus === 'loading' ? 'Running…'
    : runStatus === 'success' ? 'Done'
    : runStatus === 'error' ? 'Error'
    : 'Run';

  const testRunBtnLabel =
    debugStatus === 'loading' ? 'Testing…'
    : debugStatus === 'success' ? 'Done'
    : debugStatus === 'error' ? 'Error'
    : 'Test Run';

  const selectedStep: StepResult | undefined = debugResult?.steps.find(
    (s) => s.nodeId === selectedDebugNodeId
  );
  const selectedIsExecuted =
    selectedDebugNodeId !== null &&
    (debugResult?.executedNodes.includes(selectedDebugNodeId) ?? false);

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-zinc-800 bg-zinc-900 text-xs text-zinc-400">
        <span>{nodes.length} node{nodes.length !== 1 ? 's' : ''}</span>
        <span className="text-zinc-700">|</span>
        <span>{edges.length} edge{edges.length !== 1 ? 's' : ''}</span>
        {savedFlowId && (
          <>
            <span className="text-zinc-700">|</span>
            <span className="text-emerald-600 font-mono truncate max-w-40">
              id: {savedFlowId}
            </span>
          </>
        )}
        {flowStatus && (
          <>
            <span className="text-zinc-700">|</span>
            <span className={flowStatus === 'PUBLISHED' ? 'text-emerald-400 font-medium' : 'text-zinc-500'}>
              {flowStatus === 'PUBLISHED' ? 'published' : 'draft'}
            </span>
          </>
        )}
        {debugResult && (
          <>
            <span className="text-zinc-700">|</span>
            <span className="text-violet-400">
              dry-run: {debugResult.executedNodes.length}/{nodes.length} nodes
              {debugResult.failedAt ? ' — failed' : ' — ok'}
            </span>
            <button
              onClick={handleClearDebug}
              className="text-zinc-500 hover:text-zinc-300 text-[10px]"
            >
              clear
            </button>
          </>
        )}

        <div className="ml-auto flex items-center gap-2">
          <input
            ref={importInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleImportFile}
          />
          <button
            onClick={handleExport}
            disabled={nodes.length === 0}
            className="px-3 py-1 rounded text-xs font-medium bg-zinc-700 hover:bg-zinc-600 text-zinc-300 transition-colors disabled:opacity-40"
          >
            Export
          </button>
          <button
            onClick={() => importInputRef.current?.click()}
            disabled={importStatus === 'loading'}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors
              ${importStatus === 'success' ? 'bg-emerald-700 text-white' : ''}
              ${importStatus === 'error' ? 'bg-red-700 text-white' : ''}
              ${importStatus === 'idle' || importStatus === 'loading' ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-300 disabled:opacity-50' : ''}
            `}
          >
            {importBtnLabel}
          </button>
          {savedFlowId && (
            <button
              onClick={handleOpenVersionPanel}
              className="px-3 py-1 rounded text-xs font-medium bg-zinc-700 hover:bg-zinc-600 text-zinc-300 transition-colors"
            >
              History
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saveStatus === 'loading'}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors
              ${saveStatus === 'success' ? 'bg-emerald-700 text-white' : ''}
              ${saveStatus === 'error' ? 'bg-red-700 text-white' : ''}
              ${saveStatus === 'idle' || saveStatus === 'loading' ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200 disabled:opacity-50' : ''}
            `}
          >
            {saveBtnLabel}
          </button>
          <button
            onClick={flowStatus === 'PUBLISHED' ? handleUnpublish : handlePublish}
            disabled={!savedFlowId || publishStatus === 'loading'}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50
              ${publishStatus === 'error' ? 'bg-red-700 text-white' : ''}
              ${flowStatus === 'PUBLISHED' && publishStatus !== 'error'
                ? 'bg-emerald-700 hover:bg-emerald-600 text-white'
                : publishStatus !== 'error' ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200' : ''}
            `}
          >
            {publishBtnLabel}
          </button>
          <button
            onClick={() => setShowMockModal(true)}
            disabled={debugStatus === 'loading' || nodes.length === 0}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors
              ${debugStatus === 'success' ? 'bg-emerald-700 text-white' : ''}
              ${debugStatus === 'error' ? 'bg-red-700 text-white' : ''}
              ${debugStatus === 'idle' || debugStatus === 'loading' ? 'bg-violet-700 hover:bg-violet-600 text-white disabled:opacity-50' : ''}
            `}
          >
            {testRunBtnLabel}
          </button>
          <button
            onClick={handleRun}
            disabled={runStatus === 'loading' || nodes.length === 0}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors
              ${runStatus === 'success' ? 'bg-emerald-700 text-white' : ''}
              ${runStatus === 'error' ? 'bg-red-700 text-white' : ''}
              ${runStatus === 'idle' || runStatus === 'loading' ? 'bg-sky-700 hover:bg-sky-600 text-white disabled:opacity-50' : ''}
            `}
          >
            {runBtnLabel}
          </button>
        </div>
      </div>

      {lastLog.length > 0 && (
        <div className="px-4 py-2 bg-zinc-900 border-b border-zinc-800 text-xs font-mono text-zinc-400 max-h-32 overflow-y-auto">
          {lastLog.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}

      {errorMsg && (
        <div className="px-4 py-1 bg-red-950 border-b border-red-800 text-xs text-red-400">
          {errorMsg}
        </div>
      )}

      <div ref={reactFlowWrapper} className="flex-1 bg-zinc-950 relative">
        <ReactFlow
          nodes={displayNodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          deleteKeyCode="Delete"
          proOptions={{ hideAttribution: true }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="#3f3f46"
          />
          <Controls
            className="bg-zinc-800! border-zinc-700! rounded-lg! shadow-lg!"
          />
          <MiniMap
            nodeColor={(node) => {
              const data = node.data as { nodeType?: string };
              if (data?.nodeType === 'trigger') return '#7c3aed';
              if (data?.nodeType === 'condition') return '#d97706';
              if (data?.nodeType === 'delay') return '#0f766e';
              if (data?.nodeType === 'foreach') return '#7e22ce';
              return '#0284c7';
            }}
            className="bg-zinc-900! border-zinc-700! rounded-lg!"
          />
        </ReactFlow>

        {/* debug node detail panel */}
        {debugResult && selectedDebugNodeId && (
          <div className="absolute bottom-4 right-4 w-80 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl z-50 text-xs overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-700 bg-zinc-800">
              <div className="flex items-center gap-2">
                {selectedStep?.status === 'failed' && (
                  <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                )}
                {selectedStep?.status === 'success' && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                )}
                {!selectedIsExecuted && (
                  <span className="w-2 h-2 rounded-full bg-zinc-500 shrink-0" />
                )}
                <span className="font-semibold text-white truncate">
                  {selectedStep?.label ?? selectedDebugNodeId}
                </span>
              </div>
              <button
                onClick={() => setSelectedDebugNodeId(null)}
                className="text-zinc-400 hover:text-white ml-2 shrink-0"
              >
                x
              </button>
            </div>

            <div className="px-3 py-2 space-y-2 max-h-72 overflow-y-auto">
              <div className="flex items-center gap-2">
                <span className="text-zinc-400">Status:</span>
                {!selectedIsExecuted && (
                  <span className="text-zinc-500">Skipped</span>
                )}
                {selectedIsExecuted && selectedStep?.status === 'success' && (
                  <span className="text-emerald-400">Success</span>
                )}
                {selectedIsExecuted && selectedStep?.status === 'failed' && (
                  <span className="text-red-400">Failed</span>
                )}
              </div>

              {selectedStep?.input && Object.keys(selectedStep.input).length > 0 && (
                <div>
                  <div className="text-zinc-400 mb-1">Input:</div>
                  <pre className="bg-zinc-800 p-2 rounded text-zinc-300 overflow-x-auto max-h-24 leading-relaxed">
                    {JSON.stringify(selectedStep.input, null, 2)}
                  </pre>
                </div>
              )}

              {selectedStep?.output && Object.keys(selectedStep.output).length > 0 && (
                <div>
                  <div className="text-zinc-400 mb-1">Output:</div>
                  <pre className="bg-zinc-800 p-2 rounded text-zinc-300 overflow-x-auto max-h-24 leading-relaxed">
                    {JSON.stringify(selectedStep.output, null, 2)}
                  </pre>
                </div>
              )}

              {selectedStep?.error && (
                <div>
                  <div className="text-red-400 mb-1">Error:</div>
                  <pre className="bg-zinc-800 p-2 rounded text-red-300 overflow-x-auto max-h-24 leading-relaxed whitespace-pre-wrap">
                    {selectedStep.error}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* version history panel */}
        {showVersionPanel && (
          <div className="absolute top-4 right-4 w-72 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl z-50 text-xs overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-700 bg-zinc-800">
              <span className="font-semibold text-white">버전 히스토리</span>
              <button
                onClick={() => setShowVersionPanel(false)}
                className="text-zinc-400 hover:text-white ml-2"
              >
                x
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {versionsLoading ? (
                <div className="px-4 py-6 text-center text-zinc-500">불러오는 중…</div>
              ) : versions.length === 0 ? (
                <div className="px-4 py-6 text-center text-zinc-500">
                  저장된 버전이 없습니다.
                  <br />
                  <span className="text-zinc-600">Publish 시 자동으로 버전이 생성됩니다.</span>
                </div>
              ) : (
                versions.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-800/60 hover:bg-zinc-800/40"
                  >
                    <div>
                      <span className="font-medium text-zinc-200">v{v.version}</span>
                      <span className="ml-2 text-zinc-500">
                        {new Date(v.createdAt).toLocaleString('ko-KR', {
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRollback(v.id)}
                      disabled={rollbackStatus === 'loading'}
                      className="text-violet-400 hover:text-violet-300 transition-colors disabled:opacity-40 shrink-0 ml-2"
                    >
                      {rollbackStatus === 'loading' ? '…' : '롤백'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {showMockModal && (
        <MockInputModal
          onConfirm={handleTestRun}
          onCancel={() => setShowMockModal(false)}
        />
      )}
    </div>
  );
}
