import { NextResponse, type NextRequest } from "next/server";
import { serverSupabase } from "@/lib/supabase/server";
import { supabaseConfig } from "@/lib/supabase/config";
import { profileSchema, addressSchema } from "@/lib/account/validation";

const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
export async function GET() {
  if (!supabaseConfig()) return json({ error: "로그인 서비스가 아직 연결되지 않았어요." }, 503);
  const db = await serverSupabase();
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) return json({ error: "로그인이 필요해요." }, 401);
  const results = await Promise.all([
    db.from("profiles").select("display_name,phone").eq("id", user.id).maybeSingle(),
    db.from("books").select("id,title,status,revision,updated_at").order("updated_at", { ascending: false }),
    db.from("addresses").select("*").order("created_at", { ascending: false }),
    db.from("orders").select("id,order_number,book_id,status,shipping_address,created_at,shipments(carrier,tracking_number,status,shipped_at,delivered_at)").order("created_at", { ascending: false }),
  ]);
  const admin = await db.rpc("is_admin");
  if (results.some(r => r.error)) return json({ error: "보관함을 불러오지 못했어요. 잠시 후 다시 시도해 주세요." }, 500);
  return json({ isAdmin: admin.data === true && !admin.error, user: { email: user.email ?? null }, profile: results[0].data, books: results[1].data, addresses: results[2].data, orders: results[3].data });
}
export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return json({ error: "허용되지 않은 요청이에요." }, 403);
  if (!supabaseConfig()) return json({ error: "로그인 서비스가 아직 연결되지 않았어요." }, 503);
  const db = await serverSupabase(); const { data: { user } } = await db.auth.getUser();
  if (!user) return json({ error: "로그인이 필요해요." }, 401);
  let body;
  try { body = await request.json(); } catch { return json({ error: "입력 내용을 확인해 주세요." }, 400); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return json({ error: "입력 내용을 확인해 주세요." }, 400);
  if (body.action === "profile") {
    const parsed = profileSchema.safeParse(body.data);
    if (!parsed.success) return json({ error: parsed.error.issues[0].message }, 400);
    const { error } = await db.from("profiles").upsert({ id: user.id, display_name: parsed.data.displayName, phone: parsed.data.phone });
    return error ? json({ error: "회원정보를 저장하지 못했어요." }, 500) : json({ ok: true });
  }
  if (body.action === "address") {
    const parsed = addressSchema.safeParse(body.data);
    if (!parsed.success) return json({ error: parsed.error.issues[0].message }, 400);
    const a = parsed.data;
    const row = { label: a.label, recipient_name: a.recipientName, phone: a.phone, postal_code: a.postalCode, address1: a.address1, address2: a.address2, delivery_note: a.deliveryNote };
    const result = a.id ? await db.from("addresses").update(row).eq("id", a.id).eq("user_id", user.id).select("id").single() : await db.from("addresses").insert({ ...row, user_id: user.id }).select("id").single();
    return result.error ? json({ error: "배송지를 저장하지 못했어요." }, 500) : json({ ok: true });
  }
  if (body.action === "delete-address" && typeof body.id === "string") {
    const { error } = await db.from("addresses").delete().eq("id", body.id).eq("user_id", user.id);
    return error ? json({ error: "배송지를 삭제하지 못했어요." }, 500) : json({ ok: true });
  }
  return json({ error: "입력 내용을 확인해 주세요." }, 400);
}
