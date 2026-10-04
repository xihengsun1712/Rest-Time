import { validateAIResponse } from './assistant.js';
import { config } from './config.js';
export const BRIDGE_URL=config.assistantBase;
const fail=code=>Object.assign(new Error(code),{code});
let authorization=null,pending=null;
const storageKey=()=>`rest-time-api-token:${BRIDGE_URL}`;
export function bridgeReady(){try{const url=new URL(BRIDGE_URL);return url.protocol==='https:'&&!url.username&&!url.password&&!url.search&&!url.hash&&!BRIDGE_URL.includes('REPLACE');}catch{return false;}}
async function post(path,body,signal,token){
 let response;try{response=await fetch(BRIDGE_URL.replace(/\/$/,'')+path,{method:'POST',credentials:'omit',redirect:'error',signal,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});}catch(e){if(e.name==='AbortError')throw e;throw fail('aiNetwork');}
 if(!response.ok){let code;try{code=(await response.json()).code;}catch{}if(code==='aiBalance')throw fail('aiBalance');throw fail(response.status===401?'aiUnauthorized':response.status===403?'aiOrigin':response.status===429?'aiRateLimit':'aiHTTP');}
 try{return await response.json();}catch{throw fail('aiInvalid');}
}
async function tokenFor(signal){
 if(!bridgeReady())throw fail('aiNeedsKey');
 if(!authorization){try{authorization=JSON.parse(sessionStorage.getItem(storageKey()));}catch{}}
 if(authorization?.expires_at>Date.now()+60000)return authorization.token;
 if(!pending)pending=post('/api/session',{},signal).then(v=>{if(!/^[0-9a-f]{64}$/.test(v.token)||!Number.isFinite(v.expires_at))throw fail('aiInvalid');authorization=v;try{sessionStorage.setItem(storageKey(),JSON.stringify(v));}catch{}return v.token;}).finally(()=>{pending=null;});
 return pending;
}
export async function bridgeRequest(context,signal){
 const input=structuredClone(context);input.conversation=input.conversation.map(m=>({...m,content:String(m.content).slice(0,1200)}));input.user_message=String(input.user_message||'').slice(0,1200);
 const size=()=>new TextEncoder().encode(JSON.stringify({context:input})).length;
 while(size()>60000&&input.conversation.length)input.conversation.shift();
 while(size()>60000&&input.recent_sessions.length)input.recent_sessions.shift();
 while(size()>60000&&input.indices.length){input.indices.shift();input.indices_truncated=true;}
 if(size()>60000)throw fail('aiInvalid');
 for(let attempt=0;attempt<2;attempt++){
  try{const body=await post('/api/chat',{context:input},signal,await tokenFor(signal));return validateAIResponse(body.result,context.event,context.language);}
  catch(e){if(e.code!=='aiUnauthorized'||attempt===1)throw e;authorization=null;try{sessionStorage.removeItem(storageKey());}catch{}}
 }
}
