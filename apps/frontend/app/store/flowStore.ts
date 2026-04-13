import { create } from 'zustand';
import { addEdge, applyNodeChanges, applyEdgeChanges } from 'reactflow';
import type {
  Node,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
} from 'reactflow';

interface FlowState {
  nodes: Node[];
  edges: Edge[];
  savedFlowId: string | null;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  addNode: (node: Node) => void;
  setSavedFlowId: (id: string | null) => void;
  reset: () => void;
}

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

export const useFlowStore = create<FlowState>()((set, get) => ({
  nodes: initialNodes,
  edges: initialEdges,
  savedFlowId: null,

  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) });
  },

  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
  },

  onConnect: (connection) => {
    set({ edges: addEdge(connection, get().edges) });
  },

  addNode: (node) => {
    set({ nodes: [...get().nodes, node] });
  },

  setSavedFlowId: (id) => {
    set({ savedFlowId: id });
  },

  reset: () => {
    set({ nodes: initialNodes, edges: initialEdges, savedFlowId: null });
  },
}));
