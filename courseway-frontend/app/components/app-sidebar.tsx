import * as React from "react"
import { Link } from "react-router-dom"
import { Button } from "~/components/ui/button"
import { NavDocuments } from "~/components/nav-documents"
import { NavMain } from "~/components/nav-main"
import { NavSecondary } from "~/components/nav-secondary"
import { NavUser } from "~/components/nav-user"
import  api  from "~/lib/api" // Import your custom Axios client
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "~/components/ui/sidebar"
import { Calendar, Network, GraduationCap, Scale, LayoutDashboardIcon, ListIcon, ChartBarIcon, FolderIcon, UsersIcon, CameraIcon, FileTextIcon, Settings2Icon, CircleHelpIcon, SearchIcon, DatabaseIcon, FileChartColumnIcon, FileIcon, CommandIcon } from "lucide-react"

// Static layout data (Removed the hardcoded user mock)
const data = {
  navMain: [
    {
      title: "Planner",
      url: "#",
      icon: <Calendar />,
    },
    {
      title: "Modules",
      url: "#",
      icon: <FolderIcon />,
    },
    {
      title: "Prerequisites",
      url: "/prerequisites",
      icon: <Network />,
    },
    {
      title: "Graduation",
      url: "#",
      icon: <GraduationCap />,
    },
    {
      title: "Compare",
      url: "#",
      icon: <Scale />,
    },
  ],
  navClouds: [
    {
      title: "Capture",
      icon: <CameraIcon />,
      isActive: true,
      url: "#",
      items: [
        { title: "Active Proposals", url: "#" },
        { title: "Archived", url: "#" },
      ],
    },
    {
      title: "Proposal",
      icon: <FileTextIcon />,
      url: "#",
      items: [
        { title: "Active Proposals", url: "#" },
        { title: "Archived", url: "#" },
      ],
    },
    {
      title: "Prompts",
      icon: <FileTextIcon />,
      url: "#",
      items: [
        { title: "Active Proposals", url: "#" },
        { title: "Archived", url: "#" },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "#",
      icon: <Settings2Icon />,
    },
    {
      title: "Get Help",
      url: "#",
      icon: <CircleHelpIcon />,
    },
    {
      title: "Search",
      url: "#",
      icon: <SearchIcon />,
    },
  ],
  documents: [
    {
      name: "Onboarding",
      url: "../onboarding",
      icon: <DatabaseIcon />,
    },
    {
      name: "Reports",
      url: "#",
      icon: <FileChartColumnIcon />,
    },
    {
      name: "Word Assistant",
      url: "#",
      icon: <FileIcon />,
    },
  ],
}

export function AppSidebar({ 
  isLoggedIn = false, 
  ...props 
}: React.ComponentProps<typeof Sidebar> & { isLoggedIn?: boolean }) {
  
  // Set up local state for the fetched profile details
  const [profile, setProfile] = React.useState<{ name: string; email: string; avatar: string } | null>(null)

  // Fetch the profile dynamically when the user is logged in
  React.useEffect(() => {
    if (isLoggedIn) {
      api.get("/profile")
        .then((res) => {
          const profileData = res.data.profile
          // Map database items cleanly into the UI fields
          setProfile({
            name: `${profileData.major} (Y${profileData.yearOfStudy})`,
            email: profileData.faculty || "School of Computing",
            avatar: "/avatars/shadcn.jpg" // Fallback to your existing avatar path
          })
        })
        .catch((err) => {
          console.error("Failed to load user profile in sidebar:", err)
        })
    } else {
      // Clear profile if logged out
      setProfile(null)
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
              <a href="#">
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
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        {/* Render NavUser if logged in and profile is fetched successfully */}
        {isLoggedIn && profile ? (
          <NavUser user={profile} />
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