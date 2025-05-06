
import { Node, Edge } from '@xyflow/react';

/**
 * Base node data interface with common properties
 */
export interface BaseNodeData {
  label: string;
}

/**
 * Trigger node specific data
 */
export interface TriggerNodeData extends BaseNodeData {
  // Trigger-specific properties can be added here
}

/**
 * LLM node specific data
 */
export interface LLMNodeData extends BaseNodeData {
  prompt: string;
}

/**
 * Output node specific data
 */
export interface OutputNodeData extends BaseNodeData {
  // Output-specific properties can be added here
}

/**
 * Union type for all node data types
 */
export type NodeData = TriggerNodeData | LLMNodeData | OutputNodeData;

/**
 * Node type options for the dropdown
 */
export interface NodeTypeOption {
  value: string;
  label: string;
}

/**
 * Type-safe node with proper data typing
 */
export interface TypedNode extends Omit<Node, 'data'> {
  type: 'trigger' | 'llm' | 'output';
  data: NodeData;
}

/**
 * Type-safe trigger node
 */
export interface TriggerNode extends Omit<Node, 'data' | 'type'> {
  type: 'trigger';
  data: TriggerNodeData;
}

/**
 * Type-safe LLM node
 */
export interface LLMNode extends Omit<Node, 'data' | 'type'> {
  type: 'llm';
  data: LLMNodeData;
}

/**
 * Type-safe output node
 */
export interface OutputNode extends Omit<Node, 'data' | 'type'> {
  type: 'output';
  data: OutputNodeData;
}
