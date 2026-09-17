import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';

const ROOT=path.dirname(fileURLToPath(import.meta.url));
const rel=p=>path.join(ROOT,p.replace(/^b\//,''));

function version(){
  try{return JSON.parse(fs.readFileSync(path.join(ROOT,'VERSION.json'),'utf8')).version||'0';}catch{return '0';}
}
function atLeast15(){return Number(String(version()).split('.')[0]||0)>=15}
function readParts(prefix){
  const dir=path.join(ROOT,'release');
  if(!fs.existsSync(dir))return '';
  return fs.readdirSync(dir).filter(x=>x.startsWith(prefix)&&x.endsWith('.b64')).sort().map(x=>fs.readFileSync(path.join(dir,x),'utf8').trim()).join('');
}
function decodeB64(s){return zlib.brotliDecompressSync(Buffer.from(s,'base64')).toString('utf8')}
function ensureDir(file){fs.mkdirSync(path.dirname(file),{recursive:true})}
function parseHeaderPath(line){
  const raw=line.slice(4).split('\t')[0].trim();
  return raw==='/dev/null'?raw:raw.replace(/^[ab]\//,'');
}
function applyUnifiedPatch(patchText){
  const lines=patchText.replace(/\r\n/g,'\n').split('\n');
  let i=0;
  while(i<lines.length){
    if(!lines[i].startsWith('--- ')){i++;continue}
    const oldPath=parseHeaderPath(lines[i++]);
    if(i>=lines.length||!lines[i].startsWith('+++ '))throw new Error('Ongeldige patch-header');
    const newPath=parseHeaderPath(lines[i++]);
    const target=newPath==='/dev/null'?oldPath:newPath;
    const file=rel(target);
    let source=[];
    if(oldPath!=='/dev/null'&&fs.existsSync(file))source=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n').split('\n');
    let srcPos=0,out=[];
    while(i<lines.length&&!lines[i].startsWith('--- ')){
      if(!lines[i].startsWith('@@ ')){i++;continue}
      const m=lines[i++].match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
      if(!m)throw new Error(`Ongeldige hunk in ${target}`);
      const oldStart=Number(m[1]);
      while(srcPos<oldStart-1&&srcPos<source.length)out.push(source[srcPos++]);
      while(i<lines.length&&!lines[i].startsWith('@@ ')&&!lines[i].startsWith('--- ')){
        const line=lines[i++];
        if(line.startsWith('\\ No newline'))continue;
        const sign=line[0],body=line.slice(1);
        if(sign===' '){
          if(source[srcPos]!==body)throw new Error(`Patch mismatch ${target}:${srcPos+1}`);
          out.push(source[srcPos++]);
        }else if(sign==='-'){
          if(source[srcPos]!==body)throw new Error(`Patch mismatch ${target}:${srcPos+1}`);
          srcPos++;
        }else if(sign==='+')out.push(body);
        else if(line==='')break;
      }
    }
    while(srcPos<source.length)out.push(source[srcPos++]);
    if(newPath==='/dev/null'){if(fs.existsSync(file))fs.unlinkSync(file)}
    else{ensureDir(file);fs.writeFileSync(file,out.join('\n'),'utf8')}
  }
}
export function restoreV15Index(){
  const b64=readParts('v15_index_');
  if(!b64)throw new Error('V15 index payload ontbreekt');
  const code=decodeB64(b64);
  const target=path.join(ROOT,'server','index.mjs');
  ensureDir(target);fs.writeFileSync(target,code,'utf8');
}
export function applyV15(){
  if(!atLeast15()){
    const b64=readParts('v15_patch_');
    if(!b64)throw new Error('V15 patch payload ontbreekt');
    applyUnifiedPatch(decodeB64(b64));
  }
  restoreV15Index();
}
