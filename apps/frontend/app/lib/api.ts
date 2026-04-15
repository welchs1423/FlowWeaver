import type { Node, Edge } from 'reactflow';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export interface FlowRecord {
  id: string;
  name: string;
  dag: string;
  status: 'DRAFT' | 'PUBLISHED';
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExecutionRecord {
  id: string;
  flowId: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  result: string | null;
  createdAt: string;
}

export interface StepResult {
  nodeId: string;
  label: string;
  status: 'success' | 'failed';
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  startedAt: string;
  finishedAt: string;
  iterationIndex?: number;
  retryCount?: number;
}

export interface ExecutionResult {
  executedNodes: string[];
  log: string[];
  contextMap: Record<string, Record<string, unknown>>;
  steps: StepResult[];
  failedAt?: string;
}

export interface ExecutionWithFlow extends ExecutionRecord {
  flow: { id: string; name: string };
}

export interface ExecuteResponse {
  execution: ExecutionRecord;
  result: ExecutionResult;
}

export interface AuthResponse {
  token: string;
  user: { id: string; email: string };
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('fw_token');
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

function toApiNodes(nodes: Node[]) {
  return nodes.map((n) => ({
    id: n.id,
    type: (n.data?.nodeType as string) ?? 'action',
    label: (n.data?.label as string) ?? n.id,
    data: n.data ?? {},
  }));
}

function toApiEdges(edges: Edge[]) {
  return edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    ...(e.sourceHandle ? { sourceHandle: e.sourceHandle } : {}),
  }));
}

export async function register(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Registration failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<AuthResponse>;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Login failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<AuthResponse>;
}

export async function saveFlow(
  name: string,
  nodes: Node[],
  edges: Edge[],
): Promise<FlowRecord> {
  const res = await fetch(`${BASE_URL}/flows`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      name,
      nodes: toApiNodes(nodes),
      edges: toApiEdges(edges),
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Save failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<FlowRecord>;
}

export async function updateFlow(
  id: string,
  nodes: Node[],
  edges: Edge[],
): Promise<FlowRecord> {
  const res = await fetch(`${BASE_URL}/flows/${id}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({
      nodes: toApiNodes(nodes),
      edges: toApiEdges(edges),
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Update failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<FlowRecord>;
}

export async function executeFlow(id: string): Promise<ExecuteResponse> {
  const res = await fetch(`${BASE_URL}/flows/${id}/execute`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Execute failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<ExecuteResponse>;
}

export async function debugWorkflow(
  nodes: Node[],
  edges: Edge[],
  mockInput: Record<string, unknown>,
): Promise<ExecutionResult> {
  const res = await fetch(`${BASE_URL}/workflow/debug`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      nodes: toApiNodes(nodes),
      edges: toApiEdges(edges),
      mockInput,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Debug run failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<ExecutionResult>;
}

export async function publishFlow(id: string): Promise<FlowRecord> {
  const res = await fetch(`${BASE_URL}/flows/${id}/publish`, {
    method: 'PATCH',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Publish failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<FlowRecord>;
}

export async function unpublishFlow(id: string): Promise<FlowRecord> {
  const res = await fetch(`${BASE_URL}/flows/${id}/unpublish`, {
    method: 'PATCH',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Unpublish failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<FlowRecord>;
}

export async function fetchFlows(): Promise<FlowRecord[]> {
  const res = await fetch(`${BASE_URL}/flows`, {
    headers: authHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Failed to fetch flows (${res.status})`);
  return res.json() as Promise<FlowRecord[]>;
}

export async function deleteFlow(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/flows/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to delete flow (${res.status})`);
}

export async function fetchExecutions(): Promise<ExecutionWithFlow[]> {
  const res = await fetch(`${BASE_URL}/executions`, {
    headers: authHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Failed to fetch executions (${res.status})`);
  return res.json() as Promise<ExecutionWithFlow[]>;
}

export async function fetchExecution(id: string): Promise<ExecutionWithFlow> {
  const res = await fetch(`${BASE_URL}/executions/${id}`, {
    headers: authHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Failed to fetch execution ${id} (${res.status})`);
  return res.json() as Promise<ExecutionWithFlow>;
}

export async function fetchFlow(id: string): Promise<FlowRecord> {
  const res = await fetch(`${BASE_URL}/flows/${id}`, {
    headers: authHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Failed to fetch flow ${id} (${res.status})`);
  return res.json() as Promise<FlowRecord>;
}

// ---- Secrets ----

export interface SecretRecord {
  id: string;
  name: string;
  createdAt: string;
}

export async function fetchSecrets(): Promise<SecretRecord[]> {
  const res = await fetch(`${BASE_URL}/secrets`, {
    headers: authHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Failed to fetch secrets (${res.status})`);
  return res.json() as Promise<SecretRecord[]>;
}

export async function createSecret(name: string, value: string): Promise<SecretRecord> {
  const res = await fetch(`${BASE_URL}/secrets`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ name, value }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create secret (${res.status}): ${text}`);
  }
  return res.json() as Promise<SecretRecord>;
}

export async function deleteSecret(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/secrets/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to delete secret (${res.status})`);
}

// ---- Flow Versions ----

export interface FlowVersionRecord {
  id: string;
  version: number;
  createdAt: string;
}

export async function fetchFlowVersions(flowId: string): Promise<FlowVersionRecord[]> {
  const res = await fetch(`${BASE_URL}/flows/${flowId}/versions`, {
    headers: authHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Failed to fetch versions (${res.status})`);
  return res.json() as Promise<FlowVersionRecord[]>;
}

export async function rollbackFlowVersion(
  flowId: string,
  versionId: string,
): Promise<FlowRecord> {
  const res = await fetch(`${BASE_URL}/flows/${flowId}/versions/${versionId}/rollback`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Rollback failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<FlowRecord>;
}

// ---- Import / Export ----

export async function importFlow(
  name: string,
  nodes: Node[],
  edges: Edge[],
): Promise<FlowRecord> {
  const res = await fetch(`${BASE_URL}/flows/import`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      name,
      nodes: toApiNodes(nodes),
      edges: toApiEdges(edges),
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Import failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<FlowRecord>;
}

// ---- Templates ----

export interface TemplateRecord {
  id: string;
  name: string;
  description: string;
  category: string;
  createdAt: string;
}

export async function fetchTemplates(): Promise<TemplateRecord[]> {
  const res = await fetch(`${BASE_URL}/templates`, {
    headers: authHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Failed to fetch templates (${res.status})`);
  return res.json() as Promise<TemplateRecord[]>;
}

export async function useTemplate(id: string): Promise<FlowRecord> {
  const res = await fetch(`${BASE_URL}/templates/${id}/use`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Use template failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<FlowRecord>;
}
