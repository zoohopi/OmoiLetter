"use client";
import {useLayoutEffect,useRef,useState,type CSSProperties} from "react";
import {splitLetterParts,type LetterPaperId} from "@/lib/letter/papers";
type Edit={onQuestion?:(value:string)=>void;onChange:(value:string)=>void;maxLength:number;placeholder:string};
const region=(x:number,y:number,w:number,h:number):CSSProperties=>({position:"absolute",left:`calc(var(--bleed) + var(--pt) * ${x})`,top:`calc(var(--bleed) + var(--pt) * ${y})`,width:`calc(var(--pt) * ${w})`,height:`calc(var(--pt) * ${h})`});
export default function LetterStationery({paper,question,answer,edit}:{paper:LetterPaperId;question:string;answer:string;edit?:Edit}){
 const {to,body,from}=splitLetterParts(question,answer);
 const heading=/^(?:to\.?\s|편지\s*\d+\s*$)/i.test(question) ? "" : question;
 const NL=String.fromCharCode(10);const lines=answer.split(NL);const toAt=lines.findIndex(l=>l.trim());const hasTo=toAt>=0&&/^to\.?\s*[:：]?\s*/i.test(lines[toAt]);const rest=hasTo?lines.slice(toAt+1).join(NL).replace(/^\s+/,""):answer;
 const [editingTo,setEditingTo]=useState(false);const [split,setSplit]=useState(0);
 const startEdit=()=>{if(!edit)return;const half=Math.floor(rest.length/2);const sp=Math.max(rest.lastIndexOf(NL,half),rest.lastIndexOf(" ",half));setSplit(sp>half*.6?sp+1:half);setEditing(true);};
 const ref=useRef<HTMLDivElement>(null);const [overflow,setOverflow]=useState(false);const [editing,setEditing]=useState(false);const [editingTitle,setEditingTitle]=useState(false);
 useLayoutEffect(()=>{let alive=true;const check=()=>{const el=ref.current;if(alive&&el)setOverflow(el.scrollHeight>el.clientHeight+2||el.scrollWidth>el.clientWidth+2);};void document.fonts.ready.then(check);const ob=new ResizeObserver(check);if(ref.current)ob.observe(ref.current);return()=>{alive=false;ob.disconnect();};},[answer,question,paper,editing]);
 const title=editingTitle&&edit?.onQuestion?<textarea autoFocus aria-label="편지 질문 수정" value={question} maxLength={2000} onChange={e=>edit.onQuestion?.(e.target.value)} onBlur={()=>setEditingTitle(false)}/>:<span onDoubleClick={()=>edit?.onQuestion&&setEditingTitle(true)}>{heading}</span>;
 const save=(v:string)=>edit?.onChange(hasTo?to+NL+NL+v:v);
 // 편지지 B: 두 단이라 고칠 때도 왼쪽/오른쪽 칸으로 나눠 보여준다. 나누는 지점은 더블클릭할 때 한 번 정한다.
 const leaveSplit=(e:React.FocusEvent)=>{if(!e.currentTarget.parentElement?.contains(e.relatedTarget as Node))setEditing(false);};
 const content=editing&&edit&&paper===2?<div className="stationery__split"><textarea autoFocus aria-label="왼쪽 단 수정" value={rest.slice(0,split)} maxLength={edit.maxLength} onChange={e=>{setSplit(e.target.value.length);save(e.target.value+rest.slice(split));}} onBlur={leaveSplit}/><textarea aria-label="오른쪽 단 수정" value={rest.slice(split)} maxLength={edit.maxLength} onChange={e=>save(rest.slice(0,split)+e.target.value)} onBlur={leaveSplit}/></div>:editing&&edit?<textarea autoFocus aria-label="편지 내용 수정" value={rest} maxLength={edit.maxLength} onChange={e=>save(e.target.value)} onBlur={()=>setEditing(false)}/>:paper===1?<><div className="stationery__body">{body}</div>{from&&<p className="stationery__salutation stationery__closing">{from}</p>}</>:<><div className="stationery__body">{body}</div>{from&&<p className="stationery__salutation stationery__closing">{from}</p>}</>;
 const box=paper===1?region(302.9,to?282:246.18,254,to?264:300):paper===2?region(65,to?352:342,468,to?213:223):region(156.5,206,285,311);
 const toRegion=paper===1?region(302.9,246.18,254,28):paper===2?region(65,310,468,30):region(156.5,206,285,25);
 const toEl=to?<div className={`stationery__salutation stationery__to${edit?" is-editable":""}`} style={paper===3?undefined:toRegion} onClick={e=>{if(edit){e.stopPropagation();setEditingTo(true);}}}>{editingTo&&edit?<input autoFocus aria-label="받는 분 수정" defaultValue={to.replace(/^To\.\s*/,"")} onBlur={e=>{setEditingTo(false);const v=e.target.value.trim();edit.onChange((v?"To. "+v:"To.")+NL+NL+rest);}} onKeyDown={e=>{if(e.key==="Enter")e.currentTarget.blur();}}/>:to}</div>:null;
 return <div className={`stationery stationery--${paper}`} data-letter-paper={paper}>{paper!==3&&toEl}
  {paper===1&&<><div className="stationery__small" style={region(40,26,480,18)}>A Letter for You</div><div className="stationery__quote" style={region(48.9,175.94,212,100)}>“</div><div className="stationery__heading" style={region(48.9,246.18,250,100)}>{title}</div></>}
  {paper===2&&<><div className="stationery__small" style={region(65,58,280,15)}>A PERSONAL LETTER</div><div className="stationery__heading" style={region(65,239,468,48)}>{title}</div></>}
  {paper===3&&<><div className="stationery__heading" style={region(156,148,286,62)}>{title}</div></>}
  <div ref={ref} className={`stationery__content ${paper===2&&!editing?"stationery__columns":""}`} style={box} data-letter-overflow={overflow?"true":"false"} onDoubleClick={startEdit}>{paper===3&&toEl}{content}</div>
  {overflow&&!editing&&<div className="stationery__overflow" role="status">글이 영역을 넘어요. 편지를 나누거나 내용을 줄여 주세요.</div>}
 </div>;
}
