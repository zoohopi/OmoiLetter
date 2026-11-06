import type { Draft } from "./types";
import { QUESTIONS } from "./questions";

export function bookContent(draft: Draft) {
  if (draft.bookPhotos) return draft.bookPhotos.map((photo) => {
    const letters = (draft.letters ?? []).filter((letter) => letter.pageId === photo.id && letter.answer.trim());
    return { id: photo.id, photoId: photo.photoId, question: letters.map((l) => l.question).join(" · "),
      answer: letters.map((l) => l.answer).join("\n\n") };
  });
  return QUESTIONS.filter((q) => (draft.answers[q.id] ?? "").trim()).map((q) => ({
    id: q.id, photoId: draft.photoByQuestion[q.id] ?? null, question: q.text, answer: draft.answers[q.id] }));
}
