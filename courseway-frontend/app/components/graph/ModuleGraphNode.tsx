import { Handle, Position } from '@xyflow/react';
import { BookOpen } from 'lucide-react';

export const ModuleGraphNode = ({ data }: { data: { code: string, title?: string } }) => {
  return (
    <div className="px-4 py-2 rounded-lg bg-[var(--cw-navy-light)] border border-[var(--cw-navy-border)] shadow-lg min-w-[120px]">
      <Handle type="target" position={Position.Top} className="!opacity-0" />
      
      <div className="flex flex-col items-center">
        <span className="font-bold text-[var(--cw-teal)]">{data.code}</span>
        {data.title && (
          <span className="text-xs text-slate-500 text-center truncate w-full mt-1">
            {data.title}
          </span>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!opacity-0"  />
    </div>
  );
};