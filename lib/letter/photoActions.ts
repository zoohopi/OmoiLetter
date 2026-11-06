"use client";

import { putPhoto, updateDraft } from "./store";
import { newId, prepareImage } from "./image";

// 사진 바꾸기 — 새 사진을 저장하고, 더 이상 쓰이지 않는 예전 사진은 지운다.

export async function setQuestionPhoto(qid: string, file: File) {
  const { blob } = await prepareImage(file);
  const id = newId();
  await putPhoto(id, blob);
  updateDraft((d) => {
    const reset = { photoTransforms: { ...d.photoTransforms, [qid]: { scale: 1, x: 0, y: 0 } } };
    if (d.bookPhotos) return { ...reset, bookPhotos: d.bookPhotos.map((p) => p.id === qid ? { ...p, photoId: id } : p) };
    return { ...reset, photoByQuestion: { ...d.photoByQuestion, [qid]: id } };
  });
}

export async function setCoverPhoto(file: File) {
  const { blob } = await prepareImage(file);
  const id = newId();
  await putPhoto(id, blob);
  updateDraft(() => ({ coverPhotoId: id, coverPhotoTransform: { scale: 1, x: 0, y: 0 } }));
}
