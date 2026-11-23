"use client";

// p.07의 Blender 책/조명/카메라를 재사용하고, 고객의 실제 지면을 합성한다.
import { getPhoto } from "./store";
import { bookContent } from "./bookContent";
import type { Draft, PhotoTransform } from "./types";
import { designOf, photoPageDesign, PAGE_PT, TEXT_COVER_DESIGN, textCoverLines, type PageDesign, type TextStyle } from "./designs";

export const IG_W = 1080;
export const IG_H = 1350;
export type Slide = { name: string; blob: Blob };
const SIZE = 1400;

function canvas(w: number, h: number) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  return c;
}
function family(s: TextStyle) {
  const vars = { logo: "--font-logo", hand: "--font-title", serif: "--font-serif", sans: "--font-sans-kr", pre: "--font-body", arial: "" };
  return vars[s.font] ? getComputedStyle(document.documentElement).getPropertyValue(vars[s.font]).trim() || "serif" : "Arial";
}
async function bitmap(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("목업을 불러오지 못했어요.");
  return createImageBitmap(await response.blob());
}
async function pageTexture(pd: PageDesign, draft: Draft, photoId: string | null, transform?: PhotoTransform, no = 0) {
  const c = canvas(SIZE, SIZE), ctx = c.getContext("2d")!;
  const needsPhoto = pd.els.some(el => el.t === "photo");
  const blob = needsPhoto && photoId ? await getPhoto(photoId) : null;
  if (needsPhoto && !blob) throw new Error(no ? "내지 사진을 다시 넣어 주세요." : "표지 사진을 다시 넣어 주세요.");
  const photo = blob ? await createImageBitmap(blob) : null;
  ctx.scale(SIZE / PAGE_PT, SIZE / PAGE_PT);
  // Transparent print layer: the photographic mockup provides the paper.
  try {
    for (const el of pd.els) {
      const [x, y, right, bottom] = el.r, w = right - x, h = bottom - y;
      ctx.save();
      ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
      if (el.t === "photo" && photo) {
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
        const text = el.text.replaceAll("{coverTitleTop}", textCoverLines(draft.coverTitle)[0]).replaceAll("{coverTitleBottom}", textCoverLines(draft.coverTitle)[1]).replaceAll("{coverTitle}", draft.coverTitle ?? "말하지 못한 마음을,\n한 권의 편지로.").replaceAll("{name}", draft.recipientName || "○○")
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
  } finally { photo?.close(); }
  return c;
}

async function frontComposite(texture: HTMLCanvasElement): Promise<Blob> {
  const base = await bitmap("/sample/book-renders/share/reference-blank-v1.png");
  try {
    const c = canvas(IG_W, IG_H), ctx = c.getContext("2d")!;
    // Source photograph coordinates are normalized; only book height changes
    // to fit the square product. Preserve the original floor and cover pixels.
    const top = base.height * (291 / 1402);
    const bottom = base.height * (1100 / 1402);
    const targetTop = 280, bookHeight = 734;
    ctx.drawImage(base, 0, 0, base.width, top, 0, 0, IG_W, targetTop);
    ctx.drawImage(base, 0, top, base.width, bottom - top, 0, targetTop, IG_W, bookHeight);
    ctx.drawImage(base, 0, bottom, base.width, base.height - bottom,
      0, targetTop + bookHeight, IG_W, IG_H - targetTop - bookHeight);
    // Only the customer's ink and photos are added; no recreated shadows or paper.
    const faceLeft = IG_W * (207 / 1122);
    const faceWidth = IG_W * ((940 - 207) / 1122);
    // Derive neutral paper grain from the actual photographed cover. A local
    // luminance residual carries fibres without its colour or lighting cast.
    const printed = canvas(SIZE, SIZE), ink = printed.getContext("2d")!;
    ink.drawImage(texture, 0, 0);
    const material = canvas(SIZE, SIZE), paper = material.getContext("2d")!;
    paper.drawImage(c, faceLeft, targetTop + 2, faceWidth, bookHeight - 4, 0, 0, SIZE, SIZE);
    const softened = canvas(SIZE, SIZE), soft = softened.getContext("2d")!;
    soft.filter = "blur(3px)"; soft.drawImage(material, 0, 0);
    const surface = paper.getImageData(0, 0, SIZE, SIZE).data;
    const smooth = soft.getImageData(0, 0, SIZE, SIZE).data;
    const pixels = ink.getImageData(0, 0, SIZE, SIZE);
    const grain = new Float32Array(SIZE * SIZE);
    let sum = 0, count = 0;
    for (let n = 0; n < grain.length; n++) {
      const i = n * 4;
      const detail = ((surface[i] - smooth[i]) * .2126 +
        (surface[i + 1] - smooth[i + 1]) * .7152 +
        (surface[i + 2] - smooth[i + 2]) * .0722);
      grain[n] = Math.max(-2.5, Math.min(2.5, detail * .7));
      if (pixels.data[i + 3]) { sum += grain[n]; count++; }
    }
    const mean = count ? sum / count : 0;
    for (let n = 0; n < grain.length; n++) {
      const i = n * 4;
      if (!pixels.data[i + 3]) continue;
      // Identical neutral variation on RGB preserves hue and average exposure.
      const variation = grain[n] - mean;
      for (let ch = 0; ch < 3; ch++) pixels.data[i + ch] += variation;
    }
    ink.putImageData(pixels, 0, 0);
    ctx.drawImage(printed, faceLeft, targetTop + 2, faceWidth, bookHeight - 4);
    return await new Promise<Blob>((resolve, reject) => c.toBlob(b => b ? resolve(b) : reject(new Error("이미지 저장 실패")), "image/jpeg", .95));
  } finally { base.close(); }
}

// Photograph-backed right-hand inside page; the cover keeps its own mockup.
async function openPageComposite(texture: HTMLCanvasElement, side: "left" | "right"): Promise<Blob> {
  const base = await bitmap("/sample/book-renders/share/open-page-blank-v1.png");
  try {
    const c = canvas(IG_W, IG_H), ctx = c.getContext("2d")!;
    ctx.save();
    if (side === "left") { ctx.translate(IG_W, 0); ctx.scale(-1, 1); }
    ctx.drawImage(base, 0, 0, IG_W, IG_H);
    ctx.restore();
    // Match the photographed page's gentle bow using narrow vertical strips.
    const left = IG_W * (side === "left" ? 1 - .884 : .117), right = IG_W * (side === "left" ? 1 - .117 : .884);
    const top = IG_H * .198, bottom = IG_H * .811;
    const printed = canvas(IG_W, IG_H), ink = printed.getContext("2d")!;
    for (let x = Math.floor(left); x < right; x++) {
      const u = (x - left) / (right - left);
      const arch = Math.sin(u * Math.PI);
      const y = top - arch * IG_H * .004;
      const end = bottom + arch * IG_H * .003;
      ink.drawImage(texture, u * SIZE, 0, SIZE / (right - left) + .1, SIZE, x, y, 1.1, end - y);
    }
    // Transfer the real paper's neutral light and grain to the printed ink.
    // RGB channels receive the same light factor so photo hues remain intact.
    const paper = ctx.getImageData(0, 0, IG_W, IG_H).data;
    const pixels = ink.getImageData(0, 0, IG_W, IG_H);
    for (let i = 0; i < pixels.data.length; i += 4) {
      if (!pixels.data[i + 3]) continue;
      const light = Math.max(.78, Math.min(1.04, (paper[i] * .2126 + paper[i + 1] * .7152 + paper[i + 2] * .0722) / 227));
      for (let ch = 0; ch < 3; ch++) pixels.data[i + ch] *= light;
    }
    ink.putImageData(pixels, 0, 0);
    ctx.drawImage(printed, 0, 0);
    return await new Promise<Blob>((resolve, reject) => c.toBlob(b => b ? resolve(b) : reject(new Error("이미지 저장 실패")), "image/jpeg", .95));
  } finally { base.close(); }
}

export async function renderInstagramSlides(draft: Draft): Promise<Slide[]> {
  if (draft.coverType !== "text" && !draft.coverPhotoId) throw new Error("표지 사진을 먼저 넣어 주세요.");
  const design = designOf(draft.design);
  {
    await document.fonts.ready;
    // Cover is always first and cannot be omitted, including photo-only drafts.
    const cover = await pageTexture({ ...(draft.coverType === "text" ? TEXT_COVER_DESIGN : design.cover), bg: "#FFFFFF" }, draft, draft.coverPhotoId, draft.coverPhotoTransform);
    const slides: Slide[] = [{ name: "omoi-letter-01-cover.jpg", blob: await frontComposite(cover) }];
    for (const [i, page] of bookContent(draft).entries()) {
      if (!page.photoId) continue;
      const pd = photoPageDesign(draft.design, draft.photoLayout?.[page.id], false);
      const texture = await pageTexture({ ...pd, bg: "#FFFFFF" }, draft, page.photoId!, draft.photoTransforms?.[page.id], i + 1);
      slides.push({ name: `omoi-letter-${String(slides.length + 1).padStart(2, "0")}.jpg`, blob: await openPageComposite(texture, i % 2 === 0 ? "left" : "right") });
    }
    return slides;
  }
}

