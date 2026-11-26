"use client";
import { useState } from "react";
import BookPage from "./BookPage";
import ScaledPage from "./ScaledPage";
import {LETTER_PAPERS,type LetterPaperId} from "@/lib/letter/papers";
// 사진 페이지와 같은 방식: 편지 한 장을 눌러 고른 뒤, 아래 버튼으로 그 장의 속지를 정한다.
const ORDINAL=["첫째","둘째","셋째","넷째","다섯째","여섯째","일곱째","여덟째","아홉째","열째"];
export default function LetterPaperPicker({pages,papers,onChange,onEdit,intro}:{pages:string[];papers:LetterPaperId[];onChange:(index:number,id:LetterPaperId)=>void;onEdit?:(index:number,text:string)=>void;intro?:React.ReactNode}){
 const [selected,setSelected]=useState(0);
 const sel=Math.min(selected,pages.length-1);
 return <div className="paper-pick">
  <p className="paper-pick__count">편지 {ORDINAL[sel]??`${sel+1}번째`}장 (전체 {pages.length}장)</p>{intro}
  <div className="paper-pick__one"><button type="button" className="paper-pick__nav" aria-label="이전 장" disabled={sel===0} onClick={()=>setSelected(sel-1)}>‹</button>{pages.map((answer,n)=>n!==sel?null:<div role="button" tabIndex={0} key={n} className={`paper-pick__page${n===sel?" is-selected":""}`} aria-pressed={n===sel} aria-label={`편지 ${n+1}장 선택`} onClick={()=>setSelected(n)} onKeyDown={e=>{if(e.target===e.currentTarget&&(e.key==="Enter"||e.key===" ")){e.preventDefault();setSelected(n);}}}><ScaledPage><BookPage page={{kind:"leaf",side:n%2?"right":"left",layout:"portrait",no:n+1,photoId:null,question:"편지 "+(n+1),answer,photoPage:true,letterPaper:papers[n]??1}} size="8x8" recipientName="" anniversaryDate="" textEdit={onEdit?{onChange:v=>onEdit(n,v),maxLength:2000,placeholder:"편지 내용을 적어 주세요"}:undefined}/></ScaledPage></div>)}<button type="button" className="paper-pick__nav" aria-label="다음 장" disabled={sel>=pages.length-1} onClick={()=>setSelected(sel+1)}>›</button></div>
  <LetterPaperOptions value={papers[sel] ?? 1} onChange={id => onChange(sel,id)} />
 </div>;
}

export function LetterPaperOptions({ value, onChange }: { value: LetterPaperId; onChange: (id: LetterPaperId) => void }) {
 return (
  <div className="layout-pick" role="group" aria-label="편지지 다시 고르기">
   {LETTER_PAPERS.map(paper => (
    <button key={paper.id} type="button" aria-pressed={value === paper.id} onClick={() => onChange(paper.id)}>
     {paper.name}
    </button>
   ))}
  </div>
 );
}
