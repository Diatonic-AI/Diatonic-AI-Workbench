
import { useState, useCallback } from 'react';
import { 
  Node, 
  Edge, 
  useNodesState, 
  useEdgesState, 
  addEdge, 
  Connection
} from '@xyflow/react';
import { initialNodes, initialEdges } from './constants';

export function useFlowLogic() {
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
    // Fix: proper type narrowing for the prompt property
    if (typeof node.data.prompt === 'string') {
      setNodePrompt(node.data.prompt);
    } else {
      setNodePrompt('');
    }
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
