
import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { LLMNodeData } from '../types';

interface LLMNodeProps {
  data: LLMNodeData;
  isConnectable: boolean;
}

export function LLMNode({ data, isConnectable }: LLMNodeProps) {
  return (
    <div className="p-3 rounded-md bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-primary/30">
      <div className="font-medium text-sm mb-2">{data.label}</div>
      <div className="text-xs text-muted-foreground">
        {data.prompt ? data.prompt : 'No prompt configured'}
      </div>
      
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-primary border-2 border-background"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-primary border-2 border-background"
      />
    </div>
  );
}
