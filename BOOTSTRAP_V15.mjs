import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const ROOT=path.dirname(fileURLToPath(import.meta.url));
const RELEASE_DIR=path.join(ROOT,'release');
const MARKER=path.join(ROOT,'.v15-runtime.json');
const EXPECTED_SHA='e2f74054d76abc19be9f3fd94e6f9928e3a639d1aabcd0d5587fd0e20946d068';
const EXPECTED_VERSION='15.0.1';
const REQUIRED_FILES=[
  'public/app.js','public/index.html','public/style.css',
  'server/model.mjs','server/ml.mjs','server/refresh.mjs','server/storage.mjs',
  'server/providers/oddspapi.mjs','server/providers/sportmonks_history.mjs','server/providers/sportmonks.mjs',
  'server/providers/footballdata.mjs','server/providers/thesportsdb.mjs','server/providers/teamlogos.mjs',
  'server/app.v15.mjs'
];

function readMarker(){
  try{return JSON.parse(fs.readFileSync(MARKER,'utf8'));}catch{return null}
}
function requiredFilesPresent(){
  return REQUIRED_FILES.every(p=>fs.existsSync(path.join(ROOT,p)));
}
function readPayload(){
  if(!fs.existsSync(RELEASE_DIR))throw new Error('V15 release-map ontbreekt. Voer CHECK_UPDATE.bat uit en probeer opnieuw.');
  const parts=fs.readdirSync(RELEASE_DIR).filter(x=>/^v15_runtime_\d+[.]b64$/.test(x)).sort();
  if(!parts.length)throw new Error('V15 runtime-pakket ontbreekt. Voer CHECK_UPDATE.bat uit en probeer opnieuw.');
  const b64=parts.map(x=>fs.readFileSync(path.join(RELEASE_DIR,x),'utf8').trim()).join('');
  const raw=zlib.brotliDecompressSync(Buffer.from(b64,'base64'));
  const sha=crypto.createHash('sha256').update(raw).digest('hex');
  if(sha!==EXPECTED_SHA)throw new Error(`V15 runtime-pakket is onvolledig of beschadigd (${sha.slice(0,10)}).`);
  return JSON.parse(raw.toString('utf8'));
}
function safeTarget(rel){
  const clean=String(rel||'').replace(/\\/g,'/').replace(/^\/+/, '');
  if(clean.startsWith('data/')||clean==='data')throw new Error('V15 runtime mag de data-map niet overschrijven.');
  const target=path.resolve(ROOT,clean);
  if(!target.startsWith(path.resolve(ROOT)+path.sep))throw new Error(`Ongeldig V15 runtime-pad: ${rel}`);
  return target;
}
function writeAtomic(target,content){
  fs.mkdirSync(path.dirname(target),{recursive:true});
  const tmp=`${target}.v15tmp-${process.pid}`;
  fs.writeFileSync(tmp,content,'utf8');
  fs.renameSync(tmp,target);
}

export function prepareV15Runtime({force=false}={}){
  const marker=readMarker();
  if(!force&&marker?.version===EXPECTED_VERSION&&marker?.sha256===EXPECTED_SHA&&requiredFilesPresent()){
    return {ok:true,version:EXPECTED_VERSION,restored:false};
  }
  const payload=readPayload();
  if(payload?.version!==EXPECTED_VERSION||!payload?.files)throw new Error('V15 runtime-manifest heeft een onverwachte versie.');
  for(const required of REQUIRED_FILES){
    if(typeof payload.files[required]!=='string')throw new Error(`V15 runtime-bestand ontbreekt in manifest: ${required}`);
  }
  let written=0;
  for(const [rel,content] of Object.entries(payload.files)){
    if(typeof content!=='string')continue;
    writeAtomic(safeTarget(rel),content);written++;
  }
  fs.writeFileSync(MARKER,JSON.stringify({version:EXPECTED_VERSION,sha256:EXPECTED_SHA,preparedAt:new Date().toISOString(),written},null,2),'utf8');
  return {ok:true,version:EXPECTED_VERSION,restored:true,written};
}

if(process.argv.includes('--prepare')){
  try{console.log(JSON.stringify(prepareV15Runtime({force:process.argv.includes('--force')}),null,2));}
  catch(e){console.error('V15 PREPARE FOUT:',e?.stack||e);process.exitCode=1;}
}
