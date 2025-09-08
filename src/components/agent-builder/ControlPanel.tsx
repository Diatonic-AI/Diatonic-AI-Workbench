
import React from 'react';
import { Plus, Save } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Panel } from '@xyflow/react';
import { nodeTypeOptions } from './constants';
import { NodeTypes } from './types';

interface ControlPanelProps {
  newNodeType: NodeTypes;
  setNewNodeType: (type: NodeTypes) => void;
  addNewNode: () => void;
}

export function ControlPanel({ 
  newNodeType, 
  setNewNodeType, 
  addNewNode 
}: ControlPanelProps) {
  return (
    <Panel position="top-right" className="bg-card/90 backdrop-blur-sm p-3 rounded-md border border-border/50 shadow-sm">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <select 
            className="text-xs p-1 rounded-md border border-border bg-background w-32"
            value={newNodeType}
            onChange={(e) => setNewNodeType(e.target.value as NodeTypes)}
          >
            {nodeTypeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Button size="sm" onClick={addNewNode}>
            <Plus className="mr-1 h-3 w-3" />
            Add Node
          </Button>
        </div>
        
        <Button size="sm" variant="outline">
          <Save className="mr-1 h-3 w-3" />
          Save Flow
        </Button>
      </div>
    </Panel>
  );
}
