import type { NextRequest } from "next/server";
import { z } from "zod";
import { adminOrder, adminFailure, adminJson, AdminError } from "@/lib/admin/access";
import { PDF_TEMPLATE_VERSION, renderOrderPdf } from "@/lib/admin/pdf";
export const maxDuration = 300;
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const part = z.enum(["all", "cover", "interior"]).safeParse(_request.nextUrl.searchParams.get("part") ?? "all");
    if (!part.success) throw new AdminError("PDF 종류를 확인해 주세요.", 400);
    const { id } = await params;
    if (!z.uuid().safeParse(id).success) throw new AdminError("주문을 찾을 수 없어요.", 404);
    const { db, user, detail } = await adminOrder(id);
    const suffix = part.data === "all" ? "book" : part.data;
    const path = `${id}/${suffix}-v${PDF_TEMPLATE_VERSION}.pdf`;
    const filename = `${detail.order.order_number}-${part.data === "all" ? "photobook" : part.data}.pdf`;
    const storage = db.storage.from("order-pdfs");
    const sign = () => storage.createSignedUrl(path, 300, { download: filename });
    let { data: link } = await sign();

    if (!link) {
      const generated = await renderOrderPdf(id, part.data);
      const { error } = await storage.upload(path, generated.buffer, { contentType: "application/pdf", upsert: false });
      if (error && !("statusCode" in error && String(error.statusCode) === "409")) {
        console.error("admin_pdf_upload_failed", { part: part.data, bytes: generated.buffer.byteLength, message: error.message });
        throw new AdminError("생성된 PDF를 저장하지 못했어요. 원고 미리보기에서 PDF로 저장해 주세요.", 500);
      }
      if (part.data === "all") {
        const { error: recordError } = await db.from("order_documents").insert({
          order_id: id, template_version: PDF_TEMPLATE_VERSION, object_path: path,
          page_count: generated.pageCount, created_by: user.id,
        });
        if (recordError && recordError.code !== "23505") throw new AdminError("PDF 기록을 저장하지 못했어요.", 500);
      }
      ({ data: link } = await sign());
    }

    if (!link) throw new AdminError("PDF 다운로드 링크를 만들지 못했어요. 다시 시도해 주세요.", 500);
    return adminJson({ downloadUrl: link.signedUrl, filename });
  } catch (e) { return adminFailure(e); }
}
