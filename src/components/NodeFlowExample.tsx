
import { useState } from 'react';
import { Database, MessageSquare, Cpu, Link } from 'lucide-react';

const NodeFlowExample = () => {
  const [activeNode, setActiveNode] = useState<string | null>(null);
  
  const handleNodeClick = (nodeId: string) => {
    setActiveNode(nodeId === activeNode ? null : nodeId);
  };
  
  return (
    <div className="w-full h-[300px] md:h-[400px] relative overflow-hidden my-8">
      <svg className="absolute inset-0 w-full h-full z-0" xmlns="http://www.w3.org/2000/svg">
        <path 
          d="M100,150 C180,100 220,200 300,150" 
          className="connection"
          stroke={activeNode === 'node1' || activeNode === 'node2' ? "#9b87f5" : "rgba(255,255,255,0.3)"} 
          strokeWidth="2" 
          fill="none" 
        />
        <path 
          d="M300,150 C380,100 420,200 500,150" 
          className="connection"
          stroke={activeNode === 'node2' || activeNode === 'node3' ? "#F97316" : "rgba(255,255,255,0.3)"} 
          strokeWidth="2" 
          fill="none" 
        />
        <path 
          d="M300,150 C380,200 420,100 500,250" 
          className="connection"
          stroke={activeNode === 'node2' || activeNode === 'node4' ? "#33C3F0" : "rgba(255,255,255,0.3)"} 
          strokeWidth="2" 
          fill="none" 
        />
      </svg>
      
      <div 
        className={`node absolute top-[120px] left-[50px] ${activeNode === 'node1' ? 'ring-2 ring-workbbench-purple' : ''}`}
        onClick={() => handleNodeClick('node1')}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <Database className="w-5 h-5 mr-2 text-workbbench-purple" />
            <span className="font-medium">Data Source</span>
          </div>
          <div className="connection-point ml-2"></div>
        </div>
        <div className="text-xs text-gray-400">
          <p>Input: JSON</p>
          <p>Output: Parsed Data</p>
        </div>
      </div>
      
      <div 
        className={`node absolute top-[120px] left-[250px] ${activeNode === 'node2' ? 'ring-2 ring-workbbench-purple' : ''}`}
        onClick={() => handleNodeClick('node2')}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <MessageSquare className="w-5 h-5 mr-2 text-workbbench-orange" />
            <span className="font-medium">LLM Processor</span>
          </div>
          <div className="connection-point ml-2"></div>
        </div>
        <div className="text-xs text-gray-400">
          <p>Model: GPT-4</p>
          <p>Temp: 0.7</p>
        </div>
      </div>
      
      <div 
        className={`node absolute top-[120px] left-[450px] ${activeNode === 'node3' ? 'ring-2 ring-workbbench-purple' : ''}`}
        onClick={() => handleNodeClick('node3')}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <Cpu className="w-5 h-5 mr-2 text-workbbench-blue" />
            <span className="font-medium">Validator</span>
          </div>
          <div className="connection-point ml-2"></div>
        </div>
        <div className="text-xs text-gray-400">
          <p>Rules: Schema validation</p>
          <p>Output: Valid response</p>
        </div>
      </div>
      
      <div 
        className={`node absolute top-[220px] left-[450px] ${activeNode === 'node4' ? 'ring-2 ring-workbbench-purple' : ''}`}
        onClick={() => handleNodeClick('node4')}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <Link className="w-5 h-5 mr-2 text-workbbench-green" />
            <span className="font-medium">API Connector</span>
          </div>
          <div className="connection-point ml-2"></div>
        </div>
        <div className="text-xs text-gray-400">
          <p>Endpoint: /process</p>
          <p>Method: POST</p>
        </div>
      </div>
    </div>
  );
};

export default NodeFlowExample;
