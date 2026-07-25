import { useState, useEffect } from "react"
import SemesterCard  from "~/components/semester_card"
import { AppSidebar } from "~/components/app-sidebar"
import { SiteHeader } from "~/components/site-header"
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar"
import { TooltipProvider } from "~/components/ui/tooltip"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "~/components/ui/dialog"
import { Input } from "~/components/ui/input"
import { Button } from "~/components/ui/button"
import { Activity, X, AlertTriangle, Clock, Share2, Copy, RefreshCw, Unlink, Check } from "lucide-react"
import api from "~/lib/api"

interface Module {
  id?:        string 
  moduleCode: string
  title:      string
  credits:    number
}

interface WorkloadModule {
  moduleCode: string
  title:      string
  credits:    number
  workload:   number[] 
  totalHours: number
}

interface WorkloadBreakdown {
  lecture: number
  tutorial: number
  lab: number
  project: number
  prep: number
}

interface SemesterWorkload {
  totalMCs: number
  totalHours: number
  breakdown: WorkloadBreakdown
  flags: string[]
}

interface WorkloadData {
  workload: Record<string, SemesterWorkload>
}

type PlanMap = Record<string, Module[]>

const EMPTY_PLAN: PlanMap = {
  "1-1": [], "1-2": [],
  "2-1": [], "2-2": [],
  "3-1": [], "3-2": [],
  "4-1": [], "4-2": [],
}

