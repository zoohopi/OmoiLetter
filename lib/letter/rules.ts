import { QUESTIONS } from "./questions";
import type { BookSize, Draft } from "./types";

export const MIN_ANSWERS = 5; // 무선 제본 최소 낱장 5장 = 펼침 5세트 (05. INTERVIEW.md 3장)
export const MAX_ANSWER_LENGTH = 500;
export const PRODUCTION_DAYS = 4; // 원고 확정 후 제작+배송 (00. BRAND.md 2-3)

// 실제 책 크기 (mm). 재단여백·안전영역은 티프린트 제작가이드 기준 각 3mm.
// 8×8 정사각 한 가지 (211 × 211mm). 사진은 그 안에 4:5로 놓인다.
export const BOOK_TRIM = { w: 211, h: 211 };
export const BOOK_LABEL = "8×8 (211 × 211mm)";
export function trimOf(size: BookSize) {
  void size; // 크기는 한 가지
  return BOOK_TRIM;
}
export const BLEED_MM = 3;
export const SAFE_MM = 3;

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function parseDate(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayString() {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

// 기념일까지 남은 밤 (오늘 = 0)
export function nightsUntil(date: string) {
  const ms = parseDate(date).getTime() - startOfDay(new Date()).getTime();
  return Math.round(ms / 86_400_000);
}

// 원고 확정 마감일 = 기념일 D-3 (달력일 기준. 영업일 기준 여부는 미정 — 00. BRAND.md 12장)
export function deadlineOf(date: string) {
  const d = parseDate(date);
  d.setDate(d.getDate() - PRODUCTION_DAYS);
  return d;
}

export function isPastDeadline(date: string) {
  return startOfDay(new Date()) > deadlineOf(date);
}

export function formatKoreanDate(d: Date) {
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export function answeredQuestions(draft: Draft) {
  if (draft.bookPhotos) return (draft.letters ?? []).filter((l) => l.pageId && l.answer.trim());
  return QUESTIONS.filter((q) => (draft.answers[q.id] ?? "").trim().length > 0);
}

// 확정 전에 통과해야 하는 조건. 메시지는 보내는 분에게 그대로 보여준다.
export function checkReady(draft: Draft) {
  const answered = answeredQuestions(draft);
  const problems: string[] = [];
  if (!draft.recipientName.trim() || !draft.anniversaryDate) problems.push("받는 분과 기념일을 알려 주세요.");
  if (draft.anniversaryDate && isPastDeadline(draft.anniversaryDate) && !draft.lateAccepted)
    problems.push("기념일 이후 도착에 동의가 필요해요.");
  if (draft.bookPhotos) {
    if (draft.bookPhotos.length < 9 || draft.bookPhotos.length > 19) problems.push("내지 사진은 9~19장을 골라 주세요.");
    if (draft.bookPhotos.some((p) => !p.photoId)) problems.push("사진이 비어 있는 펼침에 사진을 넣어 주세요.");
    if (!answered.length) problems.push("편지를 한 편 이상 써 주세요.");
    if ((draft.letters ?? []).some((l) => l.pageId && (!l.question.trim() || !l.answer.trim() || !draft.bookPhotos!.some((p) => p.id === l.pageId))))
      problems.push("작성 중인 편지의 내용과 넣을 페이지를 확인해 주세요.");
  } else if (answered.length < MIN_ANSWERS)
    problems.push(`질문에 ${MIN_ANSWERS - answered.length}개 더 답해 주세요. (최소 ${MIN_ANSWERS}개)`);
  const missing = draft.bookPhotos ? [] : answered.filter((q) => !draft.photoByQuestion[q.id]);
  if (missing.length) problems.push(`사진이 비어 있는 장이 ${missing.length}개 있어요.`);
  if (!hasValidCover(draft)) problems.push("표지로 쓸 사진을 골라 주세요.");
  return problems;
}

// 표지 사진은 시작 화면에서 따로 고른다.
export function hasValidCover(draft: Draft) {
  return Boolean(draft.coverPhotoId);
}
