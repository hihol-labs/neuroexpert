import nodemailer from "nodemailer";

/**
 * R-01 (ADR-004): транзакционные письма worker'а через тот же SMTP (Yandex 360), что у GoTrue.
 * Env: SMTP_HOST, SMTP_PORT (587 по умолчанию), SMTP_USER, SMTP_PASS, SMTP_ADMIN_EMAIL (отправитель).
 * Без конфигурации бросает ошибку — вызывающий пишет её в *_last_error и повторит на следующем свипе;
 * письмо никогда не считается отправленным молча.
 */
export interface MailMessage { to: string; subject: string; text: string; html?: string; bcc?: string[] }
export type SendMail = (message: MailMessage) => Promise<void>;

export function createMailer(env: Record<string, string | undefined> = process.env): SendMail {
  let transport: nodemailer.Transporter | null = null;
  return async (message) => {
    const host = env.SMTP_HOST, user = env.SMTP_USER, pass = env.SMTP_PASS;
    if (!host || !user || !pass) throw new Error("SMTP is not configured (SMTP_HOST/SMTP_USER/SMTP_PASS)");
    const port = Number(env.SMTP_PORT || 587);
    transport ??= nodemailer.createTransport({
      host, port, secure: port === 465, auth: { user, pass },
      connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 30000,
    });
    const from = env.SMTP_ADMIN_EMAIL || user;
    await transport.sendMail({ from: `НейроЭксперт <${from}>`, to: message.to, ...(message.bcc?.length ? { bcc: message.bcc } : {}), subject: message.subject, text: message.text, html: message.html });
  };
}
