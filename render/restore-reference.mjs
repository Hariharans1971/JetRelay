import { readdir, readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const dir=new URL('./reference/',import.meta.url);
try{await stat(new URL('../public/data/airport-details/vo.json',import.meta.url));console.log('Bundled references already present')}catch{
 const manifest=JSON.parse(await readFile(new URL('manifest.json',dir),'utf8'));
 const parts=[];for(const part of manifest.parts){if(!/^snapshot-\d+\.part$/.test(part.name))throw Error('Invalid snapshot part');const bytes=await readFile(new URL(part.name,dir));if(createHash('sha256').update(bytes).digest('hex')!==part.sha256)throw Error('Reference snapshot integrity failure');parts.push(bytes)}
 const result=spawnSync('tar',['-xzf','-','-C',new URL('../',import.meta.url).pathname],{input:Buffer.concat(parts),maxBuffer:1024*1024});
 if(result.status!==0)throw Error('Could not restore reference snapshot');console.log('Verified reference snapshot restored');
}
