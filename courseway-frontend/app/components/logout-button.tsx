import { useNavigate } from "react-router-dom";

export function LogoutButton() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userEmail");

    navigate("/login");
  };

  return (
    <button 
      onClick={handleLogout}
      style={{ 
        background: "none", 
        border: "none", 
        padding: 0, 
        color: "#007bff", 
        textDecoration: "underline", 
        cursor: "pointer",
        fontSize: "inherit",
        fontFamily: "inherit"
      }}
    >
      Logout
    </button>
  );
}