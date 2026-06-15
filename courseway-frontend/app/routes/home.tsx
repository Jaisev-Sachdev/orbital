import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { LogoutButton } from "../components/logout-button";
import { Button } from "~/components/ui/button"; // Assuming you have shadcn button installed
import api from "../lib/api";

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [profileData, setProfileData] = useState<any>(null);

  useEffect(() => {
    const loadUserData = async () => {
      const token = localStorage.getItem("authToken");

      if (!token) {
        setIsLoggedIn(false);
        return;
      }

      setIsLoggedIn(true);

      const email = localStorage.getItem("userEmail") || "";
      const namePrefix = email.split("@")[0];
      setUsername(namePrefix);

      try {
        const { data } = await api.get("/profile");
        setProfileData(data.profile);
      } catch {
        // Silently fail if profile isn't set up yet
      }
    };

    loadUserData();
  }, []);

  return (
    <div className="min-h-screen bg-[var(--cw-navy)] text-[var(--cw-white)] flex flex-col">
      
      {/* ── Navbar ── */}
      <nav className="flex items-center justify-between px-6 py-4 md:px-12 border-b border-[var(--cw-navy-border)]">
        <div className="flex items-center gap-2">
          <span className="font-bold text-xl tracking-tight text-[var(--cw-white)]">
            Courseway
          </span>
        </div>

        <div className="flex items-center gap-4">
          {!isLoggedIn ? (
            <>
              <Link to="/login">
                <Button variant="ghost" className="text-muted-foreground hover:text-white">
                  Log In
                </Button>
              </Link>
              <Link to="/signup">
                <Button className="bg-[var(--cw-teal)] text-[var(--cw-navy)] hover:bg-[var(--cw-teal-dim)] font-semibold">
                  Sign Up
                </Button>
              </Link>
            </>
          ) : (
            <LogoutButton />
          )}
        </div>
      </nav>

      {/* ── Main Content Area ── */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        {isLoggedIn ? (
          
          /* ── Logged In View ── */
          <div className="space-y-6 max-w-xl fade-in">
            <h1 className="text-4xl font-bold tracking-tight">
              Welcome back, <span className="text-[var(--cw-teal)]">{username}</span>!
            </h1>
            {profileData && (
              <p className="text-lg text-muted-foreground">
                Year {profileData.yearOfStudy} • {profileData.major}
              </p>
            )}
            <div className="pt-4 flex justify-center gap-4">
              <Link to="/planner">
                <Button size="lg" className="bg-[var(--cw-teal)] text-[var(--cw-navy)] hover:bg-[var(--cw-teal-dim)] font-semibold">
                  Open Module Planner
                </Button>
              </Link>
              <Link to="/recommendations">
                <Button size="lg" variant="outline" className="border-[var(--cw-navy-border)] text-white hover:bg-[var(--cw-navy-light)]">
                  AI Recommendations
                </Button>
              </Link>
            </div>
          </div>

        ) : (

          /* ── Logged Out View (Landing Page Hero) ── */
          <div className="space-y-6 max-w-3xl fade-in">
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-tight">
              Master your <br />
              <span className="text-[var(--cw-teal)] drop-shadow-[0_0_15px_rgba(0,201,167,0.3)]">
                academic journey.
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Plan your modules, track prerequisites, and graduate on time with intelligent recommendations tailored specifically to your academic goals.
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4 pt-8">
              <Link to="/signup">
                <Button size="lg" className="h-12 px-8 bg-[var(--cw-teal)] text-[var(--cw-navy)] hover:bg-[var(--cw-teal-dim)] text-base font-bold shadow-lg shadow-[var(--cw-teal-glow)] transition-all hover:scale-105">
                  Get Started for Free
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="h-12 px-8 border-[var(--cw-navy-border)] text-white hover:bg-[var(--cw-navy-light)] text-base font-semibold">
                  Log In to Account
                </Button>
              </Link>
            </div>
          </div>

        )}
      </main>

    </div>
  );
}