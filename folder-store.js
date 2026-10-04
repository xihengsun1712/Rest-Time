// All file access is scoped to the app's subfolder inside the chosen directory.
export class FolderStore {
  constructor(handle) { this.handle=handle; this.queue=Promise.resolve(); }
  error(code) { return Object.assign(new Error(code),{code}); }
  async permission(prompt=false) {
    try {
      const options={mode:'readwrite'};
      const state=prompt?await this.handle.requestPermission(options):await this.handle.queryPermission(options);
      if(state!=='granted')throw this.error('folderPermission');
    } catch(error) { if(error.code)throw error;throw this.error('folderPermission'); }
  }
  async directory(create=false) {
    await this.permission();
    try { return await this.handle.getDirectoryHandle('rest-time-data',{create}); }
    catch(error) { if(!create&&error.name==='NotFoundError')return null;throw this.error('folderUnavailable'); }
  }
  async readJSON(name) {
    const dir=await this.directory();if(!dir)return null;
    let handle;
    try { handle=await dir.getFileHandle(name); }
    catch(error) { if(error.name==='NotFoundError')return null;throw this.error('folderUnavailable'); }
    try {
      const file=await handle.getFile();
      if(file.size>8*1024*1024)throw this.error('folderCorrupt');
      const value=JSON.parse(await file.text());
      if(!value||typeof value!=='object'||Array.isArray(value))throw this.error('folderCorrupt');
      return value;
    } catch(error) { if(error.code)throw error;throw this.error('folderCorrupt'); }
  }
  async writeJSON(name,value) {
    const dir=await this.directory(true);
    let writable;
    try {
      const file=await dir.getFileHandle(name,{create:true});
      writable=await file.createWritable();
      await writable.write(JSON.stringify(value,null,2)+'\n');
      await writable.close();
    } catch(error) {
      try { await writable?.abort(); } catch {}
      throw this.error(error.name==='NotAllowedError'?'folderPermission':'folderWriteFailed');
    }
  }
  async accounts() {
    const value=await this.readJSON('accounts.json');
    if(value===null)return [];
    if(value.format!=='rest-time-accounts'||value.version!==1||!Array.isArray(value.accounts)||
      value.accounts.some(a=>!this.validId(a.id)||typeof a.name!=='string'||typeof a.identity!=='string'||
      typeof a.salt!=='string'||typeof a.hash!=='string'||!/^[a-f0-9]{32}$/.test(a.salt)||!/^[a-f0-9]{64}$/.test(a.hash))||
      new Set(value.accounts.map(a=>a.id)).size!==value.accounts.length||new Set(value.accounts.map(a=>a.identity)).size!==value.accounts.length)throw this.error('folderCorrupt');
    return value.accounts;
  }
  validId(id) { return typeof id==='string'&&/^[a-f0-9-]{36}$/.test(id); }
  async personal(id) {
    if(!this.validId(id))throw this.error('folderCorrupt');
    const value=await this.readJSON(id+'.json');
    if(value===null)return {id,samples:[],messages:[],language:'zh',sound:true,profile:{}};
    if(value.format!=='rest-time-personal'||value.version!==1||value.id!==id||
      !Array.isArray(value.samples)||!Array.isArray(value.messages)||!['zh','en'].includes(value.language)||
      typeof value.sound!=='boolean'||!value.profile||typeof value.profile!=='object'||Array.isArray(value.profile))throw this.error('folderCorrupt');
    const {format,version,...personal}=value;
    return personal;
  }
  exclusive(task) {
    const run=()=>globalThis.navigator?.locks?.request
      ?navigator.locks.request('rest-time-folder-write',task):task();
    const result=this.queue.catch(()=>{}).then(run);this.queue=result;return result;
  }
  addAccount(account) { return this.exclusive(async()=>{
    const accounts=await this.accounts();
    if(accounts.some(a=>a.identity===account.identity))throw this.error('accountExists');
    accounts.push(account);
    await this.writeJSON('accounts.json',{format:'rest-time-accounts',version:1,accounts});
  }); }
  savePersonal(value) { return this.exclusive(async()=>{
    if(!this.validId(value.id))throw this.error('folderCorrupt');
    // Read first so a damaged or unrelated existing file is never overwritten.
    await this.personal(value.id);
    await this.writeJSON(value.id+'.json',{...value,format:'rest-time-personal',version:1});
    return value;
  }); }
}
