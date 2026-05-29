import { useEffect, useState } from "react";
import { Welcome } from "../components/welcome";
import { LogoutButton } from "../components/logout-button";
import { Link } from "react-router-dom";

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
        const response = await fetch("http://localhost:3001/profile", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
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
        {!isLoggedIn ? (
          <>
            <Link to="/login">Login</Link> | {" "}
            <Link to="/signup">Signup</Link> | {""}
          </>
        ) : (
          <>
          <LogoutButton /> | {" "}
          </>
        )}
        <Link to="/onboarding">Start Onboarding</Link> | {" "}
        {/*}<Link to="/dashboard">Dashboard</Link> | {" "}  {*/}
        <Link to="/signup">Signup</Link> | {" "}
        <Link to="/recommendations">Recommendations</Link>
      </nav>

      <div style={{ padding: "0 2rem", textAlign: "center", marginBottom: "2rem" }}>
        {isLoggedIn ? (
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">
              Welcome back, <span className="text-primary">{username}</span>!
            </h1>
            
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