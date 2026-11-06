import type { NextRequest } from "next/server";
import { z } from "zod";
import { adminOrder, adminFailure, AdminError } from "@/lib/admin/access";
import { PDF_TEMPLATE_VERSION, renderOrderPdf } from "@/lib/admin/pdf";
export const maxDuration = 120;
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!z.uuid().safeParse(id).success) throw new AdminError("주문을 찾을 수 없어요.", 404);
    const { db, user, detail } = await adminOrder(id);
    const path = `${id}/book-v${PDF_TEMPLATE_VERSION}.pdf`;
    const { data: cached, error: cacheError } = await db.from("order_documents").select("object_path").eq("order_id", id).eq("template_version", PDF_TEMPLATE_VERSION).maybeSingle();
    if (cacheError) throw new AdminError("PDF 저장소 설정을 확인해 주세요.", 503);
    let buffer: ArrayBuffer;
    if (cached) {
      const { data, error } = await db.storage.from("order-pdfs").download(cached.object_path);
      if (error || !data) throw new AdminError("보관한 PDF를 불러오지 못했어요.", 500);
      buffer = await data.arrayBuffer();
    } else {
      const generated = await renderOrderPdf(id);
      const { error } = await db.storage.from("order-pdfs").upload(path, generated.buffer, { contentType: "application/pdf", upsert: false });
      if (error && !("statusCode" in error && String(error.statusCode) === "409")) throw new AdminError("PDF를 보관하지 못했어요. 다시 시도해 주세요.", 500);
      const { error: recordError } = await db.from("order_documents").insert({ order_id: id, template_version: PDF_TEMPLATE_VERSION, object_path: path, page_count: generated.pageCount, created_by: user.id });
      if (recordError && recordError.code !== "23505") throw new AdminError("PDF 기록을 저장하지 못했어요.", 500);
      // Return exactly the persisted artifact, including a concurrent creator's file.
      const stored = await db.storage.from("order-pdfs").download(path);
      if (stored.error || !stored.data) throw new AdminError("PDF를 불러오지 못했어요.", 500);
      buffer = await stored.data.arrayBuffer();
    }
    return new Response(buffer, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${detail.order.order_number}-photobook.pdf"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (e) { return adminFailure(e); }
}
