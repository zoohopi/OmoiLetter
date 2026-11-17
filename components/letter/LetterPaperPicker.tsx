"use client";
import BookPage from "./BookPage";
import ScaledPage from "./ScaledPage";
import {LETTER_PAPERS,type LetterPaperId} from "@/lib/letter/papers";
// Shared anonymous example, independent of unfinished interview answers.
const SAMPLE="To. 소중한 너에게\n\n함께 걷던 평범한 길도 너와 나눈 뒤에는 오래 남는 장면이 되었어. 별것 아닌 이야기에 한참 웃었던 순간들이 참 소중해.\n\n늘 내 이야기에 귀 기울여 줘서 고마워. 앞으로도 서로의 하루를 물어보며 작은 마음들을 자주 나누고 싶어.\n\nFrom. 늘 너를 응원하는 내가";
export default function LetterPaperPicker({value,onChange}:{value:LetterPaperId|null|undefined;onChange:(id:LetterPaperId)=>void}){
 return <div className={`ai-paper__slots ${value ? "has-selection" : ""}`}>{LETTER_PAPERS.map(paper=><button type="button" key={paper.id} data-paper={paper.id} aria-pressed={value===paper.id} aria-label={`${paper.name} 선택`} className={`ai-paper__slot ${value===paper.id?"is-picked":""}`} onClick={()=>onChange(paper.id)}>
 <div className="paper-card__frame"><div className="ai-paper__sheet ai-paper__sheet--real"><ScaledPage><BookPage page={{kind:"leaf",side:"left",layout:"portrait",no:1,photoId:null,question:"",answer:SAMPLE,photoPage:true,letterPaper:paper.id}} size="8x8" recipientName="" anniversaryDate=""/></ScaledPage></div></div><b>{paper.name}</b>
 </button>)}</div>;
}
