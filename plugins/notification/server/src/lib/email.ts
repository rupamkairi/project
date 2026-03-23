// Email Sender - SMTP implementation using nodemailer

import nodemailer, { type Transporter, type SendMailOptions } from "nodemailer";

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
}

// Control whether to send real emails or just log (development mode)
// Set MAILER_ENABLED=true in .env to send real emails
const MAILER_ENABLED = true;
// const MAILER_ENABLED = process.env.MAILER_ENABLED === "true";

let transporter: Transporter | null = null;

export function createTransporter(smtp: SmtpConfig): Transporter {
  transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: {
      user: smtp.user,
      pass: smtp.pass,
    },
  });

  return transporter;
}

export function getTransporter(): Transporter | null {
  return transporter;
}

interface EmailPayload {
  to: string;
  subject: string;
  body: string;
  from?: string;
}

export async function sendEmail(
  payload: EmailPayload,
  smtp?: SmtpConfig,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { to, subject, body, from } = payload;

  try {
    // Check if real email sending is enabled
    if (!MAILER_ENABLED || !smtp) {
      console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 EMAIL (${MAILER_ENABLED ? "SMTP Configured" : "Development Mode"} - Not Sent)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
From: ${from}
To: ${to}
Subject: ${subject}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${body}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      `);
      return {
        success: true,
        messageId: "dev_" + Date.now(),
      };
    }

    if (!transporter || (transporter as any).options?.host !== smtp.host) {
      createTransporter(smtp);
    }

    const info = await transporter.sendMail({
      from: from || "Notifications <noreply@projectx.dev>",
      to,
      subject,
      html: body,
    } as SendMailOptions);

    console.log("[EMAIL] Sent: " + info.messageId);

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Failed to send email";
    console.error("[EMAIL] Error: " + errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}
