// SemesterCard.tsx
import { useState, useEffect, useRef } from "react"
import { X, Plus, Search, Loader2 } from "lucide-react"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "~/components/ui/card"
import api from "~/lib/api"

interface Module {
  moduleCode: string
  title:      string
  credits:    number
}

interface ModuleSearchResult {
  moduleCode: string
  title:      string
  credits:    number
}

interface SemesterCardProps {
  year:     number
  semester: number
  modules:  Module[]
  allModules: string[]          // every code already placed anywhere in the plan
  onAdd:    (module: Module) => void
  onRemove: (moduleCode: string) => void
}

const MAX_MC = 24

export function SemesterCard({
  year, semester, modules, allModules, onAdd, onRemove,
}: SemesterCardProps) {
  const [searchOpen, setSearchOpen]     = useState(false)
  const [moduleSearch, setModuleSearch] = useState("")
  const [searchResults, setSearchResults] = useState<ModuleSearchResult[]>([])
  const [isSearching, setIsSearching]   = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const totalMC = modules.reduce((sum, m) => sum + m.credits, 0)
  const pct     = Math.min((totalMC / MAX_MC) * 100, 100)
  const isOver  = totalMC > MAX_MC

  // same debounced search as onboarding
  useEffect(() => {
    if (moduleSearch.length < 2) {
      setSearchResults([])
      return
    }
    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const { data } = await api.get(`/modules?search=${moduleSearch}`)
        // filter out modules already placed anywhere in the plan
        const available = (data.modules || []).filter(
          (m: ModuleSearchResult) => !allModules.includes(m.moduleCode)
        )
        setSearchResults(available)
      } catch {
        // silently fail
      } finally {
        setIsSearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [moduleSearch, allModules])

  // close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false)
        setModuleSearch("")
        setSearchResults([])
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const handleAdd = (mod: ModuleSearchResult) => {
    onAdd(mod)
    setModuleSearch("")
    setSearchResults([])
    setSearchOpen(false)
  }

  return (
    <Card style={{
      backgroundColor: "var(--cw-navy-light)",
      borderColor:     "var(--cw-navy-border)",
      borderRadius:    16,
    }}>

      {/* ── Header ── */}
      <CardHeader style={{
        display:        "flex",
        flexDirection:  "row",
        alignItems:     "center",
        justifyContent: "space-between",
        padding:        "14px 16px",
        borderBottom:   "1px solid var(--cw-navy-border)",
      }}>
        <span style={{
          fontSize:      "13px",
          fontWeight:    700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color:         "var(--cw-white)",
        }}>
          Year {year} · Sem {semester}
        </span>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSearchOpen(prev => !prev)}
          style={{
            background:   "var(--cw-teal-glow)",
            border:       "1px solid rgba(0,201,167,0.3)",
            color:        "var(--cw-teal)",
            borderRadius: 999,
            fontSize:     "11px",
            fontWeight:   600,
            height:       "28px",
            padding:      "0 10px",
            gap:          4,
          }}
        >
          <Plus size={12} /> Add module
        </Button>
      </CardHeader>

      {/* ── Search dropdown ── */}
      {searchOpen && (
        <div ref={searchRef} style={{ padding: "10px 14px", borderBottom: "1px solid var(--cw-navy-border)" }}>
          <div style={{ position: "relative" }}>
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
              style={{ color: "rgba(240,244,255,0.35)" }}
            />
            <Input
              autoFocus
              value={moduleSearch}
              onChange={e => setModuleSearch(e.target.value)}
              placeholder="Search module code or name…"
              className="pl-9"
              style={{
                backgroundColor: "var(--cw-navy)",
                borderColor:     "var(--cw-navy-border)",
                color:           "var(--cw-white)",
              }}
            />
            {isSearching && (
              <Loader2
                className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin"
                style={{ color: "var(--cw-teal)" }}
              />
            )}
          </div>

          {/* Results */}
          {searchResults.length > 0 && (
            <div style={{
              marginTop:    8,
              borderRadius: 10,
              overflow:     "hidden",
              border:       "1px solid var(--cw-navy-border)",
            }}>
              {searchResults.slice(0, 6).map(mod => (
                <div
                  key={mod.moduleCode}
                  onClick={() => handleAdd(mod)}
                  style={{
                    display:       "flex",
                    alignItems:    "center",
                    gap:           10,
                    padding:       "10px 12px",
                    cursor:        "pointer",
                    borderBottom:  "1px solid var(--cw-navy-border)",
                    background:    "var(--cw-navy)",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--cw-navy-light)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "var(--cw-navy)")}
                >
                  <span style={{
                    fontFamily:   "'JetBrains Mono', monospace",
                    fontSize:     "11px",
                    fontWeight:   700,
                    color:        "var(--cw-teal)",
                    background:   "var(--cw-teal-glow)",
                    border:       "1px solid rgba(0,201,167,0.3)",
                    padding:      "2px 7px",
                    borderRadius: 5,
                    flexShrink:   0,
                  }}>
                    {mod.moduleCode}
                  </span>
                  <span style={{ flex: 1, fontSize: "12px", color: "rgba(240,244,255,0.8)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {mod.title}
                  </span>
                  <span style={{ fontSize: "11px", color: "rgba(240,244,255,0.35)", flexShrink: 0 }}>
                    {mod.credits} MC
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* No results state */}
          {moduleSearch.length >= 2 && !isSearching && searchResults.length === 0 && (
            <p style={{ fontSize: "12px", color: "rgba(240,244,255,0.3)", textAlign: "center", padding: "12px 0 4px" }}>
              No modules found
            </p>
          )}
        </div>
      )}

      {/* ── Module list ── */}
      <CardContent style={{
        padding:       "12px 14px",
        display:       "flex",
        flexDirection: "column",
        gap:           8,
        minHeight:     80,
      }}>
        {modules.length === 0 ? (
          <div style={{
            border:       "1.5px dashed var(--cw-navy-border)",
            borderRadius: 10,
            padding:      "20px",
            textAlign:    "center",
            fontSize:     "12px",
            color:        "rgba(240,244,255,0.25)",
          }}>
            + Add module
          </div>
        ) : (
          modules.map(mod => (
            <div key={mod.moduleCode} style={{
              display:      "flex",
              alignItems:   "center",
              gap:          10,
              background:   "var(--cw-navy)",
              border:       "1px solid var(--cw-navy-border)",
              borderRadius: 10,
              padding:      "9px 12px",
            }}>
              <span style={{
                fontFamily:   "'JetBrains Mono', monospace",
                fontSize:     "11px",
                fontWeight:   700,
                color:        "var(--cw-teal)",
                background:   "var(--cw-teal-glow)",
                border:       "1px solid rgba(0,201,167,0.3)",
                padding:      "2px 7px",
                borderRadius: 5,
                flexShrink:   0,
              }}>
                {mod.moduleCode}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: "11.5px", fontWeight: 500, color: "var(--cw-white)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>
                  {mod.title}
                </p>
                <p style={{ fontSize: "10.5px", color: "rgba(240,244,255,0.5)", margin: 0 }}>
                  {mod.credits} MCs
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onRemove(mod.moduleCode)}
                aria-label={`Remove ${mod.moduleCode}`}
                style={{ width: "22px", height: "22px", color: "rgba(240,244,255,0.25)", borderRadius: 6, flexShrink: 0 }}
                className="hover:text-red-400 hover:bg-red-500/10"
              >
                <X size={13} />
              </Button>
            </div>
          ))
        )}
      </CardContent>

      {/* ── Footer MC counter ── */}
      <CardFooter style={{
        display:    "flex",
        alignItems: "center",
        gap:        12,
        padding:    "10px 16px",
        borderTop:  "1px solid var(--cw-navy-border)",
      }}>
        <span style={{ fontSize: "11px", fontWeight: 600, letterSpacing: "0.04em", color: "rgba(240,244,255,0.25)", textTransform: "uppercase" }}>
          Total
        </span>
        <div style={{ flex: 1, height: 3, background: "var(--cw-navy-border)", borderRadius: 99, overflow: "hidden" }}>
          <div style={{
            height: "100%", width: `${pct}%`,
            background: isOver ? "#FF4D4F" : "var(--cw-teal)",
            borderRadius: 99, transition: "width 0.3s ease",
          }} />
        </div>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "13px", fontWeight: 700, color: isOver ? "#FF4D4F" : "var(--cw-teal)" }}>
          {totalMC} MCs
        </span>
      </CardFooter>
    </Card>
  )
}