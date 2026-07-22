"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect("/login?error=invalid_credentials");
  }

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    redirect("/forgot-password?error=missing_email");
  }

  const supabase = createClient() as any;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.VERCEL_URL;
  const redirectTo = siteUrl
    ? `${siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`}/auth/callback?next=/reset-password`
    : undefined;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo
  });

  if (error) {
    redirect("/forgot-password?error=send_failed");
  }

  redirect("/forgot-password?success=sent");
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (password.length < 8) {
    redirect("/reset-password?error=short_password");
  }

  if (password !== confirmPassword) {
    redirect("/reset-password?error=password_mismatch");
  }

  const supabase = createClient() as any;
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect("/reset-password?error=update_failed");
  }

  await supabase.auth.signOut();
  redirect("/login?success=password_updated");
}
