import { useState, useEffect } from "react"
import { AppSidebar } from "~/components/app-sidebar"
import { SiteHeader } from "~/components/site-header"
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar"
import { CheckCircle2, Circle, AlertTriangle, Info, BookOpen, GraduationCap, ChevronDown, ChevronUp } from "lucide-react"
import { TooltipProvider } from "~/components/ui/tooltip"
import api from "~/lib/api"

// --- Updated TypeScript Interfaces based on the new API ---
interface ModuleItem {
  moduleCode: string
  title?: string
  credits?: number
}

interface Category {
  key: string
  label: string
  type: "module_list" | "mc_total"
  satisfied: boolean
  notes?: string | null
  // For mc_total
  mcsRequired?: number
  mcsPlanned?: number
  // For module_list
  required?: string[]
  taken?: string[]
  missing?: string[]
  minRequired?: number
}

interface UnscheduledModule {
  moduleCode: string
  reason: string
}

interface MCGap {
  key: string
  label: string
  mcsRemaining: number
}

interface FourYearRecommendation {
  recommendedPlan: Record<string, ModuleItem[]>
  unscheduled: UnscheduledModule[]
  mcGapsToFillWithElectives: MCGap[]
  note?: string
}

interface RequirementsResponse {
  programme: string
  focusArea: string
  totalMCsRequired: number
  totalMCsPlanned: number
  categories: Category[]
  fourYearRecommendation: FourYearRecommendation
}

