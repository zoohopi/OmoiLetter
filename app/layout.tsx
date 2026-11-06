import type { Metadata, Viewport } from "next";
import { Fredoka, Nanum_Pen_Script, Noto_Sans_KR, Noto_Serif_KR } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import "./account.css";
import AccountProvider from "@/components/account/AccountProvider";

// 로고·기존 Cooper 영역은 교보손글씨 2025 이유빈체 (로고는 학교안심 나들이 B). Fredoka는 작은 영문 라벨에 사용
const fredoka = Fredoka({
  variable: "--font-fredoka", // 작은 영문 라벨용 글꼴
  subsets: ["latin"],
  weight: ["600", "700"],
});

// 한글 본문: Pretendard (app/fonts, 가변 글꼴)
const pretendard = localFont({
  src: "./fonts/PretendardVariable.woff2",
  variable: "--font-body",
  weight: "45 920",
});

// 제목·버튼·슬로건: 교보 손글씨 2025 (app/fonts). 굵기는 하나뿐이라 400으로만 쓴다
const kyobo = localFont({
  src: "./fonts/KyoboHandwriting2025lyb.ttf",
  variable: "--font-title",
  weight: "400",
});

// 로고 전용: 학교안심 나들이 TTF B
const brandLogo = localFont({
  src: "./fonts/HakgyoansimNadeuri-B.ttf",
  variable: "--font-logo",
  weight: "700",
});

// 편지지 위 손글씨
const pen = Nanum_Pen_Script({
  variable: "--font-hand",
  subsets: ["latin"],
  weight: "400",
});

// 편지책 디자인(미니멀·매거진)의 명조 / 고딕 — lib/letter/designs.ts
const serifKr = Noto_Serif_KR({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const sansKr = Noto_Sans_KR({
  variable: "--font-sans-kr",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Omoi Letter (想い Letter) — 말하지 못한 마음을, 한 권의 편지로",
  description: "누군가를 생각하는 마음을 인터뷰하고, 편지로 전합니다.",
};

export const viewport: Viewport = {
  themeColor: "#626E88",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${fredoka.variable} ${kyobo.variable} ${brandLogo.variable} ${pretendard.variable} ${pen.variable} ${serifKr.variable} ${sansKr.variable}`}
    >
      <body>
        <AccountProvider>{children}</AccountProvider>
      </body>
    </html>
  );
}
