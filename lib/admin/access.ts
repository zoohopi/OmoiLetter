import "server-only";
import { NextResponse } from "next/server";
import { serverSupabase } from "@/lib/supabase/server";
import { supabaseConfig } from "@/lib/supabase/config";
import type { AdminDetail } from "./types";

export class AdminError extends Error { constructor(message: string, public status: number) { super(message); } }
export const adminJson = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
export const adminFailure = (e: unknown) => adminJson({ error: e instanceof AdminError ? e.message : "처리하지 못했어요. 잠시 후 다시 시도해 주세요." }, e instanceof AdminError ? e.status : 500);
export async function adminContext() {
  if (!supabaseConfig()) throw new AdminError("Supabase 연결 후 관리자 계정을 등록하면 주문을 확인할 수 있어요.", 503);
  const db = await serverSupabase();
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) throw new AdminError("관리자 계정으로 로그인해 주세요.", 401);
  const { data: allowed, error: permissionError } = await db.rpc("is_admin");
  if (permissionError) throw new AdminError("관리자 DB 설정을 확인해 주세요.", 503);
  if (allowed !== true) throw new AdminError("관리자 계정만 접속할 수 있어요.", 403);
  return { db, user };
}
export async function adminOrder(id: string) {
  const context = await adminContext();
  const { data, error } = await context.db.rpc("admin_order_detail", { p_order_id: id });
  if (error) throw new AdminError("주문을 불러오지 못했어요.", 500);
  if (!data) throw new AdminError("주문을 찾을 수 없어요.", 404);
  return { ...context, detail: data as AdminDetail };
}
