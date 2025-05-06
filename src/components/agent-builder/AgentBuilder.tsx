
import React from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  NodeTypes
} from '@xyflow/react';
import { LLMNode } from './nodes/LLMNode';
import { TriggerNode } from './nodes/TriggerNode';
import { OutputNode } from './nodes/OutputNode';
import { NodePropertiesPanel } from './NodePropertiesPanel';
import { ControlPanel } from './ControlPanel';
import { useFlowLogic } from './useFlowLogic';
import '@xyflow/react/dist/style.css';

// Define node types mapping
const nodeTypes: NodeTypes = {
  llm: LLMNode,
  trigger: TriggerNode,
  output: OutputNode,
};

export function AgentBuilder() {
  const {
    nodes,
    edges,
    selectedNode,
    nodeName,
    nodePrompt,
    newNodeType,
    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodeClick,
    setNodeName,
    setNodePrompt,
    setNewNodeType,
    updateSelectedNode,
    addNewNode,
    deleteSelectedNode
  } = useFlowLogic();

  return (
    <div className="h-[600px] border border-border/50 rounded-lg overflow-hidden relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
      >
        <Controls />
        <MiniMap 
          nodeStrokeWidth={3}
          nodeColor={(node) => {
            switch (node.type) {
              case 'trigger': return '#10B981';
              case 'llm': return '#9b87f5';
              case 'output': return '#F97316';
              default: return '#33C3F0';
            }
          }}
        />
        <Background gap={12} size={1} />
        
        <ControlPanel 
          newNodeType={newNodeType}
          setNewNodeType={setNewNodeType}
          addNewNode={addNewNode}
        />
      </ReactFlow>
      
      <NodePropertiesPanel
        selectedNode={selectedNode}
        nodeName={nodeName}
        nodePrompt={nodePrompt}
        setNodeName={setNodeName}
        setNodePrompt={setNodePrompt}
        deleteSelectedNode={deleteSelectedNode}
        updateSelectedNode={updateSelectedNode}
      />
    </div>
  );
}
