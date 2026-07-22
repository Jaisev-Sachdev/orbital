import type { TreeNode } from '~/types';
import type { Node, Edge } from '@xyflow/react';

export const mapTreeToGraph = (rootNode: TreeNode, expandedNodes: Set<string>) => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  let idCounter = 0;

  const traverse = (node: TreeNode, parentId?: string, depth = 0): string | null => {
    
    // 1. INVISIBLE FILTER: Skip rendering specific text nodes
    if (node.type === 'OTHER' && node.text?.toLowerCase().includes('must have completed')) {
      return null;
    }

    const isLogicNode = node.type === 'AND' || node.type === 'OR' || node.type === 'N_OF';

    // Figure out how many *actual* children this node will have after filtering
    const validChildren = node.children?.filter(child => 
      !(child.type === 'OTHER' && child.text?.toLowerCase().includes('must have completed'))
    ) || [];

    // 2. PRUNE REDUNDANT LOGIC NODES
    if (isLogicNode) {
      if (validChildren.length === 0) {
        // Drop empty logic nodes completely
        return null; 
      }
      if (validChildren.length === 1) {
        // If there's only 1 option, the "OR/AND" is redundant.
        // Bypass this node entirely and connect the parent directly to the child!
        return traverse(validChildren[0], parentId, depth);
      }
    }

    // --- NORMAL NODE CREATION PROCEEDS BELOW ---
    const nodeId = `node-${idCounter++}`;
    
    // Check if this node has children that we might need to hide
    const hasChildren = !!(validChildren.length || node.prerequisiteTree);
    
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
        text: node.text, 
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
    
    const shouldExpand = depth < 2 || expandedNodes.has(nodeId) || isLogicNode;

    // Recurse into children
    if (shouldExpand && hasChildren) {
      if (validChildren.length > 0) {
        // Use the validChildren array we already calculated!
        validChildren.forEach((child: TreeNode) => traverse(child, nodeId, depth + 1));
      } else if (node.prerequisiteTree) {
        traverse(node.prerequisiteTree, nodeId, depth + 1);
      }
    }

    return nodeId;
  };

  traverse(rootNode);
  return { nodes, edges };
};