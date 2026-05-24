import { sql } from "@/lib/db";

const TOKEN_URL = "https://oauth2.googleapis.com/token";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const cookies = request.headers.get("cookie") || "";
  const stateMatch = cookies.match(
    /(?:^|;\s*)gmail_oauth_state=([^;]*)/
  );
  const savedState = stateMatch ? stateMatch[1] : null;

  const appUrl = new URL(request.url);
  const home = `${appUrl.protocol}//${appUrl.host}/`;

  if (error || !code || !state || state !== savedState) {
    const msg = encodeURIComponent(error || "Invalid OAuth state or missing code");
    const redirect = new URL(`/?gmail=error&msg=${msg}`, home);
    return Response.redirect(redirect.toString(), 302);
  }

  const redirectUri = `${appUrl.protocol}//${appUrl.host}/api/gmail/callback`;

  try {
    // Exchange code for tokens
    const tokenRes = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GMAIL_CLIENT_ID!,
        client_secret: process.env.GMAIL_CLIENT_SECRET!,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error("Token exchange failed:", err);
      const msg = encodeURIComponent(err.substring(0, 200));
      const redirect = new URL(`/?gmail=error&msg=${msg}`, home);
      return Response.redirect(redirect.toString(), 302);
    }

    const tokens = await tokenRes.json();

    // Get email address using access token
    const profileRes = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/profile",
      { headers: { Authorization: `Bearer ${tokens.access_token}` } }
    );
    const profile = await profileRes.json();

    const sessionMatch = cookies.match(/(?:^|;\s*)session=([^;]*)/);
    if (!sessionMatch) {
      const msg = encodeURIComponent("No session found — please sign in again");
      const redirect = new URL(`/?gmail=error&msg=${msg}`, home);
      return Response.redirect(redirect.toString(), 302);
    }

    const { jwtVerify } = await import("jose");
    const secretBytes = new TextEncoder().encode(
      process.env.JWT_SECRET || "fallback-insecure"
    );
    let userId: number;
    try {
      const { payload } = await jwtVerify(
        decodeURIComponent(sessionMatch[1]),
        secretBytes,
        { algorithms: ["HS256"] }
      );
      userId = (payload as { userId: number }).userId;
    } catch {
      const msg = encodeURIComponent("Session expired — please sign in again");
      const redirect = new URL(`/?gmail=error&msg=${msg}`, home);
      return Response.redirect(redirect.toString(), 302);
    }

    // Insert or update
    await sql`
      INSERT INTO gmail_accounts (user_id, email, refresh_token)
      VALUES (${userId}, ${profile.emailAddress}, ${tokens.refresh_token})
      ON CONFLICT DO NOTHING
    `;

    const redirect = new URL("/?gmail=connected", home);
    const response = Response.redirect(redirect.toString(), 302);
    response.headers.set(
      "Set-Cookie",
      "gmail_oauth_state=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0"
    );
    return response;
  } catch (e) {
    console.error("Gmail callback error:", e);
    const msg = encodeURIComponent(String(e).substring(0, 200));
    const redirect = new URL(`/?gmail=error&msg=${msg}`, home);
    return Response.redirect(redirect.toString(), 302);
  }
}
