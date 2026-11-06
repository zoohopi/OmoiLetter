// 편지 한 권의 작업 데이터. 01. TECH/01. ARCHITECTURE.md 4장 테이블 초안과 같은 내용을 담는다.
// 회원별 로컬 캐시와 Supabase books JSON 원고에 보관하며 사진은 비공개 Storage로 분리한다.
import type { DesignId, LayoutId } from "./designs";

// 크기는 8×8 한 가지 (211 × 211mm). "4x5"는 잠시 쓰던 값 — 같은 8×8로 그린다.
export type BookSize = "4x5" | "8x8";

export type Step = "order" | "interview" | "photos" | "preview";

export type PhotoTransform = { scale: number; x: number; y: number };

export type Draft = {
  cloudId?: string;
  cloudRevision?: number;
  cloudSavedAt?: string;
  coverPhotoTransform?: PhotoTransform;
  coverPhotoFrame?: PhotoTransform;
  photoTransforms?: Record<string, PhotoTransform>;
  photoFrames?: Record<string, PhotoTransform>;
  version: 1;
  bookPhotos?: { id: string; photoId: string }[];
  letters?: { id: string; question: string; answer: string; pageId: string | null }[];
  editorStage?: "photos" | "letters";
  status: "draft" | "submitted";
  step: Step;
  interviewIndex: number; // 인터뷰에서 마지막으로 보던 질문
  occasion: "lover-birthday";
  recipientName: string;
  anniversaryDate: string; // YYYY-MM-DD
  lateAccepted: boolean; // 마감이 지났는데 기념일 이후 도착에 동의함
  bookSize: BookSize;
  answers: Record<string, string>; // 질문 id → 쓴 그대로의 답
  photoByQuestion: Record<string, string>; // 질문 id → 사진 id
  design?: DesignId; // 책 디자인 (없으면 미니멀). lib/letter/designs.ts
  photoLayout?: Record<string, LayoutId>; // 질문 id → 펼침 레이아웃 (없으면 세로)
  coverPhotoId: string | null; // 시작 화면에서 따로 고른 표지 사진
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
};
