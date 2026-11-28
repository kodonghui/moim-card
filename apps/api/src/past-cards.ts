import {problemResponse} from './app';

type Cursor = {time:number;id:number};
function encodeCursor(cursor:Cursor):string {return btoa(`${cursor.time}:${cursor.id}`).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function decodeCursor(value:string):Cursor|null {
 if(!/^[A-Za-z0-9_-]{1,64}$/.test(value))return null;
 try {
  const text=atob(value.replace(/-/g,'+').replace(/_/g,'/'));const match=/^(0|[1-9]\d*):([1-9]\d*)$/.exec(text);
  if(!match)return null;const time=Number(match[1]),id=Number(match[2]);
  const result={time,id};return Number.isSafeInteger(time)&&Number.isSafeInteger(id)&&encodeCursor(result)===value?result:null;
 } catch {return null}
}
async function invalidCursor():Promise<Response>{
 const r=problemResponse('validation_failed');return Response.json({...await r.json() as object,errors:[{field:'cursor',reason:'invalid_format'}]}, {status:400,headers:{'content-type':'application/problem+json'}});
}
export async function listPastCards(request:Request,db:D1Database,userId:string):Promise<Response>{
 const values=new URL(request.url).searchParams.getAll('cursor');if(values.length>1)return invalidCursor();
 const cursor=values.length?decodeCursor(values[0]):null;if(values.length&&!cursor)return invalidCursor();
 const rows=await db.prepare(`SELECT id,gathering_name AS gatheringName,theme_name AS themeName,based_on_count AS basedOnCount,
 summary,next_action AS nextAction,finalized_at AS finalizedAt FROM past_cards
 WHERE user_id=? AND (? IS NULL OR finalized_at<? OR (finalized_at=? AND id<?)) ORDER BY finalized_at DESC,id DESC LIMIT 21`)
 .bind(userId,cursor?.time??null,cursor?.time??null,cursor?.time??null,cursor?.id??null).all<{id:number;gatheringName:string;themeName:string;basedOnCount:number;summary:string;nextAction:string;finalizedAt:number}>();
 const page=rows.results.slice(0,20),last=page.at(-1);
 return Response.json({pastCards:page.map(r=>({pastCardId:r.id,gatheringName:r.gatheringName,themeName:r.themeName,basedOnCount:r.basedOnCount,items:JSON.parse(r.summary),nextAction:r.nextAction,finalizedAt:new Date(r.finalizedAt*1000).toISOString()})),nextCursor:rows.results.length>20&&last?encodeCursor({time:last.finalizedAt,id:last.id}):null});
}
