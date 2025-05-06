
import { Edge } from '@xyflow/react';
import { TypedNode, NodeTypeOption } from './types';

// Initial nodes and edges for the canvas
export const initialNodes: TypedNode[] = [
  {
    id: '1',
    type: 'trigger',
    data: { label: 'Start Trigger' },
    position: { x: 250, y: 25 },
  },
  {
    id: '2',
    type: 'llm',
    data: { 
      label: 'LLM Processor',
      prompt: 'You are a helpful assistant. {{input}}'
    },
    position: { x: 250, y: 150 },
  },
  {
    id: '3',
    type: 'output',
    data: { label: 'Response Output' },
    position: { x: 250, y: 275 },
  },
];

export const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true },
  { id: 'e2-3', source: '2', target: '3', animated: true },
];

// Node type options for dropdown
export const nodeTypeOptions: NodeTypeOption[] = [
  { value: 'trigger', label: 'Trigger' },
  { value: 'llm', label: 'LLM Processor' },
  { value: 'output', label: 'Output' }
];
