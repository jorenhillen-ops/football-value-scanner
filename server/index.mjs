import path from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'..');
try{
  const patch=await import(pathToFileURL(path.join(root,'V15_PATCH.mjs')).href+'?t='+Date.now());
  patch.applyV15();
  console.log('V15 Adaptive Player Engine klaar. Server starten...');
  const child=spawn(process.execPath,[path.join(root,'server','index.mjs'),'--v15-live'],{cwd:root,stdio:'inherit'});
  child.on('exit',code=>process.exit(code??0));
  child.on('error',err=>{console.error(err);process.exit(1)});
}catch(err){
  console.error('V15 update kon niet worden toegepast:',err?.message||err);
  process.exit(1);
}
