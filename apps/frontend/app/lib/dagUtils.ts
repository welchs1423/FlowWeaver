import type { Node, Edge } from 'reactflow';

interface DagNode {
  id: string;
  type: string;
  label: string;
  config: Record<string, unknown>;
  // ids of nodes whose output feeds into this node
  dependencies: string[];
}

interface DagEdge {
  source: string;
  target: string;
}

export interface DagGraph {
  nodes: DagNode[];
  edges: DagEdge[];
}

// Converts the React Flow node/edge arrays into a backend-consumable DAG JSON.
// The resulting graph is directed (edges have source -> target) and assumed to
// be acyclic as enforced by the UI (no cycle detection here).
export function toDag(nodes: Node[], edges: Edge[]): DagGraph {
  const dagNodes: DagNode[] = nodes.map((node) => ({
    id: node.id,
    type: node.type ?? 'default',
    label: (node.data?.label as string) ?? node.id,
    config: (node.data?.config as Record<string, unknown>) ?? {},
    dependencies: edges
      .filter((e) => e.target === node.id)
      .map((e) => e.source),
  }));

  const dagEdges: DagEdge[] = edges.map((edge) => ({
    source: edge.source,
    target: edge.target,
  }));

  return { nodes: dagNodes, edges: dagEdges };
}
