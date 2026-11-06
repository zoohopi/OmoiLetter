"use client";

// 긴 변 3200px — 10×10(262mm)을 약 300dpi로 인쇄할 수 있는 크기.
// 사진은 안전영역 안 액자처럼 놓이므로 실제 인쇄 폭은 이보다 작다.
const MAX_EDGE = 3200;

/** 휴대폰 사진의 회전 정보(EXIF)를 반영해 바로 세우고, 너무 크면 줄여서 JPEG로 만든다. */
export async function prepareImage(file: File) {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/jpeg", 0.9),
  );
  return { blob, width, height };
}

export function newId() {
  return crypto.randomUUID();
}
