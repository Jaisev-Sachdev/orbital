import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { AppSidebar } from "~/components/app-sidebar"
import { ChartAreaInteractive } from "~/components/chart-area-interactive"
import { DataTable } from "~/components/data-table"
import { SectionCards } from "~/components/section-cards"
import { SiteHeader } from "~/components/site-header"
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar"
import { TooltipProvider } from "~/components/ui/tooltip" 
import { Button } from "~/components/ui/button"

import data from "./data.json"

export default function Page() {
  
  const [isLoggedIn] = useState(() => !!localStorage.getItem("authToken"))

  return (
    <TooltipProvider>
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 72)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as React.CSSProperties
        }
      >
        {/* Pass the auth state to the sidebar */}
        <AppSidebar variant="inset" isLoggedIn={isLoggedIn} />
        
        <SidebarInset>
          <SiteHeader />
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2 h-full">
              <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 h-full">
                
                {isLoggedIn ? (
                  
                  <>
                    <SectionCards />
                    <div className="px-4 lg:px-6">
                      <ChartAreaInteractive />
                    </div>
                    <DataTable data={data as any} />
                  </>
                ) : (
                  
                  <div className="flex flex-col items-center justify-center flex-1 h-full min-h-[60vh] text-center px-4">
                    <h1 className="text-4xl font-bold tracking-tight mb-4">Welcome to Courseway</h1>
                    <p className="text-xl text-muted-foreground mb-8 max-w-2xl">
                      Plan your modules, track your degree progress, and get AI-powered recommendations.
                    </p>
                    <div className="flex gap-4">
                      <Button asChild size="lg">
                        <Link to="/login">Log In</Link>
                      </Button>
                      <Button asChild variant="outline" size="lg">
                        <Link to="/signup">Create Account</Link>
                      </Button>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}