// --- New Category Card Component with Dropdown Logic ---
const CategoryCard = ({ category }: { category: Category }) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div 
      className={`p-4 rounded-lg border transition-all duration-200 ${
        category.satisfied 
          ? "bg-[rgba(0,163,136,0.05)] border-[rgba(0,163,136,0.3)]" 
          : "bg-[var(--cw-navy-light)] border-[var(--cw-navy-border)] hover:border-slate-400"
      }`}
    >
      {/* Header (Clickable) */}
      <div 
        className="flex justify-between items-center cursor-pointer select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className="font-semibold text-[var(--cw-white)] flex items-center gap-2">
          {category.satisfied ? (
            <CheckCircle2 size={18} className="text-[var(--cw-teal)] flex-shrink-0" />
          ) : (
            <Circle size={18} className="text-slate-400 flex-shrink-0" />
          )}
          {category.label}
        </h3>
        
        <div className="flex items-center gap-3">
          {category.type === "mc_total" && (
            <span className={`text-xs font-medium px-2 py-1 rounded bg-[var(--cw-navy)] ${
              category.satisfied ? "text-[var(--cw-teal)]" : "text-slate-400"
            }`}>
              {category.mcsPlanned} / {category.mcsRequired} MCs
            </span>
          )}
          {isOpen ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
        </div>
      </div>

      {/* Render MC Totals Progress Bar (Always visible if mc_total) */}
      {category.type === "mc_total" && (
        <div className="w-full bg-[var(--cw-navy)] rounded-full h-1.5 mt-3">
          <div 
            className="bg-[var(--cw-teal)] h-1.5 rounded-full" 
            style={{ width: `${Math.min(((category.mcsPlanned || 0) / (category.mcsRequired || 1)) * 100, 100)}%` }}
          ></div>
        </div>
      )}

      {/* Dropdown Content */}
      {isOpen && (
        <div className="mt-4 pt-4 border-t border-[var(--cw-navy-border)] animate-in fade-in slide-in-from-top-2 duration-200">
          
          {/* Notes section */}
          {category.notes && (
            <div className="mb-4 bg-[rgba(10,22,40,0.03)] p-3 rounded-md border border-[rgba(10,22,40,0.08)]">
              <p className="text-sm text-slate-500 leading-relaxed text-justify">
                {category.notes}
              </p>
            </div>
          )}

          {/* Module Lists */}
          {category.type === "module_list" && (
            <div className="flex flex-col gap-4">
              {category.minRequired && (
                <div className="text-xs text-[var(--cw-teal)] font-semibold bg-[var(--cw-teal-glow)] inline-block px-2 py-1 rounded w-max">
                  Requirements: Complete at least {category.minRequired} module(s) from this list.
                </div>
              )}
              
              {/* Taken Modules */}
              <div>
                <h4 className="text-xs text-slate-400 uppercase font-bold mb-2 tracking-wider">
                  Completed / Planned ({category.taken?.length || 0})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {category.taken && category.taken.length > 0 ? (
                    category.taken.map(code => (
                      <span key={code} className="module-chip bg-[var(--cw-teal-glow)] text-[var(--cw-teal)] border-[var(--cw-teal)]">
                        {code}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-slate-400 italic">No modules taken yet.</span>
                  )}
                </div>
              </div>
              
              {/* Missing Modules */}
              <div>
                <h4 className="text-xs text-slate-400 uppercase font-bold mb-2 tracking-wider">
                  Missing / Available Options ({category.missing?.length || 0})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {category.missing && category.missing.length > 0 ? (
                    category.missing.map(code => (
                      <span key={code} className="module-chip opacity-60 border-slate-400 text-slate-400 hover:opacity-100 hover:border-slate-500">
                        {code}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-slate-400 italic">Requirements fulfilled.</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function GraduationRequirements() {
  const [plans, setPlans] = useState<{ id: string; name: string }[]>([])
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null)
  
  const [reqData, setReqData] = useState<RequirementsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const { data } = await api.get('/plans')
        if (data.plans && data.plans.length > 0) {
          setPlans(data.plans)
          setCurrentPlanId(data.plans[0].id)
        }
      } catch (err) {
        console.error("Failed to load plans", err)
      }
    }
    fetchPlans()
  }, [])

  useEffect(() => {
    if (!currentPlanId) return

    const fetchRequirements = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const { data } = await api.get(`/plans/${currentPlanId}/requirements`)
        
        if (data.available === false) {
          setError(data.message || "Graduation requirements tracking is currently unavailable for your major.")
          setReqData(null)
          return
        }

        setReqData(data)
      } catch (err: any) {
        console.error("Failed to fetch requirements", err)
        setError(err.response?.data?.message || "Could not load graduation requirements. Please try again.")
        setReqData(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchRequirements()
  }, [currentPlanId])

  const handleSwitchPlan = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentPlanId(e.target.value)
  }

  return (
    <TooltipProvider>
    <SidebarProvider
      style={{
        "--sidebar-width": "calc(var(--spacing) * 72)",
        "--header-height": "calc(var(--spacing) * 12)",
      } as React.CSSProperties}
    >
      <AppSidebar variant="inset" isLoggedIn={true} />
      <SidebarInset className="flex flex-col h-screen overflow-hidden">
        <SiteHeader />

        {/* Page Header */}
        <div className="px-8 pt-6 pb-4 border-b border-[var(--cw-navy-border)]">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-4">
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                  <GraduationCap className="text-[var(--cw-teal)]" size={32} />
                  Graduation Tracker
                </h1>
                {plans.length > 0 && (
                  <select
                    value={currentPlanId || ""}
                    onChange={handleSwitchPlan}
                    className="mt-1 bg-[var(--cw-navy-light)] border border-[var(--cw-navy-border)] text-sm rounded-md px-3 py-1.5 text-[var(--cw-white)] focus:outline-none focus:ring-1 focus:ring-[var(--cw-teal)] cursor-pointer"
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <p className="text-muted-foreground mt-2">
                Track your academic progress and view AI-recommended modules to satisfy remaining requirements.
              </p>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto p-8 custom-scrollbar">
          {isLoading ? (
            <div className="flex justify-center items-center h-40 text-slate-400">
              Analyzing degree requirements...
            </div>
          ) : error ? (
            <div className="max-w-md mx-auto mt-16 bg-[var(--cw-navy-light)] border border-[rgba(184,114,10,0.3)] rounded-lg p-8 flex flex-col items-center text-center gap-4">
              <div className="bg-[rgba(184,114,10,0.1)] p-3 rounded-full text-warning">
                <Info size={28} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[var(--cw-white)] mb-2">Not Yet Supported</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {error}
                </p>
              </div>
            </div>
          ) : reqData ? (
            <div className="max-w-6xl mx-auto flex flex-col gap-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[var(--cw-navy-light)] border border-[var(--cw-navy-border)] p-5 rounded-lg flex flex-col gap-1">
                  <span className="text-sm text-slate-400">Programme</span>
                  <span className="text-lg font-bold text-[var(--cw-white)]">{reqData.programme}</span>
                </div>
                <div className="bg-[var(--cw-navy-light)] border border-[var(--cw-navy-border)] p-5 rounded-lg flex flex-col gap-1">
                  <span className="text-sm text-slate-400">Focus Area</span>
                  <span className="text-lg font-bold text-[var(--cw-white)]">{reqData.focusArea || "None declared"}</span>
                </div>
                <div className="bg-[var(--cw-navy-light)] border border-[var(--cw-navy-border)] p-5 rounded-lg flex flex-col gap-2">
                  <div className="flex justify-between items-center text-sm text-slate-400">
                    <span>Total Progress</span>
                    <span className="text-[var(--cw-teal)] font-bold">
                      {reqData.totalMCsPlanned} / {reqData.totalMCsRequired} MCs
                    </span>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full bg-[var(--cw-navy)] rounded-full h-2.5 mt-1 border border-[var(--cw-navy-border)]">
                    <div 
                      className="bg-[var(--cw-teal)] h-2.5 rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min((reqData.totalMCsPlanned / reqData.totalMCsRequired) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {/* LEFT COLUMN: Requirement Categories */}
                <div className="flex flex-col gap-4">
                  <h2 className="text-xl font-bold flex items-center gap-2 border-b border-[var(--cw-navy-border)] pb-2">
                    <BookOpen size={20} className="text-[var(--cw-teal)]" />
                    Requirement Categories
                  </h2>
                  
                  {/* Render mapping through new CategoryCard component */}
                  {reqData.categories.map((category) => (
                    <CategoryCard key={category.key} category={category} />
                  ))}
                </div>

                {/* RIGHT COLUMN: AI Recommendations */}
                <div className="flex flex-col gap-4">
                  <h2 className="text-xl font-bold flex items-center gap-2 border-b border-[var(--cw-navy-border)] pb-2">
                    <span className="text-[var(--cw-teal)]">✨</span>
                    Smart Scheduling Recommendations
                  </h2>
                  
                  {reqData.fourYearRecommendation.note && (
                    <div className="flex items-start gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-700 p-3 rounded-md text-sm leading-relaxed mb-2">
                      <Info size={16} className="mt-0.5 flex-shrink-0 text-blue-500" />
                      <p>{reqData.fourYearRecommendation.note}</p>
                    </div>
                  )}

                  {/* Scheduled Modules (Grouped by Sem) */}
                  {Object.keys(reqData.fourYearRecommendation.recommendedPlan).length > 0 ? (
                    <div className="bg-[var(--cw-navy-light)] border border-[var(--cw-navy-border)] rounded-lg overflow-hidden">
                      <div className="bg-[rgba(10,22,40,0.04)] px-4 py-2 border-b border-[var(--cw-navy-border)] font-semibold text-sm text-slate-500">
                        Suggested Modules (Prerequisites Cleared)
                      </div>
                      <div className="p-4 flex flex-col gap-4">
                        {Object.entries(reqData.fourYearRecommendation.recommendedPlan).map(([semKey, modules]) => (
                          <div key={semKey}>
                            <h4 className="text-xs font-bold text-[var(--cw-teal)] mb-2 uppercase tracking-wider">
                              {semKey.replace('year', 'Year ').replace('_sem', ' Semester ')}
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {modules.map(mod => (
                                <div key={mod.moduleCode} className="flex justify-between items-center bg-[var(--cw-navy)] border border-[var(--cw-navy-border)] p-2 rounded text-sm">
                                  <div>
                                    <span className="font-mono font-semibold text-[var(--cw-white)] mr-2">{mod.moduleCode}</span>
                                    <span className="text-xs text-slate-400 truncate max-w-[150px] inline-block align-bottom">{mod.title}</span>
                                  </div>
                                  <span className="text-xs text-slate-500 bg-[rgba(10,22,40,0.05)] px-1.5 py-0.5 rounded">{mod.credits} MCs</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[var(--cw-navy-light)] border border-[var(--cw-navy-border)] p-4 rounded-lg text-sm text-slate-400 text-center">
                      No core modules pending scheduling.
                    </div>
                  )}

                  {/* Unscheduled / Bottlenecked Modules */}
                  {reqData.fourYearRecommendation.unscheduled.length > 0 && (
                    <div className="bg-[rgba(184,114,10,0.05)] border border-warning rounded-lg overflow-hidden mt-2">
                      <div className="bg-[rgba(184,114,10,0.1)] px-4 py-2 border-b border-warning/30 font-semibold text-sm text-warning flex items-center gap-2">
                        <AlertTriangle size={16} />
                        Unscheduled Modules
                      </div>
                      <div className="p-4 flex flex-col gap-2">
                        {reqData.fourYearRecommendation.unscheduled.map(mod => (
                          <div key={mod.moduleCode} className="flex flex-col bg-[var(--cw-navy)] border border-[var(--cw-navy-border)] p-3 rounded">
                            <span className="font-mono font-semibold text-[var(--cw-white)]">{mod.moduleCode}</span>
                            <span className="text-sm text-slate-400 mt-1">{mod.reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* MC Gaps (Electives) */}
                  {reqData.fourYearRecommendation.mcGapsToFillWithElectives.length > 0 && (
                    <div className="bg-[var(--cw-navy-light)] border border-[var(--cw-navy-border)] rounded-lg p-4 mt-2">
                      <h4 className="text-sm font-semibold text-slate-500 mb-3">Elective Spaces Remaining</h4>
                      <div className="flex flex-col gap-2">
                        {reqData.fourYearRecommendation.mcGapsToFillWithElectives.map(gap => (
                          <div key={gap.key} className="flex justify-between items-center bg-[var(--cw-navy)] border border-[var(--cw-navy-border)] p-2.5 rounded">
                            <span className="text-sm text-[var(--cw-white)]">{gap.label}</span>
                            <span className="text-sm font-semibold text-[var(--cw-teal)] bg-[var(--cw-teal-glow)] px-2 py-1 rounded">
                              {gap.mcsRemaining} MCs left
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-slate-400 mt-20">Select a plan to view graduation requirements.</div>
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
    </TooltipProvider>
  )
}