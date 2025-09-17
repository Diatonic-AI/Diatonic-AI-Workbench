import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { TriggerNodeData } from '../types';

interface TriggerNodeProps {
  data: TriggerNodeData;
  isConnectable: boolean;
}

export function TriggerNode({ data, isConnectable }: TriggerNodeProps) {
  // Safe string conversion to avoid primitive conversion errors
  const safeLabel = String(data?.label || 'Trigger Node');

  return (
    <div className="p-3 rounded-md bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30">
      <div className="font-medium text-sm mb-2">{safeLabel}</div>
      <div className="text-xs text-muted-foreground">Event trigger</div>
      
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={isConnectable}
        className="w-3 h-3 bg-green-500 border-2 border-background"
      />
    </div>
  );
}
