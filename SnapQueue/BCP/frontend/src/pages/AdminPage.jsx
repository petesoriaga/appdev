import { useEffect, useState } from "react";
import api from "../services/api";

const stageOptions = [
  { value: "awaiting_approval", label: "Awaiting Approval" },
  { value: "approved", label: "Approved" },
  { value: "shoot_completed", label: "Shoot Completed" },
  { value: "editing", label: "Editing" },
  { value: "ready_for_download", label: "Ready for Download" }
];

export default function AdminPage() {
  const [reservations, setReservations] = useState([]);
  const [qa, setQa] = useState([]);
  const [users, setUsers] = useState([]);
  const [saving, setSaving] = useState({});
  const [trackingForm, setTrackingForm] = useState({});
  const [uploadForm, setUploadForm] = useState({});

  const load = () => {
    api.get("/reservations").then((res) => setReservations(res.data.reservations || []));
    api.get("/chatbot/qa").then((res) => setQa(res.data.items || []));
    api.get("/users").then((res) => setUsers(res.data.users || []));
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (id, status) => {
    await api.patch(`/reservations/${id}/status`, { status });
    load();
  };

  const getTrackState = (item) => {
    const existing = trackingForm[item._id];
    if (existing) return existing;
    const currentDateValue = item.estimatedDelivery
      ? new Date(item.estimatedDelivery).toISOString().slice(0, 16)
      : "";
    return {
      workflowStage: item.workflowStage || "awaiting_approval",
      estimatedDelivery: currentDateValue
    };
  };

  const setTrackState = (id, patch) => {
    setTrackingForm((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        ...patch
      }
    }));
  };

  const saveTracking = async (item) => {
    const state = getTrackState(item);
    setSaving((prev) => ({ ...prev, [item._id]: true }));
    try {
      await api.patch(`/reservations/${item._id}/status`, {
        workflowStage: state.workflowStage,
        estimatedDelivery: state.estimatedDelivery || null
      });
      load();
    } finally {
      setSaving((prev) => ({ ...prev, [item._id]: false }));
    }
  };

  const getUploadState = (item) => {
    const current = uploadForm[item._id];
    if (current) return current;
    return {
      folderName: "Admin Delivery",
      files: null
    };
  };

  const setUploadState = (id, patch) => {
    setUploadForm((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        ...patch
      }
    }));
  };

  const uploadPhotos = async (item) => {
    const state = getUploadState(item);
    const files = state.files;
    if (!files || !files.length) return;

    const formData = new FormData();
    formData.append("reservationId", item._id);
    formData.append("folderName", state.folderName || "Admin Delivery");
    Array.from(files).forEach((file) => {
      formData.append("files", file);
    });

    setSaving((prev) => ({ ...prev, [`upload-${item._id}`]: true }));
    try {
      await api.post("/archive/admin/upload-multipart", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setUploadState(item._id, { files: null });
    } finally {
      setSaving((prev) => ({ ...prev, [`upload-${item._id}`]: false }));
    }
  };

  return (
    <section className="grid">
      <div className="card">
        <h2>Admin Dashboard</h2>
        <p>Manage reservation approvals and chatbot Q&A content.</p>
      </div>

      <div className="card">
        <h3>Reservations</h3>
        {reservations.map((item) => (
          <div key={item._id} style={{ borderTop: "1px solid #e2e8f0", paddingTop: 8, marginTop: 8 }}>
            <strong>{item.fullName}</strong> - {item.eventType} ({item.status})
            <p style={{ margin: "4px 0", fontSize: 12, opacity: 0.75 }}>
              Stage: {item.workflowStage || "awaiting_approval"}
              {item.estimatedDelivery ? ` | ETA: ${new Date(item.estimatedDelivery).toLocaleString()}` : ""}
            </p>
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <button onClick={() => updateStatus(item._id, "approved")}>Approve</button>
              <button onClick={() => updateStatus(item._id, "rejected")}>Reject</button>
            </div>
            <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
              <label style={{ display: "grid", gap: 4 }}>
                <span style={{ fontSize: 12 }}>Workflow Stage</span>
                <select
                  value={getTrackState(item).workflowStage}
                  onChange={(e) => setTrackState(item._id, { workflowStage: e.target.value })}
                >
                  {stageOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </label>
              <label style={{ display: "grid", gap: 4 }}>
                <span style={{ fontSize: 12 }}>Estimated Delivery</span>
                <input
                  type="datetime-local"
                  value={getTrackState(item).estimatedDelivery}
                  onChange={(e) => setTrackState(item._id, { estimatedDelivery: e.target.value })}
                />
              </label>
              <button onClick={() => saveTracking(item)} disabled={!!saving[item._id]}>
                {saving[item._id] ? "Saving..." : "Save Tracking"}
              </button>
            </div>
            <div style={{ display: "grid", gap: 6, marginTop: 10, paddingTop: 10, borderTop: "1px dashed #cbd5e1" }}>
              <label style={{ display: "grid", gap: 4 }}>
                <span style={{ fontSize: 12 }}>Delivery Folder Name</span>
                <input
                  value={getUploadState(item).folderName}
                  onChange={(e) => setUploadState(item._id, { folderName: e.target.value })}
                />
              </label>
              <label style={{ display: "grid", gap: 4 }}>
                <span style={{ fontSize: 12 }}>Upload Client Photos</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => setUploadState(item._id, { files: e.target.files })}
                />
              </label>
              <button onClick={() => uploadPhotos(item)} disabled={!!saving[`upload-${item._id}`]}>
                {saving[`upload-${item._id}`] ? "Uploading..." : "Upload Photos"}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3>Chatbot Q&A</h3>
        {qa.map((item) => (
          <p key={item._id}><b>{item.question}</b>: {item.answer}</p>
        ))}
      </div>

      <div className="card">
        <h3>Clients</h3>
        {users.map((item) => (
          <div key={item._id} style={{ borderTop: "1px solid #e2e8f0", paddingTop: 8, marginTop: 8, display: "flex", gap: 10, alignItems: "center" }}>
            {item.avatarUrl ? (
              <img
                src={item.avatarUrl}
                alt={item.fullName || "User"}
                style={{ width: 34, height: 34, borderRadius: "9999px", objectFit: "cover", border: "1px solid #e2e8f0" }}
              />
            ) : (
              <div style={{ width: 34, height: 34, borderRadius: "9999px", background: "#334155", color: "#fff", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700 }}>
                {(item.fullName || "U").trim().slice(0, 1).toUpperCase()}
              </div>
            )}
            <div>
              <strong>{item.fullName || "Unnamed User"}</strong>
              <p style={{ margin: 0, fontSize: 12, opacity: 0.75 }}>{item.email}</p>
              <p style={{ margin: 0, fontSize: 11, opacity: 0.65 }}>Role: {item.role}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
