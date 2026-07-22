import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = next.startsWith("/") ? next : "/dashboard";
  redirectUrl.search = "";

  if (code) {
    const supabase = createClient() as any;
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(redirectUrl);
    }
  }

  redirectUrl.pathname = "/forgot-password";
  redirectUrl.searchParams.set("error", "invalid_link");
  return NextResponse.redirect(redirectUrl);
}
