"use client";

import { createBrowserClient } from "@supabase/ssr";

export interface BrowserUser {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}

export interface BrowserSession {
  access_token: string;
  user: BrowserUser;
}

export type AuthError = { message: string } | null;

export interface BrowserAuth {
  getSession(): Promise<{ data: { session: BrowserSession | null } | null; error: AuthError }>;
  signInWithOtp(args: {
    email: string;
    options: { emailRedirectTo: string; shouldCreateUser: boolean };
  }): Promise<{ error: AuthError }>;
  signOut(): Promise<{ error: AuthError }>;
}

export interface BrowserClient {
  auth: BrowserAuth;
}

let client: BrowserClient | null = null;

export function supabaseBrowser(): BrowserClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  if (!client) {
    client = createBrowserClient(url, anonKey) as unknown as BrowserClient;
  }
  return client;
}

export function authConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}