const getMailConfig = () => ({
  host: String(process.env.SMTP_HOST || "").trim(),
  port: Number(process.env.SMTP_PORT || 0),
  secure: String(process.env.SMTP_SECURE || "").trim().toLowerCase() === "true",
  user: String(process.env.SMTP_USER || "").trim(),
  pass: String(process.env.SMTP_PASS || "").trim(),
  from: String(process.env.MAIL_FROM || "").trim()
});

export const isSystemMailConfigured = () => {
  const cfg = getMailConfig();
  return Boolean(cfg.host && cfg.port && cfg.user && cfg.pass && cfg.from);
};

export const isPasswordResetMailConfigured = () => isSystemMailConfigured();

const getTransportOptions = () => {
  const cfg = getMailConfig();
  return {
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure || cfg.port === 465,
    auth: {
      user: cfg.user,
      pass: cfg.pass
    }
  };
};

export const sendSystemEmail = async ({ to, subject, text, html }) => {
  if (!isSystemMailConfigured()) {
    throw new Error("SMTP is not configured");
  }
  const cfg = getMailConfig();
  const { default: nodemailer } = await import("nodemailer");
  const transport = nodemailer.createTransport(getTransportOptions());
  await transport.sendMail({
    from: cfg.from,
    to,
    subject,
    text,
    html
  });
};

export const sendPasswordResetEmail = async ({ to, resetUrl, expiresMinutes }) => {
  await sendSystemEmail({
    to,
    subject: "SnapQueue password reset",
    text: [
      "You requested to reset your SnapQueue password.",
      `Use this link within ${expiresMinutes} minutes:`,
      resetUrl,
      "",
      "If you did not request this, you can ignore this email."
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a;">
        <h2 style="margin:0 0 12px;">SnapQueue Password Reset</h2>
        <p>You requested to reset your password.</p>
        <p>This link expires in <strong>${expiresMinutes} minutes</strong>.</p>
        <p>
          <a href="${resetUrl}" style="display:inline-block;padding:10px 16px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;">
            Reset Password
          </a>
        </p>
        <p style="font-size:12px;color:#475569;">If you did not request this, you can ignore this email.</p>
      </div>
    `
  });
};
