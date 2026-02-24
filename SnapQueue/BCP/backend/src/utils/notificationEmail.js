import User from "../models/User.js";
import { isSystemMailConfigured, sendSystemEmail } from "./mailer.js";

const appName = "SnapQueue";
const brandColor = "#2563eb";
const brandDark = "#0f172a";

const getWebBaseUrl = () => {
  const raw = String(process.env.CLIENT_URL || process.env.PASSWORD_RESET_BASE_URL || "http://localhost:5000").trim();
  return raw.replace(/\/+$/, "");
};

const dashboardUrl = () => `${getWebBaseUrl()}/dashboard.html`;
const adminDashboardUrl = () => `${getWebBaseUrl()}/admin_dashboard.html`;

const normalizeUrl = (value) => {
  const url = String(value || "").trim();
  return /^https?:\/\//i.test(url) ? url : "";
};

const logoUrl = () => normalizeUrl(process.env.MAIL_LOGO_URL);

const prettyDateTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
};

const safe = (value) => String(value || "").replace(/[<>&"]/g, (ch) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[ch]);

const renderHeaderLogo = () => {
  const url = logoUrl();
  if (url) {
    return `
      <img src="${safe(url)}" alt="${safe(appName)} Logo" style="height:36px;max-width:180px;display:block;margin:0 auto 10px;" />
    `;
  }
  return `
    <div style="width:36px;height:36px;border-radius:10px;background:${brandColor};color:#ffffff;display:inline-grid;place-items:center;font-weight:800;font-size:16px;margin:0 auto 10px;">SQ</div>
  `;
};

const buildEmailHtml = ({ title, intro, rows = [], ctaLabel = "", ctaUrl = "", note = "" }) => {
  const rowHtml = rows
    .filter((row) => row?.label && row?.value !== undefined)
    .map(
      (row) => `
        <tr>
          <td style="padding:7px 0;color:#64748b;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">${safe(row.label)}</td>
          <td style="padding:7px 0;color:${brandDark};font-size:13px;font-weight:700;text-align:right;">${safe(row.value)}</td>
        </tr>
      `
    )
    .join("");
  const hasCta = Boolean(ctaLabel && ctaUrl && normalizeUrl(ctaUrl));

  return `
    <div style="margin:0;padding:24px 10px;background:#f1f5f9;font-family:Arial,sans-serif;color:${brandDark};">
      <div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
        <div style="padding:18px 20px;background:linear-gradient(135deg, ${brandDark}, ${brandColor});color:#ffffff;text-align:center;">
          ${renderHeaderLogo()}
          <div style="font-size:12px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;opacity:0.95;">${safe(appName)}</div>
          <h2 style="margin:10px 0 0;font-size:22px;line-height:1.2;">${safe(title)}</h2>
        </div>
        <div style="padding:18px 20px;">
          <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#1e293b;">${safe(intro)}</p>
          ${rowHtml ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;margin:0 0 14px;">${rowHtml}</table>` : ""}
          ${hasCta ? `<p style="margin:0 0 14px;text-align:center;"><a href="${safe(ctaUrl)}" style="display:inline-block;padding:11px 18px;border-radius:10px;background:${brandColor};color:#ffffff;text-decoration:none;font-size:13px;font-weight:800;">${safe(ctaLabel)}</a></p>` : ""}
          ${note ? `<p style="margin:0;font-size:12px;line-height:1.6;color:#64748b;">${safe(note)}</p>` : ""}
        </div>
      </div>
    </div>
  `;
};

const buildEmailText = ({ title, intro, rows = [], ctaLabel = "", ctaUrl = "", note = "" }) => {
  const lines = [appName, title, "", intro];
  if (rows.length) {
    lines.push("");
    rows.forEach((row) => {
      lines.push(`${row.label}: ${row.value}`);
    });
  }
  if (ctaLabel && ctaUrl) {
    lines.push("", `${ctaLabel}: ${ctaUrl}`);
  }
  if (note) {
    lines.push("", note);
  }
  return lines.join("\n");
};

const canSendToUser = async ({ userId = null, email = "" }) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (userId) {
    const user = await User.findById(userId).select("emailNotificationsEnabled").lean();
    if (!user) return true;
    return user.emailNotificationsEnabled !== false;
  }
  if (!normalizedEmail) return true;
  const user = await User.findOne({ email: normalizedEmail }).select("emailNotificationsEnabled").lean();
  if (!user) return true;
  return user.emailNotificationsEnabled !== false;
};

const sendUserEmail = async ({
  to,
  userId = null,
  subject,
  title,
  intro,
  rows = [],
  ctaLabel = "",
  ctaUrl = "",
  note = ""
}) => {
  if (!isSystemMailConfigured() || !to) return false;
  const allowed = await canSendToUser({ userId, email: to });
  if (!allowed) return false;
  const text = buildEmailText({ title, intro, rows, ctaLabel, ctaUrl, note });
  const html = buildEmailHtml({ title, intro, rows, ctaLabel, ctaUrl, note });
  await sendSystemEmail({ to, subject, text, html });
  return true;
};

const sendAdminAlert = async ({ subject, title, intro, rows = [], ctaLabel = "", ctaUrl = "", note = "" }) => {
  if (!isSystemMailConfigured()) return false;
  const admins = await User.find({
    role: "admin",
    isBlocked: { $ne: true },
    emailNotificationsEnabled: { $ne: false }
  }).select("email").lean();
  const emails = admins.map((item) => String(item.email || "").trim()).filter(Boolean);
  if (!emails.length) return false;
  const text = buildEmailText({ title, intro, rows, ctaLabel, ctaUrl, note });
  const html = buildEmailHtml({ title, intro, rows, ctaLabel, ctaUrl, note });
  await sendSystemEmail({ to: emails.join(","), subject, text, html });
  return true;
};

const resolveReservationRecipient = async (reservation) => {
  const directEmail = String(reservation?.email || "").trim().toLowerCase();
  if (directEmail) {
    return { to: directEmail, userId: reservation?.userId || null };
  }
  const userId = reservation?.userId || null;
  if (!userId) return { to: "", userId: null };
  const user = await User.findById(userId).select("email").lean();
  const fallbackEmail = String(user?.email || "").trim().toLowerCase();
  return { to: fallbackEmail, userId };
};

export const notifyReservationCreated = async (reservation) => {
  const id = reservation?._id;
  const when = prettyDateTime(reservation?.eventDateTime);
  await Promise.all([
    sendUserEmail({
      to: reservation?.email,
      userId: reservation?.userId || null,
      subject: `Reservation Received (#${id})`,
      title: "Reservation Received",
      intro: `Your reservation #${id} has been received and is pending approval.`,
      rows: [
        { label: "Reservation ID", value: `#${id}` },
        { label: "Client", value: reservation?.fullName || "-" },
        { label: "Event", value: reservation?.eventType || "-" },
        { label: "Event Date", value: when }
      ],
      ctaLabel: "Open Dashboard",
      ctaUrl: dashboardUrl(),
      note: "You will receive another email once admin reviews your booking."
    }),
    sendAdminAlert({
      subject: `New Booking Request (#${id})`,
      title: "New Booking Request",
      intro: "A new booking request was submitted and is waiting for review.",
      rows: [
        { label: "Reservation ID", value: `#${id}` },
        { label: "Client", value: `${reservation?.fullName || "-"} (${reservation?.email || "-"})` },
        { label: "Event Date", value: when }
      ],
      ctaLabel: "Review in Admin Dashboard",
      ctaUrl: adminDashboardUrl()
    })
  ]);
};

