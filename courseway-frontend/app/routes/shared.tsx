import { useEffect, useState } from "react"
import { useParams, Link } from "react-router-dom"
import { Button } from "~/components/ui/button"
import { GraduationCap, AlertCircle } from "lucide-react"
import api from "~/lib/api"

interface SharedSlot {
  year: number
  semester: number
  moduleCode: string
  title: string | null
  credits: number | null
}

interface SharedPlanResponse {
  planName: string
  ownerName: string
  slots: SharedSlot[]
  grouped: Record<string, SharedSlot[]>
}

// public, unauthenticated read-only view for a shared plan link
export default function SharedPlan() {
  const { token } = useParams()
  const [data, setData] = useState<SharedPlanResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return

    const fetchSharedPlan = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const { data } = await api.get(`/plans/shared/${token}`)
        setData(data)
      } catch (err: any) {
        setError(
          err.response?.status === 404
            ? "This shared plan doesn't exist or the link has been disabled."
            : "Could not load this shared plan. Please try again later."
        )
      } finally {
        setIsLoading(false)
      }
    }

    fetchSharedPlan()
  }, [token])

  const semesterOrder = data
    ? Object.keys(data.grouped).sort((a, b) => {
        const [ay, as] = a.replace("year", "").split("_sem").map(Number)
        const [by, bs] = b.replace("year", "").split("_sem").map(Number)
        return ay - by || as - bs
      })
    : []

  return (
    <div className="min-h-screen bg-[var(--cw-navy)] text-[var(--cw-white)] flex flex-col">
      <nav className="flex items-center justify-between px-6 py-4 md:px-12 border-b border-[var(--cw-navy-border)]">
        <Link to="/" className="flex items-center gap-2">
          <span className="font-bold text-xl tracking-tight text-[var(--cw-white)]">
            Courseway
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <Link to="/login">
            <Button variant="ghost" className="text-muted-foreground hover:text-[var(--cw-white)]">
              Log In
            </Button>
          </Link>
          <Link to="/signup">
            <Button className="bg-[var(--cw-teal)] text-white hover:bg-[var(--cw-teal-dim)] font-semibold">
              Sign Up
            </Button>
          </Link>
        </div>
      </nav>

      <main className="flex-1 p-6 md:p-12">
        {isLoading ? (
          <div className="flex justify-center items-center h-40 text-slate-400">
            Loading shared plan...
          </div>
        ) : error ? (
          <div className="max-w-md mx-auto mt-16 flex flex-col items-center text-center gap-3">
            <AlertCircle size={28} className="text-red-400" />
            <h3 className="text-lg font-bold text-[var(--cw-white)]">Plan not found</h3>
            <p className="text-sm text-slate-400 leading-relaxed">{error}</p>
            <Link to="/" className="mt-2">
              <Button variant="outline" className="border-[var(--cw-navy-border)] text-[var(--cw-white)] hover:bg-[var(--cw-navy-light)]">
                Go to Courseway
              </Button>
            </Link>
          </div>
        ) : data ? (
          <div className="max-w-5xl mx-auto flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <GraduationCap className="text-[var(--cw-teal)]" size={32} />
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{data.planName}</h1>
                <p className="text-sm text-slate-400">Shared by {data.ownerName} · read-only view</p>
              </div>
            </div>

            {semesterOrder.length === 0 ? (
              <p className="text-slate-400 text-center mt-12">This plan doesn't have any modules yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {semesterOrder.map((key) => {
                  const slots = data.grouped[key]
                  const title = key.replace("year", "Year ").replace("_sem", " Semester ")
                  const totalCredits = slots.reduce((sum, s) => sum + (s.credits || 0), 0)
                  return (
                    <div key={key} className="rounded-xl border border-[var(--cw-navy-border)] bg-[var(--cw-navy-light)] flex flex-col">
                      <div className="flex items-center justify-between p-4 pb-3 border-b border-[var(--cw-navy-border)]">
                        <h3 className="font-semibold text-sm">{title}</h3>
                        <span className="text-xs font-medium text-slate-400 border border-[var(--cw-navy-border)] px-2 py-0.5 rounded-md">
                          {totalCredits} MCs
                        </span>
                      </div>
                      <div className="p-4 flex flex-col gap-2">
                        {slots.map((slot) => (
                          <div key={slot.moduleCode} className="flex flex-col p-2.5 rounded-lg border border-[var(--cw-navy-border)] bg-[var(--cw-navy)]">
                            <span className="font-semibold text-sm">{slot.moduleCode}</span>
                            {slot.title && (
                              <span className="text-xs text-slate-400 truncate">{slot.title}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="mt-8 text-center border-t border-[var(--cw-navy-border)] pt-6">
              <p className="text-sm text-slate-400 mb-3">Want to plan your own modules?</p>
              <Link to="/signup">
                <Button className="bg-[var(--cw-teal)] text-white hover:bg-[var(--cw-teal-dim)] font-semibold">
                  Get Started with Courseway
                </Button>
              </Link>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  )
}
