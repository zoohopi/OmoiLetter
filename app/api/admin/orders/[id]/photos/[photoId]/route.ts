import { NextRequest } from "next/server";
import { z } from "zod";
import { adminOrder, adminFailure, AdminError } from "@/lib/admin/access";
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string; photoId: string }> }) {
  try {
    const { id, photoId } = await params;
    if (!z.uuid().safeParse(id).success) throw new AdminError("주문을 찾을 수 없어요.", 404);
    const { db, detail } = await adminOrder(id);
    const asset = detail.order.book_snapshot.assets?.find(a => a.photo_id === photoId);
    if (!asset || !asset.object_path.startsWith(`${detail.order.user_id}/${detail.order.book_id}/`) || !["image/jpeg", "image/png", "image/webp"].includes(asset.mime_type)) throw new AdminError("사진을 찾을 수 없어요.", 404);
    const { data, error } = await db.storage.from("book-photos").download(asset.object_path);
    if (error || !data) throw new AdminError("사진을 불러오지 못했어요.", 500);
    return new Response(await data.arrayBuffer(), { headers: { "Content-Type": asset.mime_type, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (e) { return adminFailure(e); }
}
