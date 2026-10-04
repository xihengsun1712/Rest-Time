import { normalizeBatch } from './data.js';
// Adapted simulation using approximate group F-ISA means digitized from Figure 1a.
// Hamann & Carstengerdes (2023), doi:10.1038/s41598-023-31264-w, CC BY 4.0.
// Original 16-block/90-minute ratings are NOT camera/wrist probabilities.
export const DEMO_MINUTES=40;
const STUDY_MEANS=[1.61,1.72,1.87,1.93,2.14,2.39,2.40,2.46,2.57,2.87,2.84,2.82,2.78,2.88,3.10,3.03];
const TARGETS=[[0,14],[15,22],[25,40],[40,70]];
const interpolate=(values,x)=>{const i=Math.min(Math.floor(x),values.length-2);return values[i]+(values[i+1]-values[i])*(x-i);};
const raw=Array.from({length:41},(_,i)=>interpolate(STUDY_MEANS,i/40*15));
// Small observed departures from a straight trend preserve some source variability.
const residual=raw.map((v,i)=>v-(STUDY_MEANS[0]+(STUDY_MEANS.at(-1)-STUDY_MEANS[0])*i/40));
const DEMO_PAIRS=Array.from({length:DEMO_MINUTES},(_,i)=>{
 const minute=i+1;const k=minute<=15?0:minute<=25?1:2;
 const [a,lo]=TARGETS[k],[b,hi]=TARGETS[k+1],f=(minute-a)/(b-a);
 const target=lo+(hi-lo)*f;
 const adjusted=target+3*(residual[minute]-residual[a]*(1-f)-residual[b]*f);
 const smooth=(residual[Math.max(0,minute-1)]+residual[minute])/2;
 // Both illustrative channels share a fatigue trend; their offset is designed, not measured.
 const offset=minute===40?0:0.6+Math.min(0.6,Math.abs(smooth));
 return [Math.round((adjusted+offset)*10)/10,Math.round((adjusted-offset)*10)/10];
});
export function demoWindows(base){
 return DEMO_PAIRS.map(([camera,wrist],i)=>{
  const metadata={session_id:'synthetic-demo',window_start_utc:new Date(base+i*60000).toISOString(),window_end_utc:new Date(base+(i+1)*60000).toISOString()};
  const source=(v,module)=>({...metadata,module,valid:v!==null,need_rest_probability_percent:v,quality_score:v===null?0:module==='camera'?0.85:0.9,reason_codes:v===null?['demo_signal_loss']:['synthetic_demo']});
  return {...metadata,camera_result:source(camera,'camera'),physiology_result:source(wrist,'physiology')};
 });
}
export function replayDemo(base,count){
 const windows=demoWindows(base).slice(0,count);return {windows,samples:windows.length?normalizeBatch(windows):[],decision:fusionDecision(windows)};
}
// Port of uploaded fusion.py: quality-weighted 0.4/0.6 mean, three-window persistence.
export function fusionDecision(windows){
 let history=[],last={valid:false,status:'insufficient_data',probability:null};
 for(const row of windows){
  const pairs=[[row.camera_result,0.4],[row.physiology_result,0.6]].filter(([s])=>s?.valid===true&&typeof s.need_rest_probability_percent==='number'&&s.need_rest_probability_percent>=0&&s.need_rest_probability_percent<=100&&s.quality_score>0&&s.quality_score<=1);
  if(!pairs.length){history=[];last={valid:false,status:'insufficient_data',probability:null};continue;}
  const weight=pairs.reduce((sum,[s,w])=>sum+s.quality_score*w,0);
  const p=Math.round(pairs.reduce((sum,[s,w])=>sum+s.need_rest_probability_percent*s.quality_score*w,0)/weight*10)/10;
  history=[...history,p].slice(-3);
  const status=history.length===3&&history.every(v=>v>=60)?'break_recommended':p>=40?'watch':history.length===3&&history.every(v=>v<35)?'recovered_or_normal':'normal';
  last={valid:true,status,probability:p,quality:weight,history_length:history.length};
 }
 return last;
}
