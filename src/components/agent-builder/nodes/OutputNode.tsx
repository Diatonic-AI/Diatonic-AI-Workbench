
import React from 'react';
import { Handle, Position } from '@xyflow/react';

interface OutputNodeProps {
  data: {
    label: string;
  };
  isConnectable: boolean;
}

export function OutputNode({ data, isConnectable }: OutputNodeProps) {
  return (
    <div className="p-3 rounded-md bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30">
      <div className="font-medium text-sm mb-2">{data.label}</div>
      <div className="text-xs text-muted-foreground">Response output</div>
      
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-orange-500 border-2 border-background"
      />
    </div>
  );
}
