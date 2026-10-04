import {CameraWindows,faceFeatures} from './camera-metrics.js';
const error=code=>Object.assign(new Error(code),{code});
async function loadFaceDetector(){
 const {FaceLandmarker,FilesetResolver}=await import('./assets/mediapipe/vision_bundle.mjs');
 const files=await FilesetResolver.forVisionTasks(new URL('./assets/mediapipe/wasm',import.meta.url).href);
 return FaceLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:new URL('./assets/mediapipe/face_landmarker.task',import.meta.url).href,delegate:'CPU'},runningMode:'VIDEO',numFaces:2,minFaceDetectionConfidence:.6,minFacePresenceConfidence:.6,minTrackingConfidence:.6});
}
export class CameraCollector{
 constructor({onWindow=()=>{},onState=()=>{},loadDetector=loadFaceDetector}={}){this.onWindow=onWindow;this.onState=onState;this.loadDetector=loadDetector;this.state='off';this.generation=0;this.stream=null;this.detector=null;this.video=null;this.timer=null;this.windows=null;this.lastFrame=-1;}
 status(){return {state:this.state,stream:this.stream};}
 setState(state){this.state=state;this.onState(state);}
 async start(session){
  if(this.state!=='off')return;
  if(!globalThis.isSecureContext||!navigator.mediaDevices?.getUserMedia)throw error('cameraUnsupported');
  const generation=++this.generation;this.setState('loading');
  let stream,detector,video;
  try{
   // Called only from the user's explicit Enable button. Audio is never requested.
   stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:'user',width:{ideal:640},height:{ideal:480},frameRate:{ideal:15,max:30}}});
   if(generation!==this.generation){stream.getTracks().forEach(t=>t.stop());return;}
   this.stream=stream;
   detector=await this.loadDetector();
   if(generation!==this.generation){detector.close();stream.getTracks().forEach(t=>t.stop());return;}
   video=document.createElement('video');video.muted=true;video.autoplay=true;video.playsInline=true;video.className='camera-processing-video';video.setAttribute('aria-hidden','true');video.srcObject=stream;document.body.append(video);
   this.video=video;this.detector=detector;
   await video.play();
   if(generation!==this.generation){video.remove();return;}
   this.windows=new CameraWindows(session.id,session.startedAt,Date.now());this.lastFrame=-1;
   for(const track of stream.getVideoTracks())track.addEventListener('ended',()=>{if(generation===this.generation){this.stop();this.onState('cameraEnded');}},{once:true});
   this.setState('running');this.timer=setInterval(()=>this.tick(),125);
  }catch(e){
   detector?.close();stream?.getTracks().forEach(t=>t.stop());video?.remove();
   if(generation!==this.generation)return;
   this.stop(false);throw error(e.name==='NotAllowedError'?'cameraDenied':e.name==='NotFoundError'?'cameraMissing':e.name==='NotReadableError'?'cameraBusy':'cameraLoadFailed');
  }
 }
 deliver(rows){for(const row of rows)this.onWindow(row);}
 tick(){
  if(this.state!=='running'||!this.windows)return;
  const now=Date.now();
  if(document.hidden||this.video.readyState<2||this.video.currentTime===this.lastFrame){this.deliver(this.windows.push(now,null));this.onState(document.hidden?'paused':'noFace');return;}
  try{
   this.lastFrame=this.video.currentTime;
   const result=this.detector.detectForVideo(this.video,performance.now());
   const features=result.faceLandmarks.length===1?faceFeatures(result.faceLandmarks[0],this.video.videoWidth/this.video.videoHeight):null;
   this.deliver(this.windows.push(now,features));
   this.onState(features?'tracking':'noFace');
  }catch{this.stop();this.onState('cameraLoadFailed');}
 }
 flush(now=Date.now(),partial=false){if(this.windows)this.deliver(this.windows.flush(now,partial));}
 stop(flush=true){
  ++this.generation;clearInterval(this.timer);this.timer=null;
  if(flush)this.flush(Date.now(),true);
  this.windows=null;this.stream?.getTracks().forEach(t=>t.stop());this.stream=null;
  this.detector?.close();this.detector=null;this.video?.remove();this.video=null;this.setState('off');
 }
}
