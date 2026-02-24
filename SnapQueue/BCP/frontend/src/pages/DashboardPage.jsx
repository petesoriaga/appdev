import { useEffect, useMemo, useState } from "react";
import api, { usersApi } from "../services/api";
import { useAuth } from "../context/AuthContext.jsx";

const trackingSteps = [
  { key: "awaiting_approval", label: "Awaiting Approval" },
  { key: "approved", label: "Approved" },
  { key: "shoot_completed", label: "Shoot Completed" },
  { key: "editing", label: "Editing" },
  { key: "ready_for_download", label: "Ready for Download" }
];

export default function DashboardPage() {
  const { user, updateUser } = useAuth();
  const [reservations, setReservations] = useState([]);
  const [archiveFolders, setArchiveFolders] = useState([]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ text: "", error: false });
  const [profile, setProfile] = useState({
    fullName: "",
    phone: "",
    bio: "",
    avatarUrl: ""
  });

  useEffect(() => {
    setProfile({
      fullName: user?.fullName || "",
      phone: user?.phone || "",
      bio: user?.bio || "",
      avatarUrl: user?.avatarUrl || ""
    });
  }, [user]);

  useEffect(() => {
    api.get("/reservations")
      .then((res) => setReservations(res.data.reservations || []))
      .catch(() => setReservations([]));

    api.get("/archive/me")
      .then((res) => setArchiveFolders(res.data.folders || []))
      .catch(() => setArchiveFolders([]));
  }, []);

  const initials = useMemo(() => {
    const name = (profile.fullName || user?.fullName || "").trim();
    if (!name) return "U";
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("");
  }, [profile.fullName, user?.fullName]);

  const onAvatarFile = (file) => {
    if (!editing || !file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setProfile((prev) => ({ ...prev, avatarUrl: String(reader.result || "") }));
    };
    reader.readAsDataURL(file);
  };

  const toAbsoluteUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) return url;
    if (url.startsWith("/")) {
      const base = (api.defaults.baseURL || "").replace(/\/api\/?$/, "");
      return `${base}${url}`;
    }
    return url;
  };

  const getStepState = (workflowStage) => {
    const stage = workflowStage || "awaiting_approval";
    const activeIndex = trackingSteps.findIndex((step) => step.key === stage);
    return trackingSteps.map((step, index) => ({
      ...step,
      done: activeIndex >= 0 && index <= activeIndex,
      active: stage === step.key
    }));
  };

  const cancelEdit = () => {
    setProfile({
      fullName: user?.fullName || "",
      phone: user?.phone || "",
      bio: user?.bio || "",
      avatarUrl: user?.avatarUrl || ""
    });
    setEditing(false);
    setProfileMsg({ text: "", error: false });
  };

  const saveProfile = async () => {
    setSaving(true);
    setProfileMsg({ text: "", error: false });
    try {
      const res = await usersApi.updateMe(profile);
      updateUser(res.data.user);
      setEditing(false);
      setProfileMsg({ text: "Profile updated.", error: false });
    } catch (error) {
      setProfileMsg({
        text: error.response?.data?.message || "Failed to update profile.",
        error: true
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="grid">
      <div className="card">
        <h2>User Dashboard</h2>
        <p>Track your booking and payment status.</p>
      </div>
      <div className="card">
        <h3>Profile</h3>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt="Profile"
              style={{ width: 56, height: 56, borderRadius: "9999px", objectFit: "cover", border: "1px solid #e2e8f0" }}
            />
          ) : (
            <div style={{ width: 56, height: 56, borderRadius: "9999px", display: "grid", placeItems: "center", background: "#0f172a", color: "#fff", fontWeight: 700 }}>
              {initials}
            </div>
          )}
          <div>
            <strong>{profile.fullName || "User"}</strong>
            <p style={{ margin: 0, opacity: 0.7, fontSize: 12 }}>{user?.email || ""}</p>
          </div>
        </div>

        {!editing ? (
          <button
            onClick={() => {
              setProfile({
                fullName: user?.fullName || "",
                phone: user?.phone || "",
                bio: user?.bio || "",
                avatarUrl: user?.avatarUrl || ""
              });
              setEditing(true);
              setProfileMsg({ text: "", error: false });
            }}
          >
            Edit Profile
          </button>
        ) : (
          <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
            <label style={{ display: "grid", gap: 4 }}>
              <span style={{ fontSize: 12 }}>Full Name</span>
              <input value={profile.fullName} onChange={(e) => setProfile((prev) => ({ ...prev, fullName: e.target.value }))} />
            </label>
            <label style={{ display: "grid", gap: 4 }}>
              <span style={{ fontSize: 12 }}>Phone</span>
              <input value={profile.phone} onChange={(e) => setProfile((prev) => ({ ...prev, phone: e.target.value }))} />
            </label>
            <label style={{ display: "grid", gap: 4 }}>
              <span style={{ fontSize: 12 }}>Bio</span>
              <textarea rows={3} value={profile.bio} onChange={(e) => setProfile((prev) => ({ ...prev, bio: e.target.value }))} />
            </label>
            <label style={{ display: "grid", gap: 4 }}>
              <span style={{ fontSize: 12 }}>Profile Photo</span>
              <input type="file" accept="image/*" onChange={(e) => onAvatarFile(e.target.files?.[0] || null)} />
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={saveProfile} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
              <button onClick={cancelEdit} disabled={saving}>Cancel</button>
            </div>
          </div>
        )}
        {profileMsg.text ? (
          <p style={{ color: profileMsg.error ? "#dc2626" : "#16a34a", fontSize: 12, marginTop: 8 }}>
            {profileMsg.text}
          </p>
        ) : null}
      </div>
      <div className="grid">
        {reservations.map((item) => (
          <article key={item._id} className="card">
            <h3>{item.eventType} - {item.packageName}</h3>
            <p>Status: {item.status}</p>
            <p>Current Stage: {item.workflowStage || "awaiting_approval"}</p>
            <p>
              Estimated Delivery: {item.estimatedDelivery ? new Date(item.estimatedDelivery).toLocaleString() : "Not set yet"}
            </p>
            <p>Date: {new Date(item.eventDateTime).toLocaleString()}</p>
            <p>Location: {item.street}, {item.barangay}, {item.city}</p>
            <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
              {getStepState(item.workflowStage).map((step) => (
                <div key={step.key} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12 }}>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "9999px",
                      background: step.done ? "#16a34a" : "#cbd5e1",
                      border: step.active ? "2px solid #166534" : "none"
                    }}
                  />
                  <span style={{ fontWeight: step.active ? 700 : 500 }}>{step.label}</span>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
      <div className="card">
        <h3>Delivered Photos</h3>
        <p style={{ fontSize: 12, color: "#d97706", fontWeight: 600, marginTop: 4, marginBottom: 10 }}>
          Note: Archive photos are automatically deleted 7 days after upload.
        </p>
        {!archiveFolders.length ? (
          <p style={{ fontSize: 13, opacity: 0.75 }}>No uploaded photos yet.</p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {archiveFolders.map((folder) => (
              <div key={folder._id} style={{ borderTop: "1px solid #e2e8f0", paddingTop: 10 }}>
                <strong>{folder.name}</strong>
                <p style={{ margin: "4px 0", fontSize: 12, opacity: 0.75 }}>
                  Files: {(folder.photos || []).length}
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 8 }}>
                  {(folder.photos || []).map((photo) => (
                    <a
                      key={photo._id || photo.url}
                      href={toAbsoluteUrl(photo.url)}
                      target="_blank"
                      rel="noreferrer"
                      style={{ textDecoration: "none", color: "inherit" }}
                    >
                      <img
                        src={toAbsoluteUrl(photo.url)}
                        alt={photo.name || "Archive photo"}
                        style={{ width: "100%", height: 90, objectFit: "cover", borderRadius: 8, border: "1px solid #e2e8f0" }}
                      />
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
