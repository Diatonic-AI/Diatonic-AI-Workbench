
import { Edge, Node } from '@xyflow/react';
import { NodeTypeOption, NodeTypes, TriggerNodeData, LLMNodeData, OutputNodeData } from './types';

// Initial nodes and edges for the canvas
export const initialNodes: Node[] = [
  {
    id: '1',
    type: 'trigger',
    data: { label: 'Start Trigger' } as TriggerNodeData,
    position: { x: 250, y: 25 },
  },
  {
    id: '2',
    type: 'llm',
    data: { 
      label: 'LLM Processor',
      prompt: 'You are a helpful assistant. {{input}}'
    } as LLMNodeData,
    position: { x: 250, y: 150 },
  },
  {
    id: '3',
    type: 'output',
    data: { label: 'Response Output' } as OutputNodeData,
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
