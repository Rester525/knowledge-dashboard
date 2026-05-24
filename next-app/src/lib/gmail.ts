const GMAIL_API = "https://gmail.googleapis.com/gmail/v1";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const LABEL_NAME = "task-processed";

const tokenCache = new Map<string, { access_token: string; expires_at: number }>();

// Cache the label ID per access token so we don't hit the API repeatedly
const labelCache = new Map<string, string>();

export async function getAccessToken(refreshToken: string): Promise<string> {
  const cached = tokenCache.get(refreshToken);
  if (cached && Date.now() < cached.expires_at - 60_000) {
    return cached.access_token;
  }

  const body = new URLSearchParams({
    client_id: process.env.GMAIL_CLIENT_ID!,
    client_secret: process.env.GMAIL_CLIENT_SECRET!,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const res = await fetch(TOKEN_URL, { method: "POST", body });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gmail token refresh failed: ${err}`);
  }

  const data = await res.json();
  tokenCache.set(refreshToken, {
    access_token: data.access_token,
    expires_at: Date.now() + (data.expires_in || 3600) * 1000,
  });
  return data.access_token;
}

async function gmailFetch(
  accessToken: string,
  path: string,
  options: RequestInit = {}
) {
  const res = await fetch(`${GMAIL_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gmail API error ${res.status} on ${path}: ${err}`);
  }
  return res.json();
}

export async function ensureLabel(accessToken: string): Promise<string> {
  if (labelCache.has(accessToken)) {
    return labelCache.get(accessToken)!;
  }

  const data = await gmailFetch(accessToken, "/users/me/labels");
  const existing = (data.labels || []).find(
    (l: { name: string }) => l.name === LABEL_NAME
  );
  if (existing) {
    labelCache.set(accessToken, existing.id);
    return existing.id;
  }

  const created = await gmailFetch(accessToken, "/users/me/labels", {
    method: "POST",
    body: JSON.stringify({
      name: LABEL_NAME,
      labelListVisibility: "labelShow",
      messageListVisibility: "show",
    }),
  });
  labelCache.set(accessToken, created.id);
  return created.id;
}

export async function labelAsProcessed(
  accessToken: string,
  labelId: string,
  messageId: string
): Promise<void> {
  await gmailFetch(accessToken, `/users/me/messages/${messageId}/modify`, {
    method: "POST",
    body: JSON.stringify({ addLabelIds: [labelId] }),
  });
}

export interface Email {
  id: string;
  threadId: string;
  subject: string;
  sender: string;
  date: string;
  body: string;
}

export async function getUnprocessedEmails(
  accessToken: string,
  maxResults = 10
): Promise<Email[]> {
  // Pre-warm label cache so subsequent labelAsProcessed calls don't re-fetch
  await ensureLabel(accessToken);

  const query = `-label:${LABEL_NAME} -label:SENT -in:spam -in:trash -label:CATEGORY_PROMOTIONS -label:CATEGORY_SOCIAL`;
  const list = await gmailFetch(
    accessToken,
    `/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`
  );

  const messages = list.messages || [];
  const emails: Email[] = [];

  for (const msg of messages) {
    const full = await gmailFetch(
      accessToken,
      `/users/me/messages/${msg.id}?format=full`
    );
    const headers: Record<string, string> = {};
    for (const h of full.payload.headers) {
      headers[h.name] = h.value;
    }
    emails.push({
      id: full.id,
      threadId: full.threadId,
      subject: headers["Subject"] || "(no subject)",
      sender: headers["From"] || "unknown",
      date: headers["Date"] || "",
      body: extractBody(full.payload),
    });
  }

  return emails;
}

function extractBody(payload: Record<string, unknown>): string {
  if (payload.parts) {
    for (const part of payload.parts as Record<string, unknown>[]) {
      const result = findPlainText(part);
      if (result) return result;
    }
    for (const part of payload.parts as Record<string, unknown>[]) {
      const data = (part.body as Record<string, string>)?.data;
      if (data) return decodeBody(data);
    }
  }

  const data = (payload.body as Record<string, string>)?.data;
  if (data) return decodeBody(data);

  return "";
}

function findPlainText(part: Record<string, unknown>): string | null {
  if (part.mimeType === "text/plain") {
    const data = (part.body as Record<string, string>)?.data;
    if (data) return decodeBody(data);
  }
  if (part.parts) {
    for (const sub of part.parts as Record<string, unknown>[]) {
      const result = findPlainText(sub);
      if (result) return result;
    }
  }
  return null;
}

function decodeBody(data: string): string {
  return Buffer.from(
    data.replace(/-/g, "+").replace(/_/g, "/"),
    "base64"
  ).toString("utf-8");
}

export interface GmailAccount {
  id: number;
  email: string;
  refreshToken: string;
}

export async function getAccountsForUser(
  userId: number
): Promise<GmailAccount[]> {
  const { sql } = await import("@/lib/db");
  const rows = await sql`
    SELECT id, email, refresh_token FROM gmail_accounts
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;
  return rows.map((r: Record<string, unknown>) => ({
    id: r.id as number,
    email: r.email as string,
    refreshToken: r.refresh_token as string,
  }));
}
