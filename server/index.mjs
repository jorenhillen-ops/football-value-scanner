import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {prepareV15Runtime} from '../BOOTSTRAP_V15.mjs';
import {applyPwaPatch} from '../PWA_PATCH.mjs';
import {applyV154Patch} from '../V15_4_PATCH.mjs';
import {applyV155Patch} from '../V15_5_PATCH.mjs';
import {applyV156Patch} from '../V15_6_PATCH.mjs';
import {applyV157Patch} from '../V15_7_PATCH.mjs';
import {applyV158Patch} from '../V15_8_PATCH.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
try{
  // Rebuild the generated V15.2 core on every start, then apply each verified
  // incremental layer deterministically. data/ and local API keys are untouched.
  const result=prepareV15Runtime({force:true});
  if(result.restored)console.log(`V15.2 core runtime hersteld (${result.written} bestanden).`);
  applyPwaPatch();
  applyV154Patch();
  applyV155Patch();
  applyV156Patch();
  applyV157Patch();
  const v158=applyV158Patch();
  console.log(`Football Value Scanner ${v158.version} starten...`);
  await import(pathToFileURL(path.join(here,'app.v15.mjs')).href+'?runtime='+v158.version);
}catch(err){
  console.error('\nFOUT BIJ STARTEN V15.8');
  console.error(err?.stack||err);
  console.error('\nVoer CHECK_UPDATE.bat uit en start daarna opnieuw. Lokale data/API-keys worden niet gewist.');
  process.exitCode=1;
}
