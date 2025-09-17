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
    
    // Safely set node name, ensuring it's a string and handling edge cases
    try {
      const label = node.data?.label;
      if (typeof label === 'string') {
        setNodeName(label);
      } else if (label !== null && label !== undefined) {
        setNodeName(String(label));
      } else {
        setNodeName('');
      }
      
      // Type guard to check if node is an LLM node and safely get prompt
      if (node.type === 'llm' && node.data && typeof node.data.prompt === 'string') {
        setNodePrompt(node.data.prompt);
      } else {
        setNodePrompt('');
      }
    } catch (error) {
      console.warn('Error processing node data:', error);
      setNodeName('');
      setNodePrompt('');
    }
  }, []);

  const updateSelectedNode = useCallback(() => {
    if (selectedNode) {
      try {
        if (selectedNode.type === 'llm') {
          const updatedData = {
            ...selectedNode.data,
            label: String(nodeName || ''),
            prompt: String(nodePrompt || '')
          };
          
          setNodes(nodes.map(node => 
            node.id === selectedNode.id ? { ...node, data: updatedData } : node
          ));
        } else {
          const updatedData = {
            ...selectedNode.data,
            label: String(nodeName || '')
          };
          
          setNodes(nodes.map(node => 
            node.id === selectedNode.id ? { ...node, data: updatedData } : node
          ));
        }
      } catch (error) {
        console.error('Error updating selected node:', error);
      }
    }
  }, [selectedNode, nodeName, nodePrompt, nodes, setNodes]);

  const addNewNode = useCallback(() => {
    try {
      // Determine a reasonable position for the new node
      const yPos = nodes.length > 0 
        ? Math.max(...nodes.map(n => n.position.y)) + 125 
        : 100;
      
      const newNodeData: NodeData = {
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
    } catch (error) {
      console.error('Error adding new node:', error);
    }
  }, [newNodeType, nodes, setNodes]);

  const deleteSelectedNode = useCallback(() => {
    if (selectedNode) {
      try {
        setNodes(nodes.filter(node => node.id !== selectedNode.id));
        // Also remove any connected edges
        setEdges(edges.filter(edge => 
          edge.source !== selectedNode.id && edge.target !== selectedNode.id
        ));
        setSelectedNode(null);
        setNodeName('');
        setNodePrompt('');
      } catch (error) {
        console.error('Error deleting selected node:', error);
      }
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
