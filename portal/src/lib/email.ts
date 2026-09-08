import { Resend } from "resend";

// Envío de correo con Resend. Requiere RESEND_API_KEY; EMAIL_FROM opcional.
export async function sendEmail(opts: { to: string | string[]; subject: string; html: string }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY no está definida.");
  const resend = new Resend(key);
  const from = process.env.EMAIL_FROM || "onboarding@resend.dev";
  return resend.emails.send({ from, to: opts.to, subject: opts.subject, html: opts.html });
}
