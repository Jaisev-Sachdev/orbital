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

const CategoryCard = ({ category, isLast }: { category: Category; isLast: boolean }) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className={isLast ? "" : "border-b border-[var(--cw-navy-border)]"}>
      <div 
        className="flex justify-between items-center cursor-pointer select-none py-3.5"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className="font-medium text-[var(--cw-white)] flex items-center gap-2.5 text-sm">
          {category.satisfied ? (
            <CheckCircle2 size={16} className="text-[var(--cw-teal)] flex-shrink-0" />
          ) : (
            <Circle size={16} className="text-slate-300 flex-shrink-0" />
          )}
          {category.label}
        </h3>
        
        <div className="flex items-center gap-3">
          {category.type === "mc_total" && (
            <span className={`text-xs font-medium ${
              category.satisfied ? "text-[var(--cw-teal)]" : "text-slate-400"
            }`}>
              {category.mcsPlanned} / {category.mcsRequired} MCs
            </span>
          )}
          {isOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </div>

      {category.type === "mc_total" && (
        <div className="w-full bg-[var(--cw-navy-border)] rounded-full h-1 -mt-1 mb-3">
          <div 
            className="bg-[var(--cw-teal)] h-1 rounded-full" 
            style={{ width: `${Math.min(((category.mcsPlanned || 0) / (category.mcsRequired || 1)) * 100, 100)}%` }}
          ></div>
        </div>
      )}

      {isOpen && (
        <div className="pb-4 pl-6 animate-in fade-in slide-in-from-top-2 duration-200">
          
          {category.notes && (
            <p className="text-sm text-slate-500 leading-relaxed mb-3">
              {category.notes}
            </p>
          )}

          {category.type === "module_list" && (
            <div className="flex flex-col gap-4">
              {category.minRequired && (
                <p className="text-xs text-slate-500">
                  Complete at least <span className="font-medium text-[var(--cw-teal)]">{category.minRequired}</span> module(s) from this list.
                </p>
              )}
              
              <div>
                <h4 className="text-xs text-slate-400 uppercase font-semibold mb-2 tracking-wider">
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
              
              <div>
                <h4 className="text-xs text-slate-400 uppercase font-semibold mb-2 tracking-wider">
                  Missing / Available Options ({category.missing?.length || 0})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {category.missing && category.missing.length > 0 ? (
                    category.missing.map(code => (
                      <span key={code} className="module-chip opacity-60 border-slate-300 text-slate-400 hover:opacity-100 hover:border-slate-400">
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

        <div className="flex-1 overflow-auto p-8 custom-scrollbar">
          {isLoading ? (
            <div className="flex justify-center items-center h-40 text-slate-400">
              Analyzing degree requirements...
            </div>
          ) : error ? (
            <div className="max-w-md mx-auto mt-16 flex flex-col items-center text-center gap-3">
              <Info size={24} className="text-warning" />
              <div>
                <h3 className="text-lg font-bold text-[var(--cw-white)] mb-2">Not Yet Supported</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {error}
                </p>
              </div>
            </div>
          ) : reqData ? (
            <div className="max-w-6xl mx-auto flex flex-col gap-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[var(--cw-navy-border)] rounded-lg overflow-hidden border border-[var(--cw-navy-border)]">
                <div className="bg-[var(--cw-navy)] p-5 flex flex-col gap-1">
                  <span className="text-sm text-slate-400">Programme</span>
                  <span className="text-lg font-bold text-[var(--cw-white)]">{reqData.programme}</span>
                </div>
                <div className="bg-[var(--cw-navy)] p-5 flex flex-col gap-1">
                  <span className="text-sm text-slate-400">Focus Area</span>
                  <span className="text-lg font-bold text-[var(--cw-white)]">{reqData.focusArea || "None declared"}</span>
                </div>
                <div className="bg-[var(--cw-navy)] p-5 flex flex-col gap-2">
                  <div className="flex justify-between items-center text-sm text-slate-400">
                    <span>Total Progress</span>
                    <span className="text-[var(--cw-teal)] font-bold">
                      {reqData.totalMCsPlanned} / {reqData.totalMCsRequired} MCs
                    </span>
                  </div>

                  <div className="w-full bg-[var(--cw-navy-border)] rounded-full h-1.5 mt-1">
                    <div 
                      className="bg-[var(--cw-teal)] h-1.5 rounded-full transition-all duration-500" 
                      style={{ width: `${Math.min((reqData.totalMCsPlanned / reqData.totalMCsRequired) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <div className="flex flex-col">
                  <h2 className="text-xl font-bold flex items-center gap-2 border-b border-[var(--cw-navy-border)] pb-2 mb-1">
                    Requirement Categories
                  </h2>
                  
                  {reqData.categories.map((category, i) => (
                    <CategoryCard key={category.key} category={category} isLast={i === reqData.categories.length - 1} />
                  ))}
                </div>

                <div className="flex flex-col gap-4">
                  <h2 className="text-xl font-bold flex items-center gap-2 border-b border-[var(--cw-navy-border)] pb-2">
                    Smart Scheduling Recommendations
                  </h2>
                  
                  {reqData.fourYearRecommendation.note && (
                    <p className="text-sm text-slate-500 leading-relaxed -mt-2">
                      {reqData.fourYearRecommendation.note}
                    </p>
                  )}

                  {Object.keys(reqData.fourYearRecommendation.recommendedPlan).length > 0 ? (
                    <div>
                      <h4 className="font-semibold text-sm text-slate-500 mb-2">
                        Suggested Modules (Prerequisites Cleared)
                      </h4>
                      <div className="flex flex-col gap-4">
                        {Object.entries(reqData.fourYearRecommendation.recommendedPlan).map(([semKey, modules]) => (
                          <div key={semKey}>
                            <h4 className="text-xs font-bold text-[var(--cw-teal)] mb-1.5 uppercase tracking-wider">
                              {semKey.replace('year', 'Year ').replace('_sem', ' Semester ')}
                            </h4>
                            <div className="flex flex-col">
                              {modules.map(mod => (
                                <div key={mod.moduleCode} className="flex justify-between items-center py-1.5 border-b border-[var(--cw-navy-border)] last:border-b-0 text-sm">
                                  <div>
                                    <span className="font-mono font-semibold text-[var(--cw-white)] mr-2">{mod.moduleCode}</span>
                                    <span className="text-xs text-slate-400 truncate max-w-[150px] inline-block align-bottom">{mod.title}</span>
                                  </div>
                                  <span className="text-xs text-slate-400">{mod.credits} MCs</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400">
                      No core modules pending scheduling.
                    </p>
                  )}

                  {reqData.fourYearRecommendation.unscheduled.length > 0 && (
                    <div className="mt-2">
                      <h4 className="font-semibold text-sm text-warning flex items-center gap-1.5 mb-2">
                        <AlertTriangle size={14} />
                        Unscheduled Modules
                      </h4>
                      <div className="flex flex-col gap-2">
                        {reqData.fourYearRecommendation.unscheduled.map(mod => (
                          <div key={mod.moduleCode} className="flex flex-col py-1.5 border-b border-[var(--cw-navy-border)] last:border-b-0">
                            <span className="font-mono font-semibold text-sm text-[var(--cw-white)]">{mod.moduleCode}</span>
                            <span className="text-xs text-slate-400 mt-0.5">{mod.reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {reqData.fourYearRecommendation.mcGapsToFillWithElectives.length > 0 && (
                    <div className="mt-2">
                      <h4 className="text-sm font-semibold text-slate-500 mb-2">Elective Spaces Remaining</h4>
                      <div className="flex flex-col gap-1">
                        {reqData.fourYearRecommendation.mcGapsToFillWithElectives.map(gap => (
                          <div key={gap.key} className="flex justify-between items-center py-1.5 border-b border-[var(--cw-navy-border)] last:border-b-0 text-sm">
                            <span className="text-[var(--cw-white)]">{gap.label}</span>
                            <span className="font-semibold text-[var(--cw-teal)]">
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