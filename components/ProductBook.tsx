"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type * as Three from "three";
import { bookContent } from "@/lib/letter/bookContent";
import { designOf, PAGE_PT } from "@/lib/letter/designs";
import { SAMPLE_PAGES } from "@/lib/letter/sample";
import { getPhoto, useDraft } from "@/lib/letter/store";

type Spread = { photo: string | null; question: string; answer: string };
type Content = { personal: boolean; title: string; to: string; date: string; cover: string | null; spreads: Spread[] };

const DEFAULT_TITLE = "말하지 못한 마음을,\n한 권의 편지로.";
const SAMPLE_SPREADS: Spread[] = SAMPLE_PAGES.flatMap(p => p.kind === "leaf" && p.side === "left" ? [{ photo: p.photoId, question: p.question, answer: p.answer }] : []).slice(0, 2);
const SAMPLE: Content = { personal: false, title: DEFAULT_TITLE, to: "늘 내 옆에 있어준 너에게", date: "2026. 12. 24", cover: null, spreads: SAMPLE_SPREADS };
const LAST_STAGE = 3; // 0 덮임 · 1~3 펼침

const loadImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = src;
});
/** "/…" 는 공개 샘플 사진, 그 밖은 이 기기에 보관된 내 사진 id */
async function loadPhoto(ref: string | null) {
  if (!ref) return null;
  try {
    if (ref.startsWith("/")) return await loadImage(ref);
    const blob = await getPhoto(ref);
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    try { return await loadImage(url); } finally { URL.revokeObjectURL(url); }
  } catch { return null; }
}
function drawFit(g: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const s = Math.max(w / img.width, h / img.height), sw = w / s, sh = h / s;
  g.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
}
function wrap(g: CanvasRenderingContext2D, text: string, max: number) {
  const lines: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const ch of para) {
      if (line && g.measureText(line + ch).width > max) { lines.push(line); line = ch.trimStart(); } else line += ch;
    }
    lines.push(line);
  }
  return lines;
}

