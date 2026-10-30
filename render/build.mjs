import { readFile, writeFile, mkdir, cp } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
const out = new URL('../dist-node/', import.meta.url);
await mkdir(new URL('lib/data/', out), {recursive:true});
for (const file of ['access.mjs','observations.mjs','reference-source.mjs']) await cp(new URL('../lib/'+file,import.meta.url),new URL('lib/'+file,out));
for (const name of ['countries','provenance']) {
 const data=await readFile(new URL('../lib/data/'+name+'.json',import.meta.url),'utf8');
 await writeFile(new URL('lib/data/'+name+'.mjs',out),'export default '+data+';\n');
}
let aviation=await readFile(new URL('../lib/aviation.ts',import.meta.url),'utf8');
aviation=aviation.replace("'cloudflare:workers'","'../runtime.mjs'").replaceAll(".json'",".mjs'").replace("'tz-lookup'","'../../render/node_modules/tz-lookup/tz.js'");
await writeFile(new URL('lib/aviation.mjs',out),stripTypeScriptTypes(aviation));
let route=await readFile(new URL('../app/api/[...segments]/route.ts',import.meta.url),'utf8');
route=route.replace("'cloudflare:workers'","'./runtime.mjs'").replaceAll('../../../lib/','./lib/').replace("'./lib/aviation'","'./lib/aviation.mjs'").replace('Cloudflare Workers via Sites','Node.js on Render');
await writeFile(new URL('route.mjs',out),stripTypeScriptTypes(route));
await cp(new URL('runtime.mjs',import.meta.url),new URL('runtime.mjs',out));
await cp(new URL('server.mjs',import.meta.url),new URL('server.mjs',out));
console.log('Render Node runtime prepared');
