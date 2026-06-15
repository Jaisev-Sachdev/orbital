import { useState, useEffect } from "react"
import { SemesterCard } from "~/components/semester_card"
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
import api from "~/lib/api"

interface Module {
  id?:        string 
  moduleCode: string
  title:      string
  credits:    number
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

  // State for the create plan modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newPlanName, setNewPlanName] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  // State for the delete plan modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // 1. Reusable function to fetch slots for a given plan ID
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
    } catch (error) {
      console.error("Failed to load plan slots:", error)
    }
  }

  // 2. Initial load of all plans
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

  // 3. Dropdown handler to switch plans
  const handleSwitchPlan = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPlanId = e.target.value
    setCurrentPlanId(newPlanId)
    setPlan(EMPTY_PLAN) 
    loadPlanSlots(newPlanId)
  }

  // 4. Handlers to create a new plan via Modal
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
      loadPlanSlots(data.plan.id)
      setIsCreateModalOpen(false) 
    } catch (error) {
      console.error("Failed to create new plan:", error)
      alert("Failed to create plan. Please try again.")
    } finally {
      setIsCreating(false)
    }
  }

  // 5. Handlers to delete a plan via Modal
  const handleDeleteClick = () => {
    if (plans.length > 1) {
      setIsDeleteModalOpen(true)
    } else {
      alert("You cannot delete your only plan!")
    }
  }

  const executeDeletePlan = async () => {
    if (!currentPlanId) return
    setIsDeleting(true)

    try {
      await api.delete(`/plans/${currentPlanId}`)
      const remainingPlans = plans.filter(p => p.id !== currentPlanId)
      setPlans(remainingPlans)
      
      const fallbackId = remainingPlans[0].id
      setCurrentPlanId(fallbackId)
      loadPlanSlots(fallbackId)
      setIsDeleteModalOpen(false) 
    } catch (error) {
      console.error("Failed to delete plan:", error)
      alert("Failed to delete plan. Please try again.")
    } finally {
      setIsDeleting(false)
    }
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
    } catch {
      setPlan(prev => ({
        ...prev,
        [semKey]: prev[semKey].filter(m => m.moduleCode !== module.moduleCode),
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

          {/* ── Create Plan Modal ── */}
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
                  className="bg-[var(--cw-navy-light)] border-[var(--cw-navy-border)] text-white focus-visible:ring-[var(--cw-teal)]"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitNewPlan()
                  }}
                />
              </div>

              <DialogFooter>
                <Button
                  variant="ghost"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-muted-foreground hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  onClick={submitNewPlan}
                  disabled={!newPlanName.trim() || isCreating}
                  className="bg-[var(--cw-teal)] text-[var(--cw-navy)] hover:bg-[var(--cw-teal-dim)]"
                >
                  {isCreating ? "Saving..." : "Save Plan"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* ── Delete Plan Modal ── */}
          <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
            <DialogContent className="bg-[var(--cw-navy)] border-[var(--cw-navy-border)] text-[var(--cw-white)] sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="text-red-400">Delete Plan</DialogTitle>
                <DialogDescription className="text-muted-foreground mt-2">
                  Are you sure you want to delete this plan? This will permanently remove the plan and all modules inside it. This action cannot be undone.
                </DialogDescription>
              </DialogHeader>

              <DialogFooter className="mt-4">
                <Button
                  variant="ghost"
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="text-muted-foreground hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  onClick={executeDeletePlan}
                  disabled={isDeleting}
                  className="bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300 border border-red-500/20"
                >
                  {isDeleting ? "Deleting..." : "Yes, Delete Plan"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <div className="px-8 pt-6 pb-2">
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold tracking-tight">Module Planner</h1>
              
              {/* ── Plan Selection Dropdown & Controls ── */}
              {plans.length > 0 && (
                <div className="flex items-center gap-2 mt-1">
                  <select
                    value={currentPlanId || ""}
                    onChange={handleSwitchPlan}
                    className="bg-[var(--cw-navy-light)] border border-[var(--cw-navy-border)] text-sm rounded-md px-3 py-1.5 text-white focus:outline-none focus:ring-1 focus:ring-[var(--cw-teal)] cursor-pointer"
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  
                  <button
                    onClick={handleOpenCreateModal}
                    className="text-xs bg-[var(--cw-teal-glow)] text-[var(--cw-teal)] border border-[rgba(0,201,167,0.3)] px-3 py-1.5 rounded-md hover:bg-[rgba(0,201,167,0.25)] transition-colors font-medium whitespace-nowrap"
                  >
                    + New Plan
                  </button>
                  
                  {plans.length > 1 && (
                    <button
                      onClick={handleDeleteClick}
                      className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1.5 rounded-md hover:bg-red-500/20 transition-colors font-medium whitespace-nowrap"
                    >
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>

            <p className="text-muted-foreground mt-2">
              Map out your academic journey across all 4 years.
            </p>
          </div>

          {/* ── Scrollable Canvas Area ── */}
          <div className="flex-1 overflow-auto p-8 pt-4 custom-scrollbar">
            <div style={{ 
              display: "flex", 
              gap: "32px", 
              minWidth: "max-content", 
              paddingBottom: "24px" 
            }}>
              {([1, 2, 3, 4] as const).map(year => (
                <div 
                  key={year} 
                  style={{ 
                    display: "flex", 
                    flexDirection: "column", 
                    gap: "24px", 
                    width: "400px" 
                  }}
                >
                  <h3 className="text-lg font-semibold text-foreground/80 border-b pb-2">
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
                        onAdd={module => handleAdd(key, module)}
                        onRemove={moduleCode => handleRemove(key, moduleCode)}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}