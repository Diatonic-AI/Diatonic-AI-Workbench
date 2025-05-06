
import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Database, MessageSquare, Code, Cpu, ArrowRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Animation states
type AnimationState = 'adding-node' | 'connecting' | 'editing-prompt' | 'idle';
type ConnectionState = { source: string; target: string; active: boolean }[];
type NodePosition = { x: number; y: number };

// Call to action messages that will rotate
const callToActionMessages = [
  "Try It Yourself",
  "Drag & Drop Agent Creation",
  "Custom Prompt Chains",
  "Community Templates",
  "Agent Marketplace",
  "Agent Showcase",
  "Weekly Competitions"
];

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
  const [displayedMessage, setDisplayedMessage] = useState("");
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [typingState, setTypingState] = useState<'typing' | 'deleting' | 'pausing'>('typing');
  const [isHovering, setIsHovering] = useState(false);
  const [showTryForFreeButton, setShowTryForFreeButton] = useState(false);
  const [buttonAnimating, setButtonAnimating] = useState(false);
  const [nodeAnimating, setNodeAnimating] = useState(true);
  
  const animationTimer = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragNode = useRef<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const charIndex = useRef(0);
  const typingTimer = useRef<NodeJS.Timeout | null>(null);
  
  // Golden ratio for aesthetically pleasing spacing
  const goldenRatio = 1.618;
  
  // Adjust node positions based on container size and golden ratio
  useEffect(() => {
    const updatePositions = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        
        const centerX = width / 2;
        const centerY = height / 2;
        
        // Using golden ratio for spacing
        const horizontalSpacing = width / (goldenRatio * 3);
        const verticalOffset = height / (goldenRatio * 4);
        
        setNodePositions({
          node1: { x: centerX - horizontalSpacing * 1.2, y: centerY - verticalOffset / 1.5 },
          node2: { x: centerX, y: centerY },
          node3: { x: centerX + horizontalSpacing * 1.2, y: centerY - verticalOffset / 1.5 },
          node4: { x: centerX + horizontalSpacing * 1.2, y: centerY + verticalOffset / 1.5 }
        });
      }
    };
    
    updatePositions();
    window.addEventListener('resize', updatePositions);
    return () => window.removeEventListener('resize', updatePositions);
  }, []);
  
  // Typing animation for call to action messages
  useEffect(() => {
    const currentMessage = callToActionMessages[currentMessageIndex];
    
    const handleTyping = () => {
      if (typingState === 'typing') {
        if (charIndex.current < currentMessage.length) {
          setDisplayedMessage(currentMessage.substring(0, charIndex.current + 1));
          charIndex.current += 1;
          typingTimer.current = setTimeout(handleTyping, 100); // typing speed
        } else {
          setTypingState('pausing');
          typingTimer.current = setTimeout(handleTyping, 2000); // pause at the end
        }
      } else if (typingState === 'pausing') {
        setTypingState('deleting');
        typingTimer.current = setTimeout(handleTyping, 100);
      } else if (typingState === 'deleting') {
        if (charIndex.current > 0) {
          charIndex.current -= 1;
          setDisplayedMessage(currentMessage.substring(0, charIndex.current));
          typingTimer.current = setTimeout(handleTyping, 50); // deleting speed
        } else {
          setTypingState('typing');
          setCurrentMessageIndex((currentMessageIndex + 1) % callToActionMessages.length);
          typingTimer.current = setTimeout(handleTyping, 500); // pause before next message
        }
      }
    };
    
    if (isAnimating && !isHovering) {
      typingTimer.current = setTimeout(handleTyping, 500);
    }
    
    return () => {
      if (typingTimer.current) {
        clearTimeout(typingTimer.current);
      }
    };
  }, [currentMessageIndex, typingState, isAnimating, isHovering]);
  
  // Animation sequence
  const runAnimationSequence = useCallback(() => {
    if (!isAnimating) return;
    
    // Musical timing: 6/8 time at 100 BPM = 3.6 seconds per measure
    const beatDuration = 60 / 100; // 0.6 seconds per beat
    const measureDuration = beatDuration * 6; // 3.6 seconds per measure
    
    const sequence = [
      { state: 'adding-node', duration: measureDuration },
      { state: 'connecting', duration: measureDuration },
      { state: 'editing-prompt', duration: measureDuration },
      { state: 'idle', duration: beatDuration * 2 }
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
            }, beatDuration * 3);
          }
          
          if (step.state === 'editing-prompt' && !isHovering) {
            setTimeout(() => {
              setShowPromptEditor(true);
              setTimeout(() => {
                if (isAnimating) setShowPromptEditor(false);
              }, beatDuration * 4);
            }, beatDuration);
          }
        }
      }, timeOffset);
      
      timeOffset += step.duration;
    });
    
    // Total animation duration: ~6 seconds (with a bit extra for freeze)
    const totalDuration = timeOffset + 1000; // Adding 1 second freeze at the end
    
    // Restart animation cycle
    animationTimer.current = setTimeout(() => {
      if (isAnimating) {
        // Reset connections for next cycle
        setConnections(prev => prev.map(conn => 
          conn.source === 'node2' && conn.target === 'node4' 
            ? { ...conn, active: false } 
            : conn
        ));
        setNodeAnimating(true); // Reset node animation state
        setTimeout(() => setNodeAnimating(false), 1500); // Turn off node animations after initial phase
        runAnimationSequence();
      }
    }, totalDuration);
    
  }, [isAnimating, isHovering]);

  // Start/stop animation on hover
  const handleContainerMouseEnter = () => {
    setIsHovering(true);
    setIsAnimating(false);
    setShowTryForFreeButton(true);
    setButtonAnimating(true);
    setTimeout(() => setButtonAnimating(false), 500);
    
    if (animationTimer.current) {
      clearTimeout(animationTimer.current);
    }
  };
  
  const handleContainerMouseLeave = () => {
    if (!isDragging.current) {
      setIsHovering(false);
      setIsAnimating(true);
      setShowTryForFreeButton(false);
      runAnimationSequence();
    }
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
    if (!isAnimating || isHovering) {
      e.preventDefault();
      isDragging.current = true;
      dragNode.current = nodeId;
      setActiveNode(nodeId);
      
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
      
      // Get node dimensions to ensure they stay completely within container bounds
      const nodeWidth = 100; // Approximate width of nodes
      const nodeHeight = 80; // Approximate height of nodes
      
      setNodePositions(prev => ({
        ...prev,
        [dragNode.current!]: { 
          x: Math.max(0, Math.min(containerRect.width - nodeWidth, newX)),
          y: Math.max(0, Math.min(containerRect.height - nodeHeight, newY))
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
    if (!isAnimating || isHovering) {
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
  
  // Get animation class based on node and state
  const getNodeAnimationClass = (nodeId: string) => {
    if (!nodeAnimating && !isHovering) return '';
    
    const delay = nodeId === 'node1' ? 0 : 
                 nodeId === 'node2' ? 0.2 : 
                 nodeId === 'node3' ? 0.4 : 0.6;
    
    return animationState === 'adding-node' ? 
      `transform transition-transform duration-500 delay-[${delay}s] scale-95 hover:scale-105` : '';
  };
  
  // Generate bezier curve paths for connections
  const getBezierPath = (source: NodePosition, target: NodePosition) => {
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    
    // Calculate control points for smooth curves
    const controlPointX1 = source.x + dx * 0.6;
    const controlPointY1 = source.y;
    const controlPointX2 = target.x - dx * 0.6;
    const controlPointY2 = target.y;
    
    return `M${source.x + 100},${source.y + 40} C${controlPointX1},${controlPointY1} ${controlPointX2},${controlPointY2} ${target.x},${target.y + 40}`;
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
          d={getBezierPath(
            { x: nodePositions.node1.x, y: nodePositions.node1.y }, 
            { x: nodePositions.node2.x, y: nodePositions.node2.y }
          )}
          className="transition-all duration-500 ease-in-out"
          stroke={activeNode === 'node1' || activeNode === 'node2' || animationState === 'connecting' ? "#9b87f5" : "rgba(255,255,255,0.3)"} 
          strokeWidth="2" 
          strokeDasharray={animationState === 'connecting' ? "5,5" : "none"}
          fill="none" 
          markerEnd="url(#arrowhead)"
        />
        
        {/* LLM to Validator */}
        <path 
          d={getBezierPath(
            { x: nodePositions.node2.x, y: nodePositions.node2.y }, 
            { x: nodePositions.node3.x, y: nodePositions.node3.y }
          )}
          className="transition-all duration-500 ease-in-out"
          stroke={activeNode === 'node2' || activeNode === 'node3' ? "#F97316" : "rgba(255,255,255,0.3)"} 
          strokeWidth="2" 
          fill="none" 
          markerEnd="url(#arrowhead)"
        />
        
        {/* LLM to API */}
        <path 
          d={getBezierPath(
            { x: nodePositions.node2.x, y: nodePositions.node2.y + 30 }, 
            { x: nodePositions.node4.x, y: nodePositions.node4.y - 10 }
          )}
          className={`transition-all duration-500 ease-in-out ${connections.find(c => c.source === 'node2' && c.target === 'node4')?.active ? 'opacity-100' : 'opacity-30'} ${animationState === 'connecting' ? 'animate-pulse-connection' : ''}`}
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
        className={`node-card absolute transition-all duration-500 ease-in-out bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-lg p-3 cursor-grab active:cursor-grabbing ${activeNode === 'node1' ? 'ring-2 ring-workbbench-purple' : ''} ${getNodeAnimationClass('node1')}`}
        style={{ 
          left: `${nodePositions.node1.x}px`, 
          top: `${nodePositions.node1.y}px`,
          width: '100px',
          opacity: animationState === 'adding-node' && nodeAnimating ? 0.5 : 1,
          transform: animationState === 'adding-node' && nodeAnimating ? 'scale(0.9)' : 'scale(1)'
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
        className={`node-card absolute transition-all duration-500 ease-in-out bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-primary/30 rounded-lg p-3 cursor-grab active:cursor-grabbing ${activeNode === 'node2' ? 'ring-2 ring-workbbench-purple' : ''} ${getNodeAnimationClass('node2')}`}
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
        className={`node-card absolute transition-all duration-500 ease-in-out bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-lg p-3 cursor-grab active:cursor-grabbing ${activeNode === 'node3' ? 'ring-2 ring-workbbench-purple' : ''} ${getNodeAnimationClass('node3')}`}
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
        className={`node-card absolute transition-all duration-500 ease-in-out bg-gradient-to-r from-blue-400/20 to-blue-600/20 border border-blue-400/30 rounded-lg p-3 cursor-grab active:cursor-grabbing ${activeNode === 'node4' ? 'ring-2 ring-workbbench-purple' : ''} ${getNodeAnimationClass('node4')}`}
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
      
      {/* Prompt Editor Panel - only show when user hovers or clicks LLM node */}
      {(showPromptEditor && (isHovering || !isAnimating)) && (
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
      <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm p-3 rounded-md border border-border/50 z-10">
        <TooltipProvider>
          <Tooltip open={showTooltip}>
            <TooltipTrigger asChild>
              {showTryForFreeButton ? (
                <Button 
                  onClick={handleConfigAction} 
                  size="sm" 
                  className={`bg-workbbench-purple hover:bg-workbbench-purple/90 ${buttonAnimating ? 'animate-[scale_0.5s_ease]' : ''}`}
                >
                  Try For Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <div className="min-w-32 text-base font-medium text-white">
                  {displayedMessage}
                  <span className="animate-pulse">|</span>
                </div>
              )}
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
