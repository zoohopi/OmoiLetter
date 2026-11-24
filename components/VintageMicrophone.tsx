"use client";

import { useEffect, useRef, useState } from "react";

/** Actual lit geometry, rendered only while the interview prompt is in view. */
export default function VintageMicrophone() {
  const host = useRef<HTMLSpanElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const node = host.current;
    if (!node) return;
    let disposed = false, started = false, visible = false;
    let cleanup = () => {};
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = async () => {
      if (started) return;
      started = true;
      try {
        const T = await import("three");
        if (disposed) return;
        const renderer = new T.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
        renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
        renderer.setClearColor(0x000000, 0);
        renderer.outputColorSpace = T.SRGBColorSpace;
        renderer.toneMapping = T.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.05;
        const scene = new T.Scene();
        const pmrem = new T.PMREMGenerator(renderer);
        const studio = new T.Scene();
        studio.background = new T.Color(.045, .05, .065);
        const panel = (x: number, y: number, z: number, width: number, height: number, color: InstanceType<typeof T.Color>) => {
          const softbox = new T.Mesh(new T.PlaneGeometry(width, height), new T.MeshBasicMaterial({ color }));
          softbox.position.set(x, y, z);
          softbox.lookAt(0, 0, 0);
          studio.add(softbox);
        };
        panel(-3, 2, 3, 2.4, 6, new T.Color(6, 5.4, 4.8));
        panel(4, 1, -1, 1.2, 6, new T.Color(3.3, 4, 5));
        panel(0, 4, 0, 4, 2, new T.Color(4, 4, 4));
        panel(1, -2, 4, 3, 2, new T.Color(.48, .53, .6));
        const environment = pmrem.fromScene(studio, .012);
        scene.environment = environment.texture;
        studio.traverse(object => {
          if (object instanceof T.Mesh) { object.geometry.dispose(); object.material.dispose(); }
        });
        pmrem.dispose();
        const camera = new T.PerspectiveCamera(29, 1, .1, 50);
        camera.position.set(3.1, 1.0, 8.8); camera.lookAt(0, -.29, 0);
        scene.add(new T.HemisphereLight(0xfff5e6, 0x39354e, .7));
        const light = new T.DirectionalLight(0xffedcf, 2); light.position.set(-3, 5, 5); scene.add(light);
        const rim = new T.DirectionalLight(0xcae2ff, 1.4); rim.position.set(4, 2, -2); scene.add(rim);
        const chrome = new T.MeshPhysicalMaterial({ color: 0xd7dadd, metalness: 1, roughness: .155, clearcoat: .12, clearcoatRoughness: .18 });
        const polished = new T.MeshStandardMaterial({ color: 0xdce0e3, metalness: .95, roughness: .17 });
        const dark = new T.MeshStandardMaterial({ color: 0x121315, roughness: .82, metalness: .12 });
        const model = new T.Group();
        model.rotation.order = "YXZ";
        model.rotation.z = T.MathUtils.degToRad(5);
        scene.add(model);
        const tile = document.createElement("canvas");
        tile.width = tile.height = 64;
        const ctx = tile.getContext("2d")!;
        ctx.fillStyle = "#0e1012";
        ctx.fillRect(0, 0, 64, 64);
        ctx.translate(32, 32);
        ctx.rotate(Math.PI / 4);
        const pitch = Math.SQRT2 * 8;
        for (let row = -5; row <= 5; row++) {
          for (let col = -5; col <= 5; col++) {
            ctx.save();
            ctx.translate(col * pitch, row * pitch);
            if ((row + col) % 2) ctx.rotate(Math.PI / 2);
            const wire = ctx.createLinearGradient(0, -3, 0, 3);
            wire.addColorStop(0, "#28292c");
            wire.addColorStop(.32, "#727374");
            wire.addColorStop(1, "#222327");
            ctx.fillStyle = wire;
            ctx.fillRect(-pitch * .58, -3, pitch * 1.16, 6);
            ctx.restore();
          }
        }
        const weave = new T.CanvasTexture(tile);
        weave.colorSpace = T.SRGBColorSpace;
        weave.wrapS = weave.wrapT = T.RepeatWrapping;
        weave.repeat.set(14, 5);
        const cloth = new T.MeshStandardMaterial({map: weave, roughness: .82, metalness: .16});
        const satin = new T.MeshStandardMaterial({color: 0xbfc3c6, metalness: .94, roughness: .32});
        // Each profile follows the axial section from bottom to top (radius, height).
        const shell = (material: InstanceType<typeof T.Material>, profile: [number, number][]) => {
          const contour = profile.map(([radius, height]) => new T.Vector2(radius, height));
          model.add(new T.Mesh(new T.LatheGeometry(contour, 96), material));
        };
        shell(satin, [[0,-2.06],[.21,-2.06],[.225,-2.04],[.225,-1.10],[.24,-1.07]]);
        shell(satin, [[.22,-1.09],[.46,-1.09],[.49,-1.06],[.554,-.35],[.554,-.29]]);
        shell(dark, [[.55,-.30],[.56,-.29],[.56,-.23],[.55,-.22]]);
        shell(chrome, [[.55,-.23],[.573,-.21],[.573,-.045],[.56,-.02]]);
        shell(dark, [[.56,-.026],[.568,-.018],[.568,.025],[.547,.033]]);
        shell(cloth, [[.547,.018],[.547,1.30]]);
        shell(polished, [[.547,1.28],[.566,1.30],[.568,1.37],[.548,1.41],[.48,1.45],[.32,1.49],[0,1.505]]);
        const resize = () => { const w=node.clientWidth,h=node.clientHeight;if(!w||!h)return; renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix(); };
        const observer = new ResizeObserver(resize); observer.observe(node);
        const onLost = (event: Event) => { event.preventDefault(); if(!disposed)setFailed(true); };
        renderer.domElement.addEventListener("webglcontextlost",onLost);
        node.append(renderer.domElement); resize();
        let frame=0;
        let previousTime: number | undefined;
        const turnDuration = 8000;
        const render = (time: number) => {
          if(disposed)return;
          if (visible) {
            if (!reduce && previousTime !== undefined) {
              model.rotation.y += (time - previousTime) * Math.PI * 2 / turnDuration;
              model.rotation.y %= Math.PI * 2;
            }
            renderer.render(scene, camera);
          }
          previousTime = visible ? time : undefined;
          frame=requestAnimationFrame(render);
        };
        frame=requestAnimationFrame(render);
        cleanup=()=>{cancelAnimationFrame(frame);observer.disconnect();renderer.domElement.removeEventListener("webglcontextlost",onLost);scene.traverse(object=>{if(object instanceof T.Mesh)object.geometry.dispose();});weave.dispose();[cloth,satin,chrome,polished,dark].forEach(material=>material.dispose());environment.dispose();renderer.dispose();renderer.domElement.remove();};
      } catch { if(!disposed)setFailed(true); }
    };
    const observer = new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;if(visible)void start();},{rootMargin:"100px"});
    observer.observe(node);
    return ()=>{disposed=true;observer.disconnect();cleanup();};
  },[]);
  return <span ref={host} className="vintage-microphone" data-mic-model="3d" aria-hidden="true">{failed&&<span className="vintage-microphone__fallback">🎙️</span>}</span>;
}




