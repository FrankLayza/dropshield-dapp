import JSZip from "jszip";
import QRCode from "qrcode";

export interface ZipRecipient {
  address: string;
  label?: string;
  claimLink: string;
}

export interface GenerateZipParams {
  campaignName: string;
  campaignAddress: string;
  recipients: ZipRecipient[];
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

function buildHtmlCard(params: {
  recipient: ZipRecipient;
  campaignName: string;
  qrDataUrl: string;
}): string {
  const { recipient, campaignName, qrDataUrl } = params;
  const displayName =
    recipient.label ||
    `${recipient.address.slice(0, 6)}...${recipient.address.slice(-4)}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Enveil Claim Card - ${displayName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; background: #f0eef9; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 24px; }
    .card { background: #fff; border-radius: 24px; padding: 44px 40px; max-width: 420px; width: 100%; box-shadow: 0 8px 48px rgba(124,58,237,0.12); text-align: center; }
    .wordmark { font-size: 20px; font-weight: 900; color: #1a1a2e; letter-spacing: -0.04em; margin-bottom: 36px; }
    .wordmark em { color: #7c3aed; font-style: normal; }
    h1 { font-size: 22px; font-weight: 700; color: #1a1a2e; line-height: 1.3; }
    .sub { font-size: 14px; color: #6b7280; margin-top: 6px; line-height: 1.5; }
    .meta { margin: 24px 0; padding: 16px 20px; background: #f9fafb; border-radius: 14px; text-align: left; border: 1px solid #e5e7eb; }
    .meta-row { display: flex; justify-content: space-between; font-size: 13px; color: #374151; padding: 4px 0; }
    .meta-label { color: #9ca3af; }
    .meta-value { font-weight: 600; text-align: right; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .qr-wrap { margin: 24px auto; width: 180px; height: 180px; border-radius: 16px; overflow: hidden; border: 2px solid #ede9fe; padding: 8px; background: #fff; }
    .qr-wrap img { width: 100%; height: 100%; display: block; }
    .cta { display: block; margin: 20px 0 12px; background: #7c3aed; color: #fff; text-decoration: none; padding: 15px 24px; border-radius: 999px; font-weight: 700; font-size: 15px; }
    .url { font-size: 10px; color: #d1d5db; word-break: break-all; margin-top: 4px; padding: 0 8px; }
    .notice { font-size: 12px; color: #d1d5db; margin-top: 28px; border-top: 1px solid #f3f4f6; padding-top: 20px; }
    @media print { body { background: white; padding: 0; } .card { box-shadow: none; border: 1px solid #e5e7eb; } }
  </style>
</head>
<body>
  <div class="card">
    <div class="wordmark">en<em>veil</em></div>
    <h1>You have a private<br/>token allocation</h1>
    <p class="sub">Your amount is encrypted - only you can see it.<br/>Connect your wallet to reveal and claim.</p>
    <div class="meta">
      <div class="meta-row"><span class="meta-label">Campaign</span><span class="meta-value">${campaignName || "Token Campaign"}</span></div>
      <div class="meta-row"><span class="meta-label">For</span><span class="meta-value">${displayName}</span></div>
    </div>
    <div class="qr-wrap"><img src="${qrDataUrl}" alt="QR code to claim tokens" /></div>
    <a class="cta" href="${recipient.claimLink}">Scan or click to claim</a>
    <div class="url">${recipient.claimLink}</div>
    <div class="notice">This link is unique to you. Do not share it.<br/>If you were not expecting this, you can safely ignore it.</div>
  </div>
</body>
</html>`;
}

export async function generateClaimZip(params: GenerateZipParams): Promise<Blob> {
  const { campaignName, campaignAddress, recipients } = params;
  const zip = new JSZip();

  const csvHeader = "label,address,claimLink";
  const csvRows = recipients.map((r) => {
    const label = (r.label ?? "").replace(/"/g, '""');
    const link = r.claimLink.replace(/"/g, '""');
    return `"${label}","${r.address}","${link}"`;
  });
  zip.file("all-links.csv", [csvHeader, ...csvRows].join("\n"));

  for (const r of recipients) {
    const qrDataUrl = await QRCode.toDataURL(r.claimLink, {
      width: 360,
      margin: 2,
      color: { dark: "#1a1a2e", light: "#ffffff" },
    });
    const html = buildHtmlCard({ recipient: r, campaignName, qrDataUrl });
    const namePart = r.label ? slugify(r.label) : "recipient";
    const addrPart = r.address.slice(2, 8).toLowerCase();
    zip.file(`${namePart}-${addrPart}.html`, html);
  }

  zip.file(
    "README.txt",
    `Enveil Claim Cards\n==================\nCampaign: ${campaignName || "Campaign"}\nAddress:  ${campaignAddress}\n\nContents:\n- One HTML card per recipient (open in browser, print, or share)\n- all-links.csv - all claim links in one place\n\nEach card contains a QR code. Recipients scan or click the link to claim.\nThe link is unique to each recipient - only their wallet can execute the claim.\n`
  );

  return zip.generateAsync({ type: "blob" });
}
