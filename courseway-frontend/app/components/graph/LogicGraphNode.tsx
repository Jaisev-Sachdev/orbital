import { Handle, Position } from '@xyflow/react';
import { Waypoints, AlertCircle } from 'lucide-react';

export const LogicGraphNode = ({ data }: { data: { label: string, n?: number, text?: string } }) => {
  let displayLabel = '';
  let Icon = Waypoints; // Default icon

  // Safely handle all 5 possible non-module node types from the backend
  if (data.label === 'AND') {
    displayLabel = 'ALL OF';
  } else if (data.label === 'OR') {
    displayLabel = 'ANY OF';
  } else if (data.label === 'N_OF') {
    displayLabel = `${data.n || 1} OF`;
  } else if (data.label === 'PROGRAMME') {
    displayLabel = 'PROGRAMME REQ';
    Icon = AlertCircle; // Different icon for rules
  } else if (data.label === 'OTHER') {
    // If the mapper passes the raw text, show a snippet of it!
    displayLabel = data.text ? data.text : 'OTHER REQ';
    Icon = AlertCircle;
  } else {
    displayLabel = data.label; 
  }

  return (
    <div className="px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-[var(--cw-navy-border)] bg-[rgba(240,244,255,0.05)] shadow-md max-w-[150px]">
      <Handle type="target" position={Position.Top} className="!opacity-0" />
      
      <Icon className="h-3 w-3 text-white/60 shrink-0" />
      <span className="text-[10px] font-bold tracking-wider text-white/60 truncate">
        {displayLabel}
      </span>

      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
    </div>
  );
};