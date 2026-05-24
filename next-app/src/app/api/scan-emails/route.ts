import { sql } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import {
  getAccessToken,
  getUnprocessedEmails,
  ensureLabel,
  labelAsProcessed,
  getAccountsForUser,
} from "@/lib/gmail";
import { detectTask } from "@/lib/scan";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(request: Request) {
  const auth = await getAuthUser(request);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const accounts = await getAccountsForUser(auth.userId);
  if (accounts.length === 0) {
    return Response.json(
      { error: "No Gmail accounts connected. Connect a Gmail account first." },
      { status: 400 }
    );
  }

  const tasks: { id: number; text: string; account: string }[] = [];
  let scanned = 0;

  try {
    for (const account of accounts) {
      const accessToken = await getAccessToken(account.refreshToken);

      // Fetch label ID once per account — cached in ensureLabel
      const labelId = await ensureLabel(accessToken);

      const emails = await getUnprocessedEmails(accessToken);

      for (const email of emails) {
        scanned++;

        try {
          const existing = await sql`
            SELECT message_id FROM email_scans WHERE message_id = ${email.id}
          `;
          if (existing.length > 0) continue;

          // Rate-limit: small delay between emails to stay under Gmail per-user quota
          if (scanned > 1) await sleep(400);

          const body = email.body.slice(0, 1500);
          const result = await detectTask(email.subject, body, email.sender, email.date);

          if (result.is_task && result.title) {
            const priority = result.priority.toUpperCase();
            const text = result.description
              ? `[${priority}] ${result.title} — ${result.description}`
              : `[${priority}] ${result.title}`;

            const rows = await sql`
              INSERT INTO todos (user_id, text) VALUES (${auth.userId}, ${text.slice(0, 500)})
              RETURNING id, text
            `;
            tasks.push({ ...rows[0], account: account.email } as {
              id: number;
              text: string;
              account: string;
            });
          }

          await labelAsProcessed(accessToken, labelId, email.id);
          await sql`
            INSERT INTO email_scans (message_id, user_id)
            VALUES (${email.id}, ${auth.userId})
            ON CONFLICT DO NOTHING
          `;
        } catch (err) {
          console.error(`Failed to process email ${email.id}:`, err);
          // Still mark as processed so we don't retry the same broken email
          try {
            await labelAsProcessed(accessToken, labelId, email.id);
            await sql`
              INSERT INTO email_scans (message_id, user_id)
              VALUES (${email.id}, ${auth.userId})
              ON CONFLICT DO NOTHING
            `;
          } catch (_) {
            // Best-effort cleanup — non-critical
          }
        }
      }
    }

    return Response.json({
      scanned,
      tasksFound: tasks.length,
      tasks,
    });
  } catch (e) {
    console.error("scan-emails error:", e);
    return Response.json(
      { error: e instanceof Error ? e.message : "Scan failed" },
      { status: 500 }
    );
  }
}
