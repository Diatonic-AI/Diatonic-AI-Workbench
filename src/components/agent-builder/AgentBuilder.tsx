
import React, { useState, useCallback } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Node,
  Edge,
  Connection,
  Panel,
  NodeTypes
} from '@xyflow/react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LLMNode } from './nodes/LLMNode';
import { TriggerNode } from './nodes/TriggerNode';
import { OutputNode } from './nodes/OutputNode';
import '@xyflow/react/dist/style.css';

// Initial nodes and edges for the canvas
const initialNodes: Node[] = [
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

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true },
  { id: 'e2-3', source: '2', target: '3', animated: true },
];

// Define node types mapping
const nodeTypes: NodeTypes = {
  llm: LLMNode,
  trigger: TriggerNode,
  output: OutputNode,
};

// Node type options for dropdown
const nodeTypeOptions = [
  { value: 'trigger', label: 'Trigger' },
  { value: 'llm', label: 'LLM Processor' },
  { value: 'output', label: 'Output' }
];

export function AgentBuilder() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [nodeName, setNodeName] = useState('');
  const [nodePrompt, setNodePrompt] = useState('');
  const [newNodeType, setNewNodeType] = useState('llm');

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setNodeName(node.data.label);
    setNodePrompt(node.data.prompt || '');
  }, []);

  const updateSelectedNode = useCallback(() => {
    if (selectedNode) {
      const updatedData = {
        ...selectedNode.data,
        label: nodeName,
        ...(selectedNode.type === 'llm' && { prompt: nodePrompt })
      };
      
      setNodes(nodes.map(node => 
        node.id === selectedNode.id ? { ...node, data: updatedData } : node
      ));
    }
  }, [selectedNode, nodeName, nodePrompt, nodes, setNodes]);

  const addNewNode = useCallback(() => {
    // Determine a reasonable position for the new node
    const yPos = nodes.length > 0 
      ? Math.max(...nodes.map(n => n.position.y)) + 125 
      : 100;
    
    const newNode: Node = {
      id: `node-${Date.now()}`,
      type: newNodeType,
      data: { 
        label: `New ${newNodeType.charAt(0).toUpperCase() + newNodeType.slice(1)} Node`,
        ...(newNodeType === 'llm' && { prompt: 'Enter your prompt here...' })
      },
      position: { x: 250, y: yPos },
    };
    
    setNodes((nds) => [...nds, newNode]);
  }, [newNodeType, nodes, setNodes]);

  const deleteSelectedNode = useCallback(() => {
    if (selectedNode) {
      setNodes(nodes.filter(node => node.id !== selectedNode.id));
      // Also remove any connected edges
      setEdges(edges.filter(edge => 
        edge.source !== selectedNode.id && edge.target !== selectedNode.id
      ));
      setSelectedNode(null);
    }
  }, [selectedNode, nodes, edges, setNodes, setEdges]);

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
        
        <Panel position="top-right" className="bg-card/90 backdrop-blur-sm p-3 rounded-md border border-border/50 shadow-sm">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <select 
                className="text-xs p-1 rounded-md border border-border bg-background w-32"
                value={newNodeType}
                onChange={(e) => setNewNodeType(e.target.value)}
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
      </ReactFlow>
      
      {selectedNode && (
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
                Node ID: {selectedNode.id}
              </label>
              <label className="text-xs text-muted-foreground block mb-1">
                Type: {selectedNode.type || 'default'}
              </label>
            </div>
            
            <div>
              <label className="text-xs text-muted-foreground block mb-1">
                Label
              </label>
              <Input 
                value={nodeName}
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
                  value={nodePrompt}
                  onChange={(e) => setNodePrompt(e.target.value)}
                  onBlur={updateSelectedNode}
                  className="w-full p-2 text-sm rounded-md border border-border bg-background h-24 resize-none"
                  placeholder="Enter your prompt template here..."
                />
                <div className="text-xs text-muted-foreground mt-1">
                  Use {{input}} to reference incoming data
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
      )}
    </div>
  );
}
