import { useState, useEffect } from "react"
import { SemesterCard } from "~/components/semester_card"
import { AppSidebar } from "~/components/app-sidebar"
import { SiteHeader } from "~/components/site-header"
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar"
import {TooltipProvider} from "~/components/ui/tooltip"
import api from "~/lib/api"

interface Module {
  id?:        string 
  moduleCode: string
  title:      string
  credits:    number
}

type PlanMap = Record<string, Module[]>

export default function PlanBuilder() {
  const [plan, setPlan] = useState<PlanMap>({
    "1-1": [], "1-2": [],
    "2-1": [], "2-2": [],
    "3-1": [], "3-2": [],
    "4-1": [], "4-2": [],
  })

  // State to hold the dynamic Plan ID
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null)

  useEffect(() => {
    const initializePlan = async () => {
      try {
        // 1. GET /plans: Fetch the user's plans
        const { data: plansData } = await api.get('/plans')
        let planId = ''

        if (plansData.plans && plansData.plans.length > 0) {
          planId = plansData.plans[0].id
        } else {
          // 2. POST /plans: If no plans exist, create a default one
          const { data: newPlanData } = await api.post('/plans', { name: 'Main Plan' })
          planId = newPlanData.plan.id
        }

        setCurrentPlanId(planId)

        // 3. GET /plans/:id/slots: Fetch the slots for this specific plan
        const { data: slotsData } = await api.get(`/plans/${planId}/slots`)
        
        // Prepare an empty plan map
        const newPlan: PlanMap = { 
          "1-1": [], "1-2": [], "2-1": [], "2-2": [], 
          "3-1": [], "3-2": [], "4-1": [], "4-2": [] 
        }

        // Map the backend's "year1_sem1" format to the frontend's "1-1" format
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
        console.error("Failed to load or create plan:", error)
      }
    }

    initializePlan()
  }, [])

  const allPlacedCodes = Object.values(plan).flat().map(m => m.moduleCode)

  const handleAdd = async (semKey: string, module: Module) => {
    if (!currentPlanId) return // Guard clause

    const [yearStr, semStr] = semKey.split("-")
    const year = parseInt(yearStr, 10)
    const semester = parseInt(semStr, 10)

    // Optimistic UI Update: Give it a temporary ID so the UI updates instantly
    const tempId = `temp-${Date.now()}`
    const moduleWithTempId = { ...module, id: tempId }

    setPlan(prev => ({
      ...prev,
      [semKey]: [...prev[semKey], moduleWithTempId],
    }))

    try {
      // 4. POST /plans/:id/slots: Add the module to the database
      const { data } = await api.post(`/plans/${currentPlanId}/slots`, {
        year,
        semester,
        moduleCode: module.moduleCode,
      })

      // Replace the temporary UI ID with the real slot.id from the database
      setPlan(prev => ({
        ...prev,
        [semKey]: prev[semKey].map(m =>
          m.moduleCode === module.moduleCode ? { ...m, id: data.slot.id } : m
        ),
      }))
    } catch {
      // Roll back the UI if the API request fails
      setPlan(prev => ({
        ...prev,
        [semKey]: prev[semKey].filter(m => m.moduleCode !== module.moduleCode),
      }))
    }
  }

  const handleRemove = async (semKey: string, moduleCode: string) => {
    if (!currentPlanId) return // Guard clause

    const previous = plan[semKey]
    const moduleToRemove = previous.find(m => m.moduleCode === moduleCode)

    if (!moduleToRemove?.id) return

    // Optimistic UI Update: Remove it from the screen instantly
    setPlan(prev => ({
      ...prev,
      [semKey]: prev[semKey].filter(m => m.moduleCode !== moduleCode),
    }))

    try {
      // 5. DELETE /plans/:id/slots/:slotId: Remove it from the database
      if (!moduleToRemove.id.startsWith('temp-')) {
        await api.delete(`/plans/${currentPlanId}/slots/${moduleToRemove.id}`)
      }
    } catch {
      // Roll back the UI if the API request fails
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
          
          <div className="px-8 pt-6 pb-2">
            <h1 className="text-3xl font-bold tracking-tight">Module Planner</h1>
            <p className="text-muted-foreground mt-1">
              Map out your academic journey across all 4 years.
            </p>
          </div>

          {/* ── Scrollable Canvas Area ── */}
          <div className="flex-1 overflow-auto p-8 pt-4 custom-scrollbar">
            <div style={{ 
              display: "flex", 
              gap: "32px", 
              minWidth: "max-content", // Forces the container to stretch and trigger horizontal scroll 
              paddingBottom: "24px" 
            }}>
              {([1, 2, 3, 4] as const).map(year => (
                <div 
                  key={year} 
                  style={{ 
                    display: "flex", 
                    flexDirection: "column", 
                    gap: "24px", 
                    width: "400px" // Enlarged cards to prevent empty space
                  }}
                >
                  {/* Optional Year Header to organize visually */}
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