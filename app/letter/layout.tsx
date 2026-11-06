import type { Metadata } from "next";
import MakerHeader from "@/components/letter/MakerHeader";
import "./maker.css";

export const metadata: Metadata = {
  title: "편지 쓰기 — Omoi Letter",
};

export default function LetterLayout({ children }: LayoutProps<"/letter">) {
  return (
    <>
      <MakerHeader />
      {children}
    </>
  );
}
