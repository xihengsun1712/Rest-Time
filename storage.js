import { FolderStore } from './folder-store.js';
const request = (r) => new Promise((resolve,reject)=> { r.onsuccess=()=>resolve(r.result); r.onerror=()=>reject(r.error); });
let connection;
let folder=null,storageMode='browser';
const folderSupported=()=>typeof window!=='undefined'&&window.isSecureContext&&typeof window.showDirectoryPicker==='function';
const storageError=code=>Object.assign(new Error(code),{code});
async function db() {
  if (!connection) connection = new Promise((resolve,reject)=> {
    const r=indexedDB.open('rest-time-v1',2);
    r.onupgradeneeded=()=> { if(!r.result.objectStoreNames.contains('accounts'))r.result.createObjectStore('accounts',{keyPath:'id'}).createIndex('identity','identity',{unique:true});if(!r.result.objectStoreNames.contains('personal'))r.result.createObjectStore('personal',{keyPath:'id'});if(!r.result.objectStoreNames.contains('settings'))r.result.createObjectStore('settings',{keyPath:'id'}); };
    r.onsuccess=()=>resolve(r.result); r.onerror=()=>reject(r.error);
  });
  return connection;
}
async function read(store,key,index) {
  const conn=await db(), target=conn.transaction(store).objectStore(store);
  return request((index ? target.index(index):target).get(key));
}
async function put(store,value) {
  const conn=await db();
  return new Promise((resolve,reject)=> { const tx=conn.transaction(store,'readwrite'); tx.objectStore(store).put(value); tx.oncomplete=()=>resolve(value); tx.onerror=()=>reject(tx.error); tx.onabort=()=>reject(tx.error); });
}
const bytesToHex=b=>Array.from(new Uint8Array(b),v=>v.toString(16).padStart(2,'0')).join('');
async function passwordHash(password,salt) {
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
  return bytesToHex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:210000,hash:'SHA-256'},key,256));
}
export const storage={
  async init() {
    const [choice,remembered]=await Promise.all([read('settings','mode'),read('settings','folder')]);
    storageMode=folderSupported()?(choice?.value??'folder'):'browser';
    if(remembered?.handle&&folderSupported())folder=new FolderStore(remembered.handle);
  },
  status() {return {mode:storageMode,supported:folderSupported(),selected:Boolean(folder),name:folder?.handle.name??''};},
  async ready() {if(storageMode!=='folder')return true;if(!folder)return false;try{await folder.permission();return true;}catch{return false;}},
  async connectFolder(change=false) {
    if(!folderSupported())throw storageError('folderUnsupported');
    // Call the picker/request directly from the click, before database awaits.
    if(!folder||change){
      const handle=await window.showDirectoryPicker({id:'rest-time-data',mode:'readwrite'});
      const candidate=new FolderStore(handle);await candidate.permission();await candidate.accounts();
      folder=candidate;
    }else{await folder.permission(true);await folder.accounts();}
    storageMode='folder';
    await put('settings',{id:'folder',handle:folder.handle});
    await put('settings',{id:'mode',value:'folder'});
    return storage.status();
  },
  async useBrowser() {storageMode='browser';await put('settings',{id:'mode',value:'browser'});},
  async authorize() {if(storageMode==='folder'){if(!folder)throw storageError('folderRequired');await folder.permission(true);}},
  async signup(name,identity,password) {
    identity=identity.trim().toLowerCase();
    if(storageMode==='folder'&&!folder)throw storageError('folderRequired');
    if(storageMode!=='folder'&&await read('accounts',identity,'identity')) throw storageError('accountExists');
    const salt=bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
    const account={id:crypto.randomUUID(),name:name.trim(),identity,salt,hash:await passwordHash(password,salt)};
    if(storageMode==='folder')await folder.addAccount(account);else await put('accounts',account);return {id:account.id,name:account.name,identity};
  },
  async login(identity,password) {
    if(storageMode==='folder'&&!folder)throw storageError('folderRequired');
    const normalized=identity.trim().toLowerCase();
    const account=storageMode==='folder'?(await folder.accounts()).find(a=>a.identity===normalized):await read('accounts',normalized,'identity');
    if(!account || await passwordHash(password,account.salt)!==account.hash) throw storageError('incorrectAccount');
    return {id:account.id,name:account.name,identity:account.identity};
  },
  async account(id) {const a=storageMode==='folder'?(await folder.accounts()).find(a=>a.id===id):await read('accounts',id);return a?{id:a.id,name:a.name,identity:a.identity}:null;},
  async personal(id) { return storageMode==='folder'?folder.personal(id):await read('personal',id) ?? {id,samples:[],messages:[],language:'zh',sound:true,profile:{}}; },
  async savePersonal(value) {if(storageMode==='folder'){if(!folder)throw storageError('folderRequired');return folder.savePersonal(value);}return put('personal',value);},
};
