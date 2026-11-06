import { NextRequest } from "next/server";
import { z } from "zod";
import { adminContext, adminOrder, adminFailure, adminJson, AdminError } from "@/lib/admin/access";
const actionSchema = z.object({ revision: z.number().int().nonnegative(), action: z.enum(["mark_ordered", "mark_shipped", "mark_delivered", "save_note"]), note: z.string().max(2000).default(""), carrier: z.string().trim().max(50).default(""), tracking: z.string().trim().max(60).default("") });
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: NextRequest, { params }: Context) {
  try {
    const { id } = await params;
    if (!z.uuid().safeParse(id).success) throw new AdminError("주문을 찾을 수 없어요.", 404);
    return adminJson((await adminOrder(id)).detail);
  } catch (e) { return adminFailure(e); }
}
export async function POST(request: NextRequest, { params }: Context) {
  try {
    if (request.headers.get("origin") !== request.nextUrl.origin) throw new AdminError("허용되지 않은 요청이에요.", 403);
    const { db } = await adminContext(), { id } = await params;
    if (!z.uuid().safeParse(id).success) throw new AdminError("주문을 찾을 수 없어요.", 404);
    let input; try { input = actionSchema.safeParse(await request.json()); } catch { throw new AdminError("입력 내용을 확인해 주세요.", 400); }
    if (!input.success) throw new AdminError("입력 내용을 확인해 주세요.", 400);
    const a = input.data;
    const { data, error } = await db.rpc("admin_update_order", { p_order_id: id, p_revision: a.revision, p_action: a.action, p_note: a.note, p_carrier: a.carrier, p_tracking: a.tracking });
    if (error) throw new AdminError(error.code === "40001" ? "다른 화면에서 주문이 변경되었어요. 새로고침 후 확인해 주세요." : "처리할 수 없는 상태이거나 송장 정보가 올바르지 않아요.", error.code === "40001" ? 409 : 400);
    return adminJson({ revision: data });
  } catch (e) { return adminFailure(e); }
}
