import type { NextRequest } from "next/server";
import { z } from "zod";
import { adminOrder, adminFailure, adminJson, AdminError } from "@/lib/admin/access";
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
    if (!cached) {
      const generated = await renderOrderPdf(id);
      const { error } = await db.storage.from("order-pdfs").upload(path, generated.buffer, { contentType: "application/pdf", upsert: false });
      if (error && !("statusCode" in error && String(error.statusCode) === "409")) throw new AdminError("PDF를 보관하지 못했어요. 다시 시도해 주세요.", 500);
      const { error: recordError } = await db.from("order_documents").insert({ order_id: id, template_version: PDF_TEMPLATE_VERSION, object_path: path, page_count: generated.pageCount, created_by: user.id });
      if (recordError && recordError.code !== "23505") throw new AdminError("PDF 기록을 저장하지 못했어요.", 500);
    }
    const filename = `${detail.order.order_number}-photobook.pdf`;
    const { data: link, error: linkError } = await db.storage.from("order-pdfs").createSignedUrl(cached?.object_path ?? path, 120, { download: filename });
    if (linkError || !link) throw new AdminError("PDF 다운로드 링크를 만들지 못했어요. 다시 시도해 주세요.", 500);
    return adminJson({ downloadUrl: link.signedUrl, filename });
  } catch (e) { return adminFailure(e); }
}
