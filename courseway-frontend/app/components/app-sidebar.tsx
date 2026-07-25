import * as React from "react"
import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { Button } from "~/components/ui/button"
import { NavDocuments } from "~/components/nav-documents"
import { NavMain } from "~/components/nav-main"
import { NavUser } from "~/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "~/components/ui/sidebar"
import { Calendar, Network, DatabaseIcon, Sparkles, Users, GraduationCap } from "lucide-react"
import api from "~/lib/api"

const data = {
  navMain: [
    {
      title: "Module Planner",
      url: "/module-planning",
      icon: <Calendar />,
    },
    {
      title: "Module Recommendations",
      url: "/recommendations",
      icon: <Sparkles />,
    },
    {
      title: "Prerequisites",
      url: "/prerequisites",
      icon: <Network />,
    },
    {
      title: "Graduation Requirements",
      url: "/graduation",
      icon: <GraduationCap />,
    }
  ],
  documents: [
    {
      name: "Onboarding",
      url: "../onboarding",
      icon: <DatabaseIcon />,
    },
    {
      name: "Profile",
      url: "../profile",
      icon: <Users />,
    }
  ],
}

export function AppSidebar({ 
  isLoggedIn = false, 
  ...props 
}: React.ComponentProps<typeof Sidebar> & { isLoggedIn?: boolean }) {
  

  const [userData, setUserData] = useState({
    name: "Loading...",
    email: "",
    avatar: "", 
  })

  useEffect(() => {
    if (isLoggedIn) {
      api.get('/auth/me')
        .then((res) => {
          if (res.data?.user) {
            const fetchedUser = res.data.user
            setUserData({
              name: fetchedUser.name || "Student", 
              email: fetchedUser.email || "",
              avatar: "", 
            })
          }
        })
        .catch((error) => {
          console.error("Failed to load user data for sidebar:", error)
          setUserData({ name: "Error loading user", email: "", avatar: "" })
        })
    }
  }, [isLoggedIn])

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <a href="/">
                <img src="/logo.png" alt="Courseway" className="h-9 w-auto" />
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavDocuments items={data.documents} />
      </SidebarContent>
      
      <SidebarFooter>
        {isLoggedIn ? (
          <NavUser user={userData} />
        ) : (
          <div className="flex flex-col gap-2 p-2">
            <Button asChild variant="default" className="w-full">
              <Link to="/login">Log In</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/signup">Sign Up</Link>
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}
