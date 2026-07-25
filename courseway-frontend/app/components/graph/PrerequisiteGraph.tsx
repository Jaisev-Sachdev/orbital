import { ReactFlow, Controls, Background, useNodesState, useEdgesState } from '@xyflow/react';
import type { Node } from '@xyflow/react'; // <-- Imported the correct Node type!
import '@xyflow/react/dist/style.css';
import { useState, useEffect } from 'react'; // <-- Added useState here
import { ModuleGraphNode } from '~/components/graph/ModuleGraphNode';
import { LogicGraphNode } from '~/components/graph/LogicGraphNode';
import { mapTreeToGraph } from '~/lib/graphMapper';
import { getLayoutedElements } from '~/lib/layoutEngine';
import type { TreeResponse } from '~/types';

// <-- Added the nodeTypes mapping here
const nodeTypes = {
  moduleNode: ModuleGraphNode,
  logicNode: LogicGraphNode,
};

export default function PrerequisiteGraph({ treeResult }: { treeResult: TreeResponse | null }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (treeResult?.prerequisiteTree) {
      const { nodes: initialNodes, edges: initialEdges } = mapTreeToGraph(treeResult.prerequisiteTree, expandedNodes);
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(initialNodes, initialEdges);
      
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    }
  }, [treeResult, expandedNodes]);

  const handleNodeClick = (event: React.MouseEvent, node: Node) => {
    if (node.data?.isCollapsed || expandedNodes.has(node.id)) {
      setExpandedNodes((prev: Set<string>) => {
        const next = new Set(prev);
        if (next.has(node.id)) {
          next.delete(node.id); 
        } else {
          next.add(node.id);    
        }
        return next;
      });
    }
  };

  return (
    <div style={{ width: '100%', height: '600px' }} className="rounded-xl border border-[var(--cw-navy-border)] overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick} 
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        proOptions={{ hideAttribution: true }}
        fitView
      >
        <Background color="rgba(240,244,255,0.1)" gap={16} />
        <Controls className="!bg-[var(--cw-navy)] !border-[var(--cw-navy-border)] !fill-white" showInteractive={false} />
      </ReactFlow>
    </div>
  );
}