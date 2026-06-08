import { useState, useCallback } from 'react'
import { Search, ChevronRight, AlertCircle, BookOpen, Loader2, ArrowRight } from 'lucide-react'
import api from '~/lib/api'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'


interface PrereqResult {
  moduleCode: string
  prerequisites: string[]
  prerequisiteText: string
}

interface ModuleDetail {
  moduleCode: string
  title: string
  credits: number
  description: string
}

export default function PrerequisitesPage() {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<PrereqResult | null>(null)
  const [moduleDetail, setModuleDetail] = useState<ModuleDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchHistory, setSearchHistory] = useState<string[]>([])

  const lookup = useCallback(async (code: string) => {
    const normalized = code.trim().toUpperCase()
    if (!normalized) return

    setIsLoading(true)
    setError('')
    setResult(null)
    setModuleDetail(null)
    setQuery(normalized)

    try {
      const [prereqRes, moduleRes] = await Promise.all([
        api.get(`/modules/${normalized}/prerequisites`),
        api.get(`/modules/${normalized}`),
      ])

      setResult(prereqRes.data)
      setModuleDetail(moduleRes.data.module)

      setSearchHistory(prev => {
        const updated = [normalized, ...prev.filter(c => c !== normalized)]
        return updated.slice(0, 8)
      })
    } catch (err: any) {
      const status = err.response?.status
      if (status === 404) {
        setError(`Module "${normalized}" not found. Check the module code and try again.`)
      } else {
        setError('Failed to fetch prerequisites. Make sure the backend is running.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    lookup(query)
  }

  return (
    <main
      className="min-h-screen"
      style={{ backgroundColor: 'var(--cw-navy)', color: 'var(--cw-white)' }}
    >
      <div className="max-w-2xl mx-auto px-4 py-12">

        {/* ── Header ── */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <a
              href="/"
              className="text-sm"
              style={{ color: 'var(--cw-teal)', textDecoration: 'none' }}
            >
              ← Back to Courseway
            </a>
          </div>
          <h1 className="text-3xl font-bold mb-2">Prerequisite Checker</h1>
          <p style={{ color: 'rgba(240,244,255,0.6)' }}>
            Enter a module code to see what you need to take it first.
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
            <span style={{ color: 'rgba(240,244,255,0.6)' }}>Looking up {query}…</span>
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
        {result && moduleDetail && !isLoading && (
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

            {/* Prerequisites section */}
            <div
              className="rounded-xl p-5"
              style={{
                backgroundColor: 'var(--cw-navy-light)',
                border: '1px solid var(--cw-navy-border)',
              }}
            >
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <ChevronRight
                  className="h-4 w-4"
                  style={{ color: 'var(--cw-teal)' }}
                />
                Prerequisites
              </h3>

              {result.prerequisites.length === 0 ? (
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
                <div className="space-y-3">
                  <p className="text-sm mb-4" style={{ color: 'rgba(240,244,255,0.5)' }}>
                    You need to complete the following before taking {result.moduleCode}:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {result.prerequisites.map(code => (
                      <button
                        key={code}
                        onClick={() => lookup(code)}
                        className="module-chip group"
                        title={`Look up ${code}`}
                      >
                        <span>{code}</span>
                        <ArrowRight
                          className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Raw prerequisite text from NUSMods */}
              {result.prerequisiteText && (
                <div
                  className="mt-5 pt-4 text-sm"
                  style={{
                    borderTop: '1px solid var(--cw-navy-border)',
                    color: 'rgba(240,244,255,0.45)',
                  }}
                >
                  <span className="font-medium" style={{ color: 'rgba(240,244,255,0.6)' }}>
                    NUSMods condition:{' '}
                  </span>
                  {result.prerequisiteText}
                </div>
              )}
            </div>

            {/* Quick actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setResult(null)
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
        {!result && !error && !isLoading && (
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
              Enter a module code above to check its prerequisites.
            </p>
            <p className="text-sm mt-2" style={{ color: 'rgba(240,244,255,0.25)' }}>
              Try CS2040S, CS2030S, or MA1521
            </p>
          </div>
        )}

      </div>
    </main>
  )
}
