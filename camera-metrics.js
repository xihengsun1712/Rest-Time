// Experimental observable-cue score. No trained fatigue model or personal baseline.
export const CAMERA_METHOD='eye_mouth_heuristic_v1';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function distance(a,b,aspect){return Math.hypot((a.x-b.x)*aspect,a.y-b.y);}
export function faceFeatures(points,aspect=4/3){
 if(!Array.isArray(points)||points.length<468||!Number.isFinite(aspect)||aspect<=0)return null;
 const ids=[33,160,158,133,153,144,362,385,387,263,373,380,13,14,78,308,1];
 if(ids.some(i=>!points[i]||!Number.isFinite(points[i].x)||!Number.isFinite(points[i].y)))return null;
 const left=points[33],right=points[263],nose=points[1];
 const width=distance(left,right,aspect),roll=Math.abs(Math.atan2(right.y-left.y,(right.x-left.x)*aspect));
 if(width<.08||roll>Math.PI/5||Math.abs(nose.x-(left.x+right.x)/2)>Math.abs(right.x-left.x)*.45||ids.some(i=>points[i].x<0||points[i].x>1||points[i].y<0||points[i].y>1))return null;
 const ear=ids=>{
  const horizontal=distance(points[ids[0]],points[ids[3]],aspect);
  return horizontal>1e-6?(distance(points[ids[1]],points[ids[5]],aspect)+distance(points[ids[2]],points[ids[4]],aspect))/(2*horizontal):null;
 };
 const a=ear([33,160,158,133,153,144]),b=ear([362,385,387,263,373,380]);
 const mouthWidth=distance(points[78],points[308],aspect);
 if(a===null||b===null||mouthWidth<1e-6)return null;
 return {ear:(a+b)/2,mar:distance(points[13],points[14],aspect)/mouthWidth};
}
export class CameraWindows{
 constructor(sessionId,sessionStart,captureStart=sessionStart){
  this.sessionId=sessionId;this.start=sessionStart+Math.floor(Math.max(0,captureStart-sessionStart)/60000)*60000;
  this.last=null;this.previous=null;this.closedRun=0;this.mouthRun=0;this.yawnCounted=false;this.reset();
 }
 reset(){this.observed=0;this.face=0;this.closed=0;this.closedInWindow=0;this.yawns=0;}
 accumulate(ms,features){
  this.observed+=ms;
  if(!features){this.closedRun=0;this.closedInWindow=0;this.mouthRun=0;this.yawnCounted=false;return;}
  this.face+=ms;
  if(features.ear<.21){
   const alreadyLong=this.closedRun>=500;this.closedRun+=ms;this.closedInWindow+=ms;
   if(alreadyLong)this.closed+=ms;
   else if(this.closedRun>=500)this.closed+=this.closedInWindow;
  }else{this.closedRun=0;this.closedInWindow=0;}
  if(features.mar>.60){this.mouthRun+=ms;if(this.mouthRun>=1500&&!this.yawnCounted){this.yawns++;this.yawnCounted=true;}}
  else{this.mouthRun=0;this.yawnCounted=false;}
 }
 result(end){
  const seconds=(end-this.start)/1000,coverage=clamp(this.face/Math.max(1,end-this.start),0,1);
  const perclos=clamp(this.closed/Math.max(1,this.face),0,1);
  const valid=seconds>=30&&coverage>=.6;
  const score=100*(.75*clamp(perclos/.30,0,1)+.25*clamp(this.yawns/3,0,1));
  return {module:'camera',session_id:this.sessionId,window_start_utc:new Date(this.start).toISOString(),window_end_utc:new Date(end).toISOString(),valid,
   need_rest_probability_percent:valid?Math.round(score*10)/10:null,quality_score:coverage,
   camera_meta:{method:CAMERA_METHOD,coverage:Math.round(coverage*1000)/1000,perclos:Math.round(perclos*1000)/1000,yawns:this.yawns,window_seconds:seconds,valid}};
 }
 advance(now){
  const out=[];while(now>=this.start+60000){out.push(this.result(this.start+60000));this.start+=60000;this.reset();}return out;
 }
 push(now,features){
  const out=[];
  if(this.last!==null&&now>this.last&&now-this.last<=250){
   let cursor=Math.max(this.last,this.start);
   while(cursor<now){const end=Math.min(now,this.start+60000);this.accumulate(end-cursor,this.previous&&features?this.previous:null);cursor=end;out.push(...this.advance(cursor));}
  }else{this.closedRun=0;this.closedInWindow=0;this.mouthRun=0;this.yawnCounted=false;out.push(...this.advance(now));}
  this.last=now;this.previous=features;return out;
 }
 flush(now,partial=false){
  const out=this.advance(now);
  if(partial&&now>this.start){out.push(this.result(now));this.start=now;this.reset();}
  // Unobserved wall-clock time is never carried into the next frame.
  if(this.last!==null&&now-this.last>250){this.last=null;this.previous=null;this.closedRun=0;this.mouthRun=0;this.yawnCounted=false;}
  return out;
 }
}
