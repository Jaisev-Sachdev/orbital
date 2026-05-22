import { Welcome} from "../welcome/welcome";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div>
      <nav style={{ padding: "1rem", borderBottom: "1px solid #ccc" }}> 
        <Link to="/">Home</Link> | {" "} 
        <Link to="/login">Login</Link> | {" "}
        <Link to="/onboarding">Start Onboarding</Link> | {" "}
        <Link to="/dashboard">Dashboard</Link> | {" "} {/* Add this */}
        <Link to="/signup">Signup</Link>
      </nav>

      <Welcome />
    </div>
  );
}