export const notifyReservationStatusChanged = async (reservation, nextStatus) => {
  const status = String(nextStatus || reservation?.status || "").toLowerCase();
  if (!["approved", "rejected"].includes(status)) return;
  const id = reservation?._id;
  const when = prettyDateTime(reservation?.eventDateTime);
  const readable = status === "approved" ? "approved" : "rejected";
  await sendUserEmail({
    to: reservation?.email,
    userId: reservation?.userId || null,
    subject: `Booking ${readable.toUpperCase()} (#${id})`,
    title: `Booking ${readable.toUpperCase()}`,
    intro: `Your booking #${id} has been ${readable}.`,
    rows: [
      { label: "Reservation ID", value: `#${id}` },
      { label: "Event Date", value: when },
      { label: "Status", value: readable.toUpperCase() }
    ],
    ctaLabel: status === "approved" ? "Continue Booking" : "Open Dashboard",
    ctaUrl: dashboardUrl(),
    note: status === "approved" ? "Proceed with payment if required." : "If you need help, contact support/admin."
  });
};

export const notifyPaymentSubmitted = async (payment, reservation) => {
  const id = reservation?._id || payment?.reservationId;
  const recipient = await resolveReservationRecipient(reservation);
  await Promise.all([
    sendUserEmail({
      to: recipient.to,
      userId: recipient.userId,
      subject: `Payment Submitted (#${id})`,
      title: "Payment Submitted",
      intro: `We received your payment submission for booking #${id}.`,
      rows: [
        { label: "Reservation ID", value: `#${id}` },
        { label: "Amount", value: `PHP ${Number(payment?.amount || reservation?.finalPrice || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` },
        { label: "Reference", value: payment?.referenceNumber || "-" },
        { label: "Status", value: "PENDING VERIFICATION" }
      ],
      ctaLabel: "View Payment Status",
      ctaUrl: dashboardUrl(),
      note: "Admin verification is required before this payment is marked as complete."
    }),
    sendAdminAlert({
      subject: `Payment Received for Verification (#${id})`,
      title: "Payment Received for Verification",
      intro: "A payment proof was submitted and needs admin verification.",
      rows: [
        { label: "Reservation ID", value: `#${id}` },
        { label: "Client", value: `${reservation?.fullName || "-"} (${reservation?.email || "-"})` },
        { label: "Reference", value: payment?.referenceNumber || "-" }
      ],
      ctaLabel: "Open Payments",
      ctaUrl: adminDashboardUrl()
    })
  ]);
};

