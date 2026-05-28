import { useEffect, useState } from "react";
import { Welcome } from "../components/welcome";
import { Link } from "react-router-dom";

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  // NEW: State to hold the actual database profile
  const [profileData, setProfileData] = useState<any>(null); 

  useEffect(() => {
    const loadUserData = async () => {
      const token = localStorage.getItem("authToken");
      
      if (!token) {
        setIsLoggedIn(false);
        return;
      }

      // If we have a token, they are logged in!
      setIsLoggedIn(true);

      // 1. We still use the email trick for the greeting, because your 
      // backend profile schema (major, faculty, year) doesn't have a 'name' field yet!
      const email = localStorage.getItem("userEmail") || "";
      const namePrefix = email.split("@")[0]; 
      setUsername(namePrefix);

      // 2. Fetch the real profile from your backend
      try {
        const response = await fetch("http://localhost:3001/profile", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}` // The 🔒 requirement
          }
        });

        if (response.ok) {
          const data = await response.json();
          // Store the profile data (major, completedMods, etc.) in React state
          setProfileData(data.profile); 
          console.log("Successfully fetched profile:", data.profile);
        } else {
          console.error("Failed to fetch profile. Token might be expired.");
        }
      } catch (error) {
        console.error("Network error fetching profile:", error);
      }
    };

    loadUserData();
  }, []);

  return (
    <div>
      <nav style={{ padding: "1rem", borderBottom: "1px solid #ccc", marginBottom: "2rem" }}> 
        <Link to="/">Home</Link> | {" "} 
        <Link to="/login">Login</Link> | {" "}
        <Link to="/onboarding">Start Onboarding</Link> | {" "}
        <Link to="/dashboard">Dashboard</Link> | {" "} 
        <Link to="/signup">Signup</Link> | {" "}
        <Link to="/recommendations">Recommendations</Link>
      </nav>

      <div style={{ padding: "0 2rem", textAlign: "center", marginBottom: "2rem" }}>
        {isLoggedIn ? (
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome back, <span className="text-primary">{username}</span>!
            </h1>
            
            {/* NEW: Display some of that real backend data if we successfully loaded it! */}
            {profileData && (
              <p className="text-muted-foreground">
                Year {profileData.yearOfStudy} • {profileData.major}
              </p>
            )}
          </div>
        ) : (
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome to Courseway
          </h1>
        )}
      </div>

      <Welcome />
    </div>
  );
}