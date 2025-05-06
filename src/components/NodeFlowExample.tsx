
import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Database, MessageSquare, Code, Cpu, ArrowRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Animation states
type AnimationState = 'adding-node' | 'connecting' | 'editing-prompt' | 'idle';
type ConnectionState = { source: string; target: string; active: boolean }[];
type NodePosition = { x: number; y: number };

const NodeFlowExample = () => {
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [animationState, setAnimationState] = useState<AnimationState>('idle');
  const [isAnimating, setIsAnimating] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [connections, setConnections] = useState<ConnectionState>([
    { source: 'node1', target: 'node2', active: true },
    { source: 'node2', target: 'node3', active: true },
    { source: 'node2', target: 'node4', active: false }
  ]);
  const [nodePositions, setNodePositions] = useState<Record<string, NodePosition>>({
    node1: { x: 100, y: 120 },
    node2: { x: 300, y: 150 },
    node3: { x: 500, y: 120 },
    node4: { x: 500, y: 250 }
  });
  
  const animationTimer = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragNode = useRef<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  
  // Animation sequence
  const runAnimationSequence = useCallback(() => {
    if (!isAnimating) return;
    
    const sequence = [
      { state: 'adding-node', duration: 1000 },
      { state: 'connecting', duration: 1000 },
      { state: 'editing-prompt', duration: 1500 },
      { state: 'idle', duration: 500 }
    ];
    
    let timeOffset = 0;
    
    sequence.forEach(step => {
      setTimeout(() => {
        if (isAnimating) {
          setAnimationState(step.state as AnimationState);
          
          if (step.state === 'connecting') {
            setTimeout(() => {
              setConnections(prev => prev.map(conn => 
                conn.source === 'node2' && conn.target === 'node4' 
                  ? { ...conn, active: true } 
                  : conn
              ));
            }, 500);
          }
          
          if (step.state === 'editing-prompt') {
            setShowPromptEditor(true);
            setTimeout(() => {
              if (isAnimating) setShowPromptEditor(false);
            }, 1200);
          }
        }
      }, timeOffset);
      
      timeOffset += step.duration;
    });
    
    // Restart animation cycle
    animationTimer.current = setTimeout(() => {
      if (isAnimating) {
        // Reset connections for next cycle
        setConnections(prev => prev.map(conn => 
          conn.source === 'node2' && conn.target === 'node4' 
            ? { ...conn, active: false } 
            : conn
        ));
        runAnimationSequence();
      }
    }, timeOffset);
    
  }, [isAnimating]);

  // Start/stop animation on hover
  const handleContainerMouseEnter = () => {
    setIsAnimating(false);
    if (animationTimer.current) {
      clearTimeout(animationTimer.current);
    }
  };
  
  const handleContainerMouseLeave = () => {
    setIsAnimating(true);
    runAnimationSequence();
  };
  
  // Initialize animation
  useEffect(() => {
    runAnimationSequence();
    return () => {
      if (animationTimer.current) {
        clearTimeout(animationTimer.current);
      }
    };
  }, [runAnimationSequence]);
  
  // Handle node dragging
  const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
    if (!isAnimating) {
      e.preventDefault();
      isDragging.current = true;
      dragNode.current = nodeId;
      
      const nodeRect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      dragOffset.current = { 
        x: e.clientX - nodeRect.left, 
        y: e.clientY - nodeRect.top 
      };
    }
  };
  
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging.current && dragNode.current && containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const newX = e.clientX - containerRect.left - dragOffset.current.x;
      const newY = e.clientY - containerRect.top - dragOffset.current.y;
      
      setNodePositions(prev => ({
        ...prev,
        [dragNode.current!]: { 
          x: Math.max(50, Math.min(containerRect.width - 150, newX)),
          y: Math.max(30, Math.min(containerRect.height - 80, newY))
        }
      }));
    }
  }, []);
  
  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    dragNode.current = null;
  }, []);
  
  // Add/remove global event listeners for dragging
  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);
  
  // Node click handler
  const handleNodeClick = (nodeId: string) => {
    if (!isAnimating) {
      setActiveNode(nodeId === activeNode ? null : nodeId);
      
      // If they click the LLM node, show prompt editor
      if (nodeId === 'node2') {
        setShowPromptEditor(true);
        setTimeout(() => setShowPromptEditor(false), 2000);
      }
    }
  };
  
  // Login redirect handler
  const handleConfigAction = (e: React.MouseEvent) => {
    e.preventDefault();
    // This would normally redirect to login, but we'll just show tooltip
    setShowTooltip(true);
    setTimeout(() => setShowTooltip(false), 3000);
  };
  
  return (
    <div 
      ref={containerRef}
      className="w-full h-[300px] md:h-[400px] relative overflow-hidden"
      onMouseEnter={handleContainerMouseEnter}
      onMouseLeave={handleContainerMouseLeave}
    >
      {/* Paths/Connections */}
      <svg className="absolute inset-0 w-full h-full z-0" xmlns="http://www.w3.org/2000/svg">
        {/* Data source to LLM */}
        <path 
          d={`M${nodePositions.node1.x + 100},${nodePositions.node1.y + 40} C${nodePositions.node1.x + 180},${nodePositions.node1.y} ${nodePositions.node2.x - 80},${nodePositions.node2.y + 80} ${nodePositions.node2.x},${nodePositions.node2.y + 40}`}
          className="transition-all duration-300 ease-in-out"
          stroke={activeNode === 'node1' || activeNode === 'node2' || animationState === 'connecting' ? "#9b87f5" : "rgba(255,255,255,0.3)"} 
          strokeWidth="2" 
          strokeDasharray={animationState === 'connecting' ? "5,5" : "none"}
          fill="none" 
          markerEnd="url(#arrowhead)"
        />
        
        {/* LLM to Validator */}
        <path 
          d={`M${nodePositions.node2.x + 100},${nodePositions.node2.y + 40} C${nodePositions.node2.x + 180},${nodePositions.node2.y} ${nodePositions.node3.x - 80},${nodePositions.node3.y + 80} ${nodePositions.node3.x},${nodePositions.node3.y + 40}`}
          className="transition-all duration-300 ease-in-out"
          stroke={activeNode === 'node2' || activeNode === 'node3' ? "#F97316" : "rgba(255,255,255,0.3)"} 
          strokeWidth="2" 
          fill="none" 
          markerEnd="url(#arrowhead)"
        />
        
        {/* LLM to API */}
        <path 
          d={`M${nodePositions.node2.x + 100},${nodePositions.node2.y + 40} C${nodePositions.node2.x + 180},${nodePositions.node2.y + 80} ${nodePositions.node4.x - 80},${nodePositions.node4.y - 30} ${nodePositions.node4.x},${nodePositions.node4.y + 40}`}
          className={`transition-all duration-300 ease-in-out ${connections.find(c => c.source === 'node2' && c.target === 'node4')?.active ? 'opacity-100' : 'opacity-30'}`}
          stroke={activeNode === 'node2' || activeNode === 'node4' || animationState === 'connecting' ? "#33C3F0" : "rgba(255,255,255,0.3)"} 
          strokeWidth="2" 
          strokeDasharray={animationState === 'connecting' ? "5,5" : "none"}
          fill="none" 
          markerEnd="url(#arrowhead)"
        />
        
        {/* SVG definitions */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="10"
            refY="3.5"
            orient="auto"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill="#9b87f5" />
          </marker>
        </defs>
      </svg>
      
      {/* Nodes */}
      <div 
        className={`node-card absolute transition-all duration-300 ease-in-out bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-lg p-3 cursor-grab active:cursor-grabbing ${activeNode === 'node1' ? 'ring-2 ring-workbbench-purple' : ''}`}
        style={{ 
          left: `${nodePositions.node1.x}px`, 
          top: `${nodePositions.node1.y}px`,
          width: '100px',
          opacity: animationState === 'adding-node' && nodePositions.node1.x === 100 ? 0.5 : 1,
          transform: animationState === 'adding-node' && nodePositions.node1.x === 100 ? 'scale(0.9)' : 'scale(1)'
        }}
        onClick={() => handleNodeClick('node1')}
        onMouseDown={(e) => handleMouseDown(e, 'node1')}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <Database className="w-5 h-5 mr-2 text-workbbench-green" />
            <span className="font-medium text-sm">Data Source</span>
          </div>
        </div>
        <div className="text-xs text-gray-400">
          <p>Output: JSON Data</p>
        </div>
        <div className="connection-point absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 w-3 h-3 rounded-full bg-workbbench-green border-2 border-background"></div>
      </div>
      
      <div 
        className={`node-card absolute transition-all duration-300 ease-in-out bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-primary/30 rounded-lg p-3 cursor-grab active:cursor-grabbing ${activeNode === 'node2' ? 'ring-2 ring-workbbench-purple' : ''}`}
        style={{ 
          left: `${nodePositions.node2.x}px`, 
          top: `${nodePositions.node2.y}px`,
          width: '100px'
        }}
        onClick={() => handleNodeClick('node2')}
        onMouseDown={(e) => handleMouseDown(e, 'node2')}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <MessageSquare className="w-5 h-5 mr-2 text-workbbench-purple" />
            <span className="font-medium text-sm">LLM Node</span>
          </div>
        </div>
        <div className="text-xs text-gray-400">
          <p>GPT-4 Model</p>
        </div>
        <div className="connection-point absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-workbbench-purple border-2 border-background"></div>
        <div className="connection-point absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 w-3 h-3 rounded-full bg-workbbench-purple border-2 border-background"></div>
      </div>
      
      <div 
        className={`node-card absolute transition-all duration-300 ease-in-out bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-lg p-3 cursor-grab active:cursor-grabbing ${activeNode === 'node3' ? 'ring-2 ring-workbbench-purple' : ''}`}
        style={{ 
          left: `${nodePositions.node3.x}px`, 
          top: `${nodePositions.node3.y}px`,
          width: '100px'
        }}
        onClick={() => handleNodeClick('node3')}
        onMouseDown={(e) => handleMouseDown(e, 'node3')}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <Cpu className="w-5 h-5 mr-2 text-workbbench-orange" />
            <span className="font-medium text-sm">Validator</span>
          </div>
        </div>
        <div className="text-xs text-gray-400">
          <p>JSON Schema</p>
        </div>
        <div className="connection-point absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-workbbench-orange border-2 border-background"></div>
      </div>
      
      <div 
        className={`node-card absolute transition-all duration-300 ease-in-out bg-gradient-to-r from-blue-400/20 to-blue-600/20 border border-blue-400/30 rounded-lg p-3 cursor-grab active:cursor-grabbing ${activeNode === 'node4' ? 'ring-2 ring-workbbench-purple' : ''}`}
        style={{ 
          left: `${nodePositions.node4.x}px`, 
          top: `${nodePositions.node4.y}px`,
          width: '100px'
        }}
        onClick={() => handleNodeClick('node4')}
        onMouseDown={(e) => handleMouseDown(e, 'node4')}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <Code className="w-5 h-5 mr-2 text-workbbench-blue" />
            <span className="font-medium text-sm">API Call</span>
          </div>
        </div>
        <div className="text-xs text-gray-400">
          <p>HTTP POST</p>
        </div>
        <div className="connection-point absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-workbbench-blue border-2 border-background"></div>
      </div>
      
      {/* Prompt Editor Panel */}
      {showPromptEditor && (
        <div className="absolute right-4 top-4 bg-card/90 backdrop-blur-sm p-4 rounded-md border border-border/50 w-64 z-20 animate-fade-in">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-medium">Prompt Template</h3>
            <button 
              className="text-muted-foreground hover:text-foreground"
              onClick={handleConfigAction}
            >
              <Code className="h-4 w-4" />
            </button>
          </div>
          <textarea 
            className="w-full p-2 text-sm rounded-md border border-border bg-background h-24 resize-none"
            placeholder="You are a helpful assistant. {{input}}"
            onClick={handleConfigAction}
            readOnly
          />
          <div className="text-xs text-muted-foreground mt-1">
            Use {"{{"}"input{"}}"} to reference incoming data
          </div>
          <Button 
            size="sm" 
            onClick={handleConfigAction}
            className="w-full mt-2"
          >
            Apply Changes
          </Button>
        </div>
      )}
      
      {/* Controls Panel */}
      <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-sm p-3 rounded-md border border-border/50 z-10">
        <TooltipProvider>
          <Tooltip open={showTooltip}>
            <TooltipTrigger asChild>
              <Button onClick={handleConfigAction} size="sm" className="bg-workbbench-purple hover:bg-workbbench-purple/90">
                Try It Yourself
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="bg-black/80 text-white border-none p-2">
              <p>Sign in to build your own agents!</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      {/* Instructions Tooltip */}
      <div className="absolute top-2 left-2 text-xs text-white/70 bg-black/30 px-2 py-1 rounded">
        {isAnimating ? "Hover to interact" : "Drag nodes to reposition"}
      </div>
    </div>
  );
};

export default NodeFlowExample;
