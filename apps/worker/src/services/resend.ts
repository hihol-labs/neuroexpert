// Resend email service — POST https://api.resend.com/emails

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";

interface SendEmailParams {
  from: string;
  to: string | string[];
  bcc?: string[];
  subject: string;
  html: string;
}

interface ResendResponse {
  id: string;
}

export async function sendEmail(params: SendEmailParams): Promise<ResendResponse> {
  if (!RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY not configured");
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend API error ${res.status}: ${text}`);
  }

  return (await res.json()) as ResendResponse;
}
