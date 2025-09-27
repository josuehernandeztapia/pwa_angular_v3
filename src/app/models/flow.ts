export interface FlowNode { id: string; type: string; name: string; config: Record<string,any>; }
export interface FlowEdge { id: string; from: string; to: string; condition?: string; }
export interface FlowDraft { id: string; name: string; version: number; nodes: FlowNode[]; edges: FlowEdge[]; status: 'draft'|'published'; etag?: string; }

