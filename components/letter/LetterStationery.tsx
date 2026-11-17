"use client";
import {useLayoutEffect,useRef,useState,type CSSProperties} from "react";
import {splitLetterParts,type LetterPaperId} from "@/lib/letter/papers";
type Edit={onQuestion?:(value:string)=>void;onChange:(value:string)=>void;maxLength:number;placeholder:string};
const region=(x:number,y:number,w:number,h:number):CSSProperties=>({position:"absolute",left:`calc(var(--bleed) + var(--pt) * ${x})`,top:`calc(var(--bleed) + var(--pt) * ${y})`,width:`calc(var(--pt) * ${w})`,height:`calc(var(--pt) * ${h})`});
export default function LetterStationery({paper,question,answer,no,edit}:{paper:LetterPaperId;question:string;answer:string;no:number;edit?:Edit}){
 const {to,body,from}=splitLetterParts(question,answer);
 const heading=/^(?:to\.?\s|편지\s*\d+\s*$)/i.test(question) ? "" : question;
 const ref=useRef<HTMLDivElement>(null);const [overflow,setOverflow]=useState(false);const [editing,setEditing]=useState(false);const [editingTitle,setEditingTitle]=useState(false);
 useLayoutEffect(()=>{let alive=true;const check=()=>{const el=ref.current;if(alive&&el)setOverflow(el.scrollHeight>el.clientHeight+2||el.scrollWidth>el.clientWidth+2);};void document.fonts.ready.then(check);const ob=new ResizeObserver(check);if(ref.current)ob.observe(ref.current);return()=>{alive=false;ob.disconnect();};},[answer,question,paper,editing]);
 const title=editingTitle&&edit?.onQuestion?<textarea autoFocus aria-label="편지 질문 수정" value={question} maxLength={2000} onChange={e=>edit.onQuestion?.(e.target.value)} onBlur={()=>setEditingTitle(false)}/>:<span onDoubleClick={()=>edit?.onQuestion&&setEditingTitle(true)}>{heading}</span>;
 const content=editing&&edit?<textarea autoFocus aria-label="편지 내용 수정" value={answer} maxLength={edit.maxLength} onChange={e=>edit.onChange(e.target.value)} onBlur={()=>setEditing(false)}/>:paper===1?<>{to&&<p className="stationery__salutation">{to}</p>}<div className="stationery__body">{body}</div>{from&&<p className="stationery__salutation stationery__closing">{from}</p>}</>:<div className="stationery__body">{body}</div>;
 const box=paper===1?region(302.9,246.18,254,300):paper===2?region(65,to?352:342,468,to?172:182):region(166.5,to?262:252,285,to?220:230);
 return <div className={`stationery stationery--${paper}`} data-letter-paper={paper}>
  {paper===1&&<><div className="stationery__small" style={region(40,26,480,18)}>A Letter for You</div><div className="stationery__quote" style={region(48.9,175.94,212,100)}>“</div><div className="stationery__heading" style={region(48.9,246.18,250,100)}>{title}</div></>}
  {paper===2&&<><div className="stationery__small" style={region(65,58,280,15)}>A PERSONAL LETTER</div><div className="stationery__heading" style={region(65,239,468,48)}>{title}</div>{to&&<div className="stationery__salutation" style={region(65,310,468,30)}>{to}</div>}{from&&<div className="stationery__salutation stationery__closing" style={region(65,530,468,35)} onDoubleClick={()=>edit&&setEditing(true)}>{from}</div>}</>}
  {paper===3&&<><div className="stationery__heading" style={region(156,168,286,62)}>{title}</div>{to&&<div className="stationery__salutation" style={region(166.5,226,285,25)}>{to}</div>}{from&&<div className="stationery__salutation stationery__closing" style={region(166.5,498,285,45)} onDoubleClick={()=>edit&&setEditing(true)}>{from}</div>}</>}
  <div ref={ref} className={`stationery__content ${paper===2&&!editing?"stationery__columns":""}`} style={box} data-letter-overflow={overflow?"true":"false"} onDoubleClick={()=>edit&&setEditing(true)}>{content}</div>
  <div className="stationery__small" style={paper===2?region(65,570,468,15):region(40,562,500,18)}>{String(no).padStart(2,"0")}  OMOI LETTER</div>
  {overflow&&!editing&&<div className="stationery__overflow" role="status">글이 영역을 넘어요. 편지를 나누거나 내용을 줄여 주세요.</div>}
 </div>;
}
