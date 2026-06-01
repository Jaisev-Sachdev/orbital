/**
 * Onboarding  —  app/routes/onboarding.tsx
 *
 * Changes from original:
 *   - Wrapped in <ProtectedRoute> (redirects to /login if no token)
 *   - Raw fetch() → api.post() (Axios client)
 *   - localStorage.getItem("authToken") is now handled by the Axios interceptor
 *     so we don't need to read the token manually here
 *   - After finishing, calls auth.refreshProfile() to update AuthContext
 *   - Courseway brand applied: navy background, teal accents, JetBrains Mono for module chips
 *   - Cohort year is now a dropdown (AY2022/23 through AY2025/26)
 *   - Goals saved to localStorage so recommendations page can use them
 */

import { useState, useEffect } from "react"
import { useNavigate } from "react-router"
import { X, Loader2, Search, CheckCircle2 } from "lucide-react"
import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Textarea } from "~/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select"
import { Label } from "~/components/ui/label"
import { ProtectedRoute, useAuth } from "~/context/AuthContext"
import api from "~/lib/api"

// ─── Types ────────────────────────────────────────────────────────────────────

interface ModuleSearchResult {
  moduleCode: string
  title: string
  credits: number
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepBar({ current }: { current: number }) {
  const steps = ["Profile", "Modules", "Goals"]
  return (
    <div className="flex items-center gap-0 mb-10">
      {steps.map((label, i) => {
        const num  = i + 1
        const done = num < current
        const active = num === current
        return (
          <div key={label} className="flex items-center gap-0 flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
                style={{
                  backgroundColor: done || active ? "var(--cw-teal)" : "var(--cw-navy-light)",
                  border: done || active ? "none" : "1px solid var(--cw-navy-border)",
                  color: done || active ? "var(--cw-navy)" : "rgba(240,244,255,0.4)",
                }}
              >
                {done ? <CheckCircle2 className="h-4 w-4" /> : num}
              </div>
              <span
                className="text-xs font-medium"
                style={{
                  color: active
                    ? "var(--cw-teal)"
                    : done
                    ? "rgba(240,244,255,0.7)"
                    : "rgba(240,244,255,0.35)",
                }}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className="flex-1 h-0.5 mx-2 mb-4 rounded-full transition-all duration-300"
                style={{
                  backgroundColor: num < current ? "var(--cw-teal)" : "var(--cw-navy-border)",
                }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

function OnboardingContent() {
  const navigate = useNavigate()
  const { refreshProfile } = useAuth()
  const [step, setStep] = useState(1)

  const [formData, setFormData] = useState({
    faculty:    "",
    major:      "",
    year:       "Year 1",
    cohortYear: "AY2024/25",
    modules:    [] as string[],
    goals:      "",
  })

  const [moduleSearch, setModuleSearch] = useState("")
  const [searchResults, setSearchResults] = useState<ModuleSearchResult[]>([])
  const [isSearching, setIsSearching]   = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [isLoading, setIsLoading]       = useState(false)

  // Debounced module search
  useEffect(() => {
    if (moduleSearch.length < 2) {
      setSearchResults([])
      return
    }
    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const { data } = await api.get(`/modules?search=${encodeURIComponent(moduleSearch)}`)
        setSearchResults(data.modules || [])
      } catch {
        // silent — user just sees no results
      } finally {
        setIsSearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [moduleSearch])

  const addModule = (moduleCode: string) => {
    if (!formData.modules.includes(moduleCode)) {
      setFormData(prev => ({ ...prev, modules: [...prev.modules, moduleCode] }))
    }
    setModuleSearch("")
    setSearchResults([])
  }

  const removeModule = (moduleCode: string) => {
    setFormData(prev => ({ ...prev, modules: prev.modules.filter(m => m !== moduleCode) }))
  }

  const handleSelectChange = (value: string, name: string) => {
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const canProceedStep1 = formData.faculty && formData.major && formData.year

  const handleFinish = async () => {
    setIsLoading(true)
    setErrorMessage("")

    try {
      const yearOfStudyInt = parseInt(formData.year.replace(/\D/g, "")) || 1

      // 1. Save profile
      await api.post("/profile", {
        major:       formData.major,
        faculty:     formData.faculty,
        cohortYear:  formData.cohortYear,
        yearOfStudy: yearOfStudyInt,
      })

      // 2. Save completed modules (only if any selected)
      if (formData.modules.length > 0) {
        await api.post("/profile/modules", { moduleCodes: formData.modules })
      }

      // 3. Save goals to localStorage so recommendations page can pass them to the AI
      localStorage.setItem("courseGoals", formData.goals)

      await refreshProfile()

      navigate("/recommendations")
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Failed to save your profile. Please try again."
      )
    } finally {
      setIsLoading(false)
    }
  }

  // ── Render ──

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ backgroundColor: "var(--cw-navy)" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <span className="text-2xl font-bold" style={{ color: "var(--cw-teal)" }}>⌘</span>
        <span className="text-xl font-bold" style={{ color: "var(--cw-white)" }}>Courseway</span>
      </div>

      <div
        className="w-full max-w-lg rounded-2xl p-8"
        style={{
          backgroundColor: "var(--cw-navy-light)",
          border: "1px solid var(--cw-navy-border)",
        }}
      >
        <StepBar current={step} />

        {/* ── STEP 1: Profile ── */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <p className="text-xs font-semibold mb-1" style={{ color: "var(--cw-teal)" }}>
                STEP 1 OF 3
              </p>
              <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--cw-white)" }}>
                Let's build your degree plan.
              </h2>
              <p style={{ color: "rgba(240,244,255,0.5)", fontSize: "0.9rem" }}>
                Tell us where you are in your NUS journey. You can change any of this later.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label style={{ color: "rgba(240,244,255,0.7)" }}>Faculty</Label>
                <Select
                  value={formData.faculty}
                  onValueChange={val => handleSelectChange(val, "faculty")}
                >
                  <SelectTrigger style={{ backgroundColor: "var(--cw-navy)", borderColor: "var(--cw-navy-border)", color: "var(--cw-white)" }}>
                    <SelectValue placeholder="Select faculty" />
                  </SelectTrigger>
                  <SelectContent style={{ backgroundColor: "var(--cw-navy-light)" }}>
                    <SelectItem value="School of Computing">School of Computing</SelectItem>
                    <SelectItem value="Faculty of Science">Faculty of Science</SelectItem>
                    <SelectItem value="School of Business">School of Business</SelectItem>
                    <SelectItem value="College of Design and Engineering">College of Design and Engineering</SelectItem>
                    <SelectItem value="Faculty of Arts and Social Sciences">Faculty of Arts and Social Sciences</SelectItem>
                    <SelectItem value="Yong Loo Lin School of Medicine">Yong Loo Lin School of Medicine</SelectItem>
                    <SelectItem value="Faculty of Law">Faculty of Law</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label style={{ color: "rgba(240,244,255,0.7)" }}>Major</Label>
                <Input
                  value={formData.major}
                  onChange={e => setFormData(prev => ({ ...prev, major: e.target.value }))}
                  placeholder="e.g. Computer Science"
                  style={{ backgroundColor: "var(--cw-navy)", borderColor: "var(--cw-navy-border)", color: "var(--cw-white)" }}
                />
              </div>

              <div className="space-y-2">
                <Label style={{ color: "rgba(240,244,255,0.7)" }}>Current year of study</Label>
                <Select
                  value={formData.year}
                  onValueChange={val => handleSelectChange(val, "year")}
                >
                  <SelectTrigger style={{ backgroundColor: "var(--cw-navy)", borderColor: "var(--cw-navy-border)", color: "var(--cw-white)" }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={{ backgroundColor: "var(--cw-navy-light)" }}>
                    <SelectItem value="Year 1">Year 1</SelectItem>
                    <SelectItem value="Year 2">Year 2</SelectItem>
                    <SelectItem value="Year 3">Year 3</SelectItem>
                    <SelectItem value="Year 4">Year 4</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label style={{ color: "rgba(240,244,255,0.7)" }}>Cohort / curriculum year</Label>
                <Select
                  value={formData.cohortYear}
                  onValueChange={val => handleSelectChange(val, "cohortYear")}
                >
                  <SelectTrigger style={{ backgroundColor: "var(--cw-navy)", borderColor: "var(--cw-navy-border)", color: "var(--cw-white)" }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={{ backgroundColor: "var(--cw-navy-light)" }}>
                    <SelectItem value="AY2022/23">AY2022/23</SelectItem>
                    <SelectItem value="AY2023/24">AY2023/24</SelectItem>
                    <SelectItem value="AY2024/25">AY2024/25</SelectItem>
                    <SelectItem value="AY2025/26">AY2025/26</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Modules ── */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <p className="text-xs font-semibold mb-1" style={{ color: "var(--cw-teal)" }}>
                STEP 2 OF 3
              </p>
              <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--cw-white)" }}>
                Which modules have you completed?
              </h2>
              <p style={{ color: "rgba(240,244,255,0.5)", fontSize: "0.9rem" }}>
                Tap to add. We'll use these to find what you're eligible for.
              </p>
            </div>

            <div className="relative">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
                  style={{ color: "rgba(240,244,255,0.35)" }}
                />
                <Input
                  value={moduleSearch}
                  onChange={e => setModuleSearch(e.target.value)}
                  placeholder="Search module code or name…"
                  className="pl-9"
                  style={{ backgroundColor: "var(--cw-navy)", borderColor: "var(--cw-navy-border)", color: "var(--cw-white)" }}
                />
                {isSearching && (
                  <Loader2
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin"
                    style={{ color: "var(--cw-teal)" }}
                  />
                )}
              </div>

              {/* Search results dropdown */}
              {searchResults.length > 0 && (
                <div
                  className="absolute z-20 w-full mt-1 rounded-xl overflow-hidden shadow-xl"
                  style={{ backgroundColor: "var(--cw-navy)", border: "1px solid var(--cw-navy-border)" }}
                >
                  {searchResults.slice(0, 6).map(mod => (
                    <div
                      key={mod.moduleCode}
                      className="px-4 py-3 cursor-pointer flex items-center gap-3 transition-colors"
                      style={{ borderBottom: "1px solid var(--cw-navy-border)" }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--cw-navy-light)")}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
                      onClick={() => addModule(mod.moduleCode)}
                    >
                      <span
                        className="module-code text-xs px-2 py-0.5 rounded shrink-0"
                        style={{ backgroundColor: "var(--cw-teal-glow)", color: "var(--cw-teal)" }}
                      >
                        {mod.moduleCode}
                      </span>
                      <span className="text-sm truncate" style={{ color: "rgba(240,244,255,0.8)" }}>
                        {mod.title}
                      </span>
                      <span className="text-xs shrink-0" style={{ color: "rgba(240,244,255,0.35)" }}>
                        {mod.credits} MC
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected modules */}
            <div>
              <p className="text-xs font-semibold mb-3" style={{ color: "rgba(240,244,255,0.5)" }}>
                YOUR COMPLETED MODULES · {formData.modules.length}
              </p>
              {formData.modules.length === 0 ? (
                <div
                  className="rounded-xl p-6 text-center text-sm"
                  style={{
                    border: "1px dashed var(--cw-navy-border)",
                    color: "rgba(240,244,255,0.3)",
                  }}
                >
                  No modules added yet — search above to add them.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {formData.modules.map(code => (
                    <div
                      key={code}
                      className="flex items-center gap-1.5"
                      style={{
                        backgroundColor: "var(--cw-teal-glow)",
                        border: "1px solid rgba(0,201,167,0.3)",
                        color: "var(--cw-teal)",
                        borderRadius: "9999px",
                        padding: "0.25rem 0.5rem 0.25rem 0.75rem",
                        fontFamily: "JetBrains Mono, monospace",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                      }}
                    >
                      {code}
                      <button
                        onClick={() => removeModule(code)}
                        className="rounded-full p-0.5 transition-colors"
                        style={{ color: "rgba(0,201,167,0.7)" }}
                        onMouseEnter={e => (e.currentTarget.style.color = "var(--cw-teal)")}
                        onMouseLeave={e => (e.currentTarget.style.color = "rgba(0,201,167,0.7)")}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── STEP 3: Goals ── */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <p className="text-xs font-semibold mb-1" style={{ color: "var(--cw-teal)" }}>
                STEP 3 OF 3 · OPTIONAL
              </p>
              <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--cw-white)" }}>
                Any goals or focus areas?
              </h2>
              <p style={{ color: "rgba(240,244,255,0.5)", fontSize: "0.9rem" }}>
                The AI will weight recommendations toward these. You can skip — pick what fits.
              </p>
            </div>

            {/* Focus area quick-pick chips */}
            <div>
              <p className="text-xs font-semibold mb-2" style={{ color: "rgba(240,244,255,0.5)" }}>
                FOCUS AREAS
              </p>
              {[
                "AI/ML", "Systems", "Algorithms", "Security",
                "Theory", "Data Science", "Exchange Semester",
                "Second Major", "Minor", "Light Workload",
              ].map(tag => {
                const isSelected = formData.goals.includes(tag)
                return (
                  <button
                    key={tag}
                    type="button"
                    className="inline-block mr-2 mb-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all"
                    style={{
                      backgroundColor: isSelected ? "var(--cw-teal)" : "var(--cw-navy)",
                      border: isSelected ? "1px solid var(--cw-teal)" : "1px solid var(--cw-navy-border)",
                      color: isSelected ? "var(--cw-navy)" : "rgba(240,244,255,0.7)",
                    }}
                    onClick={() => {
                      const current = formData.goals
                      const next = isSelected
                        ? current.replace(tag, "").replace(/,\s*,/, ",").replace(/^,|,$/g, "").trim()
                        : current ? `${current}, ${tag}` : tag
                      setFormData(prev => ({ ...prev, goals: next }))
                    }}
                  >
                    {tag}
                  </button>
                )
              })}
            </div>

            <div className="space-y-2">
              <Label style={{ color: "rgba(240,244,255,0.7)" }}>
                Anything else we should know? (optional)
              </Label>
              <Textarea
                value={formData.goals}
                onChange={e => setFormData(prev => ({ ...prev, goals: e.target.value }))}
                placeholder="e.g. I want to do an internship in Y3 Sem 2, focusing on AI research…"
                className="min-h-[100px]"
                style={{ backgroundColor: "var(--cw-navy)", borderColor: "var(--cw-navy-border)", color: "var(--cw-white)" }}
              />
            </div>

            {errorMessage && (
              <div
                className="text-sm px-4 py-3 rounded-xl"
                style={{
                  color: "#FF4D4F",
                  backgroundColor: "rgba(255,77,79,0.08)",
                  border: "1px solid rgba(255,77,79,0.2)",
                }}
              >
                {errorMessage}
              </div>
            )}
          </div>
        )}

        {/* ── Footer buttons ── */}
        <div className="flex justify-between mt-8 gap-3">
          {step > 1 ? (
            <Button
              variant="outline"
              onClick={() => setStep(step - 1)}
              disabled={isLoading}
              style={{
                backgroundColor: "transparent",
                borderColor: "var(--cw-navy-border)",
                color: "rgba(240,244,255,0.7)",
              }}
            >
              ← Back
            </Button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={step === 1 && !canProceedStep1}
              style={{
                backgroundColor: "var(--cw-teal)",
                color: "var(--cw-navy)",
                fontWeight: 600,
                opacity: step === 1 && !canProceedStep1 ? 0.5 : 1,
              }}
            >
              Continue →
            </Button>
          ) : (
            <Button
              onClick={handleFinish}
              disabled={isLoading}
              style={{ backgroundColor: "var(--cw-teal)", color: "var(--cw-navy)", fontWeight: 600 }}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                </span>
              ) : (
                "✦ Generate my plan"
              )}
            </Button>
          )}
        </div>

        {/* Privacy note */}
        <p className="text-center text-xs mt-4" style={{ color: "rgba(240,244,255,0.25)" }}>
          Your data stays private — used only to plan your modules.
        </p>
      </div>
    </main>
  )
}

export default function Onboarding() {
  return (
    <ProtectedRoute>
      <OnboardingContent />
    </ProtectedRoute>
  )
}
