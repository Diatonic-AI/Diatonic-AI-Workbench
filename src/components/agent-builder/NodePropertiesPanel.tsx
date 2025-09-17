import React from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Node } from '@xyflow/react';

interface NodePropertiesPanelProps {
  selectedNode: Node | null;
  nodeName: string;
  nodePrompt: string;
  setNodeName: (value: string) => void;
  setNodePrompt: (value: string) => void;
  deleteSelectedNode: () => void;
  updateSelectedNode: () => void;
}

export function NodePropertiesPanel({
  selectedNode,
  nodeName,
  nodePrompt,
  setNodeName,
  setNodePrompt,
  deleteSelectedNode,
  updateSelectedNode,
}: NodePropertiesPanelProps) {
  if (!selectedNode) return null;

  // Safe string conversion for node ID and type to avoid primitive conversion errors
  const safeNodeId = String(selectedNode.id || '');
  const safeNodeType = String(selectedNode.type || 'default');
  const safeLabelValue = String(nodeName || '');
  const safePromptValue = String(nodePrompt || '');

  return (
    <div className="absolute bottom-4 right-4 bg-card/90 backdrop-blur-sm p-4 rounded-md border border-border/50 w-72 z-10">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium">Node Properties</h3>
        <Button 
          size="sm" 
          variant="destructive" 
          className="h-7 w-7 p-0" 
          onClick={deleteSelectedNode}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="space-y-3">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">
            Node ID: {safeNodeId}
          </label>
          <label className="text-xs text-muted-foreground block mb-1">
            Type: {safeNodeType}
          </label>
        </div>
        
        <div>
          <label className="text-xs text-muted-foreground block mb-1">
            Label
          </label>
          <Input 
            value={safeLabelValue}
            onChange={(e) => setNodeName(e.target.value)}
            onBlur={updateSelectedNode}
            className="text-sm"
          />
        </div>
        
        {selectedNode.type === 'llm' && (
          <div>
            <label className="text-xs text-muted-foreground block mb-1">
              Prompt Template
            </label>
            <textarea 
              value={safePromptValue}
              onChange={(e) => setNodePrompt(e.target.value)}
              onBlur={updateSelectedNode}
              className="w-full p-2 text-sm rounded-md border border-border bg-background h-24 resize-none"
              placeholder="Enter your prompt template here..."
            />
            <div className="text-xs text-muted-foreground mt-1">
              Use {`{{input}}`} to reference incoming data
            </div>
          </div>
        )}
        
        <Button 
          size="sm" 
          onClick={updateSelectedNode}
          className="w-full mt-2"
        >
          Apply Changes
        </Button>
      </div>
    </div>
  );
}
