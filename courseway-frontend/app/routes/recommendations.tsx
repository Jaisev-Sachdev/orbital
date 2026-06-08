import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { AppSidebar } from "~/components/app-sidebar"
import { SiteHeader } from "~/components/site-header"
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "~/components/ui/card"
import { Button } from "~/components/ui/button"
import { Loader2, Sparkles, AlertCircle } from "lucide-react"
import { TooltipProvider } from "~/components/ui/tooltip"
import api from "~/lib/api"

type Recommendation = {
  moduleCode: string;
  title: string;
  reason: string;
}

export default function RecommendationsPage() {
  const navigate = useNavigate()
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const token = localStorage.getItem("authToken")
    if (!token) {
      navigate("/")
      return
    }
    
    const fetchRecommendations = async () => {
      try {
        const goals = localStorage.getItem("courseGoals") || ""
        const { data } = await api.post("/recommendations", { goals })
        setRecommendations(data.recommendations || [])
      } catch (err: any) {
        setError(
          err.response?.data?.error ||
          "Failed to fetch recommendations. Make sure you completed onboarding first."
        )
      } finally {
        setIsLoading(false)
      }
    }

    fetchRecommendations()
  }, [navigate])

  return (
    <TooltipProvider>
    <SidebarProvider
      style={{
        "--sidebar-width": "calc(var(--spacing) * 72)",
        "--header-height": "calc(var(--spacing) * 12)",
      } as React.CSSProperties}
    >
      <AppSidebar variant="inset" isLoggedIn={true} />
      
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col p-4 md:p-8">
          
          <div className="mb-8 flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-full text-primary">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">AI Module Suggestions</h1>
              <p className="text-muted-foreground mt-1">
                Personalized recommendations based on your completed modules and academic goals.
              </p>
            </div>
          </div>

          {isLoading && (
            <div className="flex flex-col items-center justify-center flex-1 min-h-[40vh] text-muted-foreground">
              <Loader2 className="h-10 w-10 animate-spin mb-4 text-primary" />
              <p>Analyzing your profile and generating suggestions...</p>
            </div>
          )}

          {error && !isLoading && (
            <div className="flex flex-col items-center justify-center flex-1 min-h-[40vh] text-center max-w-md mx-auto">
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <h3 className="text-lg font-semibold">Something went wrong</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>Try Again</Button>
            </div>
          )}

          {!isLoading && !error && recommendations.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendations.map((mod) => (
                <Card key={mod.moduleCode} className="flex flex-col h-full border-primary/20 bg-gradient-to-b from-card to-primary/5 hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <div className="flex justify-between items-start mb-2">
                      <span className="inline-flex items-center rounded-md bg-primary/10 px-2.5 py-0.5 text-sm font-semibold text-primary">
                        {mod.moduleCode}
                      </span>
                    </div>
                    <CardTitle className="line-clamp-2 leading-tight">{mod.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                      Why this module?
                    </h4>
                    <CardDescription className="text-sm leading-relaxed text-foreground/80">
                      {mod.reason}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!isLoading && !error && recommendations.length === 0 && (
            <div className="text-center py-20 text-muted-foreground">
              <p>No recommendations found at this time. Try updating your profile goals!</p>
            </div>
          )}

        </div>
      </SidebarInset>
    </SidebarProvider>
    </TooltipProvider>
  )
}