export default function ProductBook() {
  const host = useRef<HTMLDivElement>(null);
  const controls = useRef<{ turn: (delta: number) => void; paint: (content: Content) => Promise<void>; download: () => Promise<void> } | null>(null);
  const stageRef = useRef(0);
  const [stage, setStage] = useState(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const draft = useDraft();
  // 작성 중인 편지책이 있으면 그 내용으로, 없으면 샘플로 그린다. 모자란 펼침은 샘플로 채운다.
  const content = useMemo<Content>(() => {
    if (!draft) return SAMPLE;
    const mine = bookContent(draft).filter(p => p.photoId || p.answer.trim()).slice(0, 2).map(p => ({ photo: p.photoId, question: p.question, answer: p.answer }));
    return {
      personal: true, title: draft.coverTitle ?? DEFAULT_TITLE, to: draft.recipientName.trim() || "소중한 당신",
      date: draft.anniversaryDate ? draft.anniversaryDate.replaceAll("-", ". ") : SAMPLE.date,
      cover: draft.coverPhotoId, spreads: [...mine, ...SAMPLE_SPREADS].slice(0, 2),
    };
  }, [draft]);
  const contentRef = useRef(content);
  useEffect(() => { contentRef.current = content; void controls.current?.paint(content); }, [content]);

  useEffect(() => {
    const container = host.current;
    if (!container) return;
    let disposed = false;
    let cleanup = () => {};
    const observer = new IntersectionObserver(async entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      try {
        const [THREE, { RoundedBoxGeometry }, { RoomEnvironment }, base] = await Promise.all([
          import("three"), import("three/addons/geometries/RoundedBoxGeometry.js"),
          import("three/addons/environments/RoomEnvironment.js"), loadImage("/product-book/cover.png"),
        ]);
        if (disposed) return;
        const rad = THREE.MathUtils.degToRad;
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.0;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.VSMShadowMap;
        container.appendChild(renderer.domElement);
        const scene = new THREE.Scene();
        const pmrem = new THREE.PMREMGenerator(renderer);
        const room = new RoomEnvironment();
        const envMap = pmrem.fromScene(room, .04).texture;
        pmrem.dispose(); room.dispose();
        scene.environment = envMap; scene.environmentIntensity = .35;
        const camera = new THREE.OrthographicCamera(-1.3, 1.3, 1.3, -1.3, .1, 20);
        camera.position.set(0, 0, 6);
        scene.add(new THREE.HemisphereLight(0xffffff, 0xaca6a0, 1.25));
        const key = new THREE.DirectionalLight(0xfff9ef, 2.2);
        key.position.set(-3, 2, 6);
        key.castShadow = true;
        key.shadow.mapSize.set(1024, 1024);
        key.shadow.camera.left = -2.8; key.shadow.camera.right = 2.8;
        key.shadow.camera.top = 2; key.shadow.camera.bottom = -2;
        key.shadow.normalBias = .008; key.shadow.bias = -.0001; key.shadow.radius = 5; key.shadow.blurSamples = 8;
        scene.add(key);
        const fill = new THREE.DirectionalLight(0xe9efff, .8);
        fill.position.set(3, 0, 4); scene.add(fill);
        const receiver = new THREE.Mesh(new THREE.PlaneGeometry(10, 8), new THREE.ShadowMaterial({ opacity: .18 }));
        receiver.position.z = -.18; receiver.receiveShadow = true;
        // 책과 그림자 바닥을 함께 기울인다: 덮였을 땐 세워 두고, 펼치면 탁자에 눕힌 듯 내려다본다.
        const table = new THREE.Group(); table.add(receiver); scene.add(table);

        // 실제 비율 (2 = 211mm): 판지 t, 책 전체 두께 T, 속지 묶음 두께 B
        const t = .02, T = .125, B = T - 2 * t;
        const bw = 1.94, bh = 1.94, xb = -1 + t + .005; // 속지 크기와 제본 쪽 가장자리
        const th = .003, blockD = B - .008; // 넘어가는 낱장 두께, 고정된 속지 묶음 두께
        const textures: Three.Texture[] = [envMap];
        const maxAniso = renderer.capabilities.getMaxAnisotropy();
        const canvas = (w: number, h: number) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
        const texture = (source: HTMLCanvasElement, color = true) => {
          const map = new THREE.CanvasTexture(source);
          if (color) map.colorSpace = THREE.SRGBColorSpace;
          map.anisotropy = maxAniso; textures.push(map); return map;
        };

        // Fine deterministic paper relief, used as physical bump rather than a painted shadow.
        const grain = canvas(512, 512);
        const ctx = grain.getContext("2d")!;
        const pixels = ctx.createImageData(512, 512);
        let seed = 29;
        const random = () => (seed = (seed * 1664525 + 1013904223) >>> 0);
        for (let i = 0; i < pixels.data.length; i += 4) {
          pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = 120 + (random() % 30);
          pixels.data[i + 3] = 255;
        }
        ctx.putImageData(pixels, 0, 0);
        // Short, irregular fibres break up the uniform noise without coarse decorative grain.
        ctx.lineWidth = .55;
        for (let i = 0; i < 5500; i++) {
          random();
          const x = seed % 512, y = (seed >>> 9) % 512;
          ctx.strokeStyle = i % 2 ? "rgba(205,205,205,.18)" : "rgba(65,65,65,.14)";
          ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 1, y + 1, x + 2 + seed % 4, y + (seed % 5) - 2); ctx.stroke();
        }
        const bump = texture(grain, false);
        bump.wrapS = bump.wrapT = THREE.RepeatWrapping; bump.repeat.set(3, 3);
        // 속지 단면: 낱장마다 밝기가 조금씩 다른 줄무늬 한 장으로 종이 묶음을 표현한다.
        const edge = canvas(64, 4);
        const edgeCtx = edge.getContext("2d")!;
        for (let x = 0; x < 64; x++) { const v = 212 + (random() >>> 8) % 30; edgeCtx.fillStyle = `rgb(${v},${v - 2},${v - 7})`; edgeCtx.fillRect(x, 0, 1, 4); }
        const edgeSide = texture(edge);
        const edgeTop = edgeSide.clone(); edgeTop.center.set(.5, .5); edgeTop.rotation = Math.PI / 2; textures.push(edgeTop);

        const cloth = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .86, metalness: 0, bumpMap: bump, bumpScale: .002 });
        const paper = new THREE.MeshStandardMaterial({ color: 0xfbf9f4, emissive: 0xfbf9f4, emissiveIntensity: .2, roughness: .95, bumpMap: bump, bumpScale: .001 });
        const printed = (source: HTMLCanvasElement) => { const map = texture(source); return new THREE.MeshStandardMaterial({ map, emissive: 0xffffff, emissiveIntensity: .2, emissiveMap: map, roughness: .92, bumpMap: bump, bumpScale: .001 }); };
        const S = 2048, P = 1024;
        const coverCanvas = canvas(S, S), glowCanvas = canvas(S, S), backCanvas = canvas(P, P), spineCanvas = canvas(S, 128);
        const pageCanvases = [0, 1, 2, 3, 4].map(() => canvas(P, P)); // 속표지, 사진1, 편지1, 사진2, 편지2
        const pageMats = pageCanvases.map(printed);
        // 사진은 조명만 받고, 흰 종이 부분만 은은하게 밝힌다 (glow 맵에서 사진 자리는 검정).
        const coverMat = new THREE.MeshPhysicalMaterial({ map: texture(coverCanvas), emissive: 0xffffff, emissiveIntensity: .3, emissiveMap: texture(glowCanvas), roughness: .8, metalness: 0, bumpMap: bump, bumpScale: .0022, sheen: .12, sheenColor: new THREE.Color(0xffffff), sheenRoughness: .9, specularIntensity: .22 });
        const solid = (mesh: Three.Mesh, name: string) => { mesh.name = name; mesh.castShadow = mesh.receiveShadow = true; return mesh; };
        const flat = (w: number, h: number, material: Three.Material, name: string) => { const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material); mesh.name = name; mesh.receiveShadow = true; return mesh; };

        const book = new THREE.Group();
        book.name = "Omoi Letter hardcover";
        table.add(book);
        const back = solid(new THREE.Mesh(new RoundedBoxGeometry(2 - t, 2, t, 4, .006), cloth), "Back cover board");
        back.position.set(t / 2, 0, -T / 2 + t / 2); book.add(back);
        const backArt = flat(1.96, 1.98, printed(backCanvas), "Back cover print");
        backArt.position.set(t / 2, 0, -T / 2 - .0008); backArt.rotation.y = Math.PI; book.add(backArt);
        const block = solid(new THREE.Mesh(new THREE.BoxGeometry(bw, bh, blockD), [
          new THREE.MeshStandardMaterial({ map: edgeSide, roughness: .98 }), paper,
          new THREE.MeshStandardMaterial({ map: edgeTop, roughness: .98 }), new THREE.MeshStandardMaterial({ map: edgeTop, roughness: .98 }),
          pageMats[4], paper,
        ]), "Paper block");
        block.position.set(xb + bw / 2, 0, -B / 2 + blockD / 2); book.add(block);
        // 책등은 뒤표지 쪽 모서리에서, 앞표지는 책등 앞 모서리에서 접힌다. 다 펼치면 한 평면에 눕는다.
        const hinge = new THREE.Group(); hinge.position.set(-1, 0, -T / 2); book.add(hinge);
        const spine = solid(new THREE.Mesh(new RoundedBoxGeometry(t, 2, T, 4, .006), cloth), "Cloth spine");
        spine.position.set(t / 2, 0, T / 2); hinge.add(spine);
        const spineArt = flat(1.96, T * .8, printed(spineCanvas), "Spine title");
        spineArt.position.set(-.0008, 0, T / 2); spineArt.rotation.set(0, -Math.PI / 2, -Math.PI / 2); hinge.add(spineArt);
        const lid = new THREE.Group(); lid.position.set(0, 0, T); hinge.add(lid);
        const front = solid(new THREE.Mesh(new RoundedBoxGeometry(2 - t, 2, t, 4, .006), cloth), "Front cover board");
        front.position.set(1 + t / 2, 0, -t / 2); lid.add(front);
        const artGeometry = new THREE.PlaneGeometry(1.97, 1.99, 160, 1);
        for (let i = 0, pos = artGeometry.attributes.position; i < pos.count; i++) {
          // 책등 옆 접히는 홈
          pos.setZ(i, .004 - .003 * Math.exp(-Math.pow((pos.getX(i) + .92) / .022, 2)));
        }
        artGeometry.computeVertexNormals();
        const art = new THREE.Mesh(artGeometry, coverMat);
        art.name = "Front cover print"; art.receiveShadow = true; art.position.set(1 + t / 2, 0, 0); lid.add(art);
        const endpaper = flat(1.94, 1.96, paper, "Endpaper");
        endpaper.position.set(1 + t / 2, 0, -t - .0006); endpaper.rotation.y = Math.PI; lid.add(endpaper);
        // 넘어가는 낱장 2장 [앞면, 뒷면]. 넘긴 장은 순서가 뒤집혀 앞표지 안쪽에 포개진다.
        const top = -B / 2 + blockD;
        const leaves = [0, 1].map(i => {
          const geometry = new THREE.BoxGeometry(bw, bh, th, 20, 1, 1); geometry.translate(bw / 2, 0, 0);
          const pivot = new THREE.Group(); pivot.position.set(xb, 0, 0);
          pivot.add(solid(new THREE.Mesh(geometry, [paper, paper, paper, paper, pageMats[i * 2], pageMats[i * 2 + 1]]), `Leaf ${i + 1}`));
          book.add(pivot);
          return { pivot, geometry, rest: Float32Array.from(geometry.attributes.position.array), closedZ: top + th / 2 + (1 - i) * th, openZ: top + th / 2 + i * th, bent: false };
        });
        const leafTurn = Math.PI + Math.asin((blockD - .001) / bw); // 넘긴 장의 끝이 앞표지 안쪽에 닿는 각도

        const style = getComputedStyle(document.documentElement);
        const serif = style.getPropertyValue("--font-serif").trim() || "serif";
        const sans = style.getPropertyValue("--font-body").trim() || "sans-serif";
        const INK = "#392343", SOFT = "#8d7f96", STOCK = "#fdfbf7";
        const photo = { l: .06, r: .94, t: .1, b: .69 };
        let painting = 0;
        let dirty = true;
        const paint = async (c: Content) => {
          const run = ++painting;
          const glyphs = [c.title, c.to, c.date, "想いOMOI LETTER", ...c.spreads.flatMap(s => [s.question, s.answer])].join("");
          const [coverPhoto, ...photos] = await Promise.all([
            loadPhoto(c.cover), ...c.spreads.map(s => loadPhoto(s.photo)),
            document.fonts.load(`500 26px ${serif}`, glyphs).catch(() => null), document.fonts.load(`600 24px ${sans}`, glyphs).catch(() => null),
          ]) as (HTMLImageElement | null)[];
          if (disposed || run !== painting) return;
          let u = S / 1000;
          let g = coverCanvas.getContext("2d")!;
          g.fillStyle = "#fff"; g.fillRect(0, 0, S, S);
          const px = photo.l * S, py = photo.t * S, pw = (photo.r - photo.l) * S, ph = (photo.b - photo.t) * S;
          if (coverPhoto) drawFit(g, coverPhoto, px, py, pw, ph);
          else g.drawImage(base, photo.l * base.width, photo.t * base.height, (photo.r - photo.l) * base.width, (photo.b - photo.t) * base.height, px, py, pw, ph);
          g.fillStyle = INK; g.textBaseline = "top"; g.textAlign = "left";
          g.font = `500 ${26 * u}px ${serif}`;
          c.title.split("\n").slice(0, 3).forEach((line, i) => g.fillText(line, 60 * u, (748 + 42 * i) * u, 560 * u));
          g.textAlign = "right"; g.font = `500 ${38 * u}px ${serif}`; g.fillText("想い", 940 * u, 744 * u);
          g.font = `600 ${24 * u}px ${sans}`; g.fillText("OMOI LETTER", 940 * u, 802 * u);
          g.textAlign = "left"; g.font = `600 ${22 * u}px ${sans}`; g.fillText(`To. ${c.to}`, 60 * u, 910 * u, 640 * u);
          g.textAlign = "right"; g.font = `500 ${20 * u}px ${sans}`; g.fillText(c.date, 940 * u, 912 * u);
          g = glowCanvas.getContext("2d")!;
          g.drawImage(coverCanvas, 0, 0); g.fillStyle = "#000"; g.fillRect(px, py, pw, ph);

          u = P / 1000;
          const sheet = (target: HTMLCanvasElement) => { const c2 = target.getContext("2d")!; c2.fillStyle = STOCK; c2.fillRect(0, 0, target.width, target.height); c2.textBaseline = "top"; c2.textAlign = "center"; return c2; };
          // Use the production back-cover layout, including its handwriting wordmark.
          const backDesign = designOf("minimal").back;
          const hand = style.getPropertyValue("--font-title").trim() || "cursive";
          await document.fonts.load(`400 24px ${hand}`, "OMOI LETTER");
          if (disposed || run !== painting) return;
          g = sheet(backCanvas); g.fillStyle = backDesign.bg; g.fillRect(0,0,P,P);
          const scale = P / PAGE_PT;
          for (const el of backDesign.els) {
            if (el.t !== "text") continue;
            const [x,y,right] = el.r;
            g.fillStyle=el.s.color; g.textAlign=el.s.align ?? "left";
            const font=el.s.font === "logo" ? getComputedStyle(document.documentElement).getPropertyValue("--font-logo").trim() || sans : el.s.font === "hand" ? hand : el.s.font === "serif" ? serif : sans;
            g.font=`${el.s.weight ?? 400} ${el.s.size*scale}px ${font}`;
            const anchor=el.s.align === "center" ? (x+right)/2 : el.s.align === "right" ? right : x;
            g.fillText(el.text,anchor*scale,y*scale,(right-x)*scale);
          }
          g = sheet(spineCanvas); g.fillStyle = INK; g.textBaseline = "middle";
          g.font = `600 ${44}px ${sans}`; g.fillText("OMOI LETTER", S / 2, 66);
          g = sheet(pageCanvases[0]); g.fillStyle = INK;
          g.font = `500 ${52 * u}px ${serif}`; g.fillText("想い", 500 * u, 400 * u);
          g.font = `600 ${30 * u}px ${sans}`; g.fillText(`To. ${c.to}`, 500 * u, 500 * u, 800 * u);
          g.fillStyle = SOFT; g.font = `500 ${24 * u}px ${sans}`; g.fillText(c.date, 500 * u, 560 * u);
          c.spreads.forEach((spread, i) => {
            g = sheet(pageCanvases[1 + i * 2]);
            const image = photos[i];
            if (image) drawFit(g, image, 90 * u, 90 * u, 820 * u, 820 * u);
            else { g.fillStyle = "#ece7df"; g.fillRect(90 * u, 90 * u, 820 * u, 820 * u); }
            g = sheet(pageCanvases[2 + i * 2]); g.textAlign = "left";
            let y = 130 * u;
            g.fillStyle = SOFT; g.font = `600 ${27 * u}px ${sans}`;
            for (const line of wrap(g, spread.question, 760 * u).slice(0, 3)) { g.fillText(line, 120 * u, y); y += 42 * u; }
            y += 46 * u; g.fillStyle = INK; g.font = `400 ${40 * u}px ${serif}`;
            const lines = wrap(g, spread.answer, 760 * u), max = Math.floor((880 * u - y) / (68 * u));
            lines.slice(0, max).forEach((line, n) => { g.fillText(n === max - 1 && lines.length > max ? `${line.slice(0, -1)}…` : line, 120 * u, y); y += 68 * u; });
            g.textAlign = "center"; g.fillStyle = SOFT; g.font = `500 ${20 * u}px ${sans}`; g.fillText(String(i + 1), 500 * u, 925 * u);
          });
          textures.forEach(map => { if (map !== envMap) map.needsUpdate = true; });
          dirty = true;
        };

        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
        const ease = (x: number) => x * x * (3 - 2 * x);
        const toward = (value: number, target: number, step: number) => value < target ? Math.min(target, value + step) : Math.max(target, value - step);
        const captureParams = new URLSearchParams(window.location.search);
        const stillView = captureParams.get("bookStill");
        const frontStill = stillView === "front" || ["45", "90", "180", "270"].includes(stillView ?? "");
        const captureAngle = stillView === "front" ? 0 : Number(stillView);
        if (frontStill && captureParams.get("transparent") === "1") receiver.visible = false;
        let open = 0, angle = frontStill ? captureAngle : 10, spin = 0, resumeAt = 0, last = 0, frame = 0;
        const flips = [0, 0];
        let dragX: number | null = null, dragAt = 0;
        const pose = () => {
          const o = ease(open);
          hinge.rotation.y = lid.rotation.y = -o * Math.PI / 2;
          // 펼치면 가로가 두 배가 되므로 책등을 가운데로 옮기고 조금 물러선다.
          book.position.x = (1 + T / 2) * o;
          table.rotation.x = frontStill ? 0 : rad(5 - 37 * o); book.rotation.y = rad(angle);
          camera.zoom = 1 - .44 * o; camera.updateProjectionMatrix();
          leaves.forEach((leaf, i) => {
            const p = ease(flips[i]);
            leaf.pivot.rotation.y = -p * leafTurn;
            leaf.pivot.position.z = leaf.closedZ + (leaf.openZ - leaf.closedZ) * p;
            // 넘어가는 동안 종이가 위로 살짝 휜다 (올라갈 때와 내려앉을 때 모두 바깥쪽으로).
            const bend = Math.sin(2 * Math.PI * p) * .07;
            if (!leaf.bent && Math.abs(bend) < 1e-4) return;
            const pos = leaf.geometry.attributes.position;
            for (let k = 0; k < pos.count; k++) pos.setZ(k, leaf.rest[k * 3 + 2] + bend * Math.sin(Math.PI * leaf.rest[k * 3] / bw));
            pos.needsUpdate = true; leaf.geometry.computeVertexNormals();
            leaf.bent = Math.abs(bend) >= 1e-4;
          });
        };
        const animate = (time: number) => {
          frame = requestAnimationFrame(animate);
          const dt = last ? Math.min((time - last) / 1000, .05) : 0;
          last = time;
          const target = stageRef.current, still = reduced.matches || frontStill, rate = still ? 99 : dt;
          const before = [open, flips[0], flips[1], angle].join();
          // 순서: 표지가 다 열린 뒤 장을 넘기고, 장을 모두 되돌린 뒤 표지를 덮는다.
          if (target > 0 || flips[0] + flips[1] < .001) open = toward(open, target > 0 ? 1 : 0, rate / 1.2);
          if (target >= 2 ? open === 1 : flips[1] < .5) flips[0] = toward(flips[0], target >= 2 ? 1 : 0, rate / .9);
          if (target < 3 || flips[0] > .5) flips[1] = toward(flips[1], target >= 3 ? 1 : 0, rate / .9);
          if (target > 0 || open > 0) {
            // 펼친 동안에는 정면을 본다.
            angle = ((angle % 360) + 540) % 360 - 180;
            angle = still || Math.abs(angle) < .05 ? 0 : angle * Math.max(0, 1 - dt * 6);
            spin = 0; resumeAt = time + 1200;
          } else if (dragX === null) {
            if (Math.abs(spin) > 1) { angle = (angle + spin * dt) % 360; spin *= Math.exp(-3.5 * dt); resumeAt = time + 2500; }
            else if (time > resumeAt && !still) angle = (angle + dt * 12) % 360;
          }
          if (!dirty && before === [open, flips[0], flips[1], angle].join()) return;
          dirty = false; pose(); renderer.render(scene, camera);
        };
        const resize = () => { renderer.setSize(container.clientWidth, container.clientHeight); dirty = true; };
        const ro = new ResizeObserver(resize); ro.observe(container);
        // 화면에 보일 때만 그린다.
        const visibility = new IntersectionObserver(seen => {
          cancelAnimationFrame(frame); last = 0;
          if (seen[seen.length - 1].isIntersecting) frame = requestAnimationFrame(animate);
        });
        const turn = (delta: number) => { angle = (angle + delta) % 360; resumeAt = performance.now() + 2500; dirty = true; };
        const down = (event: PointerEvent) => { if (event.button !== 0 || stageRef.current) return; dragX = event.clientX; dragAt = event.timeStamp; spin = 0; container.setPointerCapture(event.pointerId); };
        const move = (event: PointerEvent) => {
          if (dragX === null) return;
          const delta = (event.clientX - dragX) * .2, seconds = Math.max((event.timeStamp - dragAt) / 1000, .008);
          spin = spin * .5 + delta / seconds * .5; // 손을 뗀 뒤 이어질 회전 속도
          dragX = event.clientX; dragAt = event.timeStamp; turn(delta);
        };
        const up = (event: PointerEvent) => { if (event.timeStamp - dragAt > 90) spin = 0; dragX = null; resumeAt = performance.now() + 2500; };
        container.addEventListener("pointerdown", down); container.addEventListener("pointermove", move);
        container.addEventListener("pointerup", up); container.addEventListener("pointercancel", up);
        cleanup = () => {
          cancelAnimationFrame(frame); ro.disconnect(); visibility.disconnect(); controls.current = null;
          container.removeEventListener("pointerdown", down); container.removeEventListener("pointermove", move);
          container.removeEventListener("pointerup", up); container.removeEventListener("pointercancel", up);
          const materials = new Set<Three.Material>();
          scene.traverse(object => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => materials.add(material)); } });
          materials.forEach(material => material.dispose()); textures.forEach(map => map.dispose());
          renderer.dispose(); renderer.domElement.remove();
        };
        controls.current = { turn, paint, download: async () => {
          const { GLTFExporter } = await import("three/addons/exporters/GLTFExporter.js");
          const result = await new GLTFExporter().parseAsync(book, { binary: true });
          const url = URL.createObjectURL(new Blob([result as ArrayBuffer], { type: "model/gltf-binary" }));
          const link = document.createElement("a"); link.href = url; link.download = "omoi-letter-book.glb"; link.click();
          setTimeout(() => URL.revokeObjectURL(url), 10000);
        } };
        await paint(contentRef.current);
        if (disposed) return;
        resize(); visibility.observe(container); setReady(true);
      } catch { cleanup(); if (!disposed) setFailed(true); }
    }, { rootMargin: "300px" });
    observer.observe(container);
    return () => { disposed = true; observer.disconnect(); cleanup(); };
  }, []);

  const go = (next: number) => { stageRef.current = next; setStage(next); };
  const opened = stage > 0;
  return <section className="product-book" aria-label="오모이레터 3D 편지책">
    <div className="product-book__webgl" ref={host} role="img" aria-label="표지와 책등, 종이 단면을 입체로 보고 펼쳐 볼 수 있는 편지책">
      {!ready && <p className="product-book__loading">{failed ? "3D 미리보기를 불러오지 못했어요. 페이지를 새로고침해 주세요." : "편지책을 불러오고 있어요…"}</p>}
    </div>
    <div className="product-book__controls">
      <button type="button" disabled={!ready} aria-label={opened ? "앞 장으로" : "책 왼쪽 면 보기"} onClick={() => opened ? go(stage - 1) : controls.current?.turn(-10)}>←</button>
      <p>{content.personal ? `${content.to}에게 보낼 나의 편지책` : "사진과 마음이 담긴 한 권의 편지책"}<small>{opened ? `${stage} / ${LAST_STAGE} 펼침 · 화살표로 넘겨 보세요` : "자동으로 회전해요 · 드래그해서 살펴보세요"}</small></p>
      <button type="button" disabled={!ready || stage === LAST_STAGE} aria-label={opened ? "다음 장으로" : "책 오른쪽 면 보기"} onClick={() => opened ? go(stage + 1) : controls.current?.turn(10)}>→</button>
    </div>
    <button type="button" className="product-book__open" disabled={!ready} onClick={() => go(opened ? 0 : 1)}>{opened ? "책 덮기" : "책 펼쳐보기"}</button>
    {ready && <button className="product-book__download" onClick={() => void controls.current?.download().catch(() => alert("모델을 저장하지 못했어요. 다시 시도해 주세요."))}>3D 모델 받기</button>}
  </section>;
}
