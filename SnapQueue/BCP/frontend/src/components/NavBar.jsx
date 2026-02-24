import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function NavBar() {
  const { user, logout } = useAuth();
  const initials = (user?.fullName || "U")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

  return (
    <header style={{ background: "#0f172a", color: "#fff" }}>
      <div className="container" style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <Link to="/" style={{ fontWeight: 700 }}>BCP</Link>
        <Link to="/gallery">Gallery</Link>
        <Link to="/reservation">Reservation</Link>
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/admin">Admin</Link>
        <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}>
          {user ? (
            <>
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt="Profile"
                  style={{ width: 28, height: 28, borderRadius: "9999px", objectFit: "cover", border: "1px solid rgba(255,255,255,0.35)" }}
                />
              ) : (
                <div style={{ width: 28, height: 28, borderRadius: "9999px", background: "#334155", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700 }}>
                  {initials}
                </div>
              )}
              <span style={{ fontSize: 12 }}>{user.fullName}</span>
              <button onClick={logout}>Logout</button>
            </>
          ) : (
            <Link to="/login">Login</Link>
          )}
        </div>
      </div>
    </header>
  );
}
