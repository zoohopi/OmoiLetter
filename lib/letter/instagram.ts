"use client";

// p.07의 Blender 책/조명/카메라를 재사용하고, 고객의 실제 지면을 합성한다.
import { getPhoto } from "./store";
import { bookContent } from "./bookContent";
import type { Draft, PhotoTransform } from "./types";
import { designOf, PAGE_PT, type PageDesign, type TextStyle, type Rect } from "./designs";

export const IG_W = 1080;
export const IG_H = 1350;
export type Slide = { name: string; blob: Blob };
type Point = [number, number];
type Vertex = { p: Point; uv: Point };
const SIZE = 1400;

function canvas(w: number, h: number) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  return c;
}
function family(s: TextStyle) {
  const vars = { serif: "--font-serif", sans: "--font-sans-kr", pre: "--font-body", arial: "" };
  return vars[s.font] ? getComputedStyle(document.documentElement).getPropertyValue(vars[s.font]).trim() || "serif" : "Arial";
}
async function bitmap(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("목업을 불러오지 못했어요.");
  return createImageBitmap(await response.blob());
}
async function pageTexture(pd: PageDesign, draft: Draft, photoId: string, transform?: PhotoTransform, no = 0) {
  const c = canvas(SIZE, SIZE), ctx = c.getContext("2d")!;
  const blob = await getPhoto(photoId);
  if (!blob) throw new Error(no ? "내지 사진을 다시 넣어 주세요." : "표지 사진을 다시 넣어 주세요.");
  const photo = await createImageBitmap(blob);
  ctx.scale(SIZE / PAGE_PT, SIZE / PAGE_PT);
  ctx.fillStyle = pd.bg; ctx.fillRect(0, 0, PAGE_PT, PAGE_PT);
  try {
    for (const el of pd.els) {
      const [x, y, right, bottom] = el.r, w = right - x, h = bottom - y;
      ctx.save();
      ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
      if (el.t === "photo") {
        const t = transform ?? { scale: 1, x: 0, y: 0 };
        const fit = Math.max(w / photo.width, h / photo.height) * t.scale;
        ctx.drawImage(photo, x + w / 2 + t.x - photo.width * fit / 2, y + h / 2 + t.y - photo.height * fit / 2, photo.width * fit, photo.height * fit);
      } else if (el.t === "rect") {
        ctx.globalAlpha = el.opacity ?? 1;
        if (el.fill) { ctx.fillStyle = el.fill; ctx.fillRect(x, y, w, h); }
        if (el.stroke) { ctx.strokeStyle = el.stroke; ctx.lineWidth = el.sw ?? 1; ctx.strokeRect(x, y, w, h); }
      } else if (el.t === "img") {
        const image = await bitmap(el.src);
        ctx.globalAlpha = el.opacity ?? 1; ctx.drawImage(image, x, y, w, h); image.close();
      } else if (el.t === "text") {
        // Only public design text; questions, quotes from answers and letter copy never enter the export.
        const text = el.text.replaceAll("{name}", draft.recipientName || "○○")
          .replaceAll("{dateDot}", draft.anniversaryDate.replaceAll("-", "."))
          .replaceAll("{date}", draft.anniversaryDate.replaceAll("-", ". "))
          .replace(/\{(?:no|il|ir|pl|pr)\}/g, String(no).padStart(2, "0"))
          .replace(/\{(?:q|lead)\}/g, "");
        const s = el.s, f = family(s);
        await document.fonts.load(`${s.weight ?? 400} ${s.size}px ${f}`, text);
        ctx.font = `${s.weight ?? 400} ${s.size}px ${f}`;
        ctx.fillStyle = s.color; ctx.textBaseline = "middle"; ctx.textAlign = s.align ?? "left";
        ctx.letterSpacing = `${(s.track ?? 0) * s.size / 1000}px`;
        const lineHeight = s.lead ?? s.size * 1.25;
        const lines: string[] = [];
        for (const paragraph of text.split("\n")) {
          let line = "";
          for (const char of paragraph) {
            if (line && ctx.measureText(line + char).width > w) { lines.push(line); line = ""; }
            line += char;
          }
          lines.push(line);
        }
        const tx = s.align === "right" ? right : s.align === "center" ? x + w / 2 : x;
        lines.forEach((line, i) => ctx.fillText(line, tx, y + lineHeight * (i + .5)));
      }
      ctx.restore();
    }
  } finally { photo.close(); }
  return c;
}

