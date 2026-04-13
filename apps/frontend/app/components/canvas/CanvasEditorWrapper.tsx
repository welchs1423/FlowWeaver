'use client';

import dynamic from 'next/dynamic';
import Sidebar from './Sidebar';

// React Flow uses browser-only APIs; skip SSR for the canvas component.
const FlowCanvas = dynamic(() => import('./FlowCanvas'), { ssr: false });

export default function CanvasEditorWrapper() {
  return (
    <div className="flex flex-1 overflow-hidden">
      <Sidebar />
      <FlowCanvas />
    </div>
  );
}
