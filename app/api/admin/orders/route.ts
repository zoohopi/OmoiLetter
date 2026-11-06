import { NextRequest } from "next/server";
import { adminContext, adminFailure, adminJson, AdminError } from "@/lib/admin/access";
export async function GET(request: NextRequest) {
  try {
    const { db } = await adminContext();
    const stage = request.nextUrl.searchParams.get("stage") || "todo";
    const search = (request.nextUrl.searchParams.get("search") || "").trim();
    const offset = Number(request.nextUrl.searchParams.get("offset") || "0");
    if (!["todo", "progress", "done"].includes(stage) || search.length > 100 || !Number.isInteger(offset) || offset < 0 || offset > 100000) throw new AdminError("검색 조건을 확인해 주세요.", 400);
    const { data, error } = await db.rpc("admin_order_list", { p_stage: stage, p_search: search, p_offset: offset });
    if (error) throw new AdminError("주문 목록을 불러오지 못했어요.", 500);
    return adminJson(data);
  } catch (e) { return adminFailure(e); }
}
