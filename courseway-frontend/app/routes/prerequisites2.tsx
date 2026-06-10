import React, { useState, useCallback } from 'react'
import { Search, Loader2, AlertCircle, ArrowLeft, Download, Plus, Minus, Target, Sparkles, GitGraph, ChevronRight } from 'lucide-react'
import api from '~/lib/api'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '~/components/ui/sidebar'
import { AppSidebar } from '~/components/app-sidebar' // Adjust import path if needed

// --- Mock Data for Graph ---
const NODES = [
  { id: "MA1521",  x: 0, y: 1, name: "Calculus for Computing",   state: "completed" },
  { id: "CS1101S", x: 0, y: 2, name: "Programming Methodology",  state: "completed" },
  { id: "MA1101R", x: 1, y: 0, name: "Linear Algebra I",          state: "completed" },
  { id: "CS1231S", x: 1, y: 2, name: "Discrete Structures",       state: "completed" },
  { id: "CS2030S", x: 1, y: 3, name: "Programming Methodology II",state: "completed" },
  { id: "ST2334",  x: 2, y: 0, name: "Probability & Statistics",  state: "completed" },
  { id: "CS2040S", x: 2, y: 2, name: "Data Structures & Algos",   state: "completed" },
  { id: "CS2100",  x: 2, y: 3, name: "Computer Organisation",     state: "eligible"  },
  { id: "CS3236",  x: 3, y: 1, name: "Info Theory",               state: "locked"   },
  { id: "CS3210",  x: 3, y: 3, name: "Parallel Computing",        state: "locked"   },
  { id: "CS3230",  x: 4, y: 2, name: "Design & Analysis of Algorithms", state: "eligible", target: true },
]

const EDGES = [
  ["MA1521", "MA1101R"], ["MA1101R","ST2334"], ["CS1101S","CS1231S"],
  ["CS1101S","CS2030S"], ["CS1231S","CS2040S"], ["CS2030S","CS2040S"],
  ["CS2030S","CS2100"],  ["CS2040S","CS3230"],  ["CS1231S","CS3230"],
  ["ST2334", "CS3230"],
  ["CS2040S","CS3236",  "locked"], ["CS2100", "CS3210",  "locked"],
  ["CS3236", "CS3230",  "optional"],
]

