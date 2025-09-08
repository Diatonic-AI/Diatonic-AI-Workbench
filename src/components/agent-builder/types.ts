
import { Node, Edge } from '@xyflow/react';

/**
 * Base node data interface with common properties
 */
export interface BaseNodeData {
  label: string;
  [key: string]: unknown; // Add index signature to make it compatible with Record<string, unknown>
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
 * Type aliases for React Flow node types
 */
export type NodeTypes = 'trigger' | 'llm' | 'output';

/**
 * Type-safe node with proper data typing
 */
export type TypedNode = Node<NodeData, NodeTypes>;

/**
 * Type-safe trigger node
 */
export type TriggerNode = Node<TriggerNodeData, 'trigger'>;

/**
 * Type-safe LLM node
 */
export type LLMNode = Node<LLMNodeData, 'llm'>;

/**
 * Type-safe output node
 */
export type OutputNode = Node<OutputNodeData, 'output'>;