function composite(base: ImageBitmap, mesh: Vertex[][], texture: HTMLCanvasElement, patches: Rect[]) {
  const c = canvas(IG_W, IG_H), ctx = c.getContext("2d")!;
  ctx.drawImage(base, 0, 0);
  const corner = (u: number, v: number) => mesh.flat().find(p => Math.abs(p.uv[0] - u) < .0001 && Math.abs(p.uv[1] - v) < .0001)!.p;
  // Orthographic camera: one affine projection avoids seams between small mesh triangles.
  const a = corner(0, 1), b = corner(1, 1), d = corner(0, 0);
  ctx.setTransform((b[0] - a[0]) / SIZE, (b[1] - a[1]) / SIZE,
    (d[0] - a[0]) / SIZE, (d[1] - a[1]) / SIZE, a[0], a[1]);
  // Replace only the photo and personal fields. All other pixels come from
  // the exact p.07 artwork, paper, camera, floor and studio lights.
  ctx.globalCompositeOperation = "multiply";
  for (const [x, y, right, bottom] of patches) {
    const k = SIZE / PAGE_PT;
    ctx.drawImage(texture, x * k, y * k, (right - x) * k, (bottom - y) * k,
      x * k, y * k, (right - x) * k, (bottom - y) * k);
  }
  ctx.globalCompositeOperation = "source-over";
  // Brighten only the book face; keep the studio background unchanged.
  ctx.save();
  ctx.beginPath(); ctx.rect(0, 0, SIZE, SIZE); ctx.clip();
  ctx.resetTransform();
  ctx.filter = "brightness(1.06)";
  ctx.drawImage(c, 0, 0);
  ctx.restore();
  return new Promise<Blob>((resolve, reject) => c.toBlob(b => b ? resolve(b) : reject(new Error("이미지 저장 실패")), "image/jpeg", .95));
}

export async function renderInstagramSlides(draft: Draft): Promise<Slide[]> {
  if (!draft.coverPhotoId) throw new Error("표지 사진을 먼저 넣어 주세요.");
  const design = designOf(draft.design);
  const root = `/sample/book-renders/share/${design.id}`;
  const [base, response] = await Promise.all([bitmap(`${root}-p07.webp`), fetch(`${root}-p07.json`)]);
  try {
    if (!response.ok) throw new Error("목업을 불러오지 못했어요.");
    const mesh: Vertex[][] = await response.json();
    await document.fonts.ready;
    const patches = design.cover.els.filter(el => el.t === "photo" ||
      (el.t === "text" && /\{(?:name|date|dateDot)\}/.test(el.text))).map(el => el.r);
    // Cover is always first and cannot be omitted, including photo-only drafts.
    const cover = await pageTexture(design.cover, draft, draft.coverPhotoId, draft.coverPhotoTransform);
    const slides: Slide[] = [{ name: "omoi-letter-01-cover.jpg", blob: await composite(base, mesh, cover, patches) }];
    for (const [i, page] of bookContent(draft).filter(p => p.photoId).entries()) {
      const pd = design.cover;
      const texture = await pageTexture(pd, draft, page.photoId!, draft.photoTransforms?.[page.id], i + 1);
      slides.push({ name: `omoi-letter-${String(i + 2).padStart(2, "0")}.jpg`, blob: await composite(base, mesh, texture, patches) });
    }
    return slides;
  } finally { base.close(); }
}
