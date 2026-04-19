import { NextResponse } from "next/server";

import { publicAbsoluteUrl } from "@/lib/resolvePublicOrigin";

export async function GET(request: Request) {
  const response = NextResponse.redirect(publicAbsoluteUrl("/", request));

  response.cookies.set("discord_access_token", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 0,
  });

  response.cookies.set("discord_user_id", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 0,
  });

  response.cookies.set("discord_user_name", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 0,
  });

  return response;
}
