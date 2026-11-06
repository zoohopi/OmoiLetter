import { NextResponse, type NextRequest } from "next/server";
import { serverSupabase } from "@/lib/supabase/server";
import { supabaseConfig } from "@/lib/supabase/config";
import { orderSchema } from "@/lib/account/validation";

export async function POST(request: NextRequest) {
  const respond = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
  if (request.headers.get("origin") !== request.nextUrl.origin) return respond({ error: "허용되지 않은 요청이에요." }, 403);
  if (!supabaseConfig()) return respond({ error: "로그인 서비스가 아직 연결되지 않았어요." }, 503);
  const db = await serverSupabase(); const { data: { user } } = await db.auth.getUser();
  if (!user) return respond({ error: "로그인이 필요해요." }, 401);
  let input; try { input = orderSchema.safeParse(await request.json()); } catch { return respond({ error: "입력 내용을 확인해 주세요." }, 400); }
  if (!input.success) return respond({ error: "책과 배송지를 선택해 주세요." }, 400);
  const { data, error } = await db.rpc("request_book_order", { p_book_id: input.data.bookId, p_address_id: input.data.addressId });
  if (error) return respond({ error: error.code === "22023" ? "책을 완성하고 배송지 정보를 확인해 주세요." : "주문 요청을 저장하지 못했어요." }, 400);
  return respond({ orderId: data });
}