export default function PrerequisitesPage() {
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchHistory, setSearchHistory] = useState<string[]>(['CS3230', 'CS2040S', 'MA1521'])

  // Functional lookup (kept from File 1, but keeps mock data visible for now)
  const lookup = useCallback(async (code: string) => {
    const normalized = code.trim().toUpperCase()
    if (!normalized) return
    setIsLoading(true)
    setError('')
    setQuery(normalized)
    
    // Simulating API load for the visualization
    setTimeout(() => {
      setIsLoading(false)
      setSearchHistory(prev => {
        const updated = [normalized, ...prev.filter(c => c !== normalized)]
        return updated.slice(0, 8)
      })
    }, 600)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    lookup(query)
  }

  return (
    <SidebarProvider>
      {/* Assuming user is logged in for the sidebar profile to show */}
      <AppSidebar isLoggedIn={true} />
      
      <SidebarInset 
        className="flex flex-col h-screen overflow-hidden w-full"
        style={{ backgroundColor: 'var(--cw-navy)', color: 'var(--cw-white)' }}
      >
        
        {/* ── Top Header & Search ── */}
        <div className="px-6 py-5 shrink-0" style={{ borderBottom: '1px solid var(--cw-navy-border)' }}>
          <div className="flex items-center gap-4 mb-4">
            <SidebarTrigger className="text-white hover:bg-white/10" />
            <h1 className="text-2xl font-bold">Prerequisite Explorer</h1>
          </div>

          <form onSubmit={handleSubmit} className="flex gap-3 max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'rgba(240,244,255,0.4)' }} />
              <Input
                value={query}
                onChange={e => setQuery(e.target.value.toUpperCase())}
                placeholder="Search a module... e.g. CS3230"
                className="pl-9 font-mono text-base h-10"
                style={{ backgroundColor: 'var(--cw-navy-light)', borderColor: 'var(--cw-navy-border)', color: 'var(--cw-white)' }}
              />
            </div>
            <Button type="submit" disabled={isLoading || !query.trim()} style={{ backgroundColor: 'var(--cw-teal)', color: 'var(--cw-navy)', fontWeight: 600 }}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Visualize'}
            </Button>
          </form>

          {/* Recent searches */}
          <div className="flex items-center gap-2 flex-wrap mt-3">
            <span className="text-xs" style={{ color: 'rgba(240,244,255,0.4)' }}>Recent:</span>
            {searchHistory.map(code => (
              <button
                key={code}
                onClick={() => lookup(code)}
                className="text-xs cursor-pointer rounded px-2 py-1 transition-colors hover:bg-white/10"
                style={{ color: 'var(--cw-teal)', border: '1px solid rgba(0, 201, 167, 0.3)' }}
              >
                {code}
              </button>
            ))}
          </div>
        </div>

        {/* ── Sub-header for Target Module ── */}
        <div className="px-6 py-3 flex items-center justify-between shrink-0" style={{ backgroundColor: 'var(--cw-navy-light)', borderBottom: '1px solid var(--cw-navy-border)' }}>
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-xl font-bold" style={{ color: 'var(--cw-teal)' }}>CS3230</span>
                <span className="text-lg font-bold">Design & Analysis of Algorithms</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wider" style={{ backgroundColor: 'rgba(255, 179, 71, 0.15)', color: '#FFB347', border: '1px solid rgba(255, 179, 71, 0.4)' }}>
                  TARGET
                </span>
              </div>
              <div className="text-xs mt-1" style={{ color: 'rgba(240,244,255,0.5)' }}>Showing full prerequisite tree · 11 modules · 4 levels deep</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Toggle />
            <Button variant="outline" size="sm" className="flex items-center gap-2 border-transparent bg-white/5 hover:bg-white/10 text-white">
              <Download size={14} /> Export
            </Button>
          </div>
        </div>

        {/* ── Graph & Detail Split ── */}
        <div className="flex-1 grid grid-rows-[1fr_280px] min-h-0 relative">
          {isLoading && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-[var(--cw-navy)]/80 backdrop-blur-sm">
               <Loader2 className="h-8 w-8 animate-spin" style={{ color: 'var(--cw-teal)' }} />
            </div>
          )}
          <GraphCanvas />
          <DetailPanel />
        </div>

      </SidebarInset>
    </SidebarProvider>
  )
}

