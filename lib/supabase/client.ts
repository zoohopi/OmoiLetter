"use client";
import { createBrowserClient } from "@supabase/ssr";
import { supabaseConfig } from "./config";

export function browserSupabase() {
  const config = supabaseConfig();
  if (!config) throw new Error("로그인 연결을 준비 중이에요. 잠시 후 다시 이용해 주세요.");
  return createBrowserClient(config.url, config.key);
}
