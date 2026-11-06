import type { Draft } from "@/lib/letter/types";
export type Stage = "todo" | "progress" | "done";
export type ShippingAddress = { recipient_name: string; phone: string; postal_code: string; address1: string; address2: string; delivery_note: string };
export type SnapshotAsset = { photo_id: string; object_path: string; mime_type: string; byte_size: number; user_id: string; book_id: string };
export type AdminOrder = { id: string; order_number: string; user_id: string; status: string; shipping_address: ShippingAddress; created_at: string; production_ordered_at: string | null; admin_revision: number; customer_name: string; customer_phone: string; email: string | null; book_name: string; pdf_ready: boolean };
export type AdminList = { orders: AdminOrder[]; total: number; counts: Record<Stage, number> };
export type AdminDetail = {
  order: Omit<AdminOrder, "customer_name" | "customer_phone" | "email" | "book_name" | "pdf_ready"> & { production_note: string; book_id: string; book_snapshot: { draft: Draft; assets: SnapshotAsset[] } };
  customer: { name: string | null; phone: string | null; email: string | null };
  shipments: { id: string; carrier: string; tracking_number: string; status: string; shipped_at: string | null; delivered_at: string | null }[];
  documents: { template_version: number; page_count: number; created_at: string }[];
  events: { id: string; action: string; created_at: string }[];
};
export const ORDER_STATUS: Record<string, string> = { requested: "주문 요청", awaiting_payment: "결제 대기", paid: "결제 확인", producing: "발주 완료 · 제작 중", shipped: "배송 중", delivered: "배송 완료", cancelled: "취소" };
