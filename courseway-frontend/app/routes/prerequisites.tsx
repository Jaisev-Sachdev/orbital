/**
 * Prerequisites page  —  /prerequisites
 *
 * What it does:
 * 1. User types a module code (e.g. CS2040S)
 * 2. Hits the backend GET /modules/:code/prerequisites/tree?depth=3 endpoint
 * 3. Shows the module title and a nested prerequisite tree recursively resolving
 * subtrees (AND/OR/N_OF logic).
 *
 * No auth required for this endpoint, so no ProtectedRoute needed.
 */

import { useState, useCallback, useEffect } from 'react'
import { Search, ChevronRight, ChevronDown, AlertCircle, BookOpen, Loader2, ArrowRight, Waypoints } from 'lucide-react'
import api from '~/lib/api'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { AppSidebar } from "~/components/app-sidebar"
import { SiteHeader } from "~/components/site-header"
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar"
import { TooltipProvider } from "~/components/ui/tooltip"
import type { TreeNode, TreeResponse } from '~/types'
import PrerequisiteGraph  from '~/components/graph/PrerequisiteGraph';
// ─── Types ────────────────────────────────────────────────────────────────────

interface ModuleDetail {
  moduleCode: string
  title: string
  credits: number
  description: string
}


// ─── Main Page Component ──────────────────────────────────────────────────────

