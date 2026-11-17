export type LetterPaperId = 1 | 2 | 3;
export const LETTER_PAPERS = [{id:1,name:"편지지 1",description:"큰 따옴표와 좌우 본문"},{id:2,name:"편지지 2",description:"넓은 여백과 두 단의 글"},{id:3,name:"편지지 3",description:"가운데 제목과 차분한 본문"}] as const;
export function splitLetterParts(question:string, answer:string) {
  const lines=answer.replace(/\r\n/g,"\n").split("\n");
  let to="",from="";
  const first=lines.findIndex(line=>line.trim());
  if(first>=0 && /^to\.?\s*[:：]?\s*/i.test(lines[first])) {to=lines[first].trim();lines.splice(first,1);}
  else if(/^to\.?\s*[:：]?\s*/i.test(question)) to=question.trim();
  let last=lines.length-1;while(last>=0&&!lines[last].trim())last--;
  if(last>=0 && /^(?:from|fro)\.?\s*[:：]?\s*/i.test(lines[last])) {from=lines[last].trim();lines.splice(last,1);}
  return {to:to.replace(/^to\.?\s*[:：]?\s*/i,"To. "),body:lines.join("\n").trim(),from};
}
