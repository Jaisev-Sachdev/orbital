import { Handle, Position } from '@xyflow/react';
import { Waypoints, AlertCircle } from 'lucide-react';

export const LogicGraphNode = ({ data }: { data: { label: string, n?: number, text?: string } }) => {
  let displayLabel = '';
  let Icon = Waypoints; 

  if (data.label === 'AND') {
    displayLabel = 'ALL OF';
  } else if (data.label === 'OR') {
    displayLabel = 'ANY OF';
  } else if (data.label === 'N_OF') {
    displayLabel = `${data.n || 1} OF`;
  } else if (data.label === 'PROGRAMME') {
    displayLabel = 'PROGRAMME REQ';
    Icon = AlertCircle; 
  } else if (data.label === 'OTHER') {
    displayLabel = data.text ? data.text : 'OTHER REQ';
    Icon = AlertCircle;
  } else {
    displayLabel = data.label; 
  }

  return (
    <div className="px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-[var(--cw-navy-border)] bg-[rgba(10,22,40,0.04)] shadow-md max-w-[150px]">
      <Handle type="target" position={Position.Top} className="!opacity-0" />
      
      <Icon className="h-3 w-3 text-slate-500 shrink-0" />
      <span className="text-[10px] font-bold tracking-wider text-slate-500 truncate">
        {displayLabel}
      </span>

      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
    </div>
  );
};