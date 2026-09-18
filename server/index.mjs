import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {prepareV15Runtime} from '../BOOTSTRAP_V15.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
try{
  const result=prepareV15Runtime();
  if(result.restored)console.log(`V15.2 runtime hersteld (${result.written} bestanden).`);
  console.log('Football Value Scanner V15.2.0 starten...');
  await import(pathToFileURL(path.join(here,'app.v15.mjs')).href+'?runtime=15.2.0');
}catch(err){
  console.error('\nFOUT BIJ STARTEN V15.2');
  console.error(err?.stack||err);
  console.error('\nVoer CHECK_UPDATE.bat uit en start daarna opnieuw. Lokale data/API-keys worden niet gewist.');
  process.exitCode=1;
}
