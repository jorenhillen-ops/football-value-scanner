import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {prepareV15Runtime} from '../BOOTSTRAP_V15.mjs';
import {applyPwaPatch} from '../PWA_PATCH.mjs';
import {applyV154Patch} from '../V15_4_PATCH.mjs';
import {applyV155Patch} from '../V15_5_PATCH.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
try{
  const result=prepareV15Runtime();
  if(result.restored)console.log(`V15.2 core runtime hersteld (${result.written} bestanden).`);
  applyPwaPatch();
  applyV154Patch();
  const v155=applyV155Patch();
  console.log(`Football Value Scanner ${v155.version} starten...`);
  await import(pathToFileURL(path.join(here,'app.v15.mjs')).href+'?runtime='+v155.version);
}catch(err){
  console.error('\nFOUT BIJ STARTEN V15.5');
  console.error(err?.stack||err);
  console.error('\nVoer CHECK_UPDATE.bat uit en start daarna opnieuw. Lokale data/API-keys worden niet gewist.');
  process.exitCode=1;
}