export default function PrerequisitesPage() {
  const [query, setQuery] = useState('')
  const [treeResult, setTreeResult] = useState<TreeResponse | null>(null)
  const [moduleDetail, setModuleDetail] = useState<ModuleDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchHistory, setSearchHistory] = useState<string[]>([])
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  // Check auth state for the sidebar so it displays the user profile if they are logged in
  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem("authToken"))
  }, [])

  const lookup = useCallback(async (code: string) => {
    const normalized = code.trim().toUpperCase()
    if (!normalized) return

    setIsLoading(true)
    setError('')
    setTreeResult(null)
    setModuleDetail(null)
    setQuery(normalized)

    try {
      // Fetch new tree endpoint and module detail in parallel
      const [treeRes, moduleRes] = await Promise.all([
        api.get(`/modules/${normalized}/prerequisites/tree?depth=3`),
        api.get(`/modules/${normalized}`),
      ])

      setTreeResult(treeRes.data)
      setModuleDetail(moduleRes.data.module)

      // Add to history (deduplicated, max 8)
      setSearchHistory(prev => {
        const updated = [normalized, ...prev.filter(c => c !== normalized)]
        return updated.slice(0, 8)
      })
    } catch (err: any) {
      const status = err.response?.status
      if (status === 404) {
        setError(`Module "${normalized}" not found. Check the module code and try again.`)
      } else {
        setError('Failed to fetch prerequisite tree. Make sure the backend is running.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    lookup(query)
  }

  // ─── Data parsing logic ───
  // Handle both { prerequisiteTree: {...} } and raw TreeNode formats safely
  const rootNode = treeResult?.prerequisiteTree !== undefined
    ? treeResult.prerequisiteTree
    : (treeResult as TreeNode | null)

  const hasPrerequisites = !!rootNode && (
    rootNode.type === 'MODULE' ||
    rootNode.type === 'PROGRAMME' ||
    rootNode.type === 'OTHER' ||
    (rootNode.children && rootNode.children.length > 0)
  )

  return (
    <TooltipProvider>
      <SidebarProvider
        style={{
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties}
      >
        <AppSidebar variant="inset" isLoggedIn={isLoggedIn} />

        <SidebarInset>
          <SiteHeader />
          <main
            className="flex flex-1 flex-col min-h-screen"
            style={{ backgroundColor: 'var(--cw-navy)', color: 'var(--cw-white)' }}
          >
            <div className="max-w-3xl mx-auto px-4 py-12 w-full">

              {/* ── Header ── */}
              <div className="mb-10">
                <h1 className="text-3xl font-bold mb-2">Prerequisite Checker</h1>
                <p style={{ color: 'rgba(240,244,255,0.6)' }}>
                  Enter a module code to see its full prerequisite tree. Click any module chip to expand its own prerequisites.
                </p>
              </div>

              {/* ── Search bar ── */}
              <form onSubmit={handleSubmit} className="flex gap-3 mb-6">
                <div className="relative flex-1">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
                    style={{ color: 'rgba(240,244,255,0.4)' }}
                  />
                  <Input
                    value={query}
                    onChange={e => setQuery(e.target.value.toUpperCase())}
                    placeholder="e.g. CS2040S, MA1521, IS1108"
                    className="pl-9 font-mono text-base"
                    style={{
                      backgroundColor: 'var(--cw-navy-light)',
                      borderColor: 'var(--cw-navy-border)',
                      color: 'var(--cw-white)',
                    }}
                    autoFocus
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isLoading || !query.trim()}
                  style={{
                    backgroundColor: 'var(--cw-teal)',
                    color: 'var(--cw-navy)',
                    fontWeight: 600,
                  }}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Check'}
                </Button>
              </form>

              {/* ── Recent searches ── */}
              {searchHistory.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap mb-8">
                  <span className="text-xs" style={{ color: 'rgba(240,244,255,0.4)' }}>
                    Recent:
                  </span>
                  {searchHistory.map(code => (
                    <button
                      key={code}
                      onClick={() => lookup(code)}
                      className="module-chip text-xs cursor-pointer"
                      style={{ fontSize: '0.75rem', padding: '0.15rem 0.6rem' }}
                    >
                      {code}
                    </button>
                  ))}
                </div>
              )}

              {/* ── Loading ── */}
              {isLoading && (
                <div
                  className="rounded-xl p-8 flex items-center justify-center gap-3"
                  style={{ backgroundColor: 'var(--cw-navy-light)', border: '1px solid var(--cw-navy-border)' }}
                >
                  <Loader2
                    className="h-5 w-5 animate-spin"
                    style={{ color: 'var(--cw-teal)' }}
                  />
                  <span style={{ color: 'rgba(240,244,255,0.6)' }}>Mapping tree for {query}…</span>
                </div>
              )}

              {/* ── Error ── */}
              {error && !isLoading && (
                <div
                  className="rounded-xl p-5 flex items-start gap-3"
                  style={{
                    backgroundColor: 'rgba(255,77,79,0.08)',
                    border: '1px solid rgba(255,77,79,0.25)',
                  }}
                >
                  <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" style={{ color: '#FF4D4F' }} />
                  <p className="text-sm" style={{ color: 'rgba(240,244,255,0.8)' }}>{error}</p>
                </div>
              )}

              {/* ── Results ── */}
              {treeResult && moduleDetail && !isLoading && (
                <div className="space-y-4">

                  {/* Module header card */}
                  <div
                    className="rounded-xl p-5"
                    style={{
                      backgroundColor: 'var(--cw-navy-light)',
                      border: '1px solid var(--cw-navy-border)',
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <span
                          className="module-code text-sm px-2 py-0.5 rounded"
                          style={{
                            backgroundColor: 'var(--cw-teal-glow)',
                            color: 'var(--cw-teal)',
                            border: '1px solid rgba(0,201,167,0.25)',
                          }}
                        >
                          {moduleDetail.moduleCode}
                        </span>
                        <h2 className="text-xl font-semibold mt-2 mb-1">{moduleDetail.title}</h2>
                        <p className="text-sm" style={{ color: 'rgba(240,244,255,0.5)' }}>
                          {moduleDetail.credits} MCs
                        </p>
                      </div>
                      <BookOpen
                        className="h-5 w-5 shrink-0 mt-1"
                        style={{ color: 'rgba(240,244,255,0.3)' }}
                      />
                    </div>
                  </div>

                  {/* Prerequisites Tree Section */}
                  <div
                    className="rounded-xl p-5"
                    style={{
                      backgroundColor: 'var(--cw-navy-light)',
                      border: '1px solid var(--cw-navy-border)',
                    }}
                  >
                    <h3 className="font-semibold mb-6 flex items-center gap-2">
                      <ChevronRight
                        className="h-4 w-4"
                        style={{ color: 'var(--cw-teal)' }}
                      />
                      Prerequisite Tree
                      <span className="text-xs font-normal ml-1" style={{ color: 'rgba(240,244,255,0.4)' }}>
                        — click a module chip to expand its prerequisites
                      </span>
                    </h3>

                    {!hasPrerequisites || !rootNode ? (
                      /* No prerequisites */
                      <div className="flex items-center gap-3 py-3">
                        <div
                          className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                          style={{ backgroundColor: 'var(--cw-teal-glow)', color: 'var(--cw-teal)' }}
                        >
                          ✓
                        </div>
                        <div>
                          <p className="font-medium" style={{ color: 'var(--cw-teal)' }}>
                            No prerequisites
                          </p>
                          <p className="text-sm" style={{ color: 'rgba(240,244,255,0.5)' }}>
                            Anyone can take this module.
                          </p>
                        </div>
                      </div>
                    ) : (
                      /* Tree Render */
                      <div className="text-sm">
                        <p className="mb-4" style={{ color: 'rgba(240,244,255,0.5)' }}>
                          You must satisfy the following conditions before taking {moduleDetail.moduleCode}:
                        </p>
                       
                       <div className="p-2">
                        <PrerequisiteGraph treeResult={treeResult} />
                      </div>
                      </div>
                    )}

                    {/* Raw prerequisite text from NUSMods (Fallback/Extra Info) */}
                    {treeResult.prerequisiteText && (
                      <div
                        className="mt-6 pt-4 text-sm"
                        style={{
                          borderTop: '1px solid var(--cw-navy-border)',
                          color: 'rgba(240,244,255,0.45)',
                        }}
                      >
                        <span className="font-medium" style={{ color: 'rgba(240,244,255,0.6)' }}>
                          Raw condition text:{' '}
                        </span>
                        {treeResult.prerequisiteText}
                      </div>
                    )}
                  </div>

                  {/* Quick actions */}
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setTreeResult(null)
                        setModuleDetail(null)
                        setError('')
                        setQuery('')
                      }}
                      style={{
                        borderColor: 'var(--cw-navy-border)',
                        color: 'rgba(240,244,255,0.7)',
                        backgroundColor: 'transparent',
                      }}
                    >
                      Clear
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => window.location.href = '/recommendations'}
                      style={{
                        backgroundColor: 'var(--cw-teal)',
                        color: 'var(--cw-navy)',
                        fontWeight: 600,
                      }}
                    >
                      Get AI Recommendations →
                    </Button>
                  </div>
                </div>
              )}

              {/* ── Empty state (first load) ── */}
              {!treeResult && !error && !isLoading && (
                <div
                  className="rounded-xl p-10 text-center"
                  style={{
                    backgroundColor: 'var(--cw-navy-light)',
                    border: '1px dashed var(--cw-navy-border)',
                  }}
                >
                  <Search
                    className="h-8 w-8 mx-auto mb-3"
                    style={{ color: 'rgba(240,244,255,0.2)' }}
                  />
                  <p style={{ color: 'rgba(240,244,255,0.4)' }}>
                    Enter a module code above to map its requirement tree.
                  </p>
                  <p className="text-sm mt-2" style={{ color: 'rgba(240,244,255,0.25)' }}>
                    Try CS2040S, CS2030S, or MA1521
                  </p>
                </div>
              )}

            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
