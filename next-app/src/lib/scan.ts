import OpenAI from "openai";

const SYSTEM_PROMPT = `You are an email task extractor. Analyze the email and determine if it contains an actionable task for the recipient.

An actionable task MUST be a DIRECT, HUMAN-WRITTEN REQUEST that requires the recipient to DO something specific. When in doubt, mark is_task: false.

ALWAYS mark is_task: false for these types of emails:
- Newsletters, promotional emails, marketing, deals, offers, coupons
- Automated notifications (password changes, security alerts, account recovery, login notices)
- Two-factor authentication codes, verification codes, one-time passwords
- Order confirmations, receipts, invoices, shipping/tracking notifications
- Delivery failure bounces, undeliverable notifications
- Calendar event notifications, reminders, invites (unless the email itself is a personal request to attend)
- Social media notifications (friend requests, connection requests, profile views, likes, comments)
- System-generated alerts from any platform or service
- "Welcome" emails, onboarding sequences, account setup confirmations
- Survey requests, feedback requests, "how did we do" emails
- Status updates, digests, summaries, weekly reports
- Generic FYI messages with no specific ask
- GitHub/GitLab/Bitbucket notifications about PRs, issues, commits, deployments
- CI/CD notifications (build failures, test results, deployment status)
- "Someone viewed your profile" or similar generic platform notifications
- Credit card statements, bank notifications, payment confirmations
- Appointment reminders, reservation confirmations
- Any email where the primary purpose is to inform rather than request action

Respond with ONLY a valid JSON object, no other text:
{
  "is_task": true/false,
  "title": "Short, specific task title (5-10 words)",
  "description": "2-3 sentence summary of what needs to be done, including relevant context from the email",
  "due_date": "YYYY-MM-DD or null if no date mentioned",
  "priority": "high/medium/low"
}

For due_date: resolve relative dates (like "tomorrow", "next Monday", "by Friday") based on the email's sent date, not today's date. If the email says "December 15" and the email was sent in December 2025, use 2025-12-15 — do NOT shift it to the current year. If an absolute date is given (e.g. "March 3, 2025"), use it as-is. If no date is mentioned, use null.

Priority guide:
- high: urgent deadlines, boss/client requests, time-sensitive
- medium: regular tasks, meeting prep, follow-ups
- low: optional, whenever, FYI-but-actionable`;

export interface DetectedTask {
  is_task: boolean;
  title: string;
  description: string;
  due_date: string | null;
  priority: "high" | "medium" | "low";
}

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

export async function detectTask(
  subject: string,
  body: string,
  sender: string,
  emailDate: string = ""
): Promise<DetectedTask> {
  const today = new Date().toISOString().slice(0, 10);
  const emailDateStr = emailDate ? `(sent: ${emailDate})` : "(date unknown)";
  const emailText = `Today's date is ${today}.\nEmail date is ${emailDateStr}\nFrom: ${sender}\nSubject: ${subject}\n\n${body}`;

  const openai = getOpenAI();
  const resp = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: emailText },
    ],
    temperature: 0.1,
    max_tokens: 512,
  });

  const content = resp.choices[0]?.message?.content?.trim() || "";

  // Extract first JSON object from response
  const match = content.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]) as DetectedTask;
    } catch {
      // fall through
    }
  }

  return {
    is_task: false,
    title: "",
    description: "",
    due_date: null,
    priority: "low",
  };
}