export const notifyPaymentStatusChanged = async (payment, reservation) => {
  const status = String(payment?.status || "").toLowerCase();
  if (!["verified", "rejected", "cancelled", "refunded"].includes(status)) return;
  const id = reservation?._id || payment?.reservationId;
  const recipient = await resolveReservationRecipient(reservation);
  const amountLabel = `PHP ${Number(payment?.amount || reservation?.finalPrice || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  await Promise.all([
    sendUserEmail({
      to: recipient.to,
      userId: recipient.userId,
      subject: `Payment ${status.toUpperCase()} (#${id})`,
      title: `Payment ${status.toUpperCase()}`,
      intro: `Your payment for booking #${id} is now ${status}.`,
      rows: [
        { label: "Reservation ID", value: `#${id}` },
        { label: "Amount", value: amountLabel },
        { label: "Reference", value: payment?.referenceNumber || "-" },
        { label: "Payment Status", value: status.toUpperCase() }
      ],
      ctaLabel: "Open Dashboard",
      ctaUrl: dashboardUrl(),
      note: status === "verified" ? "Your booking can proceed." : "Please check your dashboard for next steps."
    }),
    sendAdminAlert({
      subject: `Payment ${status.toUpperCase()} (#${id})`,
      title: `Payment ${status.toUpperCase()}`,
      intro: "A payment status has been updated.",
      rows: [
        { label: "Reservation ID", value: `#${id}` },
        { label: "Client", value: `${reservation?.fullName || "-"} (${recipient.to || "-"})` },
        { label: "Amount", value: amountLabel },
        { label: "Reference", value: payment?.referenceNumber || "-" },
        { label: "Status", value: status.toUpperCase() }
      ],
      ctaLabel: "Open Payments",
      ctaUrl: adminDashboardUrl()
    })
  ]);
};

export const notifyRefundRequested = async (payment, reservation) => {
  const id = reservation?._id || payment?.reservationId;
  await Promise.all([
    sendUserEmail({
      to: reservation?.email,
      userId: reservation?.userId || null,
      subject: `Refund Request Received (#${id})`,
      title: "Refund Request Received",
      intro: `Your refund request for booking #${id} has been submitted.`,
      rows: [
        { label: "Reservation ID", value: `#${id}` },
        { label: "Payment Reference", value: payment?.referenceNumber || "-" },
        { label: "Refund Status", value: "REQUESTED" }
      ],
      ctaLabel: "View Refund Status",
      ctaUrl: dashboardUrl(),
      note: "Admin will review your request and notify you once updated."
    }),
    sendAdminAlert({
      subject: `Refund Requested (#${id})`,
      title: "Refund Requested",
      intro: "A new refund request requires admin action.",
      rows: [
        { label: "Reservation ID", value: `#${id}` },
        { label: "Client", value: `${reservation?.fullName || "-"} (${reservation?.email || "-"})` },
        { label: "Payment Reference", value: payment?.referenceNumber || "-" }
      ],
      ctaLabel: "Review Refund",
      ctaUrl: adminDashboardUrl()
    })
  ]);
};

export const notifyRefundResolved = async (payment, reservation, action) => {
  const id = reservation?._id || payment?.reservationId;
  const normalized = String(action || "").toLowerCase();
  if (!["approve", "reject", "process"].includes(normalized)) return;
  const verb = normalized === "process" ? "processed" : normalized === "approve" ? "approved" : "rejected";
  await sendUserEmail({
    to: reservation?.email,
    userId: reservation?.userId || null,
    subject: `Refund ${verb.toUpperCase()} (#${id})`,
    title: `Refund ${verb.toUpperCase()}`,
    intro: `Your refund request for booking #${id} has been ${verb}.`,
    rows: [
      { label: "Reservation ID", value: `#${id}` },
      { label: "Refund Status", value: verb.toUpperCase() },
      { label: "Refund Reference", value: payment?.refundReferenceNumber || "-" }
    ],
    ctaLabel: "Open Dashboard",
    ctaUrl: dashboardUrl(),
    note: payment?.refundReferenceNumber
      ? "Keep this refund reference for your records."
      : "Check your dashboard for full details."
  });
};
