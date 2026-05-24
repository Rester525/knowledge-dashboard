import { getAuthUser } from "@/lib/auth";
import { createToken } from "@/lib/auth";

function getRedirectUri(request: Request): string {
  const url = new URL(request.url);
  const host = url.host;
  const protocol = host.includes("localhost") ? "http" : "https";
  return `${protocol}://${host}/api/gmail/callback`;
}

function generateState(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function GET(request: Request) {
  const auth = await getAuthUser(request);
  if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const state = generateState();
  const redirectUri = getRedirectUri(request);

  const params = new URLSearchParams({
    client_id: process.env.GMAIL_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/gmail.modify",
    access_type: "offline",
    prompt: "consent",
    state,
  });

  const authUrl = `https://accounts.google.com/o/oauth2/auth?${params}`;

  return Response.json(
    { url: authUrl },
    {
      status: 200,
      headers: {
        "Set-Cookie": `gmail_oauth_state=${state}; HttpOnly; SameSite=Lax; Path=/; Max-Age=600`,
      },
    }
  );
}
