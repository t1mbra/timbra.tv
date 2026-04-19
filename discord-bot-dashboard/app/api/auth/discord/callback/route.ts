import { NextResponse } from "next/server";

type DiscordTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
};

type DiscordUser = {
  id: string;
  username: string;
  global_name: string | null;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;

  if (!code) {
    return NextResponse.redirect(new URL("/?auth=missing_code", request.url));
  }

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json(
      { error: "Missing Discord OAuth env variables" },
      { status: 500 }
    );
  }

  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    const errorText = await tokenRes.text();
    return NextResponse.json(
      { error: "Failed to exchange code for token", details: errorText },
      { status: 500 }
    );
  }

  const tokenData = (await tokenRes.json()) as DiscordTokenResponse;

  const userRes = await fetch("https://discord.com/api/users/@me", {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
    },
  });

  if (!userRes.ok) {
    const errorText = await userRes.text();
    return NextResponse.json(
      { error: "Failed to fetch Discord user", details: errorText },
      { status: 500 }
    );
  }

  const user = (await userRes.json()) as DiscordUser;

  const response = NextResponse.redirect(new URL("/servers", request.url));

  response.cookies.set("discord_access_token", tokenData.access_token, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: tokenData.expires_in,
  });

  response.cookies.set("discord_user_id", user.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: tokenData.expires_in,
  });

  response.cookies.set(
    "discord_user_name",
    encodeURIComponent(user.global_name ?? user.username),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: tokenData.expires_in,
    }
  );

  return response;
}