export interface EmailRecipient {
  email: string;
  label?: string;
  claimLink: string;
  campaignName: string;
}

export interface EmailResult {
  sent: number;
  failed: number;
  notConfigured?: boolean;
  failedEmails?: string[];
}

/**
 * Sends claim notification emails via the /api/send-claim-emails Vercel
 * serverless function. Falls back gracefully if the endpoint is not available
 * (e.g. during local dev without `vercel dev`).
 */
export async function sendClaimEmails(
  recipients: EmailRecipient[],
): Promise<EmailResult> {
  const toSend = recipients.filter((r) => r.email);
  if (toSend.length === 0) return { sent: 0, failed: 0 };

  try {
    const response = await fetch("/api/send-claim-emails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipients: toSend }),
    });

    if (!response.ok) {
      return { sent: 0, failed: toSend.length, notConfigured: true };
    }

    const data = (await response.json()) as {
      sent: number;
      failed: number;
      failedEmails?: string[];
    };
    return {
      sent: data.sent,
      failed: data.failed,
      failedEmails: data.failedEmails,
    };
  } catch {
    return { sent: 0, failed: toSend.length, notConfigured: true };
  }
}
