"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";

export default function useLetterDrag(place: (letterId: string, pageId: string) => void) {
  const [placingId,setPlacingId]=useState<string|null>(null);
  const [hoverId,setHoverId]=useState<string|null>(null);
  const [ghost,setGhost]=useState<{id:string;x:number;y:number}|null>(null);
  const pointer=useRef<{id:string;x:number;y:number}|null>(null);
  const placeRef=useRef(place);useEffect(()=>{placeRef.current=place;},[place]);
  const target=(x:number,y:number)=>document.elementFromPoint(x,y)?.closest<HTMLElement>('[data-letter-drop-id]')?.dataset.letterDropId??null;
  const isDragging=ghost!==null;
  useEffect(()=>{
    if(!isDragging)return;
    let frame=0;
    const tick=()=>{const p=pointer.current;if(!p)return;const h=window.innerHeight;
      const speed=p.y>h-100?Math.min(20,(p.y-h+100)/4):p.y<145?-Math.min(20,(145-p.y)/4):0;
      if(speed)window.scrollBy(0,speed);
      setHoverId(target(p.x,p.y));frame=requestAnimationFrame(tick);
    };frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
  },[isDragging]); // Only a drag session starts/stops this loop.
  function start(e:PointerEvent<HTMLElement>,id:string){e.preventDefault();e.stopPropagation();e.currentTarget.setPointerCapture(e.pointerId);const p={id,x:e.clientX,y:e.clientY};pointer.current=p;setGhost(p);setPlacingId(id);}
  function move(e:PointerEvent<HTMLElement>){if(!pointer.current)return;const p={...pointer.current,x:e.clientX,y:e.clientY};pointer.current=p;setGhost(p);setHoverId(target(p.x,p.y));}
  function end(e:PointerEvent<HTMLElement>,cancel=false){const p=pointer.current;if(!p)return;const page=target(e.clientX,e.clientY);if(page&&!cancel)placeRef.current(p.id,page);pointer.current=null;setGhost(null);setHoverId(null);setPlacingId(null);}
  return {placingId,setPlacingId,hoverId,setHoverId,ghost,start,move,end};
}
