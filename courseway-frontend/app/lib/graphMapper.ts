import type { TreeNode } from '~/types';
import type { Node, Edge } from '@xyflow/react';

export const mapTreeToGraph = (rootNode: TreeNode, expandedNodes: Set<string>) => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  let idCounter = 0;

  const traverse = (node: TreeNode, parentId?: string, depth = 0): string => {
    const nodeId = `node-${idCounter++}`;
    
    // Check if this node has children that we might need to hide
    const hasChildren = !!(node.children?.length || node.prerequisiteTree);
    
    // Create the Node
    nodes.push({
      id: nodeId,
      type: node.type === 'MODULE' ? 'moduleNode' : 'logicNode',
      position: { x: 0, y: 0 },
      data: { 
        label: node.type,
        code: node.code,
        title: node.title,
        n: node.n,
        text: node.text, // <-- ADD THIS LINE!
        isCollapsed: hasChildren && depth >= 2 && !expandedNodes.has(nodeId)
      },
    });

    // Create the Edge
    if (parentId) {
      edges.push({
        id: `edge-${parentId}-${nodeId}`,
        source: parentId,
        target: nodeId,
        type: 'default',
        animated: true,
        style: { stroke: 'rgba(0, 201, 167, 0.5)', strokeWidth: 2 }
      });
    }
    
    const isLogicNode = node.type === 'AND' || node.type === 'OR' || node.type === 'N_OF';
    const shouldExpand = depth < 2 || expandedNodes.has(nodeId) || isLogicNode;

    if (shouldExpand && hasChildren) {
      if (node.children) {
        node.children.forEach((child: TreeNode) => traverse(child, nodeId, depth + 1));
      } else if (node.prerequisiteTree) {
        traverse(node.prerequisiteTree, nodeId, depth + 1);
      }
    }

    return nodeId;
  };

  traverse(rootNode);
  return { nodes, edges };
};