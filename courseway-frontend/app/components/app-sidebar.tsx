import * as React from "react"
import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { Button } from "~/components/ui/button"
import { NavDocuments } from "~/components/nav-documents"
import { NavMain } from "~/components/nav-main"
// import { NavSecondary } from "~/components/nav-secondary" // Uncomment if needed
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
import { Calendar, Network, DatabaseIcon, Sparkles, CommandIcon, Users } from "lucide-react"
import api from "~/lib/api"

// Removed the hardcoded user data from here
const data = {
  navMain: [
    {
      title: "Module Planner",
      url: "#",
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
  
  // 1. Add state to hold dynamic user data
  const [userData, setUserData] = useState({
    name: "Loading...",
    email: "",
    avatar: "", // You can add a default avatar path here if you have one
  })

  // 2. Fetch the user's details on component mount if logged in
  useEffect(() => {
    if (isLoggedIn) {
      api.get('/auth/me')
        .then((res) => {
          if (res.data?.user) {
            const fetchedUser = res.data.user
            setUserData({
              // If name is null/empty, fallback to "User" or the prefix of their email
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
                <CommandIcon className="size-5!" />
                <span className="text-base font-semibold">Courseway</span>
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
          // 3. Pass the fetched state into NavUser
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