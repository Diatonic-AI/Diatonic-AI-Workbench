
import { useState, useCallback } from 'react';
import { 
  Edge, 
  Node,
  useNodesState, 
  useEdgesState, 
  addEdge, 
  Connection
} from '@xyflow/react';
import { initialNodes, initialEdges } from './constants';
import { TypedNode, LLMNodeData, NodeData, NodeTypes } from './types';

export function useFlowLogic() {
  // Use Node type from React Flow as the base type
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [nodeName, setNodeName] = useState('');
  const [nodePrompt, setNodePrompt] = useState('');
  const [newNodeType, setNewNodeType] = useState<NodeTypes>('llm');

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setNodeName(node.data.label || '');
    
    // Type guard to check if node is an LLM node
    if (node.type === 'llm' && 'prompt' in node.data) {
      setNodePrompt(node.data.prompt || '');
    } else {
      setNodePrompt('');
    }
  }, []);

  const updateSelectedNode = useCallback(() => {
    if (selectedNode) {
      if (selectedNode.type === 'llm') {
        const updatedData = {
          ...selectedNode.data,
          label: nodeName,
          prompt: nodePrompt
        };
        
        setNodes(nodes.map(node => 
          node.id === selectedNode.id ? { ...node, data: updatedData } : node
        ));
      } else {
        const updatedData = {
          ...selectedNode.data,
          label: nodeName
        };
        
        setNodes(nodes.map(node => 
          node.id === selectedNode.id ? { ...node, data: updatedData } : node
        ));
      }
    }
  }, [selectedNode, nodeName, nodePrompt, nodes, setNodes]);

  const addNewNode = useCallback(() => {
    // Determine a reasonable position for the new node
    const yPos = nodes.length > 0 
      ? Math.max(...nodes.map(n => n.position.y)) + 125 
      : 100;
    
    let newNodeData: NodeData = {
      label: `New ${newNodeType.charAt(0).toUpperCase() + newNodeType.slice(1)} Node`
    };
    
    if (newNodeType === 'llm') {
      (newNodeData as LLMNodeData).prompt = 'Enter your prompt here...';
    }
    
    const newNode: Node = {
      id: `node-${Date.now()}`,
      type: newNodeType,
      data: newNodeData,
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

  return {
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
  };
}
