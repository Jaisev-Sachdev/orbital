// PlanBuilder.tsx
import { useState, useEffect } from "react"
import { SemesterCard } from "~/components/semester_card"
import api from "~/lib/api"

interface Module {
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

  // fetch existing plan from API on mount
  useEffect(() => {
  api.get("/profile/modules").then(({ data }) => {
    const mapped: PlanMap = {
      "1-1": [], "1-2": [],
      "2-1": [], "2-2": [],
      "3-1": [], "3-2": [],
      "4-1": [], "4-2": [],
    }

   
    ;(data.modules || []).forEach((mod: Module & { semester: string }) => {
      if (mapped[mod.semester]) {
        mapped[mod.semester].push({
          moduleCode: mod.moduleCode,
          title:      mod.title,
          credits:    mod.credits,
        })
      }
    })

    setPlan(mapped)
  })
  }, [])

  // flat list of every module code placed anywhere — passed to each card
  // so the search can filter out already-placed modules
  const allPlacedCodes = Object.values(plan).flat().map(m => m.moduleCode)

  const handleAdd = async (semKey: string, module: Module) => {
    // optimistic update first — UI feels instant
    setPlan(prev => ({
      ...prev,
      [semKey]: [...prev[semKey], module],
    }))

    try {
      await api.post("/profile/modules", {
        moduleCode: module.moduleCode,
        semester:   semKey,           // adjust to match your API's expected shape
      })
    } catch {
      // roll back if API fails
      setPlan(prev => ({
        ...prev,
        [semKey]: prev[semKey].filter(m => m.moduleCode !== module.moduleCode),
      }))
    }
  }

  const handleRemove = async (semKey: string, moduleCode: string) => {
    const previous = plan[semKey]

    // optimistic update
    setPlan(prev => ({
      ...prev,
      [semKey]: prev[semKey].filter(m => m.moduleCode !== moduleCode),
    }))

    try {
      await api.delete(`/profile/modules/${moduleCode}`)
    } catch {
      // roll back
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