export default function PlanBuilder() {
  const [plan, setPlan] = useState<PlanMap>(EMPTY_PLAN)
  const [plans, setPlans] = useState<{id: string, name: string}[]>([])
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null)

  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false)
  const [activeSemesterKey, setActiveSemesterKey] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Module[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false)
  const [selectedComparePlanIds, setSelectedComparePlanIds] = useState<string[]>([])
  const [compareWorkloads, setCompareWorkloads] = useState<Record<string, WorkloadData>>({})
  const [isFetchingCompare, setIsFetchingCompare] = useState(false)

  // --- Re-added Share State ---
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [shareToken, setShareToken] = useState<string | null>(null)
  const [isSharingAction, setIsSharingAction] = useState(false)
  const [hasCopied, setHasCopied] = useState(false)

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim()) {
        executeSearch(searchQuery)
      } else {
        setSearchResults([])
        setHasSearched(false)
      }
    }, 300)

    return () => clearTimeout(delayDebounceFn)
  }, [searchQuery])
  
  const handleOpenSearch = (year: number, semester: number) => {
    setActiveSemesterKey(`${year}-${semester}`)
    setSearchQuery("")
    setSearchResults([])
    setHasSearched(false)
    setIsSearchModalOpen(true)
  }

  const handleOpenCompare = async () => {
    const initialIds = [currentPlanId, ...plans.filter(p => p.id !== currentPlanId).map(p => p.id)]
      .filter(Boolean)
      .slice(0, 3) as string[];
    
    setSelectedComparePlanIds(initialIds);
    setIsCompareModalOpen(true);
    await fetchCompareData(initialIds);
  };


  const fetchCompareData = async (planIds: string[]) => {
    setIsFetchingCompare(true);
    const newWorkloads = { ...compareWorkloads };
    
    try {
      await Promise.all(
        planIds.map(async (id) => {
          const { data } = await api.get(`/plans/${id}/workload`);
          newWorkloads[id] = data;
        })
      );
      setCompareWorkloads(newWorkloads);
    } catch (error) {
      console.error("Failed to fetch workloads for comparison:", error);
    } finally {
      setIsFetchingCompare(false);
    }
  };

  const toggleComparePlan = async (planId: string) => {
    let newSelection = [...selectedComparePlanIds];
    
    if (newSelection.includes(planId)) {
      newSelection = newSelection.filter(id => id !== planId);
    } else {
      if (newSelection.length >= 3) {
        alert("You can only compare up to 3 plans at a time.");
        return;
      }
      newSelection.push(planId);
    }
    
    setSelectedComparePlanIds(newSelection);
    await fetchCompareData(newSelection);
  };

  const executeSearch = async (queryToSearch?: string) => {
    const q = queryToSearch !== undefined ? queryToSearch : searchQuery
    if (!q.trim()) return
    setIsSearching(true)
    try {
      const { data } = await api.get(`/modules?search=${q}`)
      setSearchResults(data.modules || [])
      setHasSearched(true)
    } catch (error) {
      console.error("Failed to search modules:", error)
    } finally {
      setIsSearching(false)
    }
  }

  const confirmAddFromSearch = async (module: Module) => {
    if (!activeSemesterKey) return
    await handleAdd(activeSemesterKey, module)
    setIsSearchModalOpen(false)
  }

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newPlanName, setNewPlanName] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  const [isWorkloadOpen, setIsWorkloadOpen] = useState(false)
  const [workloadData, setWorkloadData] = useState<WorkloadData | null>(null)
  const [isLoadingWorkload, setIsLoadingWorkload] = useState(false)

  const loadWorkload = async (planId: string) => {
    setIsLoadingWorkload(true)
    try {
      const { data } = await api.get(`/plans/${planId}/workload`)
      setWorkloadData(data)
    } catch (error) {
      console.error("Failed to load workload:", error)
    } finally {
      setIsLoadingWorkload(false)
    }
  }

  const loadPlanSlots = async (planId: string) => {
    try {
      const { data: slotsData } = await api.get(`/plans/${planId}/slots`)
      const newPlan: PlanMap = { ...EMPTY_PLAN }

      if (slotsData.grouped) {
        Object.entries(slotsData.grouped).forEach(([key, slots]: [string, any]) => {
          const match = key.match(/year(\d)_sem(\d)/)
          if (match) {
            const frontendKey = `${match[1]}-${match[2]}`
            newPlan[frontendKey] = slots
          }
        })
      }
      setPlan(newPlan)
      loadWorkload(planId)
    } catch (error) {
      console.error("Failed to load plan slots:", error)
    }
  }

  useEffect(() => {
    const initializePlans = async () => {
      try {
        const { data: plansData } = await api.get('/plans')
        let planId = ''
        let loadedPlans = plansData.plans || []

        if (loadedPlans.length > 0) {
          planId = loadedPlans[0].id
        } else {
          const { data: newPlanData } = await api.post('/plans', { name: 'Main Plan' })
          planId = newPlanData.plan.id
          loadedPlans = [newPlanData.plan]
        }

        setPlans(loadedPlans)
        setCurrentPlanId(planId)
        loadPlanSlots(planId)
      } catch (error) {
        console.error("Failed to load or create plan:", error)
      }
    }
    initializePlans()
  }, [])

  const handleSwitchPlan = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPlanId = e.target.value
    setCurrentPlanId(newPlanId)
    setPlan(EMPTY_PLAN) 
    setWorkloadData(null)
    setShareToken(null) // Reset share token when switching plans
    loadPlanSlots(newPlanId)
  }

  const handleOpenCreateModal = () => {
    setNewPlanName("")
    setIsCreateModalOpen(true)
  }

  const submitNewPlan = async () => {
    if (!newPlanName.trim()) return
    setIsCreating(true)
    try {
      const { data } = await api.post('/plans', { name: newPlanName.trim() })
      setPlans(prev => [...prev, data.plan])
      setCurrentPlanId(data.plan.id)
      setPlan(EMPTY_PLAN)
      setShareToken(null) // Clear token for new plan
      loadPlanSlots(data.plan.id)
      setIsCreateModalOpen(false) 
    } catch (error) {
      console.error("Failed to create new plan:", error)
      alert("Failed to create plan. Please try again.")
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeletePlan = async () => {
    if (!currentPlanId || plans.length <= 1) {
      return alert("You cannot delete your only plan!")
    }
    if (!confirm("Are you sure you want to delete this plan? This cannot be undone.")) return
    try {
      await api.delete(`/plans/${currentPlanId}`)
      const remainingPlans = plans.filter(p => p.id !== currentPlanId)
      setPlans(remainingPlans)
      const fallbackId = remainingPlans[0].id
      setCurrentPlanId(fallbackId)
      setShareToken(null) // Clear token on deletion
      loadPlanSlots(fallbackId)
    } catch (error) {
      console.error("Failed to delete plan:", error)
    }
  }

  // --- Re-added Share Logic ---
  const handleEnableShare = async () => {
    if (!currentPlanId) return
    setIsSharingAction(true)
    try {
      const { data } = await api.post(`/plans/${currentPlanId}/share`)
      setShareToken(data.shareToken)
    } catch (error) {
      console.error("Failed to enable sharing:", error)
    } finally {
      setIsSharingAction(false)
    }
  }

  const handleRotateShare = async () => {
    if (!currentPlanId) return
    setIsSharingAction(true)
    try {
      const { data } = await api.post(`/plans/${currentPlanId}/share/rotate`)
      setShareToken(data.shareToken)
      setHasCopied(false)
    } catch (error) {
      console.error("Failed to rotate share link:", error)
    } finally {
      setIsSharingAction(false)
    }
  }

  const handleDisableShare = async () => {
    if (!currentPlanId) return
    setIsSharingAction(true)
    try {
      await api.delete(`/plans/${currentPlanId}/share`)
      setShareToken(null)
      setHasCopied(false)
    } catch (error) {
      console.error("Failed to disable sharing:", error)
    } finally {
      setIsSharingAction(false)
    }
  }

  const handleCopyLink = () => {
    if (!shareToken) return
    const url = `${window.location.origin}/shared/${shareToken}`
    navigator.clipboard.writeText(url)
    setHasCopied(true)
    setTimeout(() => setHasCopied(false), 2000)
  }

  const allPlacedCodes = Object.values(plan).flat().map(m => m.moduleCode)

  const handleAdd = async (semKey: string, module: Module) => {
    if (!currentPlanId) return 
    const [yearStr, semStr] = semKey.split("-")
    const year = parseInt(yearStr, 10)
    const semester = parseInt(semStr, 10)
    const tempId = `temp-${Date.now()}`
    const moduleWithTempId = { ...module, id: tempId }

    setPlan(prev => ({
      ...prev,
      [semKey]: [...prev[semKey], moduleWithTempId],
    }))

    try {
      const { data } = await api.post(`/plans/${currentPlanId}/slots`, {
        year,
        semester,
        moduleCode: module.moduleCode,
      })
      setPlan(prev => ({
        ...prev,
        [semKey]: prev[semKey].map(m =>
          m.moduleCode === module.moduleCode ? { ...m, id: data.slot.id } : m
        ),
      }))
      loadWorkload(currentPlanId)
    } catch {
      setPlan(prev => ({
        ...prev,
        [semKey]: prev[semKey].filter(m => m.id !== tempId),
      }))
    }
  }

  const handleRemove = async (semKey: string, moduleCode: string) => {
    if (!currentPlanId) return 
    const previous = plan[semKey]
    const moduleToRemove = previous.find(m => m.moduleCode === moduleCode)
    if (!moduleToRemove?.id) return

    setPlan(prev => ({
      ...prev,
      [semKey]: prev[semKey].filter(m => m.moduleCode !== moduleCode),
    }))

    try {
      if (!moduleToRemove.id.startsWith('temp-')) {
        await api.delete(`/plans/${currentPlanId}/slots/${moduleToRemove.id}`)
      }
      loadWorkload(currentPlanId)
    } catch {
      setPlan(prev => ({ ...prev, [semKey]: previous }))
    }
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

          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogContent className="bg-[var(--cw-navy)] border-[var(--cw-navy-border)] text-[var(--cw-white)] sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Plan</DialogTitle>
                <DialogDescription className="text-muted-foreground">
                  Give your new module plan a name (e.g., "Exchange Sem Plan").
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Input
                  value={newPlanName}
                  onChange={(e) => setNewPlanName(e.target.value)}
                  placeholder="Enter plan name..."
                  className="bg-[var(--cw-navy-light)] border-[var(--cw-navy-border)] text-[var(--cw-white)] focus-visible:ring-[var(--cw-teal)]"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitNewPlan()
                  }}
                />
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)} className="text-muted-foreground hover:text-[var(--cw-white)]">
                  Cancel
                </Button>
                <Button onClick={submitNewPlan} disabled={!newPlanName.trim() || isCreating} className="bg-[var(--cw-teal)] text-white hover:bg-[var(--cw-teal-dim)]">
                  {isCreating ? "Saving..." : "Save Plan"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isSearchModalOpen} onOpenChange={setIsSearchModalOpen}>
            <DialogContent className="bg-[var(--cw-navy)] border-[var(--cw-navy-border)] text-[var(--cw-white)] sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add Module</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Search for a module code to add to Year {activeSemesterKey?.split('-')[0]} Semester {activeSemesterKey?.split('-')[1]}.
                </DialogDescription>
              </DialogHeader>
              
              <div className="flex gap-2 py-4">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g., CS2040S or Data Structures..."
                  className="bg-[var(--cw-navy-light)] border-[var(--cw-navy-border)] text-[var(--cw-white)] focus-visible:ring-[var(--cw-teal)] flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') executeSearch()
                  }}
                />
                <Button 
                  onClick={() => executeSearch()} 
                  disabled={isSearching}
                  className="bg-[var(--cw-teal)] text-white hover:bg-[var(--cw-teal-dim)]"
                >
                  {isSearching ? "..." : "Search"}
                </Button>
              </div>

              <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                {searchResults.length === 0 && !isSearching && hasSearched && searchQuery && (
                  <p className="text-sm text-slate-400 text-center py-4">No modules found.</p>
                )}
                {searchResults.map((mod) => (
                  <button
                    key={mod.moduleCode}
                    onClick={() => confirmAddFromSearch(mod)}
                    className="flex flex-col text-left p-3 rounded-md border border-[var(--cw-navy-border)] hover:border-[var(--cw-teal)] bg-[var(--cw-navy-light)] transition-colors group"
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="font-bold text-[var(--cw-white)] group-hover:text-[var(--cw-teal)] transition-colors">
                        {mod.moduleCode}
                      </span>
                      <span className="text-xs font-medium bg-[var(--cw-navy)] px-2 py-1 rounded text-slate-500">
                        {mod.credits} MCs
                      </span>
                    </div>
                    <span className="text-sm text-slate-400 mt-1 truncate w-full">
                      {mod.title}
                    </span>
                  </button>
                ))}
              </div>
            </DialogContent>
          </Dialog>

          {/* Re-added Share Modal */}
          <Dialog open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
            <DialogContent className="bg-[var(--cw-navy)] border-[var(--cw-navy-border)] text-[var(--cw-white)] sm:max-w-[450px]">
              <DialogHeader>
                <DialogTitle>Share Plan</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Allow others to view a read-only version of this plan via a public link.
                </DialogDescription>
              </DialogHeader>

              <div className="py-4">
                {!shareToken ? (
                  <div className="flex flex-col items-center justify-center gap-4 py-6 border border-dashed border-[var(--cw-navy-border)] rounded-lg bg-[var(--cw-navy-light)]">
                    <p className="text-sm text-muted-foreground text-center px-4">
                      This plan is currently private. Generate a share link to make it visible to others.
                    </p>
                    <Button 
                      onClick={handleEnableShare} 
                      disabled={isSharingAction}
                      className="bg-[var(--cw-teal)] text-[var(--cw-navy)] hover:bg-[var(--cw-teal-dim)]"
                    >
                      {isSharingAction ? "Generating..." : "Generate Share Link"}
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                      <Input 
                        readOnly 
                        value={`${window.location.origin}/shared/${shareToken}`}
                        className="bg-[var(--cw-navy)] border-[var(--cw-navy-border)] text-[var(--cw-white)] focus-visible:ring-0 flex-1 cursor-text"
                      />
                      <Button 
                        onClick={handleCopyLink}
                        className="bg-[var(--cw-navy-light)] border border-[var(--cw-navy-border)] text-[var(--cw-white)] hover:bg-[var(--cw-navy-border)] px-3"
                      >
                        {hasCopied ? <Check size={16} className="text-[var(--cw-teal)]" /> : <Copy size={16} />}
                      </Button>
                    </div>

                    <div className="flex justify-between mt-2">
                      <Button 
                        variant="ghost" 
                        onClick={handleRotateShare}
                        disabled={isSharingAction}
                        className="text-xs text-slate-400 hover:text-[var(--cw-white)] flex items-center gap-1 h-8 px-2"
                      >
                        <RefreshCw size={12} /> Rotate Link
                      </Button>
                      <Button 
                        variant="ghost" 
                        onClick={handleDisableShare}
                        disabled={isSharingAction}
                        className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center gap-1 h-8 px-2"
                      >
                        <Unlink size={12} /> Disable Sharing
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isCompareModalOpen} onOpenChange={setIsCompareModalOpen}>
          <DialogContent className="bg-[var(--cw-navy)] border-[var(--cw-navy-border)] text-[var(--cw-white)] sm:max-w-[90vw] h-[85vh] flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="text-2xl">Compare Plans</DialogTitle>
              <DialogDescription className="text-slate-400">
                Select up to 3 plans to compare their workload breakdowns side-by-side.
              </DialogDescription>
              
              <div className="flex flex-wrap gap-2 mt-4 pb-2 border-b border-[var(--cw-navy-border)]">
                {plans.map(p => {
                  const isSelected = selectedComparePlanIds.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => toggleComparePlan(p.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        isSelected 
                          ? "bg-[var(--cw-teal-glow)] text-[var(--cw-teal)] border-[var(--cw-teal)]" 
                          : "bg-[var(--cw-navy-light)] text-slate-400 border-[var(--cw-navy-border)] hover:text-[var(--cw-white)]"
                      }`}
                    >
                      {p.name}
                    </button>
                  )
                })}
              </div>
            </DialogHeader>

            {/* Comparison Grid */}
            <div className="flex-1 overflow-y-auto custom-scrollbar mt-4">
              {isFetchingCompare ? (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Loading comparison data...
                </div>
              ) : (
                <div className={`grid gap-6 ${
                  selectedComparePlanIds.length === 1 ? 'grid-cols-1 max-w-md mx-auto' : 
                  selectedComparePlanIds.length === 2 ? 'grid-cols-2 max-w-4xl mx-auto' : 
                  'grid-cols-3'
                }`}>
                  {(() => {
                    const allActiveSemKeys = Array.from(
                      new Set(
                        selectedComparePlanIds.flatMap(id => 
                          Object.keys(compareWorkloads[id]?.workload || {})
                        )
                      )
                    ).sort(); 

                    return selectedComparePlanIds.map(planId => {
                      const planDetails = plans.find(p => p.id === planId);
                      const wData = compareWorkloads[planId]?.workload || {};
                      
                      return (
                        <div key={planId} className="flex flex-col gap-4 border border-[var(--cw-navy-border)] bg-[var(--cw-navy-light)] rounded-lg p-4">
                          <h3 className="text-lg font-bold text-center border-b border-[var(--cw-navy-border)] pb-2 text-[var(--cw-teal)]">
                            {planDetails?.name}
                          </h3>
                          
                          {allActiveSemKeys.length === 0 ? (
                            <p className="text-sm text-slate-400 text-center py-8">No workload data.</p>
                          ) : (
                            allActiveSemKeys.map(semKey => {
                              const semData = wData[semKey];
                              const semTitle = semKey.replace('year', 'Y').replace('_sem', ' S');

                              if (!semData) {
                                return (
                                  <div key={semKey} className="bg-[var(--cw-navy)] rounded-lg border border-dashed border-[var(--cw-navy-border)] opacity-60 flex flex-col items-center justify-center min-h-[140px]">
                                    <span className="font-bold text-xs text-slate-500 mb-1">{semTitle}</span>
                                    <span className="text-[10px] text-slate-400">No modules planned</span>
                                  </div>
                                );
                              }

                              return (
                                <div key={semKey} className="bg-[var(--cw-navy)] rounded-lg border border-[var(--cw-navy-border)] overflow-hidden">
                                  <div className="bg-[rgba(10,22,40,0.04)] px-3 py-2 border-b border-[var(--cw-navy-border)] flex justify-between items-center">
                                    <span className="font-bold text-xs text-[var(--cw-white)]">
                                      {semTitle}
                                    </span>
                                    <div className="flex gap-2 text-[10px] text-muted-foreground">
                                      <span>{semData.totalMCs} MCs</span>
                                      <span className={semData.totalHours > 50 ? "text-red-500" : "text-[var(--cw-teal)]"}>
                                        {semData.totalHours}h
                                      </span>
                                    </div>
                                  </div>
                                  <div className="p-3">
                                    <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                                      <div className="flex justify-between bg-[rgba(10,22,40,0.04)] rounded px-2 py-1">
                                        <span className="text-slate-400">Lecture:</span><span className="text-[var(--cw-white)]">{semData.breakdown.lecture}h</span>
                                      </div>
                                      <div className="flex justify-between bg-[rgba(10,22,40,0.04)] rounded px-2 py-1">
                                        <span className="text-slate-400">Tutorial:</span><span className="text-[var(--cw-white)]">{semData.breakdown.tutorial}h</span>
                                      </div>
                                      <div className="flex justify-between bg-[rgba(10,22,40,0.04)] rounded px-2 py-1">
                                        <span className="text-slate-400">Lab:</span><span className="text-[var(--cw-white)]">{semData.breakdown.lab}h</span>
                                      </div>
                                      <div className="flex justify-between bg-[rgba(10,22,40,0.04)] rounded px-2 py-1">
                                        <span className="text-slate-400">Project:</span><span className="text-[var(--cw-white)]">{semData.breakdown.project}h</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>
            </DialogContent> 
        </Dialog>
          
          <div className="px-8 pt-6 pb-2 border-b border-[var(--cw-navy-border)]">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-4">
                  <h1 className="text-3xl font-bold tracking-tight">Module Planner</h1>
                  {plans.length > 0 && (
                    <div className="flex items-center gap-2 mt-1">
                      <select
                        value={currentPlanId || ""}
                        onChange={handleSwitchPlan}
                        className="bg-[var(--cw-navy-light)] border border-[var(--cw-navy-border)] text-sm rounded-md px-3 py-1.5 text-[var(--cw-white)] focus:outline-none focus:ring-1 focus:ring-[var(--cw-teal)] cursor-pointer"
                      >
                        {plans.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      <button onClick={handleOpenCreateModal} className="text-xs bg-[var(--cw-teal-glow)] text-[var(--cw-teal)] border border border-[rgba(0,163,136,0.25)] px-3 py-1.5 rounded-md hover:bg-[rgba(0,163,136,0.18)] transition-colors font-medium">
                        + New Plan
                      </button>
                      {plans.length > 1 && (
                        <button onClick={handleDeletePlan} className="text-xs bg-red-500/10 text-red-500 border border border-red-500/20 px-3 py-1.5 rounded-md hover:bg-red-500/20 transition-colors font-medium">
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <p className="text-muted-foreground mt-2 mb-4">
                  Map out your academic journey across all 4 years.
                </p>
              </div>

              <div className="flex gap-2">
              {/* Re-added Share Button */}
              <button
                onClick={() => setIsShareModalOpen(true)}
                disabled={!currentPlanId}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors border ${
                  !currentPlanId 
                    ? "opacity-50 cursor-not-allowed bg-[var(--cw-navy-light)] text-muted-foreground border-[var(--cw-navy-border)]"
                    : "bg-[var(--cw-navy-light)] text-[var(--cw-white)] border-[var(--cw-navy-border)] hover:bg-[var(--cw-navy-border)]"
                }`}
              >
                <Share2 size={16} />
                Share
              </button>

              <button
                onClick={handleOpenCompare}
                disabled={plans.length < 2}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors border ${
                  plans.length < 2 
                    ? "opacity-50 cursor-not-allowed bg-[var(--cw-navy-light)] text-muted-foreground border-[var(--cw-navy-border)]"
                    : "bg-[var(--cw-navy-light)] text-[var(--cw-white)] border-[var(--cw-navy-border)] hover:bg-[var(--cw-navy-border)]"
                }`}
              >
                Compare Plans
              </button>
              <button
                onClick={() => setIsWorkloadOpen(!isWorkloadOpen)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors border ${
                  isWorkloadOpen 
                    ? "bg-[var(--cw-teal)] text-white border-[var(--cw-teal)]" 
                    : "bg-[var(--cw-navy-light)] text-[var(--cw-white)] border-[var(--cw-navy-border)] hover:bg-[var(--cw-navy-border)]"
                }`}
              >
                <Activity size={16} />
                Workload Analysis
              </button>
              </div>
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden relative">
            <div className="flex-1 overflow-auto p-8 pt-4 custom-scrollbar">
              <div style={{ display: "flex", gap: "32px", minWidth: "max-content", paddingBottom: "24px" }}>
                {([1, 2, 3, 4] as const).map(year => (
                  <div key={year} style={{ display: "flex", flexDirection: "column", gap: "24px", width: "400px" }}>
                    <h3 className="text-lg font-semibold text-foreground/80 border-b border-[var(--cw-navy-border)] pb-2">
                      Year {year}
                    </h3>
                    {([1, 2] as const).map(semester => {
                      const key = `${year}-${semester}`
                      return (
                        <SemesterCard
                          key={key}
                          year={year}
                          semester={semester}
                          modules={plan[key]}
                          allModules={allPlacedCodes}
                          onOpenSearch={handleOpenSearch}
                          onRemove={moduleCode => handleRemove(key, moduleCode)}
                        />
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>

            {isWorkloadOpen && (
              <div className="w-80 lg:w-96 flex-shrink-0 bg-[var(--cw-navy-light)] border-l border-[var(--cw-navy-border)] flex flex-col h-full animate-in slide-in-from-right-8 duration-300">
                <div className="p-4 border-b border-[var(--cw-navy-border)] flex justify-between items-center bg-[var(--cw-navy)]">
                  <h2 className="font-semibold flex items-center gap-2 text-[var(--cw-white)]">
                    <Activity size={18} className="text-[var(--cw-teal)]" /> 
                    Workload Analysis
                  </h2>
                  <Button variant="ghost" size="icon" onClick={() => setIsWorkloadOpen(false)} className="h-8 w-8 text-muted-foreground hover:text-[var(--cw-white)]">
                    <X size={16} />
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                  {isLoadingWorkload ? (
                    <div className="flex items-center justify-center h-32 text-muted-foreground">
                      Calculating workload...
                    </div>
                  ) : workloadData && workloadData.workload ? (
                    <div className="flex flex-col gap-6">
                      {Object.entries(workloadData.workload).length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center mt-8">No workload data available.</p>
                      ) : (
                        Object.entries(workloadData.workload).map(([semKey, semData]) => {
                          const title = semKey.replace('year', 'Year ').replace('_sem', ' Semester ')
                          
                          return (
                            <div key={semKey} className="bg-[var(--cw-navy)] rounded-lg border border-[var(--cw-navy-border)] overflow-hidden">
                              
                              <div className="bg-[rgba(10,22,40,0.04)] px-4 py-3 border-b border-[var(--cw-navy-border)] flex justify-between items-center">
                                <span className="font-bold text-sm tracking-wide text-[var(--cw-white)]">{title}</span>
                                <div className="flex gap-3 text-xs text-muted-foreground font-medium">
                                  <span>{semData.totalMCs} MCs</span>
                                  <span className={semData.totalHours > 50 ? "text-red-500" : "text-[var(--cw-teal)]"}>{semData.totalHours} hrs/wk</span>
                                </div>
                              </div>
                              
                              <div className="p-4 flex flex-col gap-3">
                                {semData.flags && semData.flags.length > 0 && (
                                  <div className="flex flex-col gap-2 mb-1">
                                    {semData.flags.includes('overloaded') && (
                                      <div className="flex items-center gap-2 bg-red-500/10 text-red-500 p-2 rounded border border-red-500/20 text-xs">
                                        <AlertTriangle size={14} /> <strong>Overload:</strong> Heavy academic workload.
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="flex justify-between items-center text-xs bg-[rgba(10,22,40,0.04)] rounded px-2.5 py-2 border border-[var(--cw-navy-border)]">
                                    <span className="text-muted-foreground">Lecture:</span>
                                    <span className="text-[var(--cw-white)] font-medium">{semData.breakdown.lecture}h</span>
                                  </div>
                                  <div className="flex justify-between items-center text-xs bg-[rgba(10,22,40,0.04)] rounded px-2.5 py-2 border border-[var(--cw-navy-border)]">
                                    <span className="text-muted-foreground">Tutorial:</span>
                                    <span className="text-[var(--cw-white)] font-medium">{semData.breakdown.tutorial}h</span>
                                  </div>
                                  <div className="flex justify-between items-center text-xs bg-[rgba(10,22,40,0.04)] rounded px-2.5 py-2 border border-[var(--cw-navy-border)]">
                                    <span className="text-muted-foreground">Lab:</span>
                                    <span className="text-[var(--cw-white)] font-medium">{semData.breakdown.lab}h</span>
                                  </div>
                                  <div className="flex justify-between items-center text-xs bg-[rgba(10,22,40,0.04)] rounded px-2.5 py-2 border border-[var(--cw-navy-border)]">
                                    <span className="text-muted-foreground">Project:</span>
                                    <span className="text-[var(--cw-white)] font-medium">{semData.breakdown.project}h</span>
                                  </div>
                                  <div className="flex justify-between items-center text-xs bg-[rgba(10,22,40,0.04)] rounded px-2.5 py-2 border border-[var(--cw-navy-border)] col-span-2">
                                    <span className="text-muted-foreground">Prep (Self-Study):</span>
                                    <span className="text-[var(--cw-white)] font-medium">{semData.breakdown.prep}h</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}