import React from 'react';
import { Trash2, Plus } from 'lucide-react';

export interface Module {
  id?: string;
  moduleCode: string;
  title: string;
  credits: number;
}

interface SemesterCardProps {
  year: number;
  semester: number;
  modules?: Module[]; // Using ? to make it optional, though we default to [] below
  allModules?: string[];
  onOpenSearch: (year: number, semester: number) => void; // Changed from onAdd
  onRemove: (moduleCode: string) => void;
}

export default function SemesterCard({ 
  year, 
  semester, 
  modules = [], 
  allModules = [], 
  onOpenSearch, // Use the new prop here
  onRemove 
}: SemesterCardProps) {
  
  const semesterTitle = `Year ${year} Semester ${semester}`;
  const totalCredits = modules.reduce((acc, mod) => acc + (mod.credits || 4), 0);

  return (
    <div className="rounded-xl border border-[var(--cw-navy-border)] bg-[var(--cw-navy-light)] text-white shadow-sm flex flex-col h-full">
      
      {/* Card Header */}
      <div className="flex flex-col space-y-1.5 p-6 pb-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold leading-none tracking-tight text-lg">
            {semesterTitle}
          </h3>
          <span className="text-xs font-medium text-slate-400 bg-transparent border border-[var(--cw-navy-border)] px-2.5 py-1 rounded-md">
            {totalCredits}/{24} MCs
          </span>
        </div>
      </div>

      {/* Card Content (Modules List) */}
      <div className="p-6 pt-0 flex flex-col gap-3 flex-grow">
        {modules.length === 0 ? (
          <div className="text-sm text-slate-400 flex items-center justify-center py-6 border-2 border-dashed border-[var(--cw-navy-border)] rounded-lg bg-[var(--cw-navy)]/50">
            Empty Semester
          </div>
        ) : (
          modules.map((mod) => (
            <div 
              key={mod.id || mod.moduleCode} 
              className="flex items-center justify-between p-3 rounded-lg border border-[var(--cw-navy-border)] bg-[var(--cw-navy)] hover:border-slate-500 transition-all group"
            >
              <div className="flex flex-col">
                <span className="font-semibold text-sm text-white">
                  {mod.moduleCode}
                </span>
                <span className="text-xs text-slate-400 truncate w-48">
                  {mod.title}
                </span>
              </div>
              
              <button
                onClick={() => onRemove(mod.moduleCode)}
                className="text-slate-400 hover:text-red-400 p-1.5 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                title="Remove module"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        )}

        {/* Add Module Action */}
        <button
          onClick={() => onOpenSearch(year, semester)} // Triggers the modal in the parent
          className="mt-auto flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--cw-navy-border)] p-3 text-sm font-medium text-slate-500 hover:border-slate-600 hover:text-slate-300 transition-all"
        >
          <Plus size={16} />
          Add Module
        </button>
      </div>
    </div>
  );
}