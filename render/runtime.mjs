import { readFile, stat } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
export const publicRoot=resolve(new URL('../public/',import.meta.url).pathname);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.geojson':'application/geo+json','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png','.txt':'text/plain; charset=utf-8'};
export async function staticAsset(request){
 let path;try{path=decodeURIComponent(new URL(request.url).pathname)}catch{return new Response('Bad path',{status:400})}
 const file=resolve(publicRoot,'.'+path);
 if(!file.startsWith(publicRoot+sep))return new Response('Not found',{status:404});
 try{if(!(await stat(file)).isFile())return new Response('Not found',{status:404});
 const ext=file.slice(file.lastIndexOf('.'));return new Response(request.method==='HEAD'?null:await readFile(file),{headers:{'Content-Type':mime[ext]||'application/octet-stream','Cache-Control':'public, max-age=3600'}})
 }catch{return new Response('Not found',{status:404})}
}
// Hosting-specific identity is deliberately not accepted on this runtime.
export const env={ASSETS:{fetch:staticAsset}};
globalThis.caches ??= {};
