import { useEffect, useState } from "react";
import { Welcome } from "../components/welcome";
import { LogoutButton } from "../components/logout-button";
import { Link } from "react-router-dom";
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
