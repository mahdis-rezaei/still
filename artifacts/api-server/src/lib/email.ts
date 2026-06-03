import { logger } from "./logger";

// Transactional email via the Resend REST API (no SDK). From-address and key
// come from the environment. If RESEND_API_KEY is unset (e.g. local dev), we
// log and no-op instead of throwing, so auth flows still work without email.

const RESEND_ENDPOINT = "https://api.resend.com/emails";

function fromAddress(): string {
  return process.env.EMAIL_FROM ?? "Yadegar <hello@yadegarjournal.com>";
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    logger.warn(
      { to: opts.to, subject: opts.subject },
      "RESEND_API_KEY not set — skipping email send",
    );
    return;
  }
  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddress(),
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend send failed: ${res.status} ${body}`);
  }
}

// A calm, on-brand wrapper. Plain, warm, no marketing.
function wrap(title: string, bodyHtml: string): string {
  return `<div style="font-family:Georgia,'Times New Roman',serif;max-width:480px;margin:0 auto;color:#25211C;line-height:1.6">
    <p style="font-size:22px;color:#3A2F25;margin:0 0 16px">${title}</p>
    ${bodyHtml}
    <p style="font-size:13px;color:#A59B8D;margin-top:28px">Yadegar — a companion to a lifelong journaling practice.</p>
  </div>`;
}

function button(href: string, label: string): string {
  return `<p style="margin:20px 0"><a href="${href}" style="background:#3A2F25;color:#F7F1E6;text-decoration:none;padding:11px 22px;border-radius:999px;font-family:Helvetica,Arial,sans-serif;font-size:14px">${label}</a></p>`;
}

export function verificationEmail(link: string): {
  subject: string;
  html: string;
  text: string;
} {
  return {
    subject: "Confirm your email · Yadegar",
    html: wrap(
      "Welcome to Yadegar.",
      `<p>Please confirm this is your email so we can keep your pages tied to you.</p>${button(link, "Confirm email")}<p style="font-size:13px;color:#6F675C">Or paste this link: ${link}</p>`,
    ),
    text: `Welcome to Yadegar.\n\nConfirm your email: ${link}\n`,
  };
}

export function writingNudgeEmail(link: string): {
  subject: string;
  html: string;
  text: string;
} {
  return {
    subject: "A page is waiting · Yadegar",
    html: wrap(
      "What wants to be written today?",
      `<p>No streak to keep, nothing to catch up on. Just a quiet moment, if you have one — one honest line is enough.</p>${button(link, "Write today")}`,
    ),
    text: `What wants to be written today? Write today: ${link}\n`,
  };
}

export function memoryNudgeEmail(opts: {
  observation?: string | null;
  quote?: string | null;
  quoteDate?: string | null;
  link: string;
}): { subject: string; html: string; text: string } {
  const when = opts.quoteDate ? ` from ${opts.quoteDate}` : "";
  const quoteHtml = opts.quote
    ? `<p style="font-family:Georgia,serif;font-style:italic;font-size:20px;color:#3A2F25;margin:0 0 12px">&ldquo;${opts.quote}&rdquo;</p>`
    : "";
  const obsHtml = opts.observation
    ? `<p style="color:#6F675C">${opts.observation}</p>`
    : "";
  return {
    subject: "A page came back · Yadegar",
    html: wrap(
      `A page${when} came back.`,
      `${quoteHtml}${obsHtml}${button(opts.link, "Read the page")}`,
    ),
    text: `A page${when} came back.\n\n${opts.quote ? `"${opts.quote}"\n\n` : ""}Read it: ${opts.link}\n`,
  };
}

// A date-based "on this day" return — no engine, just a page from this same day
// in a past year. Warm and quiet: a page placed on the desk, never a demand.
export function onThisDayNudgeEmail(opts: {
  monthYear: string; // e.g. "June 2018"
  excerpt: string;
  link: string;
}): { subject: string; html: string; text: string } {
  // Keep the teaser short for an email; the full page is one tap away.
  const teaser =
    opts.excerpt.length > 220
      ? opts.excerpt.slice(0, 219).trimEnd() + "…"
      : opts.excerpt;
  const quoteHtml = `<p style="font-family:Georgia,serif;font-style:italic;font-size:20px;color:#3A2F25;margin:0 0 12px">&ldquo;${teaser}&rdquo;</p>`;
  return {
    subject: "A page came back · Yadegar",
    html: wrap(
      `A page from ${opts.monthYear} came back today.`,
      `${quoteHtml}${button(opts.link, "Read the page")}`,
    ),
    text: `A page from ${opts.monthYear} came back today.\n\n"${teaser}"\n\nRead it: ${opts.link}\n`,
  };
}

export function passwordResetEmail(link: string): {
  subject: string;
  html: string;
  text: string;
} {
  return {
    subject: "Reset your password · Yadegar",
    html: wrap(
      "Reset your password.",
      `<p>Use the link below to set a new password. It expires in an hour. If you didn't ask for this, you can ignore this email.</p>${button(link, "Set a new password")}<p style="font-size:13px;color:#6F675C">Or paste this link: ${link}</p>`,
    ),
    text: `Reset your Yadegar password (expires in 1 hour): ${link}\n\nIf you didn't request this, ignore this email.\n`,
  };
}
