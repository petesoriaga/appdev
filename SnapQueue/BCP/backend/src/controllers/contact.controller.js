import ContactMessage from "../models/ContactMessage.js";
import User from "../models/User.js";
import { isSystemMailConfigured, sendSystemEmail } from "../utils/mailer.js";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONTACT_RECIPIENT = String(process.env.CONTACT_RECEIVER_EMAIL || "otpaauthetication@gmail.com").trim();

const sanitize = (value) => String(value || "").trim();
const escapeHtml = (value) => String(value || "").replace(/[<>&"]/g, (ch) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[ch]);

export const createContactMessage = async (req, res) => {
  const name = sanitize(req.body?.name);
  const email = sanitize(req.body?.email).toLowerCase();
  const subject = sanitize(req.body?.subject);
  const message = sanitize(req.body?.message);

  if (!name || !email || !subject || !message) {
    return res.status(400).json({ success: false, message: "Name, email, subject, and message are required" });
  }
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: "Invalid email format" });
  }

  const item = await ContactMessage.create({ name, email, subject, message });
  if (!isSystemMailConfigured()) {
    return res.status(503).json({ success: false, message: "Contact email service is not configured yet." });
  }

  const adminUsers = await User.find({
    role: "admin",
    isBlocked: { $ne: true }
  }).select("email").lean();
  const recipients = new Set([CONTACT_RECIPIENT]);
  adminUsers.forEach((admin) => {
    const adminEmail = sanitize(admin?.email).toLowerCase();
    if (emailRegex.test(adminEmail)) recipients.add(adminEmail);
  });

  const textBody = [
    "New Contact Form Submission",
    "",
    `Name: ${name}`,
    `Email: ${email}`,
    `Subject: ${subject}`,
    "",
    "Message:",
    message
  ].join("\n");
  const htmlBody = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a;">
      <h2 style="margin:0 0 12px;">New Contact Form Submission</h2>
      <p><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
      <p><strong>Message:</strong></p>
      <p style="white-space:pre-wrap;">${escapeHtml(message)}</p>
    </div>
  `;

  // Primary receiver MUST succeed; otherwise return an error to avoid false success in UI.
  try {
    await sendSystemEmail({
      to: CONTACT_RECIPIENT,
      subject: `Contact Form: ${subject}`,
      text: textBody,
      html: htmlBody
    });
  } catch (error) {
    console.error("Contact email failed for primary receiver", {
      to: CONTACT_RECIPIENT,
      error: error?.message || String(error)
    });
    return res.status(500).json({
      success: false,
      message: `Failed to deliver to ${CONTACT_RECIPIENT}. Please verify SMTP sender settings.`
    });
  }

  // Admin copies are best-effort only.
  const secondaryRecipients = Array.from(recipients).filter((to) => to !== CONTACT_RECIPIENT);
  if (secondaryRecipients.length) {
    const secondaryResults = await Promise.allSettled(
      secondaryRecipients.map((to) =>
        sendSystemEmail({
          to,
          subject: `Contact Form: ${subject}`,
          text: textBody,
          html: htmlBody
        })
      )
    );
    const failed = secondaryResults
      .map((result, index) => ({ result, to: secondaryRecipients[index] }))
      .filter((entry) => entry.result.status === "rejected")
      .map((entry) => entry.to);
    if (failed.length) {
      console.error("Contact email secondary recipients failed", {
        total: secondaryRecipients.length,
        failed
      });
    }
  }

  res.status(201).json({ success: true, item, deliveredPrimary: CONTACT_RECIPIENT });
};

export const listContactMessages = async (_req, res) => {
  const items = await ContactMessage.find().sort({ createdAt: -1 });
  res.json({ success: true, items });
};

export const updateContactMessageStatus = async (req, res) => {
  const { status } = req.body;
  const item = await ContactMessage.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!item) {
    return res.status(404).json({ success: false, message: "Message not found" });
  }

  res.json({ success: true, item });
};
