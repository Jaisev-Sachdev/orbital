import { useState, useEffect } from "react"
import { AppSidebar } from "~/components/app-sidebar"
import { SiteHeader } from "~/components/site-header"
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar"
import { TooltipProvider } from "~/components/ui/tooltip"
import { Input } from "~/components/ui/input"
import { Button } from "~/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select"
import { User, GraduationCap, Mail } from "lucide-react" 
import api from "~/lib/api"
import { NUS_MAJORS } from "~/lib/nusMajors"

export default function ProfileSettings() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Form State
  const [name, setName] = useState("")
  const [email, setEmail] = useState("") 
  const [major, setMajor] = useState("")
  const [faculty, setFaculty] = useState("")
  const [yearOfStudy, setYearOfStudy] = useState<number | "">("")
  const [cohortYear, setCohortYear] = useState("")

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const [authRes, profileRes] = await Promise.all([
          api.get('/auth/me'),
          api.get('/profile')
        ])

        if (authRes.data.user) {
          setName(authRes.data.user.name || "")
          setEmail(authRes.data.user.email || "")
        }

        if (profileRes.data.hasProfile && profileRes.data.profile) {
          const p = profileRes.data.profile
          setMajor(p.major || "")
          setFaculty(p.faculty || "")
          setYearOfStudy(p.yearOfStudy || "")
          setCohortYear(p.cohortYear || "")
        }
      } catch (error) {
        console.error("Failed to load profile data:", error)
        setMessage({ type: 'error', text: "Failed to load profile data." })
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfileData()
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    setMessage(null)
    
    try {
      await api.put('/auth/me', { name })

      await api.post('/profile', {
        major,
        faculty,
        yearOfStudy: typeof yearOfStudy === 'string' ? parseInt(yearOfStudy, 10) : yearOfStudy,
        cohortYear
      })

      setMessage({ type: 'success', text: "Profile updated successfully!" })
    } catch (error) {
      console.error("Failed to save profile:", error)
      setMessage({ type: 'error', text: "Failed to save profile changes. Please check your inputs." })
    } finally {
      setIsSaving(false)
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
        <SidebarInset className="flex flex-col h-screen overflow-hidden bg-[var(--cw-navy-dark)]">
          <SiteHeader />

          <div className="flex-1 overflow-auto p-8 custom-scrollbar">
            <div className="max-w-2xl mx-auto">
              <div className="mb-8 border-b border-[var(--cw-navy-border)] pb-4">
                <h1 className="text-3xl font-bold tracking-tight text-white">Profile Settings</h1>
                <p className="text-muted-foreground mt-2">
                  Manage your personal information and academic details.
                </p>
              </div>

              {isLoading ? (
                <div className="text-slate-400 flex items-center justify-center py-12">
                  Loading profile data...
                </div>
              ) : (
                <div className="flex flex-col gap-8">
                  
                  {/* Account Settings Section */}
                  <div className="bg-[var(--cw-navy)] border border-[var(--cw-navy-border)] rounded-lg p-6 shadow-sm">
                    <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                      <User className="text-[var(--cw-teal)]" size={20} />
                      Account Details
                    </h2>
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-slate-300">Email Address (Read-only)</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                          <Input 
                            value={email} 
                            disabled 
                            className="pl-9 bg-black/20 border-[var(--cw-navy-border)] text-slate-400 cursor-not-allowed"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-slate-300">Display Name</label>
                        <Input 
                          value={name} 
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g., Jane Doe"
                          className="bg-[var(--cw-navy-light)] border-[var(--cw-navy-border)] text-white focus-visible:ring-[var(--cw-teal)]"
                        />
                      </div>
                    </div>
                  </div>

        
                  <div className="bg-[var(--cw-navy)] border border-[var(--cw-navy-border)] rounded-lg p-6 shadow-sm">
                    <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                      <GraduationCap className="text-[var(--cw-teal)]" size={20} />
                      Academic Profile
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
              
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-slate-300">Major</label>
                        <Select value={major} onValueChange={setMajor}>
                          <SelectTrigger className="bg-[var(--cw-navy-light)] border-[var(--cw-navy-border)] text-white focus:ring-[var(--cw-teal)]">
                            <SelectValue placeholder="Select major" />
                          </SelectTrigger>
                          <SelectContent className="bg-[var(--cw-navy-light)] border-[var(--cw-navy-border)] text-white max-h-[300px]">
                            {NUS_MAJORS.map((m) => (
                              <SelectItem key={m} value={m}>
                                {m}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

              
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-slate-300">Faculty</label>
                        <Select value={faculty} onValueChange={setFaculty}>
                          <SelectTrigger className="bg-[var(--cw-navy-light)] border-[var(--cw-navy-border)] text-white focus:ring-[var(--cw-teal)]">
                            <SelectValue placeholder="Select faculty" />
                          </SelectTrigger>
                          <SelectContent className="bg-[var(--cw-navy-light)] border-[var(--cw-navy-border)] text-white">
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

                 
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-slate-300">Year of Study</label>
                        <Select 
                          value={yearOfStudy ? yearOfStudy.toString() : ""} 
                          onValueChange={(val) => setYearOfStudy(parseInt(val, 10))}
                        >
                          <SelectTrigger className="bg-[var(--cw-navy-light)] border-[var(--cw-navy-border)] text-white focus:ring-[var(--cw-teal)]">
                            <SelectValue placeholder="Select year" />
                          </SelectTrigger>
                          <SelectContent className="bg-[var(--cw-navy-light)] border-[var(--cw-navy-border)] text-white">
                            <SelectItem value="1">Year 1</SelectItem>
                            <SelectItem value="2">Year 2</SelectItem>
                            <SelectItem value="3">Year 3</SelectItem>
                            <SelectItem value="4">Year 4</SelectItem>
                            <SelectItem value="5">Year 5</SelectItem>
                            <SelectItem value="6">Year 6</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-slate-300">Cohort Year</label>
                        <Select value={cohortYear} onValueChange={setCohortYear}>
                          <SelectTrigger className="bg-[var(--cw-navy-light)] border-[var(--cw-navy-border)] text-white focus:ring-[var(--cw-teal)]">
                            <SelectValue placeholder="Select cohort" />
                          </SelectTrigger>
                          <SelectContent className="bg-[var(--cw-navy-light)] border-[var(--cw-navy-border)] text-white">
                            <SelectItem value="AY2022/23">AY2022/23</SelectItem>
                            <SelectItem value="AY2023/24">AY2023/24</SelectItem>
                            <SelectItem value="AY2024/25">AY2024/25</SelectItem>
                            <SelectItem value="AY2025/26">AY2025/26</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4">
                    <div>
                      {message && (
                        <p className={`text-sm font-medium ${message.type === 'success' ? 'text-[var(--cw-teal)]' : 'text-red-400'}`}>
                          {message.text}
                        </p>
                      )}
                    </div>
                    <Button 
                      onClick={handleSave} 
                      disabled={isSaving}
                      className="bg-[var(--cw-teal)] text-[var(--cw-navy)] hover:bg-[var(--cw-teal-dim)] min-w-[120px]"
                    >
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>

                </div>
              )}
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}