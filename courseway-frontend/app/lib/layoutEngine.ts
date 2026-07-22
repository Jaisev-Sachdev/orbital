import dagre from 'dagre';
import type { Node, Edge } from '@xyflow/react';

export const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  
  dagreGraph.setGraph({ rankdir: direction, nodesep: 80, ranksep: 100 });
  nodes.forEach((node) => {
    const isLogic = node.type === 'logicNode';
    const width = isLogic ? 100 : 160; 
    const height = isLogic ? 40 : 70;
    dagreGraph.setNode(node.id, { width: width, height: height }); 
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);


  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - 150 / 2, 
        y: nodeWithPosition.y - 60 / 2,  
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};