function Toggle() {
  const [mode, setMode] = useState("full")
  return (
    <div className="inline-flex p-1 rounded-full" style={{ backgroundColor: 'var(--cw-navy)', border: '1px solid var(--cw-navy-border)' }}>
      {[{ id: "mine", label: "My modules only" }, { id: "full", label: "Full tree" }].map(o => (
        <button key={o.id} onClick={() => setMode(o.id)} 
          className={`h-7 px-3 rounded-full text-xs font-semibold transition-colors ${
            mode === o.id ? "shadow-sm text-[var(--cw-navy)]" : "bg-transparent hover:text-white"
          }`}
          style={{ backgroundColor: mode === o.id ? 'var(--cw-teal)' : 'transparent', color: mode === o.id ? 'var(--cw-navy)' : 'rgba(240,244,255,0.5)' }}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ===================== GRAPH (Dark Theme) ===================== */
function GraphCanvas() {
  const cols = 5, rows = 4
  const W = 1400, H = 540
  const padX = 70, padY = 60
  const stepX = (W - padX * 2) / (cols - 1)
  const stepY = (H - padY * 2) / (rows - 1)
  const pos = (n: any) => ({ cx: padX + n.x * stepX, cy: padY + n.y * stepY })
  const NODE_W = 150, NODE_H = 56

  return (
    <div className="relative overflow-hidden" style={{ backgroundColor: 'var(--cw-navy)' }}>
      {/* Background Dots */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '20px 20px' }}></div>

      <div className="absolute top-4 left-4 z-10 flex gap-2"><Legend2 /></div>
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-1 p-1 rounded-lg" style={{ backgroundColor: 'var(--cw-navy-light)', border: '1px solid var(--cw-navy-border)' }}>
        <button className="p-1.5 hover:bg-white/10 rounded text-white/70"><Plus size={16} /></button>
        <button className="p-1.5 hover:bg-white/10 rounded text-white/70"><Minus size={16} /></button>
        <button className="p-1.5 hover:bg-white/10 rounded text-white/70"><Target size={16} /></button>
      </div>

      {/* Level labels */}
      <div className="absolute inset-0 pointer-events-none">
        {["Roots", "Year 1 S2", "Year 2 S1", "Year 2 S2", "Target"].map((lbl, i) => (
          <div key={i} className="absolute top-4 text-[10px] font-bold tracking-widest uppercase transform -translate-x-1/2" style={{ left: padX + i * stepX, color: 'rgba(240,244,255,0.3)' }}>
            {lbl}
          </div>
        ))}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <marker id="ar-active" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0 0 L10 5 L0 10 z" fill="#00C9A7" />
          </marker>
          <marker id="ar-locked" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0 0 L10 5 L0 10 z" fill="rgba(240,244,255,0.2)" />
          </marker>
        </defs>

        {/* Edges */}
        {EDGES.map(([a, b, kind], i) => {
          const A = NODES.find(n => n.id === a)
          const B = NODES.find(n => n.id === b)
          if (!A || !B) return null
          const p1 = pos(A), p2 = pos(B)
          const mx = (p1.cx + NODE_W / 2 + p2.cx - NODE_W / 2) / 2
          const d = `M ${p1.cx + NODE_W / 2} ${p1.cy} C ${mx} ${p1.cy} ${mx} ${p2.cy} ${p2.cx - NODE_W / 2} ${p2.cy}`
          const locked = kind === "locked"
          const optional = kind === "optional"
          return (
            <path key={i} d={d} fill="none"
              stroke={locked ? "rgba(240,244,255,0.2)" : "#00C9A7"}
              strokeWidth={optional ? 1 : 1.5}
              strokeDasharray={locked || optional ? "5 4" : "0"}
              opacity={locked ? 0.7 : optional ? 0.5 : 0.9}
              markerEnd={`url(#${locked ? "ar-locked" : "ar-active"})`} />
          )
        })}

        {/* Nodes */}
        {NODES.map(n => {
          const { cx, cy } = pos(n)
          return <GraphNode key={n.id} node={n} cx={cx} cy={cy} w={NODE_W} h={NODE_H} />
        })}
      </svg>
    </div>
  )
}

function GraphNode({ node, cx, cy, w, h }: any) {
  const x = cx - w / 2, y = cy - h / 2
  const isTarget = node.target
  const isCompleted = node.state === "completed"
  const isEligible = node.state === "eligible"
  const isLocked = node.state === "locked"

  const fill = isCompleted ? "rgba(0, 201, 167, 0.15)" : isLocked ? "rgba(240, 244, 255, 0.03)" : "rgba(240, 244, 255, 0.08)"
  const stroke = isTarget ? "#FFB347" : isCompleted ? "#00C9A7" : isEligible ? "#00C9A7" : "rgba(240, 244, 255, 0.15)"
  const dash = isLocked ? "5 4" : "0"
  const sw = isTarget ? 2.5 : 1.5

  const codeColor = isLocked ? "rgba(240, 244, 255, 0.4)" : "#00C9A7"
  const nameColor = isLocked ? "rgba(240, 244, 255, 0.4)" : "rgba(240, 244, 255, 0.8)"

  return (
    <g>
      {isTarget && <rect x={x - 5} y={y - 5} width={w + 10} height={h + 10} rx={12} fill="none" stroke="#FFB347" strokeWidth="2" strokeOpacity="0.3" />}
      <rect x={x} y={y} width={w} height={h} rx={8} fill={fill} stroke={stroke} strokeWidth={sw} strokeDasharray={dash} />
      <text x={cx} y={cy - 6} fontFamily="monospace" fontSize="14" fontWeight="700" fill={codeColor} textAnchor="middle">{node.id}</text>
      <text x={cx} y={cy + 12} fontSize="10" fontWeight="500" fill={nameColor} textAnchor="middle">
        {node.name.length > 22 ? node.name.slice(0, 21) + "…" : node.name}
      </text>
    </g>
  )
}

function Legend2() {
  return (
    <div className="flex gap-4 px-3 py-2 rounded-full text-xs shadow-sm" style={{ backgroundColor: 'var(--cw-navy-light)', border: '1px solid var(--cw-navy-border)', color: 'rgba(240,244,255,0.6)' }}>
      <span className="flex items-center gap-1.5"><span className="w-4 h-2.5 rounded-sm" style={{ backgroundColor: 'rgba(0, 201, 167, 0.4)', border: '1px solid #00C9A7' }} /> Completed</span>
      <span className="flex items-center gap-1.5"><span className="w-4 h-2.5 rounded-sm" style={{ backgroundColor: 'transparent', border: '1.5px solid #00C9A7' }} /> Eligible</span>
      <span className="flex items-center gap-1.5"><span className="w-4 h-2.5 rounded-sm" style={{ backgroundColor: 'rgba(240,244,255,0.05)', border: '1.5px dashed rgba(240,244,255,0.3)' }} /> Locked</span>
      <span className="flex items-center gap-1.5"><span className="w-4 h-2.5 rounded-sm" style={{ backgroundColor: 'transparent', border: '2px solid #FFB347' }} /> Target</span>
    </div>
  )
}

/* ===================== DETAIL PANEL (Dark Theme) ===================== */
function DetailPanel() {
  return (
    <div className="p-6 overflow-y-auto shrink-0" style={{ backgroundColor: 'var(--cw-navy-light)', borderTop: '1px solid var(--cw-navy-border)' }}>
      <div className="grid grid-cols-[1.4fr_1fr] gap-8 max-w-6xl mx-auto">
        
        {/* Left — Module info */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="font-mono text-2xl font-bold" style={{ color: 'var(--cw-teal)' }}>CS3230</span>
            <span className="text-xl font-bold">Design & Analysis of Algorithms</span>
          </div>
          <div className="flex flex-wrap gap-6 text-sm mb-4" style={{ color: 'rgba(240,244,255,0.6)' }}>
            <Meta label="MCs" value="4 MC" />
            <Meta label="Department" value="School of Computing" />
            <Meta label="Offered" value="Sem 1 · Sem 2" />
            <Meta label="Workload" value="3·1·0·3·3" mono />
          </div>

          <div className="text-[11px] font-bold tracking-widest uppercase mb-2" style={{ color: 'rgba(240,244,255,0.4)' }}>Direct prerequisites</div>
          <div className="flex flex-wrap gap-2 mb-6">
            {["CS2040S", "CS1231S", "ST2334", "MA1101R"].map(code => (
               <span key={code} className="text-xs px-2 py-1 rounded-md font-medium font-mono" style={{ backgroundColor: 'var(--cw-teal-glow)', color: 'var(--cw-teal)', border: '1px solid rgba(0, 201, 167, 0.3)' }}>
                 {code}
               </span>
            ))}
            <span className="text-xs px-1 self-center font-medium" style={{ color: 'var(--cw-teal)' }}>· all met ✓</span>
          </div>

          <div className="flex gap-3">
            <Button size="sm" className="flex items-center gap-2" style={{ backgroundColor: 'var(--cw-teal)', color: 'var(--cw-navy)', fontWeight: 600 }}>
              <Plus size={16} /> Add to plan
            </Button>
            <Button variant="outline" size="sm" className="flex items-center gap-2 bg-transparent hover:bg-white/5" style={{ borderColor: 'var(--cw-navy-border)', color: 'var(--cw-white)' }}>
              <GitGraph size={16} /> Explore prerequisites
            </Button>
          </div>
        </div>

        {/* Right — AI rationale */}
        <div className="rounded-lg p-5 self-start" style={{ backgroundColor: 'rgba(0, 201, 167, 0.05)', border: '1px solid rgba(0, 201, 167, 0.2)' }}>
          <div className="flex items-center gap-2 font-semibold mb-3 text-sm" style={{ color: 'var(--cw-teal)' }}>
            <Sparkles size={16} /> Why take this?
          </div>
          <div className="text-sm leading-relaxed" style={{ color: 'rgba(240,244,255,0.8)' }}>
            CS3230 anchors your <span className="font-semibold" style={{ color: 'var(--cw-teal)' }}>AI/ML focus</span> — it's a prerequisite for CS4248 (NLP) and CS4243 (CV). All four prerequisites are completed, and it's offered Sem 2. <span style={{ color: 'rgba(240,244,255,0.4)' }}>Pair it with CS3244 for a focused theory-and-application semester.</span>
          </div>
        </div>
        
      </div>
    </div>
  )
}

function Meta({ label, value, mono }: { label: string, value: string, mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: 'rgba(240,244,255,0.4)' }}>{label}</span>
      <span className={`text-sm font-semibold ${mono ? "font-mono" : ""}`} style={{ color: 'var(--cw-white)' }}>{value}</span>
    </div>
  )
}