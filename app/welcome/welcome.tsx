import { Link } from "react-router-dom";

export function Welcome() {
  return (
    <main>
      <h1>Welcome to THE Team Planner!</h1>
      {/* This moves the user to the onboarding page */}
      <Link to="/onboarding" style={{ padding: '10px', background: 'blue', color: 'white' }}>
        Get Started
      </Link>

      {/* Strategic link to the dashboard */}
      <div style={{ marginTop: "2rem" }}>
        <Link to="/dashboard" style={{ 
          padding: "10px 20px", 
          backgroundColor: "#007bff", 
          color: "white", 
          textDecoration: "none", 
          borderRadius: "5px" 
        }}>
          Go to My Planner
        </Link>
      </div>
    </main>
  );
}







