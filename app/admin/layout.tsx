import type { Metadata } from "next";
import "./admin.css";
export const metadata: Metadata = { title: "주문·발주 관리 — Omoi Letter", robots: { index: false, follow: false } };
export default function AdminLayout({ children }: { children: React.ReactNode }) { return children; }
