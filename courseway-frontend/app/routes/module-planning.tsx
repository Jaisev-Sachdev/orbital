// PlanBuilder.tsx
import { useState, useEffect } from "react"
import { SemesterCard } from "~/components/semester_card"
import api from "~/lib/api"

interface Module {
  id?:        string // Added to store the database slot ID for deletion
  moduleCode: string
  title:      string
  credits:    number
}

type PlanMap = Record<string, Module[]>

// ⚠️ Note: For testing, you will need to hardcode a valid Plan ID from your database here.
// Eventually, fetch this from GET /plans 
const CURRENT_PLAN_ID = "your-database-plan-id"

export default function PlanBuilder() {
  const [plan, setPlan] = useState<PlanMap>({
    "1-1": [], "1-2": [],
    "2-1": [], "2-2": [],
    "3-1": [], "3-2": [],
    "4-1": [], "4-2": [],
  })

  // 1. Fetch existing plan slots on mount
  useEffect(() => {
    // Using the MS2 endpoint to get slots [cite: 32]
    api.get(`/plans/${CURRENT_PLAN_ID}/slots`).then(({ data }) => {
      const mapped: PlanMap = {
        "1-1": [], "1-2": [],
        "2-1": [], "2-2": [],
        "3-1": [], "3-2": [],
        "4-1": [], "4-2": [],
      }

      // Map the flat array back into the "year-semester" buckets [cite: 34]
      ;(data.slots || []).forEach((slot: any) => {
        const semKey = `${slot.year}-${slot.semester}`
        if (mapped[semKey]) {
          mapped[semKey].push({
            id:         slot.id,          
            moduleCode: slot.moduleCode,
            // ⚠️ Ensure your backend GET /plans/:id/slots performs a join 
            // to return title and credits!
            title:      slot.title || slot.moduleCode, 
            credits:    slot.credits || 4,             
          })
        }
      })

      setPlan(mapped)
    }).catch(() => {
      console.error("Failed to load plan slots.")
    })
  }, [])

  const allPlacedCodes = Object.values(plan).flat().map(m => m.moduleCode)

  const handleAdd = async (semKey: string, module: Module) => {
    // Parse "1-1" into year: 1, semester: 1 
    const [yearStr, semStr] = semKey.split("-")
    const year = parseInt(yearStr, 10)
    const semester = parseInt(semStr, 10)

    // Generate a temporary ID so React doesn't complain about missing keys during optimistic update
    const tempId = `temp-${Date.now()}`
    const moduleWithTempId = { ...module, id: tempId }

    setPlan(prev => ({
      ...prev,
      [semKey]: [...prev[semKey], moduleWithTempId],
    }))

    try {
      // 2. Add one module to a semester [cite: 21, 22]
      const { data } = await api.post(`/plans/${CURRENT_PLAN_ID}/slots`, {
        year,
        semester,
        moduleCode: module.moduleCode,
      })

      // Update the temporary ID with the real slot ID returned from the database [cite: 24]
      setPlan(prev => ({
        ...prev,
        [semKey]: prev[semKey].map(m =>
          m.moduleCode === module.moduleCode ? { ...m, id: data.slot.id } : m
        ),
      }))
    } catch {
      // Roll back if API fails
      setPlan(prev => ({
        ...prev,
        [semKey]: prev[semKey].filter(m => m.moduleCode !== module.moduleCode),
      }))
    }
  }

  const handleRemove = async (semKey: string, moduleCode: string) => {
    const previous = plan[semKey]
    const moduleToRemove = previous.find(m => m.moduleCode === moduleCode)

    if (!moduleToRemove?.id) return

    // Optimistic update
    setPlan(prev => ({
      ...prev,
      [semKey]: prev[semKey].filter(m => m.moduleCode !== moduleCode),
    }))

    try {
      // 3. Remove a module using its unique slotId [cite: 28, 29]
      if (!moduleToRemove.id.startsWith('temp-')) {
        await api.delete(`/plans/${CURRENT_PLAN_ID}/slots/${moduleToRemove.id}`)
      }
    } catch {
      // Roll back
      setPlan(prev => ({ ...prev, [semKey]: previous }))
    }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, padding: 24 }}>
      {([1, 2, 3, 4] as const).map(year =>
        ([1, 2] as const).map(semester => {
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
        })
      )}
    </div>
  